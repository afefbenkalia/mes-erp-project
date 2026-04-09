import mqtt from "mqtt";

const DEFAULT_TOPIC = "mes/machines/+/data";
const DEFAULT_URL = "ws://localhost:9001";

/**
 * Creates an MQTT client and subscribes to machine real-time updates.
 * Returns a cleanup function that closes the connection.
 */
export const subscribeMachineRealtime = ({
  onMessage,
  onConnectionChange,
  url = import.meta.env.VITE_MQTT_URL || DEFAULT_URL,
  topic = DEFAULT_TOPIC,
}) => {
  console.info("[MQTT][Machine] Connecting to", url);
  const client = mqtt.connect(url, {
    protocol: "ws",
    reconnectPeriod: 3000,
    connectTimeout: 10000,
  });

  client.on("connect", () => {
    console.info("[MQTT][Machine] Connected");
    onConnectionChange?.("connected");
    client.subscribe(topic, (err) => {
      if (err) {
        console.error("[MQTT][Machine] Subscribe failed:", topic, err.message);
        onConnectionChange?.("error");
        return;
      }
      console.info("[MQTT][Machine] Subscribed to", topic);
    });
  });

  client.on("reconnect", () => {
    console.warn("[MQTT][Machine] Reconnecting...");
    onConnectionChange?.("reconnecting");
  });
  client.on("offline", () => {
    console.warn("[MQTT][Machine] Offline");
    onConnectionChange?.("offline");
  });
  client.on("error", (error) => {
    console.error("[MQTT] machine stream error:", error?.message || error);
    onConnectionChange?.("error");
  });
  client.on("close", () => {
    console.warn("[MQTT][Machine] Connection closed");
    onConnectionChange?.("disconnected");
  });

  client.on("message", (receivedTopic, payload) => {
    try {
      const parsed = JSON.parse(payload.toString());
      console.debug("[MQTT][Machine] Message", receivedTopic, parsed);
      onMessage?.(parsed);
    } catch (error) {
      console.error(
        "[MQTT][Machine] JSON parse failed for payload:",
        payload?.toString?.(),
        error
      );
    }
  });

  return () => {
    if (client.connected) client.unsubscribe(topic);
    client.end(true);
  };
};

