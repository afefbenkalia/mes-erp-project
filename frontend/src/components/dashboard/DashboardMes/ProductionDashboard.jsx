import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Gauge,
  Package,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { dashboardAPI } from "../../../api/api";
import KpiCard from "./KpiCard";
import MachineChart from "./MachineChart";
import OeeChart from "./OeeChart";
import PerformanceTrendChart from "./PerformanceTrendChart";
import ProductionLast24HChart from "./ProductionLast24HChart";
import ScrapRateChart from "./ScrapRateChart";
import { subscribeDashboardMqtt } from "../../../services/telemetrySocket";

const EMPTY_STATE = {
  kpis: { total_production_24h: 0, oee: 0, availability: 0, performance: 0, quality: 0 },
  production_by_hour: [],
  production_by_machine: [],
  oee_breakdown: { availability: 0, performance: 0, quality: 0 },
  performance_over_time: [],
};

function normalizePayload(raw) {
  if (!raw || typeof raw !== "object") return null;
  const k = raw.kpis || {};
  return {
    kpis: {
      total_production_24h: Number(k.total_production_24h) || 0,
      oee: Number(k.oee) || 0,
      availability: Number(k.availability) || 0,
      performance: Number(k.performance) || 0,
      quality: Number(k.quality) || 0,
    },
    production_by_hour: Array.isArray(raw.production_by_hour)
      ? raw.production_by_hour
      : [],
    production_by_machine: Array.isArray(raw.production_by_machine)
      ? raw.production_by_machine
      : [],
    oee_breakdown: raw.oee_breakdown || {
      availability: k.availability,
      performance: k.performance,
      quality: k.quality,
    },
    performance_over_time: Array.isArray(raw.performance_over_time)
      ? raw.performance_over_time
      : [],
  };
}

export default function ProductionDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mqttStatus, setMqttStatus] = useState("Disconnected");
  const lastRealtimeRefreshRef = useRef(0);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await dashboardAPI.getProductionSummary();
      const normalized = normalizePayload(res.data);
      setData(normalized ?? EMPTY_STATE);
    } catch {
      setData(EMPTY_STATE);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load + polling régulier (15s) pour détecter immédiatement les
  // nouvelles entrées etapes_production / Production / Rebut insérées en DB.
  // Refetch supplémentaire à 00:00:01 pour reset propre du nouveau cycle 24h.
  useEffect(() => {
    load();
    const pollId = setInterval(() => load({ silent: true }), 15_000);

    const scheduleMidnightReset = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 1, 0);
      const delay = nextMidnight.getTime() - now.getTime();
      return setTimeout(() => {
        load({ silent: true });
        midnightTimer = scheduleMidnightReset();
      }, delay);
    };
    let midnightTimer = scheduleMidnightReset();

    return () => {
      clearInterval(pollId);
      clearTimeout(midnightTimer);
    };
  }, [load]);

  // WebSocket : refresh instantané sur événements globaux (production/rebut/state).
  useEffect(() => {
    const unsubscribe = subscribeDashboardMqtt({
      onConnectionChange: setMqttStatus,
      onGlobalMessage: () => {
        const now = Date.now();
        if (now - lastRealtimeRefreshRef.current >= 1500) {
          lastRealtimeRefreshRef.current = now;
          load({ silent: true });
        }
      },
    });
    return unsubscribe;
  }, [load]);

  const displayed = data ?? EMPTY_STATE;
  const k = displayed.kpis;
  const isEmpty = !loading && k.total_production_24h === 0 && k.availability === 0;

  return (
    <div className="space-y-4 px-2 sm:px-3 lg:px-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            Production Dashboard
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Manufacturing KPIs and trends — depuis 00:00 (heure système)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${
              mqttStatus === "Connected"
                ? "bg-emerald-50 text-emerald-800 ring-emerald-200/80"
                : "bg-slate-100 text-slate-700 ring-slate-200/80"
            }`}
          >
            MQTT {mqttStatus}
          </span>
          {isEmpty ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200/80">
              Aucune production
            </span>
          ) : null}
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          title="Total production (24h)"
          value={Math.round(k.total_production_24h).toLocaleString()}
          subtitle="Units recorded"
          icon={Package}
          iconClassName="bg-blue-50 text-blue-700"
        />
        <KpiCard
          title="OEE"
          value={k.oee.toFixed(1)}
          suffix="%"
          subtitle="Availability × Performance × Quality"
          icon={Gauge}
          iconClassName="bg-violet-50 text-violet-700"
        />
        <KpiCard
          title="Performance"
          value={k.performance.toFixed(1)}
          suffix="%"
          icon={Activity}
          iconClassName="bg-teal-50 text-teal-700"
        />
        <KpiCard
          title="Availability"
          value={k.availability.toFixed(1)}
          suffix="%"
          icon={Timer}
          iconClassName="bg-amber-50 text-amber-800"
        />
        <KpiCard
          title="Quality"
          value={k.quality.toFixed(1)}
          suffix="%"
          icon={ShieldCheck}
          iconClassName="bg-emerald-50 text-emerald-700"
        />
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <article className="rounded-lg border border-slate-200/80 bg-white p-[18px] shadow-sm shadow-slate-200/50">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              TRS per machine
            </h2>
            <Package className="h-3.5 w-3.5 text-slate-400" aria-hidden />
          </div>
          {displayed.production_by_machine.length === 0 ? (
            <p className="py-12 text-center text-xs text-slate-500">
              No machine data in this window.
            </p>
          ) : (
            <MachineChart data={displayed.production_by_machine} />
          )}
        </article>

        <article className="rounded-lg border border-slate-200/80 bg-white p-[18px] shadow-sm shadow-slate-200/50">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Performance over time
            </h2>
            <Activity className="h-3.5 w-3.5 text-slate-400" aria-hidden />
          </div>
          <PerformanceTrendChart data={displayed.performance_over_time} />
        </article>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <article className="flex h-full flex-col rounded-lg border border-slate-200/80 bg-white p-[18px] shadow-sm shadow-slate-200/50">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">OEE breakdown</h2>
            <Gauge className="h-3.5 w-3.5 text-slate-400" aria-hidden />
          </div>
          <div className="flex-1">
            <OeeChart breakdown={displayed.oee_breakdown} />
          </div>
        </article>

        <ScrapRateChart />
      </section>

      <section className="grid grid-cols-1 gap-3">
        <ProductionLast24HChart />
      </section>
    </div>
  );
}
