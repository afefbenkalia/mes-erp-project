from __future__ import annotations

import argparse
import json
import random
import signal
import time
import urllib.request
from dataclasses import dataclass
from typing import Dict

import requests
import paho.mqtt.client as mqtt


BROKER_HOST = "localhost"
BROKER_PORT = 1883
GLOBAL_TOPIC = "mes/metrics/global"
MACHINE_TOPIC_TEMPLATE = "mes/machines/{id}/data"

PUBLISH_INTERVAL_SECONDS = 2
DEFAULT_MACHINES_API_URL = "http://127.0.0.1:8000/api/machines"


# 🧠 Machine simulation
@dataclass
class MachineSim:
    machine_id: str
    machine_type: str = "generic"
    state: str = "PAUSE"
    production: int = 0
    temperature: float = 70.0
    speed: int = 1000

    # ✅ نجيب state من backend (operator)
    def fetch_state(self):
        try:
            res = requests.get(
            f"http://127.0.0.1:8000/api/machines/{self.machine_id}/state",
            timeout=1
        )
            data = res.json()
            return data.get("state", "PAUSE")
        except:
            return "PAUSE"

    def update_behavior(self):
        if self.machine_type == "Injection":
            self.temperature = random.uniform(80, 120)
            self.speed = random.randint(500, 900)

        elif self.machine_type == "Nettoyeuse":
            self.temperature = random.uniform(30, 50)
            self.speed = random.randint(1000, 1500)

        elif self.machine_type == "Condenseur":
            self.temperature = random.uniform(20, 40)
            self.speed = random.randint(300, 600)

        elif self.machine_type == "Cardage":
            self.temperature = random.uniform(50, 70)
            self.speed = random.randint(800, 1200)

        elif self.machine_type == "Séchage":
            self.temperature = random.uniform(90, 130)
            self.speed = random.randint(400, 700)

        elif self.machine_type == "Bobinage":
            self.temperature = random.uniform(40, 60)
            self.speed = random.randint(900, 1400)

        else:
            self.temperature = random.uniform(60, 80)
            self.speed = random.randint(800, 1200)

    def tick(self):
        # ✅ state من operator
        self.state = self.fetch_state()

        if self.state == "MARCHE":
            self.production += random.randint(5, 20)

        self.update_behavior()

    def to_payload(self):
        return {
            "machine_reference": self.machine_id,
            "state": self.state,
            "temperature": round(self.temperature, 1),
            "speed": self.speed,
            "vibration": round(random.uniform(0.01, 0.05), 3),
            "production": self.production,
        }


# 🧠 load machines depuis API
def load_machines(api_url: str):
    try:
        with urllib.request.urlopen(api_url) as response:
            data = json.loads(response.read().decode())

        machines = {}

        for item in data:
            ref = item.get("reference")
            type_ = item.get("machine_type", "generic")

            if ref:
                machines[ref] = MachineSim(
                    machine_id=ref,
                    machine_type=type_
                )

        print(f"✅ Loaded {len(machines)} machines from DB")
        return machines

    except Exception as e:
        print("❌ API error:", e)
        return {}


# 🧠 global metrics
def compute_global(machines: Dict[str, MachineSim]):
    total_prod = sum(m.production for m in machines.values())

    return {
        "total_production": total_prod,
        "machines": len(machines)
    }


# 🚀 simulation loop
def run(api_url: str):
    client = mqtt.Client()
    client.connect(BROKER_HOST, BROKER_PORT)
    client.loop_start()

    machines = load_machines(api_url)

    running = True

    def stop(sig, frame):
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, stop)

    print("🚀 Simulation started...")

    while running:

        # 🔄 reload machines
        if random.random() < 0.05:
            machines.update(load_machines(api_url))

        for m in machines.values():
            m.tick()
            payload = m.to_payload()

            # 📡 MQTT
            topic = MACHINE_TOPIC_TEMPLATE.format(id=m.machine_id)
            client.publish(topic, json.dumps(payload))

            # 🗄️ API → DB
            try:
                requests.post(
                    "http://127.0.0.1:8000/api/machines/data",
                    json=payload,
                    timeout=1
                )
            except:
                pass

            print(f"{m.machine_id} | {m.machine_type} | {m.state} | prod={m.production}")

        global_payload = compute_global(machines)
        client.publish(GLOBAL_TOPIC, json.dumps(global_payload))

        time.sleep(PUBLISH_INTERVAL_SECONDS)

    client.loop_stop()
    client.disconnect()


# ▶️ main
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", action="store_true")
    args = parser.parse_args()

    if args.start:
        run(DEFAULT_MACHINES_API_URL)
    else:
        print("Use --start")


if __name__ == "__main__":
    main()