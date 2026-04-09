import mqtt from "mqtt";

const DEFAULT_BROKER_URL = "ws://localhost:9001";
const ROOT_TOPIC = "mes/#";
const MACHINE_TOPIC_PATTERN = /^mes\/machines\/[^/]+\/data$/;
const GLOBAL_TOPIC = "mes/metrics/global";

export function subscribeDashboardMqtt({
  onMachineMessage,
  onGlobalMessage,
  onConnectionChange,
  brokerUrl = import.meta.env.VITE_MQTT_URL || DEFAULT_BROKER_URL,
}) {
  console.info("[MQTT][Dashboard] Connecting to", brokerUrl);
  const client = mqtt.connect(brokerUrl, {
    protocol: "ws",
    reconnectPeriod: 3000,
    connectTimeout: 10000,
  });

  client.on("connect", () => {
    console.info("[MQTT][Dashboard] Connected");
    onConnectionChange?.("Connected");
    client.subscribe(ROOT_TOPIC, (err) => {
      if (err) {
        console.error("[MQTT] subscribe error:", err.message);
        onConnectionChange?.("Disconnected");
        return;
      }
      console.info("[MQTT][Dashboard] Subscribed to", ROOT_TOPIC);
    });
  });

  client.on("reconnect", () => {
    console.warn("[MQTT][Dashboard] Reconnecting...");
    onConnectionChange?.("Disconnected");
  });
  client.on("offline", () => {
    console.warn("[MQTT][Dashboard] Offline");
    onConnectionChange?.("Disconnected");
  });
  client.on("close", () => {
    console.warn("[MQTT][Dashboard] Connection closed");
    onConnectionChange?.("Disconnected");
  });
  client.on("error", (error) => {
    console.error("[MQTT] connection error:", error?.message || error);
    onConnectionChange?.("Disconnected");
  });

  client.on("message", (topic, payload) => {
    try {
      const parsed = JSON.parse(payload.toString());
      console.debug("[MQTT][Dashboard] Message", topic, parsed);
      if (topic === GLOBAL_TOPIC) {
        onGlobalMessage?.(parsed);
        return;
      }
      if (MACHINE_TOPIC_PATTERN.test(topic)) {
        onMachineMessage?.(parsed);
      }
    } catch (error) {
      console.error(
        "[MQTT][Dashboard] JSON parse failed for topic",
        topic,
        payload?.toString?.(),
        error
      );
    }
  });

  return () => {
    if (client.connected) {
      client.unsubscribe(ROOT_TOPIC);
    }
    client.end(true);
  };
}

