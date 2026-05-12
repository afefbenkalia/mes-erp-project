import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { dashboardAPI } from '../../../api/api';

const ScrapRateChart = () => {
  const [productions, setProductions] = useState([]);
  const [selectedOfNumero, setSelectedOfNumero] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProductions, setLoadingProductions] = useState(false);
  const [error, setError] = useState(null);

  const totals = data.reduce(
    (accumulator, item) => {
      accumulator.production += Number(item.production_total) || 0;
      accumulator.rebut += Number(item.rebut_total) || 0;
      return accumulator;
    },
    { production: 0, rebut: 0 }
  );

  const fetchProductions = async () => {
    try {
      setLoadingProductions(true);
      const response = await dashboardAPI.getProductionsList();
      const list = response.data || [];
      setProductions(list);
      if (!selectedOfNumero && list.length > 0) {
        setSelectedOfNumero(list[0].of_numero);
      }
      return list;
    } catch (err) {
      console.error('Erreur lors du chargement des OF:', err);
      setProductions([]);
      return [];
    } finally {
      setLoadingProductions(false);
    }
  };

  const fetchData = async (ofNumero = selectedOfNumero) => {
    if (!ofNumero) {
      setData([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await dashboardAPI.getScrapRateByOf(ofNumero);
      const mapped = (response.data || []).map((item) => ({
        machine: item.machine,
        nom_machine: item.nom_machine,
        production_total: Number(item.production_total) || 0,
        rebut_total: Number(item.rebut_total) || 0,
        rebut_rate: Number(item.rebut_rate) || 0,
        ordre: Number(item.ordre) || 0,
      }));
      mapped.sort((a, b) => a.ordre - b.ordre);
      setData(mapped);
    } catch (err) {
      console.error('Erreur lors du chargement du taux de rebut:', err);
      setError('Impossible de charger le taux de rebut');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const list = await fetchProductions();
      const firstOf = list.length > 0 ? list[0].of_numero : '';
      if (firstOf) {
        await fetchData(firstOf);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (!selectedOfNumero) return undefined;

    fetchData(selectedOfNumero);
    const timer = setInterval(() => fetchData(selectedOfNumero), 30000);
    return () => clearInterval(timer);
  }, [selectedOfNumero]);

  const handleChange = (event) => {
    const value = event.target.value || '';
    setSelectedOfNumero(value);
    if (value) {
      fetchData(value);
    } else {
      setData([]);
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
        <p className="text-sm font-semibold text-slate-900">{item.nom_machine}</p>
        <p className="mt-1 text-xs text-slate-500">Taux de rebut</p>
        <p className="mt-1 text-base font-semibold text-blue-600">{item.rebut_rate.toFixed(2)} %</p>
        <p className="mt-2 text-xs text-slate-500">Production totale: {item.production_total.toFixed(2)}</p>
        <p className="text-xs text-slate-500">Déchets totaux: {item.rebut_total.toFixed(2)}</p>
      </div>
    );
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="py-16 text-center text-sm text-slate-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
      <div className="mb-3 flex flex-col gap-2.5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">Taux de rebut</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Calcul par machine pour un seul OF, à partir de <span className="font-medium text-slate-700">etapes_production</span>.
          </p>
        </div>

        <div className="w-full lg:w-[320px]">
          <label htmlFor="scrap-of-select" className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Sélectionner un OF
          </label>
          <select
            id="scrap-of-select"
            value={selectedOfNumero}
            onChange={handleChange}
            disabled={loadingProductions}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Sélectionner un OF</option>
            {productions.map((prod) => (
              <option key={prod.production_id} value={prod.of_numero}>
                {prod.of_numero}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">OF courant</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{selectedOfNumero || 'Aucun'}</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">Machines affichées</p>
          <p className="mt-1 text-sm font-semibold text-blue-900">{data.length} étapes de production</p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">Taux moyen</p>
          <p className="mt-1 text-sm font-semibold text-emerald-900">
            {totals.production > 0 ? ((totals.rebut / totals.production) * 100).toFixed(2) : '0.00'} %
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200/60 bg-gradient-to-b from-slate-50/80 to-white p-3">
        <div className="h-56 w-full">
          {loading && data.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="inline-block animate-spin mb-3">
                  <div className="h-8 w-8 rounded-full border-3 border-blue-200 border-t-blue-600" />
                </div>
                <p className="text-sm text-slate-500">Chargement...</p>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600 mb-1">Aucune donnée disponible</p>
                <p className="text-xs text-slate-500">Aucune production n'a été lancée depuis minuit (00:00)</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 6, right: 12, left: 6, bottom: 36 }}>
                <defs>
                  <linearGradient id="scrapAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.32} />
                    <stop offset="50%" stopColor="#f97316" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="scrapLineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="50%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} opacity={0.4} />

                <XAxis
                  dataKey="nom_machine"
                  tick={{ fontSize: 9, fill: '#64748b', fontWeight: 500 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0', strokeWidth: 1.5 }}
                  interval={0}
                  angle={-12}
                  textAnchor="end"
                  height={42}
                />

                <YAxis
                  tick={{ fontSize: 9, fill: '#64748b', fontWeight: 500 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0', strokeWidth: 1.5 }}
                  width={32}
                  domain={[0, 100]}
                  label={{
                    value: 'Taux de rebut (%)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fill: '#94a3b8', fontSize: 9, fontWeight: 500, offset: 10 },
                  }}
                />

                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: '#ef4444', strokeWidth: 2, opacity: 0.28, fill: 'rgba(239, 68, 68, 0.06)' }}
                />

                <Area
                  type="monotone"
                  dataKey="rebut_rate"
                  stroke="url(#scrapLineGradient)"
                  strokeWidth={2}
                  fill="url(#scrapAreaGradient)"
                  dot={false}
                  activeDot={{
                    r: 6,
                    fill: '#ef4444',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                    filter: 'drop-shadow(0 2px 8px rgba(239, 68, 68, 0.3))',
                  }}
                  animationDuration={1000}
                  animationEasing="ease-in-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-gradient-to-r from-red-500 to-orange-500" />
          <span>Taux de rebut par machine</span>
        </div>
        {loading && data.length > 0 ? (
          <span className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Actualisation...
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default ScrapRateChart;