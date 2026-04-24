const WS_BASE_URL = import.meta.env.VITE_MAINTENANCE_WS_URL || "ws://127.0.0.1:8000/api/maintenance/ws";

export function subscribeMaintenanceEvents({
  onMessage,
  onStatusChange,
}) {
  let socket;
  let pingInterval;

  const connect = () => {
    socket = new WebSocket(WS_BASE_URL);
    onStatusChange?.("connecting");

    socket.onopen = () => {
      onStatusChange?.("connected");
      pingInterval = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send("ping");
        }
      }, 15000);
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onMessage?.(parsed);
      } catch (_error) {
        // Ignore malformed websocket events.
      }
    };

    socket.onerror = () => {
      onStatusChange?.("error");
    };

    socket.onclose = () => {
      onStatusChange?.("disconnected");
    };
  };

  connect();

  return () => {
    if (pingInterval) window.clearInterval(pingInterval);
    if (socket && socket.readyState <= WebSocket.OPEN) {
      socket.close();
    }
  };
}
