const WS_BASE_URL = import.meta.env.VITE_MAINTENANCE_WS_URL || "ws://127.0.0.1:8000/api/maintenance/ws";

const RECONNECT_DELAY_INIT = 2_000;
const RECONNECT_DELAY_MAX  = 30_000;

export function subscribeMaintenanceEvents({ onMessage, onStatusChange }) {
  let socket;
  let pingInterval;
  let reconnectTimer;
  let reconnectDelay = RECONNECT_DELAY_INIT;
  let destroyed = false;

  const connect = () => {
    if (destroyed) return;
    socket = new WebSocket(WS_BASE_URL);
    onStatusChange?.("connecting");

    socket.onopen = () => {
      reconnectDelay = RECONNECT_DELAY_INIT;
      onStatusChange?.("connected");
      pingInterval = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) socket.send("ping");
      }, 15_000);
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onMessage?.(parsed);
      } catch (_) {
        // message malformé — ignoré
      }
    };

    socket.onerror = () => {
      onStatusChange?.("error");
    };

    socket.onclose = () => {
      if (pingInterval) window.clearInterval(pingInterval);
      pingInterval = null;
      onStatusChange?.("disconnected");
      if (!destroyed) {
        reconnectTimer = window.setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_DELAY_MAX);
          connect();
        }, reconnectDelay);
      }
    };
  };

  connect();

  return () => {
    destroyed = true;
    if (pingInterval)   window.clearInterval(pingInterval);
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    if (socket && socket.readyState <= WebSocket.OPEN) socket.close();
  };
}
