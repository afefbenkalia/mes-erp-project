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
} from "lucide-react";

import { maintenanceAPI } from "../../api/api";
import { subscribeMaintenanceEvents } from "../../services/maintenanceSocket";

const STATE_STYLES = {
  MARCHE: "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
  PAUSE: "bg-slate-100 text-slate-700 ring-slate-200/80",
  ERREUR: "bg-rose-50 text-rose-700 ring-rose-200/80",
  MAINTENANCE: "bg-amber-50 text-amber-700 ring-amber-200/80",
};

const STATE_LABELS = {
  MARCHE: "En marche",
  PAUSE: "En pause",
  ERREUR: "En erreur",
  MAINTENANCE: "En maintenance",
};

const PREVENTIVE_STATUS_STYLES = {
  PLANIFIE: "bg-indigo-50 text-indigo-700 ring-indigo-200/80",
  "EN COURS": "bg-amber-50 text-amber-700 ring-amber-200/80",
  TERMINE: "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
};

const PREVENTIVE_STATUS_ICONS = {
  PLANIFIE: Clock3,
  "EN COURS": PlayCircle,
  TERMINE: CheckCircle2,
};

const TAB_STYLES = {
  active: "border-slate-900 bg-slate-900 text-white shadow-sm",
  idle: "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("fr-FR");
};

