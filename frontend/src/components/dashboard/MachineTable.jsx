import React from "react";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

const STATE_STYLE = {
  MARCHE: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80",
  PAUSE: "bg-red-50 text-red-800 ring-1 ring-red-200/80",
  MAINTENANCE: "bg-orange-50 text-orange-800 ring-1 ring-orange-200/80",
  ERREUR: "bg-rose-100 text-rose-900 ring-1 ring-rose-300/80",
};

const STATE_LABEL = {
  MARCHE: "MARCHE",
  PAUSE: "PAUSE",
  MAINTENANCE: "MAINTENANCE",
  ERREUR: "ERREUR",
};

const formatDurationMinutes = (minutesTotal) => {
  const m = Number(minutesTotal);
  if (!Number.isFinite(m) || m < 0) return "No Data";
  const totalMinutes = Math.round(m);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes} min`;
};

const formatRealtimeNumber = (value, suffix = "") => {
  if (value === null || value === undefined || value === "") return "No Data";
  return `${value}${suffix}`;
};

const formatLastUpdate = (timestamp) => {
  if (!timestamp) return "No Data";
  return new Date(timestamp).toLocaleTimeString();
};

const MachineTable = ({
  machines,
  loading,
  onEdit,
  onDelete,
  getRealtimeForMachine,
  mqttConnectionStatus,
}) => {
  return (
    <article className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/50 lg:col-span-2">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-slate-900">Liste des machines</h2>
        <span
          className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
            mqttConnectionStatus === "connected"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200/80"
              : "bg-slate-100 text-slate-700 ring-slate-200/80"
          }`}
        >
          MQTT: {mqttConnectionStatus}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">name</th>
              <th className="px-4 py-3">reference</th>
              <th className="px-4 py-3">type</th>
              <th className="px-4 py-3">state</th>
              <th className="px-4 py-3">runtime</th>
              <th className="px-4 py-3">downtime</th>
              <th className="px-4 py-3">production/day</th>
              <th className="px-4 py-3">rejects/day</th>
              <th className="px-4 py-3">temperature</th>
              <th className="px-4 py-3">pressure</th>
              <th className="px-4 py-3">speed</th>
              <th className="px-4 py-3">current_of</th>
              <th className="px-4 py-3">last update</th>
              <th className="px-4 py-3 text-right">actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={14} className="px-4 py-12 text-center text-slate-500">
                  Chargement…
                </td>
              </tr>
            ) : machines.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-4 py-12 text-center text-slate-500">
                  Aucune machine
                </td>
              </tr>
            ) : (
              machines.map((machine) => {
                const rt = getRealtimeForMachine(machine);
                const state = String(machine?.state || machine?.current_state || "").trim().toUpperCase();
                return (
                  <tr key={machine.id} className="transition hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{machine.name}</td>
                    <td className="px-4 py-3 text-slate-700">{machine.reference}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {machine.machine_type || "No Data"}
                    </td>
                    <td className="px-4 py-3">
                      {state ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            STATE_STYLE[state] || "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80"
                          }`}
                        >
                          {STATE_LABEL[state] || state}
                        </span>
                      ) : (
                        <span className="text-slate-500">No Data</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{rt ? formatDurationMinutes(rt.runtime_minutes) : "No Data"}</td>
                    <td className="px-4 py-3">{rt ? formatDurationMinutes(rt.downtime_minutes) : "No Data"}</td>
                    <td className="px-4 py-3">{rt ? formatRealtimeNumber(rt.production_per_day) : "No Data"}</td>
                    <td className="px-4 py-3">{rt ? formatRealtimeNumber(rt.rejects_per_day) : "No Data"}</td>
                    <td className="px-4 py-3">
                      {rt ? formatRealtimeNumber(rt.temperature, "°C") : "No Data"}
                    </td>
                    <td className="px-4 py-3">{rt ? formatRealtimeNumber(rt.pressure, " bar") : "No Data"}</td>
                    <td className="px-4 py-3">{rt ? formatRealtimeNumber(rt.speed) : "No Data"}</td>
                    <td className="px-4 py-3">{rt ? formatRealtimeNumber(rt.current_of) : "No Data"}</td>
                    <td className="px-4 py-3 text-slate-600">{formatLastUpdate(rt?.lastUpdate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(machine)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-blue-600"
                          aria-label="Modifier"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(machine)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                          aria-label="Supprimer"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
};

export default MachineTable;

