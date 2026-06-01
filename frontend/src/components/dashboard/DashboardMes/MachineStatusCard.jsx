import React from "react";

const STATUS_CONFIG = {
  RUNNING: { color: "bg-emerald-500", label: "En marche", dotColor: "bg-emerald-400" },
  OFF: { color: "bg-slate-400", label: "Éteint", dotColor: "bg-slate-300" },
  ERROR: { color: "bg-red-500", label: "Erreur", dotColor: "bg-red-400" },
  PAUSED: { color: "bg-amber-500", label: "En pause", dotColor: "bg-amber-400" },
};

export default function MachineStatusCard({ machines = [] }) {
  if (machines.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-slate-500">Aucune machine configurée</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-72 overflow-y-auto">
      {machines.map((machine) => {
        const config = STATUS_CONFIG[machine.status] || STATUS_CONFIG.OFF;
        
        return (
          <div
            key={machine.id}
            className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100"
          >
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${config.dotColor} animate-pulse`} />
              <span className="text-sm font-medium text-slate-700">
                {machine.name}
              </span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${config.color}`}
            >
              {config.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}