"""
MES Machine Simulator
─────────────────────
IoT plug-and-play layer: publishes telemetry to MQTT topics using the same
payload contract a real PLC would use. When real devices replace this simulator
no changes are required in the backend or frontend.

Data contract (schema_version 1.0)
───────────────────────────────────
  machine_reference  str    machine reference from DB (join key)
  state              str    MARCHE | PAUSE | ERREUR | MAINTENANCE  (read from API)
  temperature        float  °C
  pressure           float  bar
  speed              int    RPM
  vibration          float  g
  production         int    cumulative units since boot
  timestamp          str    ISO-8601 UTC
  schema_version     str    "1.0"
  _source            str    "simulator"  (real devices set "plc", "opcua", …)

State-aware sensor physics
──────────────────────────
  MARCHE      → nominal ranges (machine-type-specific)
  PAUSE       → speed=0, pressure=0, temperature cooling towards ambient
  ERREUR      → temperature spike, vibration surge, speed=0
  MAINTENANCE → ambient+20°C, diagnostic pressure, no production
"""
from __future__ import annotations

import argparse
import json
import random
import signal
import time
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict

import requests
import paho.mqtt.client as mqtt

# ── Configuration ─────────────────────────────────────────────────────────────

BROKER_HOST              = "localhost"
BROKER_PORT              = 1883
GLOBAL_TOPIC             = "mes/metrics/global"
MACHINE_TOPIC_TEMPLATE   = "mes/machines/{ref}/data"
PUBLISH_INTERVAL_SECONDS = 2
MACHINES_API_URL         = "http://127.0.0.1:8000/api/machines"

# Nominal sensor ranges per machine type (MARCHE state)
_NOMINAL: dict[str, dict] = {
    "Injection":  {"temp": (80, 120), "speed": (500, 900),   "pressure": (2.5, 4.5), "vibration": (0.01, 0.04)},
    "Nettoyeuse": {"temp": (30,  50), "speed": (1000, 1500), "pressure": (0.5, 1.5), "vibration": (0.01, 0.03)},
    "Condenseur": {"temp": (20,  40), "speed": (300, 600),   "pressure": (1.0, 2.0), "vibration": (0.01, 0.02)},
    "Cardage":    {"temp": (50,  70), "speed": (800, 1200),  "pressure": (0.3, 0.8), "vibration": (0.02, 0.05)},
    "Séchage":    {"temp": (90, 130), "speed": (400, 700),   "pressure": (0.1, 0.5), "vibration": (0.01, 0.03)},
    "Bobinage":   {"temp": (40,  60), "speed": (900, 1400),  "pressure": (0.2, 0.6), "vibration": (0.01, 0.04)},
}
_NOMINAL_DEFAULT = {"temp": (60, 80), "speed": (800, 1200), "pressure": (0.5, 1.5), "vibration": (0.01, 0.04)}


# ── Machine simulation ────────────────────────────────────────────────────────

@dataclass
class MachineSim:
    numeric_id:   int    # DB primary key — used for API state polling
    machine_ref:  str    # human-readable reference — used for MQTT topic + payload
    machine_type: str = "generic"
    state:        str = "PAUSE"
    production:   int = 0
    temperature:  float = 25.0
    pressure:     float = 0.0
    speed:        int   = 0
    vibration:    float = 0.01 
    

    def fetch_state(self) -> str:
        """Read current machine state from the authoritative API endpoint."""
        try:
            res = requests.get(
                f"{MACHINES_API_URL}/{self.numeric_id}/current-state",
                timeout=1,
            )
            if res.status_code == 200:
                return res.json().get("current_state", "PAUSE")
        except Exception:
            pass
        return self.state  # keep last known state on transient error

    def _update_sensors(self) -> None:
        nom = _NOMINAL.get(self.machine_type, _NOMINAL_DEFAULT)
        s = self.state

        if s == "MARCHE":
            self.temperature = round(random.uniform(*nom["temp"]), 1)
            self.pressure    = round(random.uniform(*nom["pressure"]), 3)
            self.speed       = random.randint(*nom["speed"])
            self.vibration   = round(random.uniform(*nom["vibration"]), 4)

        elif s == "PAUSE":
            # Gradual cool-down, no flow
            self.temperature = round(max(25.0, self.temperature - random.uniform(0.5, 2.0)), 1)
            self.pressure    = 0.0
            self.speed       = 0
            self.vibration   = round(random.uniform(0.002, 0.006), 4)

        elif s == "ERREUR":
            # Anomalous: temperature spike, vibration surge, no flow
            self.temperature = round(random.uniform(130, 180), 1)
            self.pressure    = round(random.uniform(0.0, 0.3), 3)
            self.speed       = 0
            self.vibration   = round(random.uniform(0.08, 0.15), 4)

        elif s == "MAINTENANCE":
            # Technician diagnostics: ambient + small diagnostic pressure
            self.temperature = round(random.uniform(25, 45), 1)
            self.pressure    = round(random.uniform(0.1, 0.4), 3)
            self.speed       = 0
            self.vibration   = round(random.uniform(0.005, 0.015), 4)

    def tick(self) -> None:
        self.state = self.fetch_state()
        if self.state == "MARCHE":
            self.production += random.randint(5, 20)
        self._update_sensors()

    def to_payload(self) -> dict:
        return {
            "schema_version":    "1.0",
            "machine_reference": self.machine_ref,
            "state":             self.state,
            "temperature":       self.temperature,
            "pressure":          self.pressure,
            "speed":             self.speed,
            "vibration":         self.vibration,
            "production":        self.production,
            "timestamp":         datetime.now(timezone.utc).isoformat(),
            "_source":           "simulator",
        }


