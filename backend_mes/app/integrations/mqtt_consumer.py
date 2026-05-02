"""
Backend MQTT consumer — subscribes to machine telemetry topics and:
  1. Updates the in-memory TelemetryCache (latest + aggregation buffer)
  2. Schedules a WebSocket broadcast on the main asyncio event loop

Runs in a dedicated daemon thread so it never blocks the ASGI server.
Real industrial devices and the simulator publish to the same topics;
no code change is required here when moving from simulation to production.
"""
import asyncio
import json
import logging
import threading
from typing import Awaitable, Callable

import paho.mqtt.client as mqtt

from .telemetry_cache import telemetry_cache

BROKER_HOST = "localhost"
BROKER_PORT = 1883
TOPICS = [
    ("mes/machines/+/data", 0),
    ("mes/metrics/global", 0),
]

logger = logging.getLogger(__name__)

# Injected at startup — avoids circular imports
_event_loop: asyncio.AbstractEventLoop | None = None
_on_message_async: Callable[[str, dict], Awaitable[None]] | None = None


class MQTTConsumer:
    def __init__(self) -> None:
        self._client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
        self._client.on_connect = self._on_connect
        self._client.on_message = self._on_message
        self._client.on_disconnect = self._on_disconnect 

    # ── paho callbacks (run in the MQTT thread) ────────────────────────────

    def _on_connect(self, client, userdata, flags, rc: int) -> None:
        if rc == 0:
            logger.info("[MQTT] Connected to broker %s:%s", BROKER_HOST, BROKER_PORT)
            for topic, qos in TOPICS:
                client.subscribe(topic, qos)
                logger.debug("[MQTT] Subscribed → %s", topic)
        else:
            logger.error("[MQTT] Connection refused, rc=%s", rc)

    def _on_disconnect(self, client, userdata, rc: int) -> None:
        if rc != 0:
            logger.warning("[MQTT] Unexpected disconnect, rc=%s — will reconnect", rc)

    def _on_message(self, client, userdata, msg: mqtt.MQTTMessage) -> None:
        try:
            payload: dict = json.loads(msg.payload.decode())
        except Exception:
            logger.warning("[MQTT] Non-JSON payload on %s", msg.topic)
            return

        # Update in-memory cache for machine telemetry
        machine_ref = payload.get("machine_reference")
        if machine_ref:
            telemetry_cache.update(machine_ref, payload)

        # Fan-out to WebSocket clients on the async event loop
        if _event_loop and _on_message_async:
            asyncio.run_coroutine_threadsafe(
                _on_message_async(msg.topic, payload), _event_loop
            )

    # ── lifecycle ─────────────────────────────────────────────────────────

    def start(
        self,
        loop: asyncio.AbstractEventLoop,
        on_message_async: Callable[[str, dict], Awaitable[None]],
    ) -> None:
        global _event_loop, _on_message_async
        _event_loop = loop
        _on_message_async = on_message_async

        thread = threading.Thread(target=self._run, daemon=True, name="mqtt-consumer")
        thread.start()
        logger.info("[MQTT] Consumer thread started")

    def _run(self) -> None:
        self._client.reconnect_delay_set(min_delay=1, max_delay=30)
        try:
            self._client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
            self._client.loop_forever()
        except Exception:
            logger.exception("[MQTT] Consumer loop terminated unexpectedly")


mqtt_consumer = MQTTConsumer()
