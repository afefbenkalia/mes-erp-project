import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Cpu,
  PieChart as PieChartIcon,
  RefreshCw,
  BarChart3,
  TrendingUp,
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
import { machineAPI } from "../../api/api";
import toast from "react-hot-toast";
import KpiCard from "./DashboardMes/KpiCard";
import MachineTable from "./MachineTable";
import EditMachineModal from "./EditMachineModal";
import { subscribeMachineRealtime } from "../../services/mqttService";
import { subscribeMaintenanceEvents } from "../../services/maintenanceSocket";

const STATE_COLORS = {
  MARCHE: "#10b981",
  PAUSE: "#ef4444",
  MAINTENANCE: "#f59e0b",
  ERREUR: "#7f1d1d",
};

const PIE_COLORS = ["#10b981", "#ef4444", "#f59e0b", "#7f1d1d"];
const normalizeKey = (value) => String(value ?? "").trim().toUpperCase();

const Machine = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingMachine, setEditingMachine] = useState(null);
  const [mqttConnectionStatus, setMqttConnectionStatus] = useState("disconnected");
  const [realtimeByMachineId, setRealtimeByMachineId] = useState({});
  const [performanceTrend, setPerformanceTrend] = useState([]);

  const normalizeState = (value) => String(value ?? "").trim().toUpperCase();

  const [form, setForm] = useState({
    name: "",
    reference: "",
    machine_type: "",
    location: "",
    description: "",
  });

  const getRealtimeStatsFromMap = useCallback((mapData) => {
    const realtimeMachines = Object.values(mapData);
    let totalRuntime = 0;
    let totalDowntime = 0;
    let activeMachines = 0;
    let failedMachines = 0;

    realtimeMachines.forEach((machine) => {
      const state = String(machine?.state || "").trim().toUpperCase();
      const runtime = Number(machine?.runtime_minutes);
      const downtime = Number(machine?.downtime_minutes);

      if (Number.isFinite(runtime) && runtime > 0) totalRuntime += runtime;
      if (Number.isFinite(downtime) && downtime > 0) totalDowntime += downtime;

      if (state === "MARCHE") activeMachines += 1;
      if (state === "ERREUR" || state === "PAUSE") failedMachines += 1;
    });

    const totalTime = totalRuntime + totalDowntime;
    const globalPerformance =
      totalTime > 0 ? Number(((totalRuntime / totalTime) * 100).toFixed(1)) : 0;
    const runtimeHours = Math.floor(totalRuntime / 60);
    const runtimeMinutes = Math.round(totalRuntime % 60);

    return {
      activeMachines,
      failedMachines,
      totalMachines: realtimeMachines.length,
      globalPerformance,
      totalRuntime,
      totalDowntime,
      formattedRuntime:
        runtimeHours > 0 ? `${runtimeHours}h ${runtimeMinutes}min` : `${runtimeMinutes}min`,
    };
  }, []);

  const loadMachines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await machineAPI.getMachines({
        include_current_state: true,
      });

      const machinesWithHistory = await Promise.all(
        res.data.map(async (m) => {
          try {
            const history = await machineAPI.getStateHistory(m.id);
            return {
              ...m,
              state: normalizeState(m.current_state || m.state || "MARCHE"),
              state_history: history.data,
            };
          } catch {
            return {
              ...m,
              state: normalizeState(m.current_state || m.state || "MARCHE"),
              state_history: [],
            };
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

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

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
                hour: "2-digit",
                minute: "2-digit",
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

  useEffect(() => {
    const unsubscribeMaintenance = subscribeMaintenanceEvents({
      onMessage: (message) => {
        if (!message || message.event !== "machine_update" || !message.payload) return;
        const payload = message.payload;
        setMachines((prev) =>
          prev.map((machine) => {
            const sameId = Number(machine.id) === Number(payload.machine_id);
            const sameRef =
              String(machine.reference || "").trim() ===
              String(payload.machine_reference || "").trim();
            if (!sameId && !sameRef) return machine;
            return {
              ...machine,
              state: normalizeState(payload.state || machine.state),
              current_state: normalizeState(payload.state || machine.current_state),
              current_state_started_at: payload.last_update || machine.current_state_started_at,
            };
          })
        );
      },
    });

    return unsubscribeMaintenance;
  }, []);

  const handleAddMachine = async () => {
    if (!form.name || !form.reference) {
      toast.error("Nom et référence requis");
      return;
    }

    try {
      await machineAPI.createMachine({
        name: form.name,
        reference: form.reference,
        machine_type: form.machine_type,
        location: form.location,
        description: form.description,
      });

      toast.success("Machine ajoutée");
      loadMachines();

      setForm({
        name: "",
        reference: "",
        machine_type: "",
        location: "",
        description: "",
      });
    } catch {
      toast.error("Erreur ajout");
    }
  };

  const handleUpdateMachine = async () => {
    if (!editingMachine) return;

    try {
      await machineAPI.updateMachine(editingMachine.id, {
        name: form.name,
        reference: form.reference,
        machine_type: form.machine_type,
        location: form.location,
        description: form.description,
      });

      toast.success("Machine modifiée");
      setEditingMachine(null);
      loadMachines();

      setForm({
        name: "",
        reference: "",
        machine_type: "",
        location: "",
        description: "",
      });
    } catch {
      toast.error("Erreur modification");
    }
  };

  const handleEdit = (machine) => {
    setEditingMachine(machine);
    setForm({
      name: machine.name,
      reference: machine.reference,
      machine_type: machine.machine_type || "",
      location: machine.location || "",
      description: machine.description || "",
    });
  };

  const cancelEdit = () => {
    setEditingMachine(null);
    setForm({
      name: "",
      reference: "",
      machine_type: "",
      location: "",
      description: "",
    });
  };

  const handleDelete = async (m) => {
    if (window.confirm(`Supprimer ${m.name} ?`)) {
      await machineAPI.deleteMachine(m.id);
      toast.success("Supprimée");
      loadMachines();
    }
  };

  const getGlobalStats = () => {
    const realtimeStats = getRealtimeStatsFromMap(realtimeByMachineId);
    const states = machines.map((m) => normalizeState(m.state));
    const activeMachines = states.filter((s) => s === "MARCHE").length;
    const failedMachines = states.filter((s) => s === "ERREUR" || s === "PAUSE").length;
    return {
      ...realtimeStats,
      activeMachines,
      failedMachines,
      totalMachines: machines.length,
    };
  };

  const getStateDistributionData = () => {
    const states = machines.map((m) => normalizeState(m.state));
    const marche = states.filter((s) => s === "MARCHE").length;
    const pause = states.filter((s) => s === "PAUSE").length;
    const maintenance = states.filter((s) => s === "MAINTENANCE").length;
    const erreur = states.filter((s) => s === "ERREUR").length;
    return [
      { name: "En marche", value: marche },
      { name: "Pause", value: pause },
      { name: "Maintenance", value: maintenance },
      { name: "Erreur", value: erreur },
    ];
  };

  const getRuntimeVsDowntimeData = () => {
    const stats = getGlobalStats();
    return [
      { name: "Runtime", minutes: Math.round(stats.totalRuntime) },
      { name: "Downtime", minutes: Math.round(stats.totalDowntime) },
    ];
  };

  const getPerformanceOverTimeData = () => {
    if (performanceTrend.length === 0) {
      return [{ label: "Now", performance: 0 }];
    }
    return performanceTrend;
  };

  const filtered = machines.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const getRealtimeForMachine = (machine) => {
    const byReference = realtimeByMachineId[normalizeKey(machine.reference)];
    if (byReference) return byReference;
    const byId = realtimeByMachineId[normalizeKey(machine.id)];
    if (byId) return byId;

    const byName = realtimeByMachineId[normalizeKey(machine.name)];
    if (byName) return byName;

    // Fallback: match by comparing payload machineId with static identifiers.
    const targetKeys = [
      normalizeKey(machine.reference),
      normalizeKey(machine.id),
      normalizeKey(machine.name),
    ];
    const matched = Object.values(realtimeByMachineId).find((rt) =>
      targetKeys.includes(normalizeKey(rt?.machineId))
    );
    if (matched) return matched;

    return null;
  };

  useEffect(() => {
    if (import.meta.env.DEV) {
      const machineKeys = machines.map((m) => ({
        name: m.name,
        reference: m.reference,
        id: m.id,
        normalized: {
          name: normalizeKey(m.name),
          reference: normalizeKey(m.reference),
          id: normalizeKey(m.id),
        },
      }));
      console.debug("[Machine] static machine keys:", machineKeys);
      console.debug("[Machine] realtime map keys:", Object.keys(realtimeByMachineId));
    }
  }, [machines, realtimeByMachineId]);

  const globalStats = getGlobalStats();
  const statePieData = getStateDistributionData();
  const runtimeBarData = getRuntimeVsDowntimeData();
  const perfLineData = getPerformanceOverTimeData();

  const inputClass =
    "mb-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="space-y-7 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Machines
          </h1>
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
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            aria-hidden
          />
          {loading ? "Actualisation…" : "Actualiser"}
        </button>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <KpiCard
          title="Machines actives"
          value={globalStats.activeMachines}
          subtitle={`sur ${globalStats.totalMachines} machine(s)`}
          icon={Cpu}
          iconClassName="bg-emerald-50 text-emerald-700"
        />
        <KpiCard
          title="En panne"
          value={globalStats.failedMachines}
          subtitle="Intervention éventuelle"
          icon={AlertTriangle}
          iconClassName="bg-red-50 text-red-700"
        />
        <KpiCard
          title="Disponibilité (runtime)"
          value={globalStats.globalPerformance}
          suffix="%"
          subtitle="Calculée en temps réel via MQTT"
          icon={Activity}
          iconClassName="bg-blue-50 text-blue-700"
        />
        <KpiCard
          title="Runtime"
          value={globalStats.formattedRuntime}
          subtitle="Somme runtime_minutes (MQTT)"
          icon={BarChart3}
          iconClassName="bg-emerald-50 text-emerald-700"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/50">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              Distribution des états
            </h2>
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
                    <Cell
                      key={entry.name}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
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

        <article className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/50">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              Runtime vs downtime
            </h2>
            <BarChart3 className="h-4 w-4 text-slate-400" aria-hidden />
          </div>
          <div className="h-72 w-full min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={runtimeBarData}
                margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  formatter={(v) => [`${v} min`, "Durée"]}
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
                  maxBarSize={56}
                >
                  {runtimeBarData.map((entry, index) => (
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

        <article className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/50">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              Tendance (7 jours)
            </h2>
            <TrendingUp className="h-4 w-4 text-slate-400" aria-hidden />
          </div>
          <div className="h-72 w-full min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={perfLineData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
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
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  animationDuration={800}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/50">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Ajouter une machine
          </h2>

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
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              Ajouter
            </button>
          </div>
        </article>
        <div className="space-y-3 lg:col-span-2">
          <input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:max-w-xs"
          />
          <MachineTable
            machines={filtered}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            getRealtimeForMachine={getRealtimeForMachine}
            mqttConnectionStatus={mqttConnectionStatus}
          />
        </div>
      </div>

      <EditMachineModal
        open={Boolean(editingMachine)}
        form={form}
        setForm={setForm}
        onSave={handleUpdateMachine}
        onClose={cancelEdit}
      />
    </div>
  );
};

export default Machine;
