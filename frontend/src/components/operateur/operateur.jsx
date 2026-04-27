import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Settings2,
  Wrench,
  XCircle,
} from "lucide-react";
import { maintenanceAPI, machineAPI } from "../../api/api";


const STATUS = {
  MARCHE: {
    label: "MARCHE",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  PAUSE: {
    label: "PAUSE",
    chip: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
    icon: PauseCircle,
  },
  ERREUR: {
    label: "ERREUR",
    chip: "bg-rose-50 text-rose-700 ring-rose-200",
    dot: "bg-rose-500",
    icon: XCircle,
  },
  MAINTENANCE: {
    label: "MAINTENANCE",
    chip: "bg-sky-50 text-sky-700 ring-sky-200",
    dot: "bg-sky-500",
    icon: Wrench,
  },
  UNKNOWN: {
    label: "INCONNU",
    chip: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-400",
    icon: AlertTriangle,
  },
};

function normalizeState(value) {
  const state = String(value || "").trim().toUpperCase();
  if (state === "RUNNING") return "MARCHE";
  if (state === "PAUSED") return "PAUSE";
  if (state === "ERROR") return "ERREUR";
  if (STATUS[state]) return state;
  return "UNKNOWN";
}

function formatRelativeTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const deltaSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (deltaSec < 10) return "a l'instant";
  if (deltaSec < 60) return `il y a ${deltaSec}s`;
  const min = Math.floor(deltaSec / 60);
  if (min < 60) return `il y a ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `il y a ${hours}h`;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function StatusBadge({ state }) {
  const cfg = STATUS[state] || STATUS.UNKNOWN;
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${cfg.chip}`}>
      <span className={`h-2 w-2 rounded-full ${cfg.dot} ${state === "MARCHE" ? "animate-pulse" : ""}`} />
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

function Kpi({ label, value, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-50 text-slate-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    sky: "bg-sky-50 text-sky-700",
  };

  return (
    <article className={`rounded-xl border border-slate-200 p-4 ${tones[tone] || tones.slate}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </article>
  );
}


export default function Operateur() {
  const [machines, setMachines] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState(null);

  const fetchMachines = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await maintenanceAPI.getMachines();
      const nextMachines = Array.isArray(response.data)
        ? response.data.map((m) => ({ ...m, state: normalizeState(m.state) }))
        : [];

      setMachines(nextMachines);
      setError("");
      setLastSync(new Date());

      setSelectedId((prev) => {
        if (!nextMachines.length) return null;
        const exists = nextMachines.some((m) => String(m.machine_id) === String(prev));
        return exists ? prev : nextMachines[0].machine_id;
      });
    } catch (err) {
      console.error(err);
      setError("Erreur de chargement des machines.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMachines(false);
    const timer = setInterval(() => fetchMachines(true), 7000);
    return () => clearInterval(timer);
  }, []);

  const selectedMachine = useMemo(() => {
    return machines.find((m) => String(m.machine_id) === String(selectedId)) || null;
  }, [machines, selectedId]);

  const counts = useMemo(() => {
    const summary = { total: machines.length, MARCHE: 0, PAUSE: 0, ERREUR: 0, MAINTENANCE: 0 };
    machines.forEach((m) => {
      const key = normalizeState(m.state);
      if (summary[key] !== undefined) summary[key] += 1;
    });
    return summary;
  }, [machines]);

  const changeState = async (state) => {
    if (!selectedMachine || actionLoading) return;

    setActionLoading(true);
    try {
      await machineAPI.changeState(selectedMachine.machine_id, {
        state,
        comment: "Action operateur",
      });
      await fetchMachines(true);
    } catch (err) {
      console.error(err);
      setError("Action impossible pour cette machine.");
    } finally {
      setActionLoading(false);
    }
  };

  const renderMachines = () => (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Total" value={counts.total} />
        <Kpi label="MARCHE" value={counts.MARCHE} tone="emerald" />
        <Kpi label="PAUSE" value={counts.PAUSE} tone="amber" />
        <Kpi label="ERREUR" value={counts.ERREUR} tone="rose" />
        <Kpi label="MAINTENANCE" value={counts.MAINTENANCE} tone="sky" />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-700">Etat machines</p>
            <button
              type="button"
              onClick={() => fetchMachines(false)}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {lastSync ? formatRelativeTime(lastSync.toISOString()) : "Actualiser"}
            </button>
          </div>

          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : machines.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">Aucune machine.</div>
          ) : (
            <>
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">Machine</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3">Maj</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {machines.map((m) => {
                      const selected = String(m.machine_id) === String(selectedId);
                      return (
                        <tr
                          key={m.machine_id}
                          onClick={() => setSelectedId(m.machine_id)}
                          className={`cursor-pointer transition ${selected ? "bg-blue-50" : "hover:bg-slate-50"}`}
                        >
                          <td className="px-4 py-3 font-mono text-xs text-slate-700">{m.machine_reference || "-"}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{m.machine_name || "Machine"}</td>
                          <td className="px-4 py-3">
                            <StatusBadge state={normalizeState(m.state)} />
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatRelativeTime(m.last_update)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 p-4 md:hidden">
                {machines.map((m) => {
                  const selected = String(m.machine_id) === String(selectedId);
                  return (
                    <button
                      key={m.machine_id}
                      type="button"
                      onClick={() => setSelectedId(m.machine_id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selected ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">{m.machine_name || "Machine"}</p>
                        <StatusBadge state={normalizeState(m.state)} />
                      </div>
                      <p className="mt-1 font-mono text-xs text-slate-500">{m.machine_reference || "-"}</p>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Actions operateur</p>

          {!selectedMachine ? (
            <p className="mt-4 text-sm text-slate-500">Selectionnez une machine.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">{selectedMachine.machine_name || "Machine"}</p>
                <p className="mt-0.5 font-mono text-xs text-slate-500">{selectedMachine.machine_reference || "-"}</p>
                <div className="mt-2">
                  <StatusBadge state={normalizeState(selectedMachine.state)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                <button
                  type="button"
                  disabled={actionLoading || normalizeState(selectedMachine.state) === "MARCHE"}
                  onClick={() => changeState("MARCHE")}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <PlayCircle className="h-3.5 w-3.5" /> MARCHE
                </button>
                <button
                  type="button"
                  disabled={actionLoading || normalizeState(selectedMachine.state) === "PAUSE"}
                  onClick={() => changeState("PAUSE")}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
                >
                  <PauseCircle className="h-3.5 w-3.5" /> PAUSE
                </button>
                <button
                  type="button"
                  disabled={actionLoading || normalizeState(selectedMachine.state) === "ERREUR"}
                  onClick={() => changeState("ERREUR")}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" /> ERREUR
                </button>
              </div>

              <p className="text-xs text-slate-500">Derniere MAJ: {formatRelativeTime(selectedMachine.last_update)}</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-4 sm:p-6">
      <div className="mx-auto max-w-[1450px] space-y-4">
        <header className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#0a6ed1] p-2 text-white">
                <Settings2 className="h-4 w-4" />
              </div>
              <h1 className="text-lg font-semibold text-slate-900">Machines</h1>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Live
            </div>
          </div>
        </header>

        {renderMachines()}
      </div>
    </div>
  );
}
