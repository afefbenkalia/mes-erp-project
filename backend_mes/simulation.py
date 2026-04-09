"""
Realistic MES MQTT simulator.

Publishes:
- mes/machines/{id}/data
- mes/metrics/global

Run:
    python simulation.py --start
Stop:
    Ctrl+C

Dependency:
    pip install paho-mqtt
"""

from __future__ import annotations

import argparse
import json
import random
import signal
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List

import paho.mqtt.client as mqtt


BROKER_HOST = "localhost"
BROKER_PORT = 1883
GLOBAL_TOPIC = "mes/metrics/global"
MACHINE_TOPIC_TEMPLATE = "mes/machines/{id}/data"

MACHINE_IDS = ["M1", "M2", "M3", "M4"]
STATE_CHOICES = ["running", "stopped", "maintenance", "error"]
NON_RUNNING_STATES = {"stopped", "maintenance", "error"}

PUBLISH_INTERVAL_SECONDS = 2
STATE_CHANGE_WINDOW_SECONDS = (10, 30)
DEFAULT_MACHINES_API_URL = "http://127.0.0.1:8000/api/machines"


@dataclass
class MachineSim:
    machine_id: str
    state: str = "running"
    runtime_minutes: float = 0.0
    downtime_minutes: float = 0.0
    production: int = 0
    rejects: int = 0
    temperature: float = 75.0
    pressure: float = 6.2
    speed: int = 1100
    current_of: str = "OF-1001"
    expected_production_per_minute: float = 6.0
    next_state_change_at: float = field(default_factory=lambda: 0.0)

    def __post_init__(self) -> None:
        self.schedule_next_state_change()

    def schedule_next_state_change(self) -> None:
        delay = random.randint(*STATE_CHANGE_WINDOW_SECONDS)
        self.next_state_change_at = time.time() + delay

    def maybe_change_state(self) -> None:
        now = time.time()
        if now < self.next_state_change_at:
            return

        # Bonus: occasional forced failure.
        if random.random() < 0.12:
            next_state = "error"
        else:
            weighted_states = [
                ("running", 0.68),
                ("stopped", 0.18),
                ("maintenance", 0.09),
                ("error", 0.05),
            ]
            r = random.random()
            cumulative = 0.0
            next_state = self.state
            for s, w in weighted_states:
                cumulative += w
                if r <= cumulative:
                    next_state = s
                    break

        if next_state != self.state:
            print(
                f"[{datetime.now().strftime('%H:%M:%S')}] "
                f"{self.machine_id} state change: {self.state} -> {next_state}"
            )
            self.state = next_state

            if self.state == "running" and random.random() < 0.35:
                # New order id when resuming production.
                self.current_of = f"OF-{random.randint(1001, 9999)}"

        self.schedule_next_state_change()

    def tick(self, interval_seconds: int) -> None:
        self.maybe_change_state()

        delta_minutes = interval_seconds / 60.0
        if self.state == "running":
            self.runtime_minutes += delta_minutes
        else:
            self.downtime_minutes += delta_minutes

        if self.state == "running":
            produced_now = random.randint(6, 18)
            self.production += produced_now
            self.rejects += random.randint(0, 2)
            self.speed = random.randint(800, 1500)
            self.temperature = round(random.uniform(70.0, 90.0), 1)
        elif self.state == "stopped":
            self.speed = 0
            self.temperature = round(random.uniform(30.0, 50.0), 1)
        elif self.state == "maintenance":
            self.speed = random.randint(0, 200)
            self.temperature = round(random.uniform(35.0, 60.0), 1)
        else:  # error
            self.speed = 0
            self.temperature = round(random.uniform(60.0, 95.0), 1)

        self.pressure = round(random.uniform(5.0, 8.0), 2)

    def to_payload(self) -> dict:
        payload = {
            "machineId": self.machine_id,
            "state": self.state,
            "runtime_minutes": round(self.runtime_minutes, 2),
            "downtime_minutes": round(self.downtime_minutes, 2),
            "production": self.production,
            "rejects": self.rejects,
            "temperature": self.temperature,
            "pressure": self.pressure,
            "speed": self.speed,
            "current_of": self.current_of,
        }

        # Extra signal for monitoring without breaking existing UI.
        if self.temperature > 85:
            payload["warning"] = "HIGH_TEMPERATURE"

        return payload


