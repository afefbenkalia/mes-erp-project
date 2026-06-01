import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock3,
  Edit3,
  Filter,
  Gauge,
  LayoutGrid,
  List,
  PlayCircle,
  Plus,
  Search,
  Settings,
  Timer,
  Trash2,
  Wrench,
  X,
  Activity,
  Zap,
  ShieldCheck,
  ClipboardList,
  BarChart3,
  ChevronRight,
  AlertOctagon,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

import { maintenanceAPI, machineAPI } from "../../api/api";
import { subscribeMaintenanceEvents } from "../../services/maintenanceSocket";
import { subscribeMachineRealtime } from "../../services/telemetrySocket";

/* ─────────────────────────── constants ──────────────────────────── */

const STATE_STYLES = {
  MARCHE:      "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/25",
  PAUSE:       "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  ERREUR:      "bg-red-500/10 text-red-700 ring-1 ring-red-500/25",
  MAINTENANCE: "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/25",
};

const STATE_DOT = {
  MARCHE:      "bg-emerald-500",
  PAUSE:       "bg-slate-400",
  ERREUR:      "bg-red-500",
  MAINTENANCE: "bg-amber-500",
};

const STATE_LABELS = {
  MARCHE:      "En marche",
  PAUSE:       "En pause",
  ERREUR:      "En erreur",
  MAINTENANCE: "En maintenance",
};

const PRIORITY_BORDER = {
  CRITIQUE: "border-l-red-500",
  HAUTE:    "border-l-amber-500",
  MOYENNE:  "border-l-slate-300",
};

const PRIORITY_BADGE = {
  CRITIQUE: "bg-red-50 text-red-700 ring-1 ring-red-200",
  HAUTE:    "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  MOYENNE:  "bg-slate-50 text-slate-600 ring-1 ring-slate-200",
};

const PREVENTIVE_STATUS_STYLES = {
  PLANIFIE:  "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  "EN COURS":"bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  TERMINE:   "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

const PREVENTIVE_STATUS_ICONS = {
  PLANIFIE:  Clock3,
  "EN COURS":PlayCircle,
  TERMINE:   CheckCircle2,
};

const PREVENTIVE_TOP_BAR = {
  PLANIFIE:  "bg-blue-500",
  "EN COURS":"bg-amber-500",
  TERMINE:   "bg-emerald-500",
};

/* ─────────────────────────── helpers ────────────────────────────── */

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR");
};

const formatDuration = (seconds) => {
  const safe = Number(seconds) || 0;
  const hours   = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs    = safe % 60;
  return `${hours}h ${minutes}m ${secs}s`;
};

const formatMinutes = (minutes) => {
  const safe  = Math.max(Number(minutes) || 0, 0);
  const hours = Math.floor(safe / 60);
  const mins  = safe % 60;
  return `${hours}h ${mins}m`;
};

const toDatetimeLocalValue = (isoString) => {
  if (!isoString) return "";
  const d     = new Date(isoString);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const normalizeKey  = (value) => String(value ?? "").trim().toUpperCase();
const normalizeText = (value) => (value || "").toString().trim().toLowerCase();
const isAfterDate     = (value, dateFrom) => {
  if (!value || !dateFrom) return true;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return true;
  const start = new Date(dateFrom);
  if (Number.isNaN(start.getTime())) return true;
  return target >= start;
};
const calculatePriorityRank = (p) => p === "CRITIQUE" ? 0 : p === "HAUTE" ? 1 : p === "MOYENNE" ? 2 : 3;

/* ─────────────────────────── sub-components ─────────────────────── */

const StateBadge = ({ state }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATE_STYLES[state] || "bg-slate-100 text-slate-600 ring-1 ring-slate-200"}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${STATE_DOT[state] || "bg-slate-400"} ${state === "MARCHE" ? "animate-pulse" : ""}`} />
    {STATE_LABELS[state] || state || "Inconnu"}
  </span>
);

const KpiCard = ({ title, value, icon: Icon, accent, sub }) => (
  <article className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm ${accent.border}`}>
    <div className={`absolute inset-x-0 top-0 h-0.5 ${accent.bar}`} />
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</p>
        <p className={`mt-2 text-3xl font-bold tabular-nums ${accent.text}`}>{value}</p>
        {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
      </div>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent.iconBg}`}>
        <Icon className={`h-5 w-5 ${accent.iconText}`} />
      </div>
    </div>
  </article>
);

const SectionHeader = ({ eyebrow, title, description, aside }) => (
  <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">{eyebrow}</p>
      <h2 className="mt-1.5 text-lg font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-1 max-w-xl text-sm text-slate-500">{description}</p>}
    </div>
    {aside && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{aside}</div>}
  </div>
);

const Pill = ({ children, color = "slate" }) => {
  const map = {
    slate:   "bg-slate-100 text-slate-600",
    rose:    "bg-rose-50 text-rose-700",
    amber:   "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    blue:    "bg-blue-50 text-blue-700",
    indigo:  "bg-indigo-50 text-indigo-700",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${map[color] || map.slate}`}>
      {children}
    </span>
  );
};

const EmptyState = ({ icon: Icon, title, description, colSpan }) => {
  const inner = (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-14">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
    </div>
  );
  if (colSpan) return <tr><td colSpan={colSpan}><div className="px-4 py-4">{inner}</div></td></tr>;
  return inner;
};

