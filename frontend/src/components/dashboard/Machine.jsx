import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Cpu,
  PauseCircle,
  PieChart as PieChartIcon,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Wrench,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { machineAPI, dashboardAPI } from "../../api/api";
import toast from "react-hot-toast";
import KpiCard from "./DashboardMes/KpiCard";
import MachineTable from "./MachineTable";
import EditMachineModal from "./EditMachineModal";
import { subscribeMachineRealtime } from "../../services/telemetrySocket";
import { subscribeMaintenanceEvents } from "../../services/maintenanceSocket";

// ─────────────────────────────────────────────────────────────────────────────
//  HELPER — Runtime / downtime depuis state_history (dernières 24h)
//  Source de vérité : DB (via machineAPI.getStateHistory)
//  MQTT n'est PAS utilisé ici — évite les 0 quand MQTT est déconnecté
// ─────────────────────────────────────────────────────────────────────────────

function computeHistoryStats(stateHistory) {
  if (!Array.isArray(stateHistory) || !stateHistory.length) return null;
  const now   = Date.now();
  const since = now - 24 * 60 * 60 * 1000;
  let runtime  = 0;
  let downtime = 0;
  for (const entry of stateHistory) {
    const start = new Date(entry.started_at).getTime();
    if (isNaN(start)) continue;
    const end    = entry.ended_at ? new Date(entry.ended_at).getTime() : now;
    const wStart = Math.max(start, since);
    if (wStart >= end) continue;
    const mins = (end - wStart) / 60000;
    const s    = String(entry.state ?? "").trim().toUpperCase();
    if (s === "MARCHE") runtime  += mins;
    else if (s === "PAUSE" || s === "ERREUR" || s === "MAINTENANCE") downtime += mins;
  }
  return {
    runtime_minutes:  Math.round(runtime  * 10) / 10,
    downtime_minutes: Math.round(downtime * 10) / 10,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  HELPER — Agrège runtime/downtime sur TOUTES les machines depuis DB history
//  Utilisé pour les graphiques — indépendant du MQTT
// ─────────────────────────────────────────────────────────────────────────────

function computeGlobalRuntimeFromMachines(machines) {
  let totalRuntime  = 0;
  let totalDowntime = 0;

  for (const machine of machines) {
    const stats = computeHistoryStats(machine.state_history);
    if (!stats) continue;
    totalRuntime  += stats.runtime_minutes;
    totalDowntime += stats.downtime_minutes;
  }

  return {
    totalRuntime:  Math.round(totalRuntime),
    totalDowntime: Math.round(totalDowntime),
  };
}

const STATE_COLORS = {
  MARCHE:      "#10b981",
  PAUSE:       "#ef4444",
  MAINTENANCE: "#f59e0b",
  ERREUR:      "#7f1d1d",
};

const PIE_COLORS  = ["#10b981", "#ef4444", "#f59e0b", "#7f1d1d"];
const normalizeKey = (value) => String(value ?? "").trim().toUpperCase();

// ─────────────────────────────────────────────────────────────────────────────

const Machine = () => {
  const [machines,             setMachines]             = useState([]);
  const [loading,              setLoading]              = useState(true);
  const [search,               setSearch]               = useState("");
  const [editingMachine,       setEditingMachine]       = useState(null);
  const [isAddModalOpen,       setIsAddModalOpen]       = useState(false);
  const [mqttConnectionStatus, setMqttConnectionStatus] = useState("disconnected");
  const [realtimeByMachineId,  setRealtimeByMachineId]  = useState({});
  const [performanceTrend,     setPerformanceTrend]     = useState([]);
  const [machineKpis,          setMachineKpis]          = useState({});

  const normalizeState = (value) => String(value ?? "").trim().toUpperCase();

  const [form, setForm] = useState({
    name:         "",
    reference:    "",
    machine_type: "",
    location:     "",
    description:  "",
  });

  // ── MQTT global stats (pour KpiCard Disponibilité / Runtime) ──────────────
  const getRealtimeStatsFromMap = useCallback((mapData) => {
    const realtimeMachines = Object.values(mapData);
    let totalRuntime    = 0;
    let totalDowntime   = 0;
    let activeMachines  = 0;
    let failedMachines  = 0;

    realtimeMachines.forEach((machine) => {
      const state   = String(machine?.state || "").trim().toUpperCase();
      const runtime  = Number(machine?.runtime_minutes);
      const downtime = Number(machine?.downtime_minutes);
      if (Number.isFinite(runtime)  && runtime  > 0) totalRuntime  += runtime;
      if (Number.isFinite(downtime) && downtime > 0) totalDowntime += downtime;
      if (state === "MARCHE") activeMachines += 1;
      if (state === "ERREUR" || state === "PAUSE") failedMachines += 1;
    });

    const totalTime         = totalRuntime + totalDowntime;
    const globalPerformance = totalTime > 0
      ? Number(((totalRuntime / totalTime) * 100).toFixed(1))
      : 0;
    const runtimeHours   = Math.floor(totalRuntime / 60);
    const runtimeMinutes = Math.round(totalRuntime % 60);

    return {
      activeMachines,
      failedMachines,
      totalMachines: realtimeMachines.length,
      globalPerformance,
      totalRuntime,
      totalDowntime,
      formattedRuntime: runtimeHours > 0
        ? `${runtimeHours}h ${runtimeMinutes}min`
        : `${runtimeMinutes}min`,
    };
  }, []);

  // ── Chargement machines + state_history ───────────────────────────────────
  const loadMachines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await machineAPI.getMachines({ include_current_state: true });

      const machinesWithHistory = await Promise.all(
        res.data.map(async (m) => {
          const currentState = normalizeState(m.current_state || m.state || "MARCHE");
          try {
            const history = await machineAPI.getStateHistory(m.id);
            let stateHistory = history.data ?? [];

            // Fallback : si aucun historique, on synthétise l'état courant
            if (stateHistory.length === 0 && m.current_state_started_at) {
              stateHistory = [{
                state:      currentState,
                started_at: m.current_state_started_at,
                ended_at:   null,
              }];
            }
            return { ...m, state: currentState, state_history: stateHistory };
          } catch {
            const stateHistory = m.current_state_started_at
              ? [{ state: currentState, started_at: m.current_state_started_at, ended_at: null }]
              : [];
            return { ...m, state: currentState, state_history: stateHistory };
          }
        })
      );

      setMachines(machinesWithHistory);
    } catch {
      toast.error("Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMachines(); }, [loadMachines]);

  // ── MQTT subscribe ────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = subscribeMachineRealtime({
      onConnectionChange: setMqttConnectionStatus,
      onMessage: (payload) => {
        if (!payload || !payload.machineId) return;
        const machineKey = normalizeKey(payload.machineId);
        setRealtimeByMachineId((prev) => {
          const nextMap = {
            ...prev,
            [machineKey]: {
              ...payload,
              machineId: machineKey,
              lastUpdate: new Date().toISOString(),
            },
          };
          const nextStats = getRealtimeStatsFromMap(nextMap);
          setPerformanceTrend((prevTrend) => {
            const nextPoint = {
              label: new Date().toLocaleTimeString("fr-FR", {
                hour: "2-digit", minute: "2-digit",
              }),
              performance: nextStats.globalPerformance,
            };
            return [...prevTrend, nextPoint].slice(-7);
          });
          return nextMap;
        });
      },
    });
    return unsubscribe;
  }, [getRealtimeStatsFromMap]);

  // ── Maintenance WebSocket ─────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribeMaintenance = subscribeMaintenanceEvents({
      onMessage: (message) => {
        if (!message || message.event !== "machine_update" || !message.payload) return;
        const payload = message.payload;
        setMachines((prev) =>
          prev.map((machine) => {
            const sameId  = Number(machine.id) === Number(payload.machine_id);
            const sameRef = String(machine.reference || "").trim() ===
                            String(payload.machine_reference || "").trim();
            if (!sameId && !sameRef) return machine;
            return {
              ...machine,
              state:         normalizeState(payload.state || machine.state),
              current_state: normalizeState(payload.state || machine.current_state),
              current_state_started_at:
                payload.last_update || machine.current_state_started_at,
            };
          })
        );
      },
    });
    return unsubscribeMaintenance;
  }, []);

  // ── Sync états depuis DB toutes les 30s ───────────────────────────────────
  useEffect(() => {
    const syncStates = async () => {
      try {
        const res = await machineAPI.getMachines({ include_current_state: true });
        setMachines((prev) =>
          prev.map((m) => {
            const updated = res.data.find((d) => d.id === m.id);
            if (!updated) return m;
            const newState = normalizeState(
              updated.current_state || updated.state || m.state
            );
            if (newState === m.state) return m;
            return { ...m, state: newState, current_state: newState };
          })
        );
      } catch {
        // silent
      }
    };
    const id = setInterval(syncStates, 30_000);
    return () => clearInterval(id);
  }, []);

  // ── KPIs production depuis dashboard API ──────────────────────────────────
  useEffect(() => {
    const fetchKpis = () =>
      dashboardAPI.getMachineKpis()
        .then((res) => {
          const normalized = Object.fromEntries(
            Object.entries(res.data || {}).map(([k, v]) => [k.trim().toUpperCase(), v])
          );
          setMachineKpis(normalized);
        })
        .catch(() => {});
    fetchKpis();
    const id = setInterval(fetchKpis, 60_000);
    return () => clearInterval(id);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  //  STATS GLOBALES
  //  - Compteurs d'états     → machine.state (DB, source de vérité)
  //  - Runtime/Downtime KPI  → MQTT si connecté, sinon DB state_history
  //  - Runtime/Downtime graph→ TOUJOURS DB state_history (fiable sans MQTT)
  // ─────────────────────────────────────────────────────────────────────────

  const getGlobalStats = () => {
    const realtimeStats = getRealtimeStatsFromMap(realtimeByMachineId);

    let marcheMachines      = 0;
    let pauseMachines       = 0;
    let erreurMachines      = 0;
    let maintenanceMachines = 0;

    for (const m of machines) {
      const s = normalizeState(m.state || "");
      if      (s === "MARCHE")      marcheMachines++;
      else if (s === "PAUSE")       pauseMachines++;
      else if (s === "ERREUR")      erreurMachines++;
      else if (s === "MAINTENANCE") maintenanceMachines++;
    }

    return {
      ...realtimeStats,
      marcheMachines,
      pauseMachines,
      erreurMachines,
      maintenanceMachines,
      activeMachines: marcheMachines,
      failedMachines: pauseMachines + erreurMachines,
      totalMachines:  machines.length,
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  DONNÉES GRAPHIQUES
  // ─────────────────────────────────────────────────────────────────────────

  const getStateDistributionData = () => {
    let marche = 0, pause = 0, maintenance = 0, erreur = 0;
    for (const m of machines) {
      const s = normalizeState(m.state || "");
      if      (s === "MARCHE")      marche++;
      else if (s === "PAUSE")       pause++;
      else if (s === "MAINTENANCE") maintenance++;
      else if (s === "ERREUR")      erreur++;
    }
    return [
      { name: "En marche",   value: marche },
      { name: "Pause",       value: pause },
      { name: "Maintenance", value: maintenance },
      { name: "Erreur",      value: erreur },
    ];
  };

  /**
   * ✅ FIX : Runtime vs Downtime calculé depuis DB state_history
   *
   * AVANT : utilisait getGlobalStats() → realtimeByMachineId (MQTT)
   *         → affichait 0 si MQTT déconnecté ou pas encore reçu
   *
   * APRÈS : computeGlobalRuntimeFromMachines(machines)
   *         → agrège state_history de chaque machine (chargé au montage)
   *         → fonctionne toujours, même sans MQTT
   */
  const getRuntimeVsDowntimeData = () => {
    const { totalRuntime, totalDowntime } = computeGlobalRuntimeFromMachines(machines);

    // Formater en heures pour une lecture plus lisible si > 60 min
    const formatLabel = (mins) => {
      if (mins === 0) return "0 min";
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return h > 0 ? `${h}h ${m}min` : `${m} min`;
    };

    return [
      {
        name:    "Runtime",
        minutes: totalRuntime,
        label:   formatLabel(totalRuntime),
      },
      {
        name:    "Downtime",
        minutes: totalDowntime,
        label:   formatLabel(totalDowntime),
      },
    ];
  };

  /**
   * ✅ FIX : Tendance performance calculée depuis DB state_history
   *
   * AVANT : performanceTrend mis à jour uniquement par messages MQTT
   *         → graphique vide si MQTT déconnecté
   *
   * APRÈS : calculé depuis state_history de chaque machine au chargement,
   *         puis enrichi par MQTT en temps réel si disponible
   */
  const getPerformanceOverTimeData = () => {
    // Si on a des données MQTT temps réel, on les utilise
    if (performanceTrend.length >= 2) {
      return performanceTrend;
    }

    // Sinon : calculer depuis DB — on génère un point par machine
    // représentant son taux de marche sur les 24h
    const points = machines
      .map((machine) => {
        const stats = computeHistoryStats(machine.state_history);
        if (!stats) return null;
        const total = stats.runtime_minutes + stats.downtime_minutes;
        const perf  = total > 0
          ? Math.round((stats.runtime_minutes / total) * 100)
          : 0;
        return {
          label:       machine.name,
          performance: perf,
        };
      })
      .filter(Boolean);

    if (points.length === 0) {
      return [{ label: "—", performance: 0 }];
    }

    return points;
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  REALTIME PAR MACHINE (MachineTable)
  // ─────────────────────────────────────────────────────────────────────────

  const getRealtimeForMachine = (machine) => {
    const byReference = realtimeByMachineId[normalizeKey(machine.reference)];
    const byId        = realtimeByMachineId[normalizeKey(machine.id)];
    const byName      = realtimeByMachineId[normalizeKey(machine.name)];

    const targetKeys = [
      normalizeKey(machine.reference),
      normalizeKey(machine.id),
      normalizeKey(machine.name),
    ];
    const matched = Object.values(realtimeByMachineId).find((rt) =>
      targetKeys.includes(normalizeKey(rt?.machineId))
    );

    const rtData = byReference || byId || byName || matched || null;
    const kpi    = machineKpis[normalizeKey(machine.name)] || {};
    const hasKpi = Object.keys(kpi).length > 0;

    // ✅ FIX : runtime/downtime depuis DB state_history
    //    Plus de dépendance au MQTT pour ces valeurs dans la table
    const histStats = computeHistoryStats(machine.state_history);

    if (!rtData && !hasKpi && !histStats) return null;

    const { state: _ignored, ...rtSensorData } = rtData ?? {};

    return {
      // Base DB (toujours présent)
      ...(histStats ?? {}),
      // MQTT override si disponible (temperature, pressure, speed, runtime_cache)
      ...rtSensorData,
      // KPIs production en dernier
      ...kpi,
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleAddMachine = async () => {
    if (!form.name || !form.reference) {
      toast.error("Nom et référence requis");
      return;
    }
    try {
      await machineAPI.createMachine({
        name:         form.name,
        reference:    form.reference,
        machine_type: form.machine_type,
        location:     form.location,
        description:  form.description,
      });
      toast.success("Machine ajoutée");
      loadMachines();
      setIsAddModalOpen(false);
      setForm({ name: "", reference: "", machine_type: "", location: "", description: "" });
    } catch {
      toast.error("Erreur ajout");
    }
  };

  const handleUpdateMachine = async () => {
    if (!editingMachine) return;
    try {
      await machineAPI.updateMachine(editingMachine.id, {
        name:         form.name,
        reference:    form.reference,
        machine_type: form.machine_type,
        location:     form.location,
        description:  form.description,
      });
      toast.success("Machine modifiée");
      setEditingMachine(null);
      loadMachines();
      setForm({ name: "", reference: "", machine_type: "", location: "", description: "" });
    } catch {
      toast.error("Erreur modification");
    }
  };

  const handleEdit = (machine) => {
    setEditingMachine(machine);
    setForm({
      name:         machine.name,
      reference:    machine.reference,
      machine_type: machine.machine_type || "",
      location:     machine.location     || "",
      description:  machine.description  || "",
    });
  };

  const cancelEdit = () => {
    setEditingMachine(null);
    setForm({ name: "", reference: "", machine_type: "", location: "", description: "" });
  };

  const openAddModal = () => {
    setEditingMachine(null);
    setForm({ name: "", reference: "", machine_type: "", location: "", description: "" });
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setForm({ name: "", reference: "", machine_type: "", location: "", description: "" });
  };

  const handleDelete = async (m) => {
    if (window.confirm(`Supprimer ${m.name} ?`)) {
      await machineAPI.deleteMachine(m.id);
      toast.success("Supprimée");
      loadMachines();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  DEBUG (dev only)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug("[Machine] machine keys:", machines.map((m) => ({
        name: m.name, reference: m.reference, id: m.id,
      })));
      console.debug("[Machine] realtime map keys:", Object.keys(realtimeByMachineId));
      console.debug("[Machine] machineKpis keys:", Object.keys(machineKpis));

      // Log runtime/downtime calculé depuis DB pour vérification
      const globalRuntime = computeGlobalRuntimeFromMachines(machines);
      console.debug("[Machine] DB runtime global:", globalRuntime);
    }
  }, [machines, realtimeByMachineId, machineKpis]);

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const globalStats   = getGlobalStats();
  const hasMqttData   = Object.keys(realtimeByMachineId).length > 0;
  const displayPerformance = hasMqttData
    ? Number(globalStats.globalPerformance).toFixed(1)
    : "—";
  const displayRuntime = hasMqttData ? globalStats.formattedRuntime : "—";

  const statePieData  = getStateDistributionData();
  const runtimeBarData = getRuntimeVsDowntimeData();   // ✅ depuis DB
  const perfLineData  = getPerformanceOverTimeData();   // ✅ depuis DB + MQTT

  const filtered = machines.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const inputClass =
    "mb-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="space-y-7 px-4 sm:px-6 lg:px-8">

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Machines</h1>
          <p className="mt-1 text-sm text-slate-500">
            Parc machines, états et temps de fonctionnement
          </p>
        </div>
        <button
          type="button"
          onClick={loadMachines}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
          {loading ? "Actualisation…" : "Actualiser"}
        </button>
      </div>

      {/* Compteurs d'états */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          title="En marche"
          value={globalStats.marcheMachines}
          subtitle={`/ ${globalStats.totalMachines} machine(s)`}
          icon={Cpu}
          iconClassName="bg-emerald-50 text-emerald-700"
        />
        <KpiCard
          title="En pause"
          value={globalStats.pauseMachines}
          subtitle="Arrêt planifié ou en attente"
          icon={PauseCircle}
          iconClassName="bg-red-50 text-red-700"
        />
        <KpiCard
          title="En erreur"
          value={globalStats.erreurMachines}
          subtitle="Intervention requise"
          icon={AlertTriangle}
          iconClassName="bg-rose-50 text-rose-700"
        />
        <KpiCard
          title="Maintenance"
          value={globalStats.maintenanceMachines}
          subtitle="En cours de maintenance"
          icon={Wrench}
          iconClassName="bg-amber-50 text-amber-800"
        />
      </section>

      {/* KPI Disponibilité / Runtime */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          title="Disponibilité"
          value={displayPerformance}
          suffix={hasMqttData ? "%" : undefined}
          subtitle="Temps en MARCHE / temps total"
          icon={Activity}
          iconClassName="bg-blue-50 text-blue-700"
        />
        <KpiCard
          title="Runtime cumulé"
          value={displayRuntime}
          subtitle="Somme des durées de fonctionnement"
          icon={BarChart3}
          iconClassName="bg-emerald-50 text-emerald-700"
        />
      </section>

      {/* Graphiques */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Pie — Distribution des états */}
        <article className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/50">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Distribution des états</h2>
            <PieChartIcon className="h-4 w-4 text-slate-400" aria-hidden />
          </div>
          <div className="h-72 w-full min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statePieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="48%"
                  outerRadius="72%"
                  paddingAngle={2}
                  animationDuration={800}
                >
                  {statePieData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [value, "Machines"]}
                  contentStyle={{
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgb(15 23 42 / 8%)",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => (
                    <span className="text-sm text-slate-600">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Bar — Runtime vs Downtime ✅ depuis DB state_history */}
        <article className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/50">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Runtime vs Downtime</h2>
            <BarChart3 className="h-4 w-4 text-slate-400" aria-hidden />
          </div>

          {/* Affiche les totaux en clair sous le titre */}
          <div className="mb-3 flex gap-4 text-xs text-slate-500">
            <span>
              <span className="font-semibold text-emerald-600">Runtime : </span>
              {runtimeBarData[0]?.label ?? "—"}
            </span>
            <span>
              <span className="font-semibold text-red-500">Downtime : </span>
              {runtimeBarData[1]?.label ?? "—"}
            </span>
          </div>

          <div className="h-60 w-full min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={runtimeBarData}
                margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v) => {
                    const h = Math.floor(v / 60);
                    const m = v % 60;
                    return h > 0 ? `${h}h${m > 0 ? m : ""}` : `${m}m`;
                  }}
                />
                <Tooltip
                  formatter={(v, name) => {
                    const h = Math.floor(v / 60);
                    const m = v % 60;
                    const formatted = h > 0 ? `${h}h ${m}min` : `${m} min`;
                    return [formatted, name];
                  }}
                  contentStyle={{
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgb(15 23 42 / 8%)",
                  }}
                />
                <Bar
                  dataKey="minutes"
                  radius={[8, 8, 0, 0]}
                  animationDuration={800}
                  maxBarSize={72}
                >
                  {runtimeBarData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.name === "Runtime"
                          ? STATE_COLORS.MARCHE
                          : STATE_COLORS.PAUSE
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Line — Tendance performance ✅ depuis DB + MQTT */}
        <article className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/50">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              {hasMqttData ? "Tendance temps réel" : "Performance par machine (24h)"}
            </h2>
            <TrendingUp className="h-4 w-4 text-slate-400" aria-hidden />
          </div>
          <div className="h-72 w-full min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={perfLineData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  interval={0}
                  angle={machines.length > 5 ? -30 : 0}
                  textAnchor={machines.length > 5 ? "end" : "middle"}
                  height={machines.length > 5 ? 48 : 24}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  formatter={(v) => [`${v}%`, "Performance"]}
                  contentStyle={{
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgb(15 23 42 / 8%)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="performance"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#2563eb", strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  animationDuration={800}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      {/* Table machines */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:max-w-xs"
          />
          <button
            type="button"
            onClick={openAddModal}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            Ajouter une machine
          </button>
        </div>
        <MachineTable
          machines={filtered}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          getRealtimeForMachine={getRealtimeForMachine}
          mqttConnectionStatus={mqttConnectionStatus}
          machineKpis={machineKpis}
        />
      </div>

      {/* Modal edit */}
      <EditMachineModal
        open={Boolean(editingMachine)}
        form={form}
        setForm={setForm}
        onSave={handleUpdateMachine}
        onClose={cancelEdit}
      />

      {/* Modal add */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-900/10">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Ajouter une machine</h3>
              <button
                type="button"
                onClick={closeAddModal}
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100"
              >
                Fermer
              </button>
            </div>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nom *"
              className={inputClass}
            />
            <input
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              placeholder="Référence *"
              className={inputClass}
            />
            <input
              value={form.machine_type}
              onChange={(e) => setForm({ ...form, machine_type: e.target.value })}
              placeholder="Type"
              className={inputClass}
            />
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Localisation"
              className={inputClass}
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description"
              className={`${inputClass} min-h-[96px] resize-y`}
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={handleAddMachine}
                className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
              >
                Ajouter
              </button>
              <button
                type="button"
                onClick={closeAddModal}
                className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Machine;