import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Gauge,
  Package,
  Percent,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { dashboardAPI } from "../../../api/api";
import KpiCard from "./KpiCard";
import ProductionChart from "./ProductionChart";
import MachineChart from "./MachineChart";
import OeeChart from "./OeeChart";
import PerformanceTrendChart from "./PerformanceTrendChart";
import { subscribeDashboardMqtt } from "../../../services/mqtt";

/** Demo payload when API is unreachable or empty DB — keeps UI runnable. */
const DEMO_PAYLOAD = {
  kpis: {
    total_production_24h: 12480,
    oee: 78.4,
    availability: 91.2,
    performance: 88.5,
    quality: 97.1,
  },
  production_by_hour: Array.from({ length: 24 }, (_, i) => {
    const h = String(i).padStart(2, "0");
    return {
      label: `${h}:00`,
      quantity: Math.round(180 + Math.sin(i / 3) * 120 + (i % 5) * 40),
    };
  }),
  production_by_machine: [
    { machine: "Ligne A", quantity: 4200 },
    { machine: "Ligne B", quantity: 3980 },
    { machine: "Ligne C", quantity: 2650 },
    { machine: "Ligne D", quantity: 1650 },
  ],
  oee_breakdown: {
    availability: 91.2,
    performance: 88.5,
    quality: 97.1,
  },
  performance_over_time: Array.from({ length: 24 }, (_, i) => {
    const h = String(i).padStart(2, "0");
    return {
      label: `${h}:00`,
      performance: Math.min(
        100,
        Math.round(65 + Math.sin(i / 4) * 22 + (i % 3) * 5)
      ),
    };
  }),
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

const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000;

const clampPercent = (value) => Math.max(0, Math.min(100, Number(value) || 0));

const safePercent = (num, den) => {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return 0;
  return clampPercent((num / den) * 100);
};

const toTimeLabel = (date) =>
  date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

function trimHistory(series, nowTs) {
  const minTs = nowTs - HISTORY_WINDOW_MS;
  return series.filter((item) => item.ts >= minTs);
}

export default function ProductionDashboard() {
  const [data, setData] = useState(() => normalizePayload(DEMO_PAYLOAD));
  const [loading, setLoading] = useState(true);
  const [fromDemo, setFromDemo] = useState(false);
  const [mqttStatus, setMqttStatus] = useState("Disconnected");
  const [machinesMap, setMachinesMap] = useState({});
  const [globalMetrics, setGlobalMetrics] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardAPI.getProductionSummary();
      const normalized = normalizePayload(res.data);
      if (normalized) {
        setData(normalized);
        setFromDemo(false);
      } else {
        setData(normalizePayload(DEMO_PAYLOAD));
        setFromDemo(true);
      }
    } catch {
      setData(normalizePayload(DEMO_PAYLOAD));
      setFromDemo(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsubscribe = subscribeDashboardMqtt({
      onConnectionChange: setMqttStatus,
      onGlobalMessage: (metrics) => {
        setGlobalMetrics((prev) => ({
          ...prev,
          ...metrics,
          oee: metrics?.oee ?? prev.oee,
          availability: metrics?.availability ?? prev.availability,
          performance: metrics?.performance ?? prev.performance,
          quality: metrics?.quality ?? prev.quality,
          trs: metrics?.trs ?? prev.trs,
        }));
      },
      onMachineMessage: (machinePayload) => {
        if (!machinePayload?.machineId) return;
        const machineId = String(machinePayload.machineId);
        setMachinesMap((prev) => ({
          ...prev,
          [machineId]: {
            ...(prev[machineId] || {}),
            ...machinePayload,
            machineId,
            ts: Date.now(),
          },
        }));
      },
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const machines = Object.values(machinesMap);
    if (machines.length === 0) return;

    const now = new Date();
    const nowTs = now.getTime();
    const label = toTimeLabel(now);

    const totals = machines.reduce(
      (acc, machine) => {
        const runtime = Number(machine.runtime_minutes) || 0;
        const downtime = Number(machine.downtime_minutes) || 0;
        const production = Number(machine.production) || 0;
        const rejects = Number(machine.rejects) || 0;
        const expectedProduction =
          Number(machine.expected_production) || Math.max(production, 1);

        const availability = safePercent(runtime, runtime + downtime) / 100;
        const performance = safePercent(production, expectedProduction) / 100;
        const quality = safePercent(production - rejects, Math.max(production, 1)) / 100;
        const oee = availability * performance * quality;

        acc.runtime += runtime;
        acc.downtime += downtime;
        acc.production += production;
        acc.rejects += rejects;
        acc.expected += expectedProduction;
        acc.machineBars.push({
          machine: machine.machineId || "Unknown",
          quantity: Math.round(oee * 1000) / 10, // TRS/OEE % per machine
        });
        return acc;
      },
      {
        runtime: 0,
        downtime: 0,
        production: 0,
        rejects: 0,
        expected: 0,
        machineBars: [],
      }
    );

    const availability = safePercent(totals.runtime, totals.runtime + totals.downtime);
    const performance =
      globalMetrics?.performance !== undefined
        ? clampPercent(globalMetrics.performance)
        : safePercent(totals.production, totals.expected);
    const quality =
      globalMetrics?.quality !== undefined
        ? clampPercent(globalMetrics.quality)
        : safePercent(totals.production - totals.rejects, Math.max(totals.production, 1));
    const oee =
      globalMetrics?.oee !== undefined
        ? clampPercent(globalMetrics.oee)
        : clampPercent((availability / 100) * (performance / 100) * (quality / 100) * 100);

    setData((prev) => ({
      ...prev,
      production_by_hour: trimHistory(
        [
          ...(prev.production_by_hour || []).map((item) => ({
            ts: item.ts || nowTs,
            label: item.label,
            quantity: Number(item.quantity) || 0,
          })),
          { ts: nowTs, label, quantity: totals.production },
        ],
        nowTs
      ).map(({ ts, label: l, quantity }) => ({ ts, label: l, quantity })),
      performance_over_time: trimHistory(
        [
          ...(prev.performance_over_time || []).map((item) => ({
            ts: item.ts || nowTs,
            label: item.label,
            performance: Number(item.performance) || 0,
          })),
          { ts: nowTs, label, performance },
        ],
        nowTs
      ).map(({ ts, label: l, performance: p }) => ({ ts, label: l, performance: p })),
      kpis: {
        total_production_24h: totals.production,
        oee,
        availability,
        performance,
        quality,
      },
      production_by_machine: totals.machineBars,
      oee_breakdown: {
        availability,
        performance,
        quality,
      },
    }));
    setFromDemo(false);
    setLoading(false);
  }, [machinesMap, globalMetrics]);

  const k = data?.kpis || DEMO_PAYLOAD.kpis;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Production Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manufacturing KPIs and trends — last 24 hours
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
              mqttStatus === "Connected"
                ? "bg-emerald-50 text-emerald-800 ring-emerald-200/80"
                : "bg-slate-100 text-slate-700 ring-slate-200/80"
            }`}
          >
            MQTT {mqttStatus}
          </span>
          {fromDemo ? (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200/80">
              Demo data
            </span>
          ) : null}
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/50">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              Production — last 24h
            </h2>
            <Percent className="h-4 w-4 text-slate-400" aria-hidden />
          </div>
          <ProductionChart data={data.production_by_hour} />
        </article>

        <article className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/50">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              TRS per machine
            </h2>
            <Package className="h-4 w-4 text-slate-400" aria-hidden />
          </div>
          {data.production_by_machine.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">
              No machine data in this window.
            </p>
          ) : (
            <MachineChart data={data.production_by_machine} />
          )}
        </article>

        <article className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/50">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">OEE breakdown</h2>
            <Gauge className="h-4 w-4 text-slate-400" aria-hidden />
          </div>
          <OeeChart breakdown={data.oee_breakdown} />
        </article>

        <article className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/50">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              Performance over time
            </h2>
            <Activity className="h-4 w-4 text-slate-400" aria-hidden />
          </div>
          <PerformanceTrendChart data={data.performance_over_time} />
        </article>
      </section>
    </div>
  );
}
