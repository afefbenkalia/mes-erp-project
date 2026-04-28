/**
 * telemetrySocket.js
 *
 * Drop-in replacement for mqttService.js + mqtt.js.
 *
 * Instead of connecting the browser directly to the MQTT broker over WebSocket
 * (which requires Mosquitto's WS listener on port 9001), this module connects
 * to the FastAPI backend WebSocket at /api/telemetry/stream.
 *
 * The backend enriches each MQTT payload with:
 *   - machineId   = machine_reference  (fixes the field-name mismatch)
 *   - runtime_minutes / downtime_minutes  (from machine_state_history)
 *   - _type: "machine" | "global" | "offline"
 *
 * Exported functions match the exact call signatures of the old services so
 * Machine.jsx and ProductionDashboard.jsx need only a one-line import swap.
 *
 * IoT-ready: when real PLCs replace the simulator they publish to the same
 * MQTT topics. The backend forwards enriched payloads here unchanged — zero
 * frontend or API contract changes required.
 */

const WS_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_TELEMETRY_WS_URL) ||
  "ws://127.0.0.1:8000/api/telemetry/stream";

const RECONNECT_DELAY_MS = 3_000;

// ── Core WebSocket connection ─────────────────────────────────────────────────

function createConnection({ onPayload, onStatusChange }) {
  let ws = null;
  let timer = null;
  let destroyed = false;

  function connect() {
    if (destroyed) return;

    onStatusChange?.("connecting");

    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      onStatusChange?.("connected");
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        onPayload?.(payload);
      } catch {
        // malformed JSON — skip silently
      }
    };

    ws.onerror = () => {
      onStatusChange?.("error");
      // onclose fires next and schedules reconnect
    };

    ws.onclose = () => {
      if (destroyed) return;
      onStatusChange?.("reconnecting");
      timer = setTimeout(connect, RECONNECT_DELAY_MS);
    };
  }

  connect();

  return function destroy() {
    destroyed = true;
    clearTimeout(timer);
    ws?.close();
  };
}


// ── Drop-in for mqttService.subscribeMachineRealtime ─────────────────────────
// Used by Machine.jsx — expects onConnectionChange("connected"|"disconnected"…)

export function subscribeMachineRealtime({ onMessage, onConnectionChange }) {
  return createConnection({
    onStatusChange: onConnectionChange,
    onPayload: (payload) => {
      if (payload._type === "machine") {
        onMessage?.(payload);
      }
    },
  });
}


// ── Drop-in for mqtt.subscribeDashboardMqtt ───────────────────────────────────
// Used by ProductionDashboard.jsx — expects capitalized "Connected"/"Disconnected"

export function subscribeDashboardMqtt({
  onMachineMessage,
  onGlobalMessage,
  onConnectionChange,
}) {
  function mapStatus(raw) {
    return raw === "connected" ? "Connected" : "Disconnected";
  }

  return createConnection({
    onStatusChange: (raw) => onConnectionChange?.(mapStatus(raw)),
    onPayload: (payload) => {
      if (payload._type === "global") {
        onGlobalMessage?.(payload);
      } else if (payload._type === "machine") {
        onMachineMessage?.(payload);
      }
    },
  });
}