const formatDuration = (seconds) => {
  const safe = Number(seconds) || 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${hours}h ${minutes}m ${secs}s`;
};

const formatMinutes = (minutes) => {
  const safe = Math.max(Number(minutes) || 0, 0);
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return `${hours}h ${mins}m`;
};

const normalizeText = (value) => (value || "").toString().trim().toLowerCase();

const inDateRange = (value, from, to) => {
  if (!value) return false;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return false;
  if (from) {
    const start = new Date(from);
    if (!Number.isNaN(start.getTime()) && target < start) return false;
  }
  if (to) {
    const end = new Date(to);
    if (!Number.isNaN(end.getTime()) && target > end) return false;
  }
  return true;
};

const calculatePriorityRank = (priority) => {
  if (priority === "CRITIQUE") return 0;
  if (priority === "HAUTE") return 1;
  if (priority === "MOYENNE") return 2;
  return 3;
};

const priorityBadge = (priority) => {
  if (priority === "CRITIQUE") {
    return "bg-rose-100 text-rose-700 ring-rose-200";
  }
  if (priority === "HAUTE") {
    return "bg-amber-100 text-amber-700 ring-amber-200";
  }
  if (priority === "MOYENNE") {
    return "bg-sky-100 text-sky-700 ring-sky-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
};

const isInPeriod = (value, period) => {
  if (!value || period === "ALL") return true;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return false;
  const now = new Date();
  const msInDay = 24 * 3600 * 1000;

  if (period === "DAY") {
    return now.getTime() - target.getTime() <= msInDay;
  }
  if (period === "WEEK") {
    return now.getTime() - target.getTime() <= 7 * msInDay;
  }
  if (period === "MONTH") {
    return (
      target.getFullYear() === now.getFullYear() &&
      target.getMonth() === now.getMonth()
    );
  }
  if (period === "YEAR") {
    return target.getFullYear() === now.getFullYear();
  }
  return true;
};

const KpiCard = ({ title, value, icon: Icon, colorClass }) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
    <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
  </article>
);

export default function MaintenanceDashboard() {
  const [machines, setMachines] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [history, setHistory] = useState([]);
  const [preventive, setPreventive] = useState([]);
  const [actionByMachine, setActionByMachine] = useState({});
  const [dashboardFilters, setDashboardFilters] = useState({
    query: "",
    status: "ALL",
    dateFrom: "",
    dateTo: "",
  });
  const [interventionFilters, setInterventionFilters] = useState({
    query: "",
    status: "ALL",
    dateFrom: "",
    dateTo: "",
  });
  const [historyFilters, setHistoryFilters] = useState({
    query: "",
    technician: "",
    dateFrom: "",
    dateTo: "",
  });
  const [preventiveFilters, setPreventiveFilters] = useState({
    machine: "ALL",
    status: "ALL",
    trigger: "ALL",
    dateFrom: "",
    dateTo: "",
  });
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [preventiveForm, setPreventiveForm] = useState({
    machine_id: "",
    maintenance_type: "",
    trigger_mode: "SCHEDULED",
    planned_date: "",
    runtime_threshold_minutes: "",
  });
  const [preventiveFormMode, setPreventiveFormMode] = useState("create");
  const [editingPreventiveId, setEditingPreventiveId] = useState(null);
  const [preventiveViewMode, setPreventiveViewMode] = useState("cards");
  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "interventions", label: "Interventions" },
    { id: "historique", label: "Historique" },
    { id: "preventive", label: "Préventive" },
  ];

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

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const unsubscribe = subscribeMaintenanceEvents({
      onStatusChange: setWsStatus,
      onMessage: (message) => {
        if (!message || !message.event) return;
        if (message.event === "notification") {
          toast(message.payload?.message || "Notification maintenance");
        }
        if (["machine_update", "intervention_completed", "notification"].includes(message.event)) {
          loadAll();
        }
      },
    });
    return unsubscribe;
  }, [loadAll]);

  const kpis = useMemo(() => {
    const marche = machines.filter((m) => m.state === "MARCHE").length;
    const erreur = machines.filter((m) => m.state === "ERREUR").length;
    const maintenanceCount = machines.filter((m) => m.state === "MAINTENANCE").length;
    return {
      marche,
      erreur,
      maintenanceCount,
      total: machines.length,
      interventionsOpen: interventions.length,
      preventiveOpen: preventive.length,
    };
  }, [interventions.length, machines, preventive.length]);

  const machineById = useMemo(() => {
    const map = {};
    machines.forEach((machine) => {
      map[machine.machine_id] = machine;
    });
    return map;
  }, [machines]);

  const interventionByMachine = useMemo(() => {
    const map = {};
    interventions.forEach((item) => {
      map[item.machine_id] = item;
    });
    return map;
  }, [interventions]);

  const dashboardMachines = useMemo(() => {
    return machines.filter((machine) => {
      const machineText = `${machine.machine_reference} ${machine.machine_name}`;
      const passQuery =
        !normalizeText(dashboardFilters.query) ||
        normalizeText(machineText).includes(normalizeText(dashboardFilters.query));
      const passStatus =
        dashboardFilters.status === "ALL" || machine.state === dashboardFilters.status;
      const passDate =
        (!dashboardFilters.dateFrom && !dashboardFilters.dateTo) ||
        inDateRange(machine.last_update, dashboardFilters.dateFrom, dashboardFilters.dateTo);
      return passQuery && passStatus && passDate;
    });
  }, [dashboardFilters, machines]);

  const interventionCards = useMemo(() => {
    const now = Date.now();
    return machines
      .map((machine) => {
        const intervention = interventionByMachine[machine.machine_id];
        const ageMinutes = intervention?.start_time
          ? Math.max(Math.floor((now - new Date(intervention.start_time).getTime()) / 60000), 0)
          : null;
        let priority = machine.state === "ERREUR" ? "CRITIQUE" : machine.state === "MAINTENANCE" ? "HAUTE" : "MOYENNE";
        if (ageMinutes !== null && ageMinutes >= 60) priority = "CRITIQUE";
        else if (ageMinutes !== null && ageMinutes >= 30) priority = "HAUTE";
        const machineText = `${machine.machine_reference} ${machine.machine_name}`;

        const passQuery =
          !normalizeText(interventionFilters.query) ||
          normalizeText(machineText).includes(normalizeText(interventionFilters.query));
        const passStatus =
          interventionFilters.status === "ALL" || machine.state === interventionFilters.status;
        const dateTarget = intervention?.start_time || machine.last_update;
        const passDate =
          (!interventionFilters.dateFrom && !interventionFilters.dateTo) ||
          inDateRange(dateTarget, interventionFilters.dateFrom, interventionFilters.dateTo);

        return {
          machine,
          intervention,
          ageMinutes,
          priority,
          visible: passQuery && passStatus && passDate,
        };
      })
      .filter((item) => item.visible)
      .sort((a, b) => {
        const statePriority = {
          ERREUR: 0,
          MAINTENANCE: 1,
          PAUSE: 2,
          MARCHE: 3,
        };
        const first = (statePriority[a.machine.state] ?? 9) - (statePriority[b.machine.state] ?? 9);
        if (first !== 0) return first;
        return calculatePriorityRank(a.priority) - calculatePriorityRank(b.priority);
      });
  }, [interventionByMachine, interventionFilters, machines]);

  const historyRows = useMemo(() => {
    return history
      .map((item) => {
        const machine = machineById[item.machine_id];
        const machineLabel = machine
          ? `${machine.machine_reference} ${machine.machine_name}`
          : `Machine ${item.machine_id}`;
        const durationSeconds = Number(item.duration_seconds) || 0;
        let priority = "MOYENNE";
        if (durationSeconds >= 7200) priority = "CRITIQUE";
        else if (durationSeconds >= 3600) priority = "HAUTE";

        const passQuery =
          !normalizeText(historyFilters.query) ||
          normalizeText(machineLabel).includes(normalizeText(historyFilters.query)) ||
          normalizeText(item.action_effectuee).includes(normalizeText(historyFilters.query));
        const passTechnician =
          !normalizeText(historyFilters.technician) ||
          normalizeText(item.technician).includes(normalizeText(historyFilters.technician));
        const passDate =
          (!historyFilters.dateFrom && !historyFilters.dateTo) ||
          inDateRange(item.date, historyFilters.dateFrom, historyFilters.dateTo);

        return {
          ...item,
          priority,
          machineLabel,
          visible: passQuery && passTechnician && passDate,
        };
      })
      .filter((item) => item.visible);
  }, [history, historyFilters, machineById]);

  const preventiveRows = useMemo(() => {
    const now = Date.now();
    return preventive
      .map((item) => {
        const machine = machineById[item.machine_id];
        const plannedDate = item.planned_date ? new Date(item.planned_date).getTime() : null;
        let priority = "MOYENNE";
        if (item.status === "PLANIFIE" && plannedDate && plannedDate < now) {
          priority = "CRITIQUE";
        } else if (
          item.status === "PLANIFIE" &&
          plannedDate &&
          plannedDate <= now + 24 * 3600 * 1000
        ) {
          priority = "HAUTE";
        }

        const passMachine =
          preventiveFilters.machine === "ALL" ||
          String(item.machine_id) === preventiveFilters.machine;
        const passStatus =
          preventiveFilters.status === "ALL" ||
          item.status === preventiveFilters.status;
        const passTrigger =
          preventiveFilters.trigger === "ALL" ||
          item.trigger_mode === preventiveFilters.trigger;
        const passDate =
          (!preventiveFilters.dateFrom && !preventiveFilters.dateTo) ||
          (item.planned_date && inDateRange(item.planned_date, preventiveFilters.dateFrom, preventiveFilters.dateTo));

        return {
          ...item,
          priority,
          machineLabel: machine
            ? `${machine.machine_reference} - ${machine.machine_name}`
            : `Machine #${item.machine_id}`,
          visible: passMachine && passStatus && passTrigger && passDate,
        };
      })
      .filter((item) => item.visible);
  }, [machineById, preventive, preventiveFilters]);

  const machineCards = useMemo(
    () =>
      [...interventionCards].sort((a, b) => {
        const priority = {
          ERREUR: 0,
          MAINTENANCE: 1,
          PAUSE: 2,
          MARCHE: 3,
        };
        return (priority[a.machine.state] ?? 99) - (priority[b.machine.state] ?? 99);
      }),
    [interventionCards]
  );

  const stateBadge = (state) => (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${STATE_STYLES[state] || "bg-slate-100 text-slate-700 ring-slate-200"
        }`}
    >
      {STATE_LABELS[state] || state || "Inconnu"}
    </span>
  );

  const sectionShell =
    "rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_22px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur";

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
    if (!action) {
      toast.error("Action effectuée obligatoire");
      return;
    }
    try {
      await maintenanceAPI.markRepaired(machineId, {
        technician: "Responsable de Maintenance",
        action_effectuee: action,
      });
      setActionByMachine((prev) => ({ ...prev, [machineId]: "" }));
      toast.success("Machine marquée réparée");
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Impossible de clôturer l'intervention");
    }
  };

  const handleCreatePreventive = async () => {
    if (!preventiveForm.machine_id || !preventiveForm.maintenance_type.trim()) {
      toast.error("Machine et type de maintenance requis");
      return;
    }

    if (preventiveForm.trigger_mode === "SCHEDULED" && !preventiveForm.planned_date) {
      toast.error("Date planifiée requise");
      return;
    }

    if (
      preventiveForm.trigger_mode === "RUNTIME" &&
      (!preventiveForm.runtime_threshold_minutes || Number(preventiveForm.runtime_threshold_minutes) <= 0)
    ) {
      toast.error("Seuil runtime (minutes) requis");
      return;
    }

    try {
      const payload = {
        machine_id: Number(preventiveForm.machine_id),
        maintenance_type: preventiveForm.maintenance_type.trim(),
        trigger_mode: preventiveForm.trigger_mode,
        planned_date:
          preventiveForm.trigger_mode === "SCHEDULED"
            ? new Date(preventiveForm.planned_date).toISOString()
            : null,
        runtime_threshold_minutes:
          preventiveForm.trigger_mode === "RUNTIME"
            ? Number(preventiveForm.runtime_threshold_minutes)
            : null,
        status: "PLANIFIE",
      };

      if (preventiveFormMode === "edit" && editingPreventiveId) {
        await maintenanceAPI.updatePreventive(editingPreventiveId, {
          maintenance_type: payload.maintenance_type,
          trigger_mode: payload.trigger_mode,
          planned_date: payload.planned_date,
          runtime_threshold_minutes: payload.runtime_threshold_minutes,
          status: payload.status,
        });
        toast.success("Maintenance préventive modifiée");
      } else {
        await maintenanceAPI.createPreventive(payload);
        toast.success("Maintenance préventive créée");
      }

      setPreventiveFormMode("create");
      setEditingPreventiveId(null);
      setPreventiveForm({
        machine_id: "",
        maintenance_type: "",
        trigger_mode: "SCHEDULED",
        planned_date: "",
        runtime_threshold_minutes: "",
      });
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Impossible d'enregistrer la maintenance préventive");
    }
  };

  const handleEditPreventive = (item) => {
    setPreventiveFormMode("edit");
    setEditingPreventiveId(item.id);
    setPreventiveForm({
      machine_id: String(item.machine_id),
      maintenance_type: item.maintenance_type || "",
      trigger_mode: item.trigger_mode || "SCHEDULED",
      planned_date: item.planned_date ? new Date(item.planned_date).toISOString().slice(0, 16) : "",
      runtime_threshold_minutes: item.runtime_threshold_minutes ? String(item.runtime_threshold_minutes) : "",
    });
  };

  const handleCancelEditPreventive = () => {
    setPreventiveFormMode("create");
    setEditingPreventiveId(null);
    setPreventiveForm({
      machine_id: "",
      maintenance_type: "",
      trigger_mode: "SCHEDULED",
      planned_date: "",
      runtime_threshold_minutes: "",
    });
  };

  const handleDeletePreventive = async (item) => {
    const confirmed = window.confirm(`Supprimer la maintenance préventive ${item.maintenance_type} ?`);
    if (!confirmed) return;
    try {
      await maintenanceAPI.deletePreventive(item.id);
      if (editingPreventiveId === item.id) {
        handleCancelEditPreventive();
      }
      toast.success("Maintenance préventive supprimée");
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Impossible de supprimer la maintenance préventive");
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <KpiCard title="MARCHE" value={kpis.marche} icon={PlayCircle} colorClass="bg-emerald-100 text-emerald-700" />
        <KpiCard title="ERREUR" value={kpis.erreur} icon={AlertTriangle} colorClass="bg-rose-100 text-rose-700" />
        <KpiCard title="MAINTENANCE" value={kpis.maintenanceCount} icon={Wrench} colorClass="bg-amber-100 text-amber-700" />
        <KpiCard title="Interventions ouvertes" value={kpis.interventionsOpen} icon={Clock3} colorClass="bg-slate-100 text-slate-700" />
      </section>

      <section className={sectionShell}>
        <div className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">Filtres dashboard</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Filtrage complet des états machines</h2>
          </div>
          <span className="text-sm text-slate-500">{dashboardMachines.length} / {machines.length} machines</span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={dashboardFilters.query}
              onChange={(e) =>
                setDashboardFilters((prev) => ({
                  ...prev,
                  query: e.target.value,
                }))
              }
              placeholder="Machine (nom/référence)"
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
          </label>
          <select
            value={dashboardFilters.status}
            onChange={(e) =>
              setDashboardFilters((prev) => ({
                ...prev,
                status: e.target.value,
              }))
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
          >
            <option value="ALL">Statut: tous</option>
            <option value="MARCHE">MARCHE</option>
            <option value="ERREUR">ERREUR</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
            <option value="PAUSE">PAUSE</option>
          </select>
          <input
            type="datetime-local"
            value={dashboardFilters.dateFrom}
            onChange={(e) =>
              setDashboardFilters((prev) => ({
                ...prev,
                dateFrom: e.target.value,
              }))
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
          />
          <input
            type="datetime-local"
            value={dashboardFilters.dateTo}
            onChange={(e) =>
              setDashboardFilters((prev) => ({
                ...prev,
                dateTo: e.target.value,
              }))
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
          />
        </div>
      </section>

      <section className={sectionShell}>
        <div className="mb-5 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">Centre de supervision</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">État des machines en temps réel</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Vue consolidée des états machine, avec lecture immédiate des anomalies et suivi des interventions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-emerald-100">
              {kpis.total} machines
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
              WebSocket: {wsStatus}
            </span>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-400">
                <th className="border-b border-slate-100 px-4 py-3 font-medium">Machine</th>
                <th className="border-b border-slate-100 px-4 py-3 font-medium">État</th>
                <th className="border-b border-slate-100 px-4 py-3 font-medium">Dernière mise à jour</th>
              </tr>
            </thead>
            <tbody>
              {dashboardMachines.map((m) => (
                <tr key={m.machine_id} className="group border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                  <td className="px-4 py-4 font-medium text-slate-900">
                    <div>
                      <div>{m.machine_reference}</div>
                      <div className="text-xs font-normal text-slate-500">{m.machine_name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">{stateBadge(m.state)}</td>
                  <td className="px-4 py-4 text-slate-600">{formatDate(m.last_update)}</td>
                </tr>
              ))}
              {!loading && dashboardMachines.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-slate-500">
                    Aucune machine ne correspond aux filtres.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );

  const renderInterventions = () => (
    <section className={sectionShell}>
      <div className="mb-5 flex flex-col gap-2 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">Intervention</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Machines à traiter</h2>
          <p className="mt-1 text-sm text-slate-500">
            Les machines en erreur sont affichées en priorité, puis les machines déjà prises en charge.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-slate-500">
          <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700 ring-1 ring-rose-100">{kpis.erreur} en erreur</span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 ring-1 ring-amber-100">{kpis.interventionsOpen} ouvertes</span>
        </div>
      </div>
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={interventionFilters.query}
            onChange={(e) =>
              setInterventionFilters((prev) => ({
                ...prev,
                query: e.target.value,
              }))
            }
            placeholder="Machine"
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
          />
        </label>
        <select
          value={interventionFilters.status}
          onChange={(e) =>
            setInterventionFilters((prev) => ({
              ...prev,
              status: e.target.value,
            }))
          }
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        >
          <option value="ALL">Statut</option>
          <option value="ERREUR">ERREUR</option>
          <option value="MAINTENANCE">MAINTENANCE</option>
          <option value="MARCHE">MARCHE</option>
          <option value="PAUSE">PAUSE</option>
        </select>
        <input
          type="datetime-local"
          value={interventionFilters.dateFrom}
          onChange={(e) =>
            setInterventionFilters((prev) => ({
              ...prev,
              dateFrom: e.target.value,
            }))
          }
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        />
        <input
          type="datetime-local"
          value={interventionFilters.dateTo}
          onChange={(e) =>
            setInterventionFilters((prev) => ({
              ...prev,
              dateTo: e.target.value,
            }))
          }
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        />
      </div>
      <div className="space-y-4">
        {machineCards.map(({ machine, intervention, ageMinutes }) => {
          const isError = machine.state === "ERREUR";
          const isMaintenance = machine.state === "MAINTENANCE";
          const actionValue = actionByMachine[machine.machine_id] || "";

          return (
            <article
              key={machine.machine_id}
              className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm"
            >
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-slate-900">{machine.machine_reference}</p>
                  <p className="text-sm text-slate-500">{machine.machine_name}</p>
                </div>
                {stateBadge(machine.state)}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-2xl space-y-2 text-sm text-slate-600">
                  <p>Dernière mise à jour: {formatDate(machine.last_update)}</p>
                  {intervention?.start_time ? (
                    <p>Intervention ouverte depuis: {formatMinutes(ageMinutes || 0)}</p>
                  ) : null}
                  {isError ? (
                    <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-rose-700">
                      Intervention requise. La machine peut être prise en charge immédiatement.
                    </p>
                  ) : null}
                  {isMaintenance ? (
                    <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-amber-700">
                      La machine est déjà en maintenance. Renseignez l'action effectuée pour clôturer.
                    </p>
                  ) : null}
                </div>

                <div className="min-w-full space-y-2 sm:min-w-[280px] sm:max-w-sm">
                  {isError ? (
                    <button
                      type="button"
                      onClick={() => handleTakeOver(machine.machine_id)}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Prendre en charge
                    </button>
                  ) : null}

                  {isMaintenance ? (
                    <div className="space-y-2">
                      <input
                        value={actionValue}
                        onChange={(e) =>
                          setActionByMachine((prev) => ({
                            ...prev,
                            [machine.machine_id]: e.target.value,
                          }))
                        }
                        placeholder="Action effectuée"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => handleMarkRepaired(machine.machine_id)}
                        disabled={!actionValue.trim()}
                        className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Marquer réparée
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
        {!loading && machineCards.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Aucune intervention ne correspond aux filtres.
          </p>
        ) : null}
      </div>
    </section>
  );

  const renderHistory = () => (
    <section className={sectionShell}>
      <div className="mb-5 flex flex-col gap-2 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">Traçabilité</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Historique des réparations</h2>
          <p className="mt-1 text-sm text-slate-500">
            Les interventions clôturées sont listées avec durée, technicien et action réalisée.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200">
          {historyRows.length} / {history.length} enregistrements
        </span>
      </div>
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={historyFilters.query}
            onChange={(e) =>
              setHistoryFilters((prev) => ({
                ...prev,
                query: e.target.value,
              }))
            }
            placeholder="Machine ou action"
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
          />
        </label>
        <input
          value={historyFilters.technician}
          onChange={(e) =>
            setHistoryFilters((prev) => ({
              ...prev,
              technician: e.target.value,
            }))
          }
          placeholder="Technicien"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        />
        <input
          type="datetime-local"
          value={historyFilters.dateFrom}
          onChange={(e) =>
            setHistoryFilters((prev) => ({
              ...prev,
              dateFrom: e.target.value,
            }))
          }
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        />
        <input
          type="datetime-local"
          value={historyFilters.dateTo}
          onChange={(e) =>
            setHistoryFilters((prev) => ({
              ...prev,
              dateTo: e.target.value,
            }))
          }
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        />
      </div>
      <div className="overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-400">
              <th className="border-b border-slate-100 px-4 py-3 font-medium">Machine</th>
              <th className="border-b border-slate-100 px-4 py-3 font-medium">Technicien</th>
              <th className="border-b border-slate-100 px-4 py-3 font-medium">Durée</th>
              <th className="border-b border-slate-100 px-4 py-3 font-medium">Date</th>
              <th className="border-b border-slate-100 px-4 py-3 font-medium">Action effectuée</th>
            </tr>
          </thead>
          <tbody>
            {historyRows.map((item) => (
              <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                <td className="px-4 py-4 font-medium text-slate-900">{item.machineLabel}</td>
                <td className="px-4 py-4 text-slate-600">{item.technician}</td>
                <td className="px-4 py-4 text-slate-600">{formatDuration(item.duration_seconds)}</td>
                <td className="px-4 py-4 text-slate-600">{formatDate(item.date)}</td>
                <td className="px-4 py-4 text-slate-600">{item.action_effectuee}</td>
              </tr>
            ))}
            {!loading && historyRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                  Aucun historique disponible pour le moment.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderPreventive = () => (
    <section className={sectionShell}>
      {/* En-tête avec compteurs et résumé */}
      <div className="mb-6 flex flex-col gap-2 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">Maintenance Préventive</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Planification & Suivi</h2>
          <p className="mt-1 text-sm text-slate-500">
            Gérez vos opérations de maintenance préventive planifiées ou basées sur le temps de fonctionnement.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-indigo-50 px-4 py-2 ring-1 ring-indigo-100">
            <Calendar className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-700">{preventiveRows.length} planifiées</span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2 ring-1 ring-amber-100">
            <PlayCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">
              {preventive.filter(p => p.status === "EN COURS").length} en cours
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2 ring-1 ring-emerald-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              {preventive.filter(p => p.status === "TERMINE").length} terminées
            </span>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-medium text-slate-500">Filtres</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <select
            value={preventiveFilters.machine}
            onChange={(e) =>
              setPreventiveFilters((prev) => ({
                ...prev,
                machine: e.target.value,
              }))
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
          >
            <option value="ALL">Toutes les machines</option>
            {machines.map((machine) => (
              <option key={machine.machine_id} value={String(machine.machine_id)}>
                {machine.machine_reference}
              </option>
            ))}
          </select>
          <select
            value={preventiveFilters.status}
            onChange={(e) =>
              setPreventiveFilters((prev) => ({
                ...prev,
                status: e.target.value,
              }))
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="PLANIFIE">Planifié</option>
            <option value="EN COURS">En cours</option>
            <option value="TERMINE">Terminé</option>
          </select>
          <select
            value={preventiveFilters.trigger}
            onChange={(e) =>
              setPreventiveFilters((prev) => ({
                ...prev,
                trigger: e.target.value,
              }))
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
          >
            <option value="ALL">Type de déclenchement</option>
            <option value="SCHEDULED">Planifié</option>
            <option value="RUNTIME">Basé runtime</option>
          </select>
          <input
            type="datetime-local"
            value={preventiveFilters.dateFrom}
            onChange={(e) =>
              setPreventiveFilters((prev) => ({
                ...prev,
                dateFrom: e.target.value,
              }))
            }
            placeholder="Date début"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
          />
          <input
            type="datetime-local"
            value={preventiveFilters.dateTo}
            onChange={(e) =>
              setPreventiveFilters((prev) => ({
                ...prev,
                dateTo: e.target.value,
              }))
            }
            placeholder="Date fin"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
          />
        </div>
      </div>

      {/* Formulaire de création/édition */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm">
        <div className="border-b border-indigo-100 bg-white/80 px-5 py-4 backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-2 ${preventiveFormMode === "edit" ? "bg-amber-100" : "bg-indigo-100"}`}>
                {preventiveFormMode === "edit" ? (
                  <Edit3 className="h-5 w-5 text-amber-600" />
                ) : (
                  <Plus className="h-5 w-5 text-indigo-600" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  {preventiveFormMode === "edit" ? "Modifier la maintenance" : "Nouvelle maintenance préventive"}
                </h3>
                <p className="text-xs text-slate-500">
                  {preventiveFormMode === "edit"
                    ? "Ajustez les paramètres de la maintenance"
                    : "Planifiez une opération de maintenance"}
                </p>
              </div>
            </div>
            {preventiveFormMode === "edit" && (
              <button
                type="button"
                onClick={handleCancelEditPreventive}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <X className="h-3.5 w-3.5" />
                Annuler
              </button>
            )}
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">Machine</label>
              <select
                value={preventiveForm.machine_id}
                onChange={(e) => setPreventiveForm((prev) => ({ ...prev, machine_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
              >
                <option value="">Sélectionner...</option>
                {machines.map((machine) => (
                  <option key={machine.machine_id} value={machine.machine_id}>
                    {machine.machine_reference}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">Type de maintenance</label>
              <input
                value={preventiveForm.maintenance_type}
                onChange={(e) => setPreventiveForm((prev) => ({ ...prev, maintenance_type: e.target.value }))}
                placeholder="Ex: Vidange, Révision..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">Mode de déclenchement</label>
              <select
                value={preventiveForm.trigger_mode}
                onChange={(e) =>
                  setPreventiveForm((prev) => ({
                    ...prev,
                    trigger_mode: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
              >
                <option value="SCHEDULED">📅 Planifié</option>
                <option value="RUNTIME">⏱️ Basé runtime</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">
                {preventiveForm.trigger_mode === "SCHEDULED" ? "Date planifiée" : "Seuil runtime (minutes)"}
              </label>
              {preventiveForm.trigger_mode === "SCHEDULED" ? (
                <input
                  type="datetime-local"
                  value={preventiveForm.planned_date}
                  onChange={(e) => setPreventiveForm((prev) => ({ ...prev, planned_date: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                />
              ) : (
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={preventiveForm.runtime_threshold_minutes}
                    onChange={(e) =>
                      setPreventiveForm((prev) => ({
                        ...prev,
                        runtime_threshold_minutes: e.target.value,
                      }))
                    }
                    placeholder="Ex: 1440 (24h)"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                  />
                  <Gauge className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              )}
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleCreatePreventive}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${preventiveFormMode === "edit"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
              >
                {preventiveFormMode === "edit" ? (
                  <>
                    <Edit3 className="h-4 w-4" />
                    Modifier
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle vue cartes/tableau */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-slate-600">
          {preventiveRows.length} maintenance{preventiveRows.length > 1 ? 's' : ''} trouvée{preventiveRows.length > 1 ? 's' : ''}
        </p>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setPreventiveViewMode("cards")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${preventiveViewMode === "cards"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
              }`}
          >
            <LayoutGrid className="h-4 w-4" /> Cartes
          </button>
          <button
            type="button"
            onClick={() => setPreventiveViewMode("table")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${preventiveViewMode === "table"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
              }`}
          >
            <List className="h-4 w-4" /> Tableau
          </button>
        </div>
      </div>

      {/* Vue Cartes */}
      {preventiveViewMode === "cards" ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {preventiveRows.map((item) => {
            const StatusIcon = PREVENTIVE_STATUS_ICONS[item.status] || Clock3;
            return (
              <article
                key={item.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                {/* Barre de statut en haut */}
                <div className={`absolute inset-x-0 top-0 h-1 ${item.status === "TERMINE" ? "bg-emerald-500" :
                  item.status === "EN COURS" ? "bg-amber-500" :
                    "bg-indigo-500"
                  }`} />

                <div className="relative">
                  {/* En-tête de la carte */}
                  <div className="mb-4 flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`rounded-lg p-1.5 ${item.status === "TERMINE" ? "bg-emerald-50" :
                          item.status === "EN COURS" ? "bg-amber-50" :
                            "bg-indigo-50"
                          }`}>
                          <StatusIcon className={`h-4 w-4 ${item.status === "TERMINE" ? "text-emerald-600" :
                            item.status === "EN COURS" ? "text-amber-600" :
                              "text-indigo-600"
                            }`} />
                        </div>
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {item.machineLabel}
                        </p>
                      </div>
                      <p className="mt-1.5 ml-9 text-xs text-slate-500">
                        {item.maintenance_type}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${PREVENTIVE_STATUS_STYLES[item.status] || "bg-slate-100 text-slate-700 ring-slate-200"
                        }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  {/* Détails */}
                  <div className="ml-9 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Settings className="h-3.5 w-3.5" />
                      <span>Mode: {item.trigger_mode === "RUNTIME" ? "Basé runtime" : "Planifié"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {item.trigger_mode === "RUNTIME" ? (
                        <>
                          <Timer className="h-3.5 w-3.5" />
                          <span>Seuil: {item.runtime_threshold_minutes ? `${item.runtime_threshold_minutes} min` : "-"}</span>
                        </>
                      ) : (
                        <>
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Planifié le: {formatDate(item.planned_date)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 ml-9 flex gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => handleEditPreventive(item)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePreventive(item)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          {!loading && preventiveRows.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12">
              <Calendar className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">Aucune maintenance préventive</p>
              <p className="mt-1 text-xs text-slate-400">Ajustez les filtres ou créez une nouvelle maintenance</p>
            </div>
          ) : null}
        </div>
      ) : (
        /* Vue Tableau */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/80 text-left">
                <th className="border-b border-slate-100 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Machine
                </th>
                <th className="border-b border-slate-100 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Type
                </th>
                <th className="border-b border-slate-100 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Mode
                </th>
                <th className="border-b border-slate-100 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Statut
                </th>
                <th className="border-b border-slate-100 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Détail
                </th>
                <th className="border-b border-slate-100 px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {preventiveRows.map((item) => {
                const StatusIcon = PREVENTIVE_STATUS_ICONS[item.status] || Clock3;
                return (
                  <tr key={item.id} className="transition hover:bg-slate-50/50">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-slate-800">{item.machineLabel}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-600">{item.maintenance_type}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${item.trigger_mode === "RUNTIME"
                        ? "bg-purple-50 text-purple-700 ring-1 ring-purple-200"
                        : "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                        }`}>
                        {item.trigger_mode === "RUNTIME" ? (
                          <><Timer className="h-3 w-3" /> Runtime</>
                        ) : (
                          <><Calendar className="h-3 w-3" /> Planifié</>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${PREVENTIVE_STATUS_STYLES[item.status] || "bg-slate-100 text-slate-700 ring-slate-200"
                          }`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {item.trigger_mode === "RUNTIME"
                        ? `${item.runtime_threshold_minutes || "-"} min`
                        : formatDate(item.planned_date)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditPreventive(item)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePreventive(item)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && preventiveRows.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center px-6 py-12">
                      <Calendar className="mb-3 h-10 w-10 text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">Aucune maintenance préventive</p>
                      <p className="mt-1 text-xs text-slate-400">Ajustez les filtres ou créez une nouvelle maintenance</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 p-4 text-slate-900 sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.16),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_35%)]" />
      <main className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-[32px] border border-slate-900/10 bg-slate-900 px-5 py-5 text-white shadow-[0_30px_80px_-50px_rgba(15,23,42,0.95)] sm:px-6 sm:py-6">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(148,163,184,0.14),transparent_42%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">Maintenance MES</p>
              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Pilotage clair des incidents et maintenances</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Une vue synthétique pour suivre les machines, traiter les incidents plus vite et garder un historique exploitable.
              </p>
            </div>
          </div>

          <div className="relative mt-6 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${activeTab === tab.id ? TAB_STYLES.active : TAB_STYLES.idle
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "interventions" && renderInterventions()}
          {activeTab === "historique" && renderHistory()}
          {activeTab === "preventive" && renderPreventive()}
        </div>
      </main>
    </div>
  );
}