const FilterBar = ({ filters, onFilterChange, fields }) => (
  <div className="mb-5 flex flex-wrap items-center gap-2">
    <Filter className="h-3.5 w-3.5 shrink-0 text-slate-300" />
    {fields.map((field, idx) => {
      if (field.type === "search") return (
        <label key={idx} className="relative flex-1 min-w-[160px] max-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-300" />
          <input
            value={filters[field.name] || ""}
            onChange={(e) => onFilterChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2.5 text-xs text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
        </label>
      );
      if (field.type === "select") return (
        <select
          key={idx}
          value={filters[field.name] || "ALL"}
          onChange={(e) => onFilterChange(field.name, e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
        >
          {field.options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      );
      if (field.type === "date") return (
        <input
          key={idx}
          type="datetime-local"
          value={filters[field.name] || ""}
          onChange={(e) => onFilterChange(field.name, e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
        />
      );
      if (field.type === "text") return (
        <input
          key={idx}
          value={filters[field.name] || ""}
          onChange={(e) => onFilterChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          className="flex-1 min-w-[120px] max-w-[180px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
        />
      );
      return null;
    })}
  </div>
);

const TableHead = ({ cols }) => (
  <thead>
    <tr className="bg-slate-50/80">
      {cols.map((col, i) => (
        <th key={i} className="border-b border-slate-100 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 first:rounded-tl-xl last:rounded-tr-xl">
          {col}
        </th>
      ))}
    </tr>
  </thead>
);

/* ═══════════════════════ main component ════════════════════════════ */

export default function MaintenanceDashboard({ activeTab = "dashboard" }) {

  /* ── state ── */
  const [machines,           setMachines]           = useState([]);
  const [interventions,      setInterventions]      = useState([]);
  const [history,            setHistory]            = useState([]);
  const [preventive,         setPreventive]         = useState([]);
  const [actionByMachine,    setActionByMachine]    = useState({});
  const [dashboardFilters,   setDashboardFilters]   = useState({ query: "", status: "ALL", dateFrom: "" });
  const [interventionFilters,setInterventionFilters]= useState({ query: "", status: "ALL", dateFrom: "" });
  const [historyFilters,     setHistoryFilters]     = useState({ query: "", dateFrom: "" });
  const [preventiveFilters,  setPreventiveFilters]  = useState({ machine: "ALL", status: "ALL", trigger: "ALL", dateFrom: "" });
  const [wsStatus,           setWsStatus]           = useState("disconnected");
  const [loading,            setLoading]            = useState(true);
  const [runtimeStats,       setRuntimeStats]       = useState({});
  const [realtimeByMachineId,setRealtimeByMachineId]= useState({});
  const [machineTypeMap,     setMachineTypeMap]     = useState({});
  const [preventiveForm,     setPreventiveForm]     = useState({
    machine_id: "", maintenance_type: "", trigger_mode: "SCHEDULED", planned_date: "", runtime_threshold_minutes: "",
  });
  const [preventiveFormMode,  setPreventiveFormMode]  = useState("create");
  const [editingPreventiveId, setEditingPreventiveId] = useState(null);
  const [preventiveViewMode,  setPreventiveViewMode]  = useState("cards");
  const [tick, setTick] = useState(0);

  /* ── timer tick ── */
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  /* ── data loading ── */
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [machinesRes, interventionsRes, historyRes, preventiveRes] = await Promise.all([
        maintenanceAPI.getMachines(),
        maintenanceAPI.getInterventions(),
        maintenanceAPI.getHistory(),
        maintenanceAPI.getPreventive(),
      ]);
      setMachines(machinesRes.data || []);
      setInterventions(interventionsRes.data || []);
      setHistory(historyRes.data || []);
      setPreventive(preventiveRes.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Erreur de chargement maintenance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ── runtime stats + machine types (toutes les 60 s) ── */
  useEffect(() => {
    const load = async () => {
      try {
        const [rtRes, fullRes] = await Promise.all([
          machineAPI.getRuntimeStats(),
          machineAPI.getMachines({ include_current_state: false }),
        ]);
        setRuntimeStats(rtRes.data || {});
        const map = {};
        (fullRes.data || []).forEach((m) => { map[m.id] = m.machine_type || "—"; });
        setMachineTypeMap(map);
      } catch { /* silent */ }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  /* ── MQTT temps réel (température, pression, vitesse) ── */
  useEffect(() => {
    const unsubscribe = subscribeMachineRealtime({
      onConnectionChange: () => {},
      onMessage: (payload) => {
        if (!payload?.machineId) return;
        const key = normalizeKey(payload.machineId);
        setRealtimeByMachineId((prev) => ({
          ...prev,
          [key]: { ...payload, machineId: key, lastUpdate: new Date().toISOString() },
        }));
      },
    });
    return unsubscribe;
  }, []);

  /* ── websocket ── */
  useEffect(() => {
    const unsubscribe = subscribeMaintenanceEvents({
      onStatusChange: setWsStatus,
      onMessage: (message) => {
        if (!message || !message.event) return;
        if (message.event === "notification") toast(message.payload?.message || "Notification maintenance");
        if (["machine_update", "intervention_completed", "notification"].includes(message.event)) loadAll();
      },
    });
    return unsubscribe;
  }, [loadAll]);

  /* ── derived data ── */
  const kpis = useMemo(() => ({
    marche:            machines.filter((m) => m.state === "MARCHE").length,
    erreur:            machines.filter((m) => m.state === "ERREUR").length,
    maintenanceCount:  machines.filter((m) => m.state === "MAINTENANCE").length,
    pause:             machines.filter((m) => m.state === "PAUSE").length,
    total:             machines.length,
    interventionsOpen: interventions.length,
    preventiveOpen:    preventive.length,
  }), [interventions.length, machines, preventive.length]);

  const machineById = useMemo(() => {
    const map = {};
    machines.forEach((m) => { map[m.machine_id] = m; });
    return map;
  }, [machines]);

  const interventionByMachine = useMemo(() => {
    const map = {};
    interventions.forEach((item) => { map[item.machine_id] = item; });
    return map;
  }, [interventions]);

  const updateDashboardFilter    = (k, v) => setDashboardFilters   ((p) => ({ ...p, [k]: v }));
  const updateInterventionFilter = (k, v) => setInterventionFilters((p) => ({ ...p, [k]: v }));
  const updateHistoryFilter      = (k, v) => setHistoryFilters     ((p) => ({ ...p, [k]: v }));
  const updatePreventiveFilter   = (k, v) => setPreventiveFilters  ((p) => ({ ...p, [k]: v }));

  const dashboardMachines = useMemo(() => machines.filter((m) => {
    const text     = `${m.machine_reference} ${m.machine_name}`;
    const passQ    = !normalizeText(dashboardFilters.query) || normalizeText(text).includes(normalizeText(dashboardFilters.query));
    const passS    = dashboardFilters.status === "ALL" || m.state === dashboardFilters.status;
    const passD    = isAfterDate(m.last_update, dashboardFilters.dateFrom);
    return passQ && passS && passD;
  }), [dashboardFilters, machines]);

  const interventionCards = useMemo(() => {
    const now = Date.now();
    return machines
      .map((machine) => {
        const intervention = interventionByMachine[machine.machine_id];
        const ageMinutes   = intervention?.start_time
          ? Math.max(Math.floor((now - new Date(intervention.start_time).getTime()) / 60000), 0)
          : null;
        let priority = machine.state === "ERREUR" ? "CRITIQUE" : machine.state === "MAINTENANCE" ? "HAUTE" : "MOYENNE";
        if (ageMinutes !== null && ageMinutes >= 60) priority = "CRITIQUE";
        else if (ageMinutes !== null && ageMinutes >= 30) priority = "HAUTE";
        const machineText = `${machine.machine_reference} ${machine.machine_name}`;
        const passQ = !normalizeText(interventionFilters.query) || normalizeText(machineText).includes(normalizeText(interventionFilters.query));
        const passS = interventionFilters.status === "ALL" || machine.state === interventionFilters.status;
        const dateTarget = intervention?.start_time || machine.last_update;
        const passD = isAfterDate(dateTarget, interventionFilters.dateFrom);
        return { machine, intervention, ageMinutes, priority, visible: passQ && passS && passD };
      })
      .filter((i) => i.visible)
      .sort((a, b) => {
        const sp = { ERREUR: 0, MAINTENANCE: 1, PAUSE: 2, MARCHE: 3 };
        const first = (sp[a.machine.state] ?? 9) - (sp[b.machine.state] ?? 9);
        if (first !== 0) return first;
        return calculatePriorityRank(a.priority) - calculatePriorityRank(b.priority);
      });
  }, [interventionByMachine, interventionFilters, machines, tick]);

  const historyRows = useMemo(() => history
    .map((item) => {
      const machine     = machineById[item.machine_id];
      const machineLabel = machine ? `${machine.machine_reference} – ${machine.machine_name}` : `Machine ${item.machine_id}`;
      const dur = Number(item.duration_seconds) || 0;
      let priority = "MOYENNE";
      if (dur >= 7200) priority = "CRITIQUE";
      else if (dur >= 3600) priority = "HAUTE";
      const passQ = !normalizeText(historyFilters.query) || normalizeText(machineLabel).includes(normalizeText(historyFilters.query)) || normalizeText(item.action_effectuee).includes(normalizeText(historyFilters.query));
      const passD = isAfterDate(item.date, historyFilters.dateFrom);
      return { ...item, priority, machineLabel, visible: passQ && passD };
    })
    .filter((i) => i.visible),
  [history, historyFilters, machineById]);

  const recentHistory = useMemo(() =>
    [...historyRows].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5),
  [historyRows]);

  const preventiveRows = useMemo(() => {
    const now = Date.now();
    return preventive
      .map((item) => {
        const machine     = machineById[item.machine_id];
        const plannedDate = item.planned_date ? new Date(item.planned_date).getTime() : null;
        let priority = "MOYENNE";
        if (item.status === "PLANIFIE" && plannedDate && plannedDate < now) priority = "CRITIQUE";
        else if (item.status === "PLANIFIE" && plannedDate && plannedDate <= now + 24 * 3600 * 1000) priority = "HAUTE";
        const passMachine  = preventiveFilters.machine === "ALL" || String(item.machine_id) === preventiveFilters.machine;
        const passStatus   = preventiveFilters.status  === "ALL" || item.status === preventiveFilters.status;
        const passTrigger  = preventiveFilters.trigger  === "ALL" || item.trigger_mode === preventiveFilters.trigger;
        const passDate     = isAfterDate(item.planned_date, preventiveFilters.dateFrom);
        return {
          ...item,
          priority,
          machineLabel: machine ? `${machine.machine_reference} — ${machine.machine_name}` : `Machine #${item.machine_id}`,
          visible: passMachine && passStatus && passTrigger && passDate,
        };
      })
      .filter((i) => i.visible);
  }, [machineById, preventive, preventiveFilters]);

  const machineCards = useMemo(() =>
    [...interventionCards].sort((a, b) => {
      const p = { ERREUR: 0, MAINTENANCE: 1, PAUSE: 2, MARCHE: 3 };
      return (p[a.machine.state] ?? 99) - (p[b.machine.state] ?? 99);
    }),
  [interventionCards]);

  /* ── handlers ── */
  const handleTakeOver = async (machineId) => {
    try {
      await maintenanceAPI.takeOver(machineId, { technician: "Responsable de Maintenance" });
      toast.success("Machine prise en charge");
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Impossible de prendre en charge");
    }
  };

  const handleMarkRepaired = async (machineId) => {
    const action = (actionByMachine[machineId] || "").trim();
    if (!action) { toast.error("Action effectuée obligatoire"); return; }
    try {
      await maintenanceAPI.markRepaired(machineId, { technician: "Responsable de Maintenance", action_effectuee: action });
      setActionByMachine((prev) => ({ ...prev, [machineId]: "" }));
      toast.success("Machine marquée réparée");
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Impossible de clôturer l'intervention");
    }
  };

  const handleCreatePreventive = async () => {
    if (!preventiveForm.machine_id || !preventiveForm.maintenance_type.trim()) {
      toast.error("Machine et type de maintenance requis"); return;
    }
    if (preventiveForm.trigger_mode === "SCHEDULED" && !preventiveForm.planned_date) {
      toast.error("Date planifiée requise"); return;
    }
    if (preventiveForm.trigger_mode === "RUNTIME" && (!preventiveForm.runtime_threshold_minutes || Number(preventiveForm.runtime_threshold_minutes) <= 0)) {
      toast.error("Seuil runtime (minutes) requis"); return;
    }
    try {
      const payload = {
        machine_id:                Number(preventiveForm.machine_id),
        maintenance_type:          preventiveForm.maintenance_type.trim(),
        trigger_mode:              preventiveForm.trigger_mode,
        planned_date:              preventiveForm.trigger_mode === "SCHEDULED" ? new Date(preventiveForm.planned_date).toISOString() : null,
        runtime_threshold_minutes: preventiveForm.trigger_mode === "RUNTIME"    ? Number(preventiveForm.runtime_threshold_minutes) : null,
        status: "PLANIFIE",
      };
      if (preventiveFormMode === "edit" && editingPreventiveId) {
        await maintenanceAPI.updatePreventive(editingPreventiveId, {
          maintenance_type: payload.maintenance_type, trigger_mode: payload.trigger_mode,
          planned_date: payload.planned_date, runtime_threshold_minutes: payload.runtime_threshold_minutes, status: payload.status,
        });
        toast.success("Maintenance préventive modifiée");
      } else {
        await maintenanceAPI.createPreventive(payload);
        toast.success("Maintenance préventive créée");
      }
      setPreventiveFormMode("create");
      setEditingPreventiveId(null);
      setPreventiveForm({ machine_id: "", maintenance_type: "", trigger_mode: "SCHEDULED", planned_date: "", runtime_threshold_minutes: "" });
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Impossible d'enregistrer la maintenance préventive");
    }
  };

  const handleEditPreventive = (item) => {
    setPreventiveFormMode("edit");
    setEditingPreventiveId(item.id);
    setPreventiveForm({
      machine_id:                String(item.machine_id),
      maintenance_type:          item.maintenance_type || "",
      trigger_mode:              item.trigger_mode || "SCHEDULED",
      planned_date:              toDatetimeLocalValue(item.planned_date),
      runtime_threshold_minutes: item.runtime_threshold_minutes ? String(item.runtime_threshold_minutes) : "",
    });
  };

  const handleCancelEditPreventive = () => {
    setPreventiveFormMode("create");
    setEditingPreventiveId(null);
    setPreventiveForm({ machine_id: "", maintenance_type: "", trigger_mode: "SCHEDULED", planned_date: "", runtime_threshold_minutes: "" });
  };

  const handleDeletePreventive = async (item) => {
    if (!window.confirm(`Supprimer la maintenance préventive « ${item.maintenance_type} » ?`)) return;
    try {
      await maintenanceAPI.deletePreventive(item.id);
      if (editingPreventiveId === item.id) handleCancelEditPreventive();
      toast.success("Maintenance préventive supprimée");
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Impossible de supprimer");
    }
  };

  /* ════════════════════════ renders ══════════════════════════════════ */

  /* ── Dashboard ── */
  const renderDashboard = () => (
    <div className="space-y-6">

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard
          title="En marche" value={kpis.marche}
          icon={Activity}
          accent={{ bar: "bg-emerald-500", border: "border-slate-100", text: "text-emerald-600", iconBg: "bg-emerald-50", iconText: "text-emerald-600" }}
          sub={`sur ${kpis.total} machines`}
        />
        <KpiCard
          title="En erreur" value={kpis.erreur}
          icon={AlertOctagon}
          accent={{ bar: "bg-red-500", border: "border-slate-100", text: kpis.erreur > 0 ? "text-red-600" : "text-slate-800", iconBg: "bg-red-50", iconText: "text-red-600" }}
          sub="intervention requise"
        />
        <KpiCard
          title="En maintenance" value={kpis.maintenanceCount}
          icon={Wrench}
          accent={{ bar: "bg-amber-500", border: "border-slate-100", text: "text-amber-600", iconBg: "bg-amber-50", iconText: "text-amber-600" }}
          sub="en cours de traitement"
        />
        <KpiCard
          title="En pause" value={kpis.pause}
          icon={Clock3}
          accent={{ bar: "bg-slate-400", border: "border-slate-100", text: "text-slate-600", iconBg: "bg-slate-100", iconText: "text-slate-500" }}
          sub="production suspendue"
        />
        <KpiCard
          title="Interventions ouvertes" value={kpis.interventionsOpen}
          icon={ClipboardList}
          accent={{ bar: "bg-blue-500", border: "border-slate-100", text: "text-blue-600", iconBg: "bg-blue-50", iconText: "text-blue-600" }}
          sub="tickets actifs"
        />
      </section>

      {/* Machine table — détaillée */}
      {(() => {
        const getRT = (m) => {
          const keys = [
            normalizeKey(m.machine_reference),
            normalizeKey(m.machine_id),
            normalizeKey(m.machine_name),
          ];
          return Object.values(realtimeByMachineId).find(
            (rt) => keys.includes(normalizeKey(rt?.machineId))
          ) || null;
        };

        const fmtRuntime = (mins) => {
          const n = Number(mins);
          if (!Number.isFinite(n) || n < 0) return "—";
          const t = Math.round(n);
          const h = Math.floor(t / 60);
          const m = t % 60;
          return h > 0 ? `${h}h ${m}min` : `${m} min`;
        };

        const fmtSensor = (val, suffix = "") => {
          if (val === null || val === undefined || val === "") return "—";
          const n = Number(val);
          return Number.isFinite(n) ? `${n}${suffix}` : "—";
        };

        return (
          <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="px-5 py-4">
              <SectionHeader
                eyebrow="Supervision temps réel"
                title="État des machines"
                description="Vue détaillée — états, temps de fonctionnement et capteurs en temps réel."
                aside={
                  <>
                    <Pill color="slate">{kpis.total} machines</Pill>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${wsStatus === "connected" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {wsStatus === "connected"
                        ? <><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /><Wifi className="h-3 w-3" /> Temps réel</>
                        : <><WifiOff className="h-3 w-3" /> Déconnecté</>}
                    </span>
                    <span className="text-xs text-slate-400">{dashboardMachines.length}/{machines.length}</span>
                  </>
                }
              />
            </div>

            <div className="px-5 pb-2">
              <FilterBar
                filters={dashboardFilters}
                onFilterChange={updateDashboardFilter}
                fields={[
                  { type: "search", name: "query", placeholder: "Référence ou nom…" },
                  { type: "select", name: "status", options: [
                    { value: "ALL",         label: "Tous les statuts" },
                    { value: "MARCHE",      label: "En marche" },
                    { value: "ERREUR",      label: "En erreur" },
                    { value: "MAINTENANCE", label: "En maintenance" },
                    { value: "PAUSE",       label: "En pause" },
                  ]},
                ]}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="bg-slate-50/80">
                    {["Nom", "Référence", "Type", "État",
                      "Tps de marche", "Tps d'arrêt",
                      "Température", "Pression", "Vitesse"].map((col) => (
                      <th key={col}
                          className="border-b border-slate-100 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 first:rounded-tl-xl last:rounded-tr-xl whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dashboardMachines.map((m, i) => {
                    const rt      = getRT(m);
                    const stats   = runtimeStats[m.machine_id] ?? runtimeStats[String(m.machine_id)];
                    const type    = machineTypeMap[m.machine_id] || "—";

                    return (
                      <tr key={m.machine_id}
                          className={`transition hover:bg-slate-50/80 ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>

                        {/* Nom */}
                        <td className="border-b border-slate-50 px-4 py-3.5">
                          <p className="font-semibold text-slate-800 whitespace-nowrap">
                            {m.machine_name || "—"}
                          </p>
                        </td>

                        {/* Référence */}
                        <td className="border-b border-slate-50 px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className={`h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-[10px] font-bold ${STATE_STYLES[m.state] || "bg-slate-100 text-slate-600"}`}>
                              {(m.machine_reference || "??").slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                              {m.machine_reference}
                            </span>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="border-b border-slate-50 px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                          {type}
                        </td>

                        {/* État */}
                        <td className="border-b border-slate-50 px-4 py-3.5">
                          <StateBadge state={m.state} />
                        </td>

                        {/* Temps de marche */}
                        <td className="border-b border-slate-50 px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            {fmtRuntime(stats?.runtime_minutes)}
                          </span>
                        </td>

                        {/* Temps d'arrêt */}
                        <td className="border-b border-slate-50 px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                            {fmtRuntime(stats?.downtime_minutes)}
                          </span>
                        </td>

                        {/* Température */}
                        <td className="border-b border-slate-50 px-4 py-3.5 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                          {fmtSensor(rt?.temperature, " °C")}
                        </td>

                        {/* Pression */}
                        <td className="border-b border-slate-50 px-4 py-3.5 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                          {fmtSensor(rt?.pressure, " bar")}
                        </td>

                        {/* Vitesse */}
                        <td className="border-b border-slate-50 px-4 py-3.5 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                          {fmtSensor(rt?.speed)}
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && dashboardMachines.length === 0 && (
                    <EmptyState colSpan={9} icon={BarChart3} title="Aucune machine ne correspond" description="Ajustez les filtres pour afficher des résultats." />
                  )}
                </tbody>
              </table>
            </div>
          </section>
        );
      })()}

      {/* Recent activity */}
      <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="px-5 py-4">
          <SectionHeader
            eyebrow="Activité récente"
            title="Dernières interventions clôturées"
            description="Les 5 dernières réparations avec durée et technicien."
          />
        </div>
        <div className="px-5 pb-5">
          {recentHistory.length > 0 ? (
            <div className="space-y-2">
              {recentHistory.map((item, i) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/40 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.machineLabel}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        <span className="font-medium text-slate-600">{item.technician}</span>
                        <ChevronRight className="inline h-3 w-3 mx-0.5 text-slate-300" />
                        {item.action_effectuee}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      <Timer className="h-3 w-3" />
                      {formatDuration(item.duration_seconds)}
                    </span>
                    <span className="text-xs text-slate-400">
                      <Calendar className="inline h-3 w-3 mr-1" />
                      {formatDate(item.date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Clock3} title="Aucune intervention terminée" description="L'historique s'affichera après la première clôture." />
          )}
        </div>
      </section>
    </div>
  );

  /* ── Interventions ── */
  const renderInterventions = () => (
    <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="px-5 py-4">
        <SectionHeader
          eyebrow="Gestion des incidents"
          title="Machines à traiter"
          description="Les machines en erreur sont affichées en priorité, suivies des machines en cours de maintenance."
          aside={
            <>
              <Pill color="rose">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                {kpis.erreur} en erreur
              </Pill>
              <Pill color="amber">{kpis.interventionsOpen} ouvertes</Pill>
            </>
          }
        />
      </div>

      <div className="px-5 pb-2">
        <FilterBar
          filters={interventionFilters}
          onFilterChange={updateInterventionFilter}
          fields={[
            { type: "search", name: "query", placeholder: "Machine..." },
            { type: "select", name: "status", options: [
              { value: "ALL",         label: "Tous les statuts" },
              { value: "ERREUR",      label: "En erreur" },
              { value: "MAINTENANCE", label: "En maintenance" },
              { value: "MARCHE",      label: "En marche" },
              { value: "PAUSE",       label: "En pause" },
            ]},
            { type: "date", name: "dateFrom" },
          ]}
        />
      </div>

      <div className="space-y-3 px-5 pb-5">
        {machineCards.map(({ machine, intervention, ageMinutes, priority }) => {
          const isError       = machine.state === "ERREUR";
          const isMaintenance = machine.state === "MAINTENANCE";
          const actionValue   = actionByMachine[machine.machine_id] || "";

          return (
            <article
              key={machine.machine_id}
              className={`overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md border-l-4 ${PRIORITY_BORDER[priority] || "border-l-slate-200"}`}
            >
              <div className="p-4">
                {/* header row */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${isError ? "bg-red-50 text-red-700" : isMaintenance ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-600"}`}>
                      {machine.machine_reference.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{machine.machine_reference}</p>
                      <p className="text-xs text-slate-400">{machine.machine_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${PRIORITY_BADGE[priority]}`}>
                      {priority}
                    </span>
                    <StateBadge state={machine.state} />
                  </div>
                </div>

                {/* info row */}
                <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3" />
                    MàJ {formatDate(machine.last_update)}
                  </span>
                  {intervention?.start_time && (
                    <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                      <Timer className="h-3 w-3 text-amber-500" />
                      Ouvert depuis {formatMinutes(ageMinutes || 0)}
                    </span>
                  )}
                </div>

                {/* alert banners */}
                {isError && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Intervention requise — la machine peut être prise en charge immédiatement.
                  </div>
                )}
                {isMaintenance && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    En cours de maintenance — renseignez l'action effectuée pour clôturer.
                  </div>
                )}

                {/* action area */}
                {isError && (
                  <button
                    type="button"
                    onClick={() => handleTakeOver(machine.machine_id)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1a2c4e] px-4 py-2.5 text-sm font-semibold text-white active:scale-[0.99]"
                  >
                    <Zap className="h-4 w-4" />
                    Prendre en charge
                  </button>
                )}
                {isMaintenance && (
                  <div className="flex gap-2">
                    <input
                      value={actionValue}
                      onChange={(e) => setActionByMachine((prev) => ({ ...prev, [machine.machine_id]: e.target.value }))}
                      placeholder="Décrivez l'action effectuée…"
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleMarkRepaired(machine.machine_id)}
                      disabled={!actionValue.trim()}
                      className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Clôturer
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}

        {!loading && machineCards.length === 0 && (
          <EmptyState icon={ShieldCheck} title="Aucune intervention à traiter" description="Aucune machine ne correspond aux filtres sélectionnés." />
        )}
      </div>
    </section>
  );

  /* ── History ── */
  const renderHistory = () => (
    <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* header */}
      <div className="px-5 py-4">
        <SectionHeader
          eyebrow="Traçabilité"
          title="Historique des réparations"
          description="Toutes les interventions clôturées avec durée et action réalisée."
          aside={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              <ClipboardList className="h-3.5 w-3.5" />
              {historyRows.length} / {history.length} enregistrements
            </span>
          }
        />
      </div>

      {/* filters */}
      <div className="border-b border-slate-100 px-5 pb-4">
        <FilterBar
          filters={historyFilters}
          onFilterChange={updateHistoryFilter}
          fields={[
            { type: "search", name: "query",    placeholder: "Machine ou action…" },
            { type: "date",   name: "dateFrom" },
          ]}
        />
      </div>

      {/* list */}
      <div className="divide-y divide-slate-50 px-5 pb-5">
        {historyRows.length > 0 ? historyRows.map((item) => (
          <div key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">

            {/* left — machine + action */}
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                item.priority === "CRITIQUE" ? "bg-red-50 text-red-600"
                : item.priority === "HAUTE"  ? "bg-amber-50 text-amber-600"
                : "bg-emerald-50 text-emerald-600"
              }`}>
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{item.machineLabel}</p>
                <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{item.action_effectuee}</p>
              </div>
            </div>

            {/* right — duration + date */}
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-6">
              <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${PRIORITY_BADGE[item.priority]}`}>
                <Timer className="h-3 w-3" />
                {formatDuration(item.duration_seconds)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-slate-500 ring-1 ring-slate-100">
                <Calendar className="h-3 w-3 text-slate-300" />
                {formatDate(item.date)}
              </span>
            </div>

          </div>
        )) : (
          !loading && (
            <div className="pt-4">
              <EmptyState icon={ClipboardList} title="Aucun historique disponible" description="Les interventions clôturées apparaîtront ici." />
            </div>
          )
        )}
      </div>
    </section>
  );

  /* ── Preventive ── */
  const renderPreventive = () => (
    <div className="space-y-6">

      {/* stat pills */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5">
          <Calendar className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-semibold text-blue-700">{preventiveRows.length} planifiées</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5">
          <PlayCircle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-amber-700">
            {preventive.filter((p) => p.status === "EN COURS").length} en cours
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-semibold text-emerald-700">
            {preventive.filter((p) => p.status === "TERMINE").length} terminées
          </span>
        </div>
      </div>

      {/* form panel */}
      <div className={`overflow-hidden rounded-2xl border shadow-sm ${preventiveFormMode === "edit" ? "border-amber-200 bg-amber-50/30" : "border-slate-100 bg-white"}`}>
        {/* form header */}
        <div className={`flex items-center justify-between border-b px-5 py-3.5 ${preventiveFormMode === "edit" ? "border-amber-100 bg-amber-50" : "border-slate-100 bg-slate-50/50"}`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${preventiveFormMode === "edit" ? "bg-amber-100" : "bg-blue-100"}`}>
              {preventiveFormMode === "edit"
                ? <Edit3 className="h-4 w-4 text-amber-600" />
                : <Plus className="h-4 w-4 text-blue-600" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {preventiveFormMode === "edit" ? "Modifier la maintenance" : "Nouvelle maintenance préventive"}
              </p>
              <p className="text-xs text-slate-400">
                {preventiveFormMode === "edit" ? "Ajustez les paramètres" : "Planifiez une opération"}
              </p>
            </div>
          </div>
          {preventiveFormMode === "edit" && (
            <button
              type="button"
              onClick={handleCancelEditPreventive}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" /> Annuler
            </button>
          )}
        </div>

        {/* form body */}
        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Machine */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Machine</label>
              <select
                value={preventiveForm.machine_id}
                onChange={(e) => setPreventiveForm((p) => ({ ...p, machine_id: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
              >
                <option value="">Sélectionner…</option>
                {machines.map((m) => (
                  <option key={m.machine_id} value={m.machine_id}>{m.machine_reference}</option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Type de maintenance</label>
              <input
                value={preventiveForm.maintenance_type}
                onChange={(e) => setPreventiveForm((p) => ({ ...p, maintenance_type: e.target.value }))}
                placeholder="Ex: Vidange, Révision…"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
              />
            </div>

            {/* Mode */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Déclenchement</label>
              <select
                value={preventiveForm.trigger_mode}
                onChange={(e) => setPreventiveForm((p) => ({ ...p, trigger_mode: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
              >
                <option value="SCHEDULED">Planifié (date)</option>
                <option value="RUNTIME">Basé runtime (heures)</option>
              </select>
            </div>

            {/* Date / threshold */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {preventiveForm.trigger_mode === "SCHEDULED" ? "Date planifiée" : "Seuil (minutes)"}
              </label>
              {preventiveForm.trigger_mode === "SCHEDULED" ? (
                <input
                  type="datetime-local"
                  value={preventiveForm.planned_date}
                  onChange={(e) => setPreventiveForm((p) => ({ ...p, planned_date: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                />
              ) : (
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={preventiveForm.runtime_threshold_minutes}
                    onChange={(e) => setPreventiveForm((p) => ({ ...p, runtime_threshold_minutes: e.target.value }))}
                    placeholder="Ex: 1440"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  />
                  <Gauge className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-300" />
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleCreatePreventive}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.99] ${
                  preventiveFormMode === "edit"
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {preventiveFormMode === "edit"
                  ? <><Edit3 className="h-4 w-4" /> Modifier</>
                  : <><Plus className="h-4 w-4" /> Ajouter</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* filter + view toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <FilterBar
            filters={preventiveFilters}
            onFilterChange={updatePreventiveFilter}
            fields={[
              { type: "select", name: "machine", options: [
                { value: "ALL", label: "Toutes les machines" },
                ...machines.map((m) => ({ value: String(m.machine_id), label: m.machine_reference })),
              ]},
              { type: "select", name: "status", options: [
                { value: "ALL",       label: "Tous les statuts" },
                { value: "PLANIFIE",  label: "Planifié" },
                { value: "EN COURS",  label: "En cours" },
                { value: "TERMINE",   label: "Terminé" },
              ]},
              { type: "select", name: "trigger", options: [
                { value: "ALL",       label: "Type déclenchement" },
                { value: "SCHEDULED", label: "Planifié" },
                { value: "RUNTIME",   label: "Basé runtime" },
              ]},
              { type: "date", name: "dateFrom" },
            ]}
          />
        </div>
        <div className="mb-5 ml-auto flex shrink-0 items-center gap-2">
          <span className="text-xs text-slate-400">{preventiveRows.length} résultat{preventiveRows.length !== 1 ? "s" : ""}</span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setPreventiveViewMode("cards")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${preventiveViewMode === "cards" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Cartes
            </button>
            <button
              type="button"
              onClick={() => setPreventiveViewMode("table")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${preventiveViewMode === "table" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <List className="h-3.5 w-3.5" /> Tableau
            </button>
          </div>
        </div>
      </div>

      {/* cards view */}
      {preventiveViewMode === "cards" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {preventiveRows.map((item) => {
            const StatusIcon = PREVENTIVE_STATUS_ICONS[item.status] || Clock3;
            return (
              <article key={item.id} className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md">
                <div className={`absolute inset-x-0 top-0 h-1 ${PREVENTIVE_TOP_BAR[item.status] || "bg-slate-300"}`} />

                <div className="p-5 pt-6">
                  {/* top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          item.status === "TERMINE" ? "bg-emerald-50" : item.status === "EN COURS" ? "bg-amber-50" : "bg-blue-50"
                        }`}>
                          <StatusIcon className={`h-4 w-4 ${
                            item.status === "TERMINE" ? "text-emerald-600" : item.status === "EN COURS" ? "text-amber-600" : "text-blue-600"
                          }`} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{item.machineLabel}</p>
                          <p className="truncate text-xs text-slate-400">{item.maintenance_type}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${PREVENTIVE_STATUS_STYLES[item.status] || "bg-slate-100 text-slate-600 ring-1 ring-slate-200"}`}>
                        {item.status}
                      </span>
                      {item.priority !== "MOYENNE" && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${PRIORITY_BADGE[item.priority]}`}>
                          {item.priority}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* details */}
                  <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Settings className="h-3.5 w-3.5 text-slate-300" />
                      <span>Mode : <span className="font-medium text-slate-600">{item.trigger_mode === "RUNTIME" ? "Basé runtime" : "Planifié"}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.trigger_mode === "RUNTIME" ? (
                        <><Gauge className="h-3.5 w-3.5 text-slate-300" /><span>Seuil : <span className="font-medium text-slate-600">{item.runtime_threshold_minutes ?? "—"} min</span></span></>
                      ) : (
                        <><Calendar className="h-3.5 w-3.5 text-slate-300" /><span>Planifié le : <span className="font-medium text-slate-600">{formatDate(item.planned_date)}</span></span></>
                      )}
                    </div>
                  </div>

                  {/* actions */}
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditPreventive(item)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePreventive(item)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Supprimer
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          {!loading && preventiveRows.length === 0 && (
            <div className="col-span-full">
              <EmptyState icon={Calendar} title="Aucune maintenance préventive" description="Ajustez les filtres ou créez une nouvelle maintenance." />
            </div>
          )}
        </div>
      ) : (
        /* table view */
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <TableHead cols={["Machine", "Type", "Mode", "Statut", "Détail", "Actions"]} />
              <tbody>
                {preventiveRows.map((item, i) => {
                  const StatusIcon = PREVENTIVE_STATUS_ICONS[item.status] || Clock3;
                  return (
                    <tr key={item.id} className={`transition hover:bg-slate-50/80 ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>
                      <td className="border-b border-slate-50 px-4 py-3.5">
                        <p className="font-semibold text-slate-800">{item.machineLabel}</p>
                      </td>
                      <td className="border-b border-slate-50 px-4 py-3.5 text-sm text-slate-600">
                        {item.maintenance_type}
                      </td>
                      <td className="border-b border-slate-50 px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          item.trigger_mode === "RUNTIME"
                            ? "bg-purple-50 text-purple-700 ring-1 ring-purple-200"
                            : "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                        }`}>
                          {item.trigger_mode === "RUNTIME"
                            ? <><Timer className="h-3 w-3" />Runtime</>
                            : <><Calendar className="h-3 w-3" />Planifié</>}
                        </span>
                      </td>
                      <td className="border-b border-slate-50 px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${PREVENTIVE_STATUS_STYLES[item.status] || "bg-slate-100 text-slate-600 ring-1 ring-slate-200"}`}>
                          <StatusIcon className="h-3 w-3" />
                          {item.status}
                        </span>
                      </td>
                      <td className="border-b border-slate-50 px-4 py-3.5 text-xs text-slate-500">
                        {item.trigger_mode === "RUNTIME"
                          ? `${item.runtime_threshold_minutes ?? "—"} min`
                          : formatDate(item.planned_date)}
                      </td>
                      <td className="border-b border-slate-50 px-4 py-3.5">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditPreventive(item)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            <Edit3 className="h-3.5 w-3.5" /> Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePreventive(item)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && preventiveRows.length === 0 && (
                  <EmptyState colSpan={6} icon={Calendar} title="Aucune maintenance préventive" description="Ajustez les filtres ou créez une nouvelle maintenance." />
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  /* ════════════════════════ root render ══════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ── page header ── */}
        <header className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                  <Wrench className="h-4 w-4 text-slate-500" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Module Maintenance · MES</span>
              </div>
              <h1 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                Pilotage des incidents &amp; maintenances
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Supervision en temps réel, gestion des interventions et planification préventive.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${wsStatus === "connected" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"}`}>
                {wsStatus === "connected"
                  ? <><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />Temps réel actif</>
                  : <><span className="h-2 w-2 rounded-full bg-slate-400" />Déconnecté</>}
              </div>
              {loading && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Chargement…
                </div>
              )}
              <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                <Activity className="h-3.5 w-3.5" />
                {kpis.total} machines · {kpis.erreur} erreurs
              </div>
            </div>
          </div>
        </header>

        {/* ── tab content ── */}
        <div>
          {activeTab === "dashboard"     && renderDashboard()}
          {activeTab === "interventions" && renderInterventions()}
          {activeTab === "historique"    && renderHistory()}
          {activeTab === "preventive"    && renderPreventive()}
        </div>

      </div>
    </div>
  );
}