# ── Machine loader ────────────────────────────────────────────────────────────

def load_machines(api_url: str) -> Dict[str, MachineSim]:
    try:
        with urllib.request.urlopen(api_url) as resp:
            items = json.loads(resp.read().decode())

        machines: Dict[str, MachineSim] = {}
        for item in items:
            ref = item.get("reference")
            nid = item.get("id")
            if ref and nid:
                machines[ref] = MachineSim(
                    numeric_id=nid,
                    machine_ref=ref,
                    machine_type=item.get("machine_type", "generic"),
                )
        print(f"✅  Loaded {len(machines)} machines")
        return machines
    except Exception as exc:
        print(f"❌  Could not load machines: {exc}")
        return {}


def compute_global(machines: Dict[str, MachineSim]) -> dict:
    running = sum(1 for m in machines.values() if m.state == "MARCHE")
    return {
        "total_production": sum(m.production for m in machines.values()),
        "machines":         len(machines),
        "running":          running,
        "schema_version":   "1.0",
        "_source":          "simulator",
    }


# ── Main loop ─────────────────────────────────────────────────────────────────

def run(api_url: str) -> None:
    client = mqtt.Client()
    try:
        client.connect(BROKER_HOST, BROKER_PORT)
        client.loop_start()
        mqtt_ok = True
    except Exception as exc:
        print(f"⚠️  MQTT unavailable ({exc}), running without broker")
        mqtt_ok = False

    machines = load_machines(api_url)
    if not machines:
        print("No machines found — exiting.")
        return

    running = True

    def _stop(sig, frame):
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, _stop)
    print("🚀  Simulation started (Ctrl-C to stop)")

    while running:
        if random.random() < 0.05:
            machines.update(load_machines(api_url))

        for m in machines.values():
            m.tick()
            payload = m.to_payload()

            if mqtt_ok:
                topic = MACHINE_TOPIC_TEMPLATE.format(ref=m.machine_ref)
                try:
                    client.publish(topic, json.dumps(payload))
                except Exception:
                    pass

            print(
                f"  {m.machine_ref:<20} | {m.machine_type:<12} | "
                f"{m.state:<12} | {m.temperature:>6.1f}°C | "
                f"{m.pressure:>5.2f}bar | {m.speed:>5}rpm | prod={m.production}"
            )

        if mqtt_ok:
            try:
                client.publish(GLOBAL_TOPIC, json.dumps(compute_global(machines)))
            except Exception:
                pass

        time.sleep(PUBLISH_INTERVAL_SECONDS)

    if mqtt_ok:
        client.loop_stop()
        client.disconnect()


def main() -> None:
    parser = argparse.ArgumentParser(description="MES machine simulator")
    parser.add_argument("--start", action="store_true", help="Start simulation loop")
    args = parser.parse_args()
    if args.start:
        run(MACHINES_API_URL)
    else:
        print("Usage: python simulation.py --start")


if __name__ == "__main__":
    main()
