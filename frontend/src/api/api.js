import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Intercepteur pour ajouter le token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs
API.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ API Error:`, error.response?.status, error.response?.data);
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ============ Endpoints Machines ============

export const machineAPI = {
  // Machines
  getMachines: (params = {}) => 
    API.get("/api/machines", { params }),  // ← ajout /api
  
  getMachine: (id) => 
    API.get(`/api/machines/${id}`),  // ← ajout /api
  
  createMachine: (data) => 
    API.post("/api/machines", data),  // ← ajout /api
  
  updateMachine: (id, data) => 
    API.patch(`/api/machines/${id}`, data),  // ← ajout /api
  
  deleteMachine: (id) => 
    API.delete(`/api/machines/${id}`),  // ← ajout /api
  
  // État actuel
  getCurrentState: (machineId) => 
    API.get(`/api/machines/${machineId}/current-state`),  // ← ajout /api
  
  changeState: (machineId, data) => 
    API.post(`/api/machines/${machineId}/change-state`, data),  // ← ajout /api
  
  closeCurrentState: (machineId) => 
    API.post(`/api/machines/${machineId}/close-current-state`),  // ← ajout /api
  
  // Runtime / downtime pre-calculés depuis la DB (24h)
  getRuntimeStats: () => API.get("/api/machines/runtime-stats"),

  // Historique des états
  getStateHistory: (machineId, params = {}) =>
    API.get(`/api/machines/${machineId}/state-history`, { params }),  // ← ajout /api
  
  addStateHistory: (machineId, data) => 
    API.post(`/api/machines/${machineId}/state-history`, data),  // ← ajout /api
  
  updateStateHistory: (machineId, historyId, data) => 
    API.patch(`/api/machines/${machineId}/state-history/${historyId}`, data),  // ← ajout /api
};

export const dashboardAPI = {
  getProductionSummary: () => API.get("/api/dashboard/summary"),
  getMachineKpis: () => API.get("/api/dashboard/machine-kpis"),
  getProductionsList: () => API.get("/api/dashboard/productions"),
  getProductionLast24h: (productionId = null) => {
    const params = productionId ? { production_id: productionId } : {};
    return API.get("/api/dashboard/production-last-24h", { params });
  },
  getScrapRateByOf: (ofNumero) => {
    const params = ofNumero ? { of_numero: ofNumero } : {};
    return API.get("/api/dashboard/scrap-rate", { params });
  },
};

export const maintenanceAPI = {
  getMachines: () => API.get("/api/maintenance/machines"),
  getInterventions: () => API.get("/api/maintenance/interventions"),
  getHistory: () => API.get("/api/maintenance/history"),
  getPreventive: () => API.get("/api/maintenance/preventive"),
  takeOver: (machineId, data = {}) =>
    API.post(`/api/maintenance/machines/${machineId}/take-over`, data),
  markRepaired: (machineId, data) =>
    API.post(`/api/maintenance/machines/${machineId}/mark-repaired`, data),
  simulateError: (machineId) =>
    API.post(`/api/maintenance/machines/${machineId}/simulate-error`),
  createPreventive: (data) => API.post("/api/maintenance/preventive", data),
  updatePreventive: (preventiveId, data) =>
    API.patch(`/api/maintenance/preventive/${preventiveId}`, data),
  deletePreventive: (preventiveId) =>
    API.delete(`/api/maintenance/preventive/${preventiveId}`),
};

// ============ Endpoints Telemetry ============

export const telemetryAPI = {
  // REST snapshot of all live readings (enriched with runtime_minutes etc.)
  getCurrent: () => API.get("/api/telemetry/current"),

  // Aggregated history from PostgreSQL (resolution: 'minute' | 'hour' | 'day')
  getHistory: (machineId, params = {}) =>
    API.get(`/api/telemetry/${machineId}/history`, { params }),
};

export const reportsAPI = {
  getDaily:        (date)       => API.get(`/api/reports/daily?date=${date}`),
  getWeekly:       (week)       => API.get(`/api/reports/weekly?week=${week}`),
  getProductionOf: (from, to)   => API.get(`/api/reports/production?date_from=${from}&date_to=${to}`),
  getMaintenance:  (from, to)   => API.get(`/api/reports/maintenance?date_from=${from}&date_to=${to}`),
  getPerformance:  (from, to)   => API.get(`/api/reports/performance?date_from=${from}&date_to=${to}`),
  getTraceability: (from, to)   => API.get(`/api/reports/traceability?date_from=${from}&date_to=${to}`),
};

export const authAPI = {
  forgotPassword:        (email) => API.post("/auth/forgot-password", { email }),
  getNotifications:      ()      => API.get("/auth/notifications"),
  markNotificationsRead: ()      => API.post("/auth/notifications/read"),
  getOperators:          ()      => API.get("/auth/operators"),
};

export default API;