def compute_global_metrics(machines: Dict[str, MachineSim]) -> dict:
    total_runtime = sum(m.runtime_minutes for m in machines.values())
    total_downtime = sum(m.downtime_minutes for m in machines.values())
    total_production = sum(m.production for m in machines.values())
    total_rejects = sum(m.rejects for m in machines.values())
    total_expected = sum(
        max(m.runtime_minutes * m.expected_production_per_minute, 1.0)
        for m in machines.values()
    )

    availability = (
        (total_runtime / (total_runtime + total_downtime)) * 100
        if (total_runtime + total_downtime) > 0
        else 0.0
    )
    performance = (total_production / total_expected) * 100 if total_expected > 0 else 0.0
    quality = (
        ((total_production - total_rejects) / total_production) * 100
        if total_production > 0
        else 0.0
    )

    oee = (availability / 100.0) * (performance / 100.0) * (quality / 100.0) * 100.0
    trs = oee

    return {
        "availability": round(max(0.0, min(availability, 100.0)), 2),
        "performance": round(max(0.0, min(performance, 100.0)), 2),
        "quality": round(max(0.0, min(quality, 100.0)), 2),
        "oee": round(max(0.0, min(oee, 100.0)), 2),
        "trs": round(max(0.0, min(trs, 100.0)), 2),
    }


def load_machine_identifiers(api_url: str, limit: int = 4) -> List[str]:
    """
    Fetch machine references from API so MQTT machineId matches frontend DB identifiers.
    Falls back to M1..M4 if API is unavailable.
    """
    query = urllib.parse.urlencode({"include_current_state": "true", "limit": str(max(limit, 1))})
    url = f"{api_url}?{query}"

    try:
        with urllib.request.urlopen(url, timeout=4) as response:
            payload = response.read().decode("utf-8")
        data = json.loads(payload)
        if not isinstance(data, list):
            raise ValueError("Machines API did not return a list")

        references = []
        for item in data:
            ref = str((item or {}).get("reference", "")).strip()
            if ref:
                references.append(ref)
            if len(references) >= limit:
                break

        if references:
            print(f"Loaded machine references from API: {', '.join(references)}")
            return references

        print("Machines API returned no references. Using fallback IDs.")
        return MACHINE_IDS[:limit]
    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError) as error:
        print(f"Could not load machines from API ({error}). Using fallback IDs: {', '.join(MACHINE_IDS[:limit])}")
        return MACHINE_IDS[:limit]


def run_simulation(api_url: str) -> None:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="mes-simulator")
    client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
    client.loop_start()

    machine_identifiers = load_machine_identifiers(api_url=api_url, limit=4)
    machines = {mid: MachineSim(machine_id=mid) for mid in machine_identifiers}
    running = True

    def stop_handler(_sig, _frame):
        nonlocal running
        running = False
        print("\nStopping simulator...")

    signal.signal(signal.SIGINT, stop_handler)
    signal.signal(signal.SIGTERM, stop_handler)

    print("MES simulator started.")
    print(f"Broker: {BROKER_HOST}:{BROKER_PORT}")
    print(f"Publishing every {PUBLISH_INTERVAL_SECONDS}s for: {', '.join(machine_identifiers)}")

    while running:
        for machine in machines.values():
            machine.tick(PUBLISH_INTERVAL_SECONDS)
            payload = machine.to_payload()
            topic = MACHINE_TOPIC_TEMPLATE.format(id=machine.machine_id)
            client.publish(topic, json.dumps(payload), qos=0, retain=False)

            temp_warn = " ⚠ HIGH TEMP" if payload.get("warning") else ""
            print(
                f"[{datetime.now().strftime('%H:%M:%S')}] {topic} "
                f"state={payload['state']} runtime={payload['runtime_minutes']}m "
                f"downtime={payload['downtime_minutes']}m prod={payload['production']} "
                f"rej={payload['rejects']} temp={payload['temperature']}C{temp_warn}"
            )

        global_payload = compute_global_metrics(machines)
        client.publish(GLOBAL_TOPIC, json.dumps(global_payload), qos=0, retain=False)
        print(
            f"[{datetime.now().strftime('%H:%M:%S')}] {GLOBAL_TOPIC} "
            f"oee={global_payload['oee']} avail={global_payload['availability']} "
            f"perf={global_payload['performance']} qual={global_payload['quality']}"
        )

        time.sleep(PUBLISH_INTERVAL_SECONDS)

    client.loop_stop()
    client.disconnect()
    print("MES simulator stopped.")


def main() -> None:
    parser = argparse.ArgumentParser(description="MES MQTT realistic simulator")
    parser.add_argument(
        "--start",
        action="store_true",
        help="Start simulation loop (required to run).",
    )
    parser.add_argument(
        "--machines-api-url",
        default=DEFAULT_MACHINES_API_URL,
        help=f"Machines API URL used to fetch references (default: {DEFAULT_MACHINES_API_URL})",
    )
    args = parser.parse_args()

    if not args.start:
        print("Simulation is disabled. Use --start to run.")
        return

    run_simulation(api_url=args.machines_api_url)


if __name__ == "__main__":
    main()

