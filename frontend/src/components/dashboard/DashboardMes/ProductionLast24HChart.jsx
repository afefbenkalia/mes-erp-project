import React, { useState, useEffect } from 'react';
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

const ProductionLast24HChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalProductionFinal, setTotalProductionFinal] = useState(0);
  const [productionId, setProductionId] = useState(null);
  const [productions, setProductions] = useState([]);
  const [loadingProductions, setLoadingProductions] = useState(false);

  const selectedProduction = productions.find((prod) => prod.production_id === productionId);

  // Récupère la liste des productions et sélectionne la plus récente par défaut
  const fetchProductions = async () => {
    try {
      setLoadingProductions(true);
      const response = await dashboardAPI.getProductionsList();
      const list = response.data || [];
      setProductions(list);
      if (!productionId && list.length > 0) {
        setProductionId(list[0].production_id);
      }
      return list;
    } catch (err) {
      console.error('Erreur lors de la récupération de la liste des productions:', err);
      setProductions([]);
      return [];
    } finally {
      setLoadingProductions(false);
    }
  };

  // Récupère les données de l'API pour la production sélectionnée
  const fetchData = async (prodId = productionId) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!prodId) {
        setData([]);
        setTotalProductionFinal(0);
        return;
      }
      
      const response = await dashboardAPI.getProductionLast24h(prodId);
      
      // Mappe les données pour le graphique
      const mappedData = response.data.map((item) => ({
        nom_machine: item.nom_machine,
        machine: item.machine,
        qte_sortie: parseFloat(item.qte_sortie),
        ordre: item.ordre || 0,
      }));
      
      // Trie par ordre de passage
      mappedData.sort((a, b) => a.ordre - b.ordre);
      
      // Calcule la "Total Production" = qte_sortie de la dernière machine
      const finalProduction = mappedData.length > 0 
        ? mappedData[mappedData.length - 1].qte_sortie 
        : 0;
      
      setData(mappedData);
      setTotalProductionFinal(finalProduction);
    } catch (err) {
      console.error('Erreur lors de la récupération des données:', err);
      setError('Erreur lors de la récupération des données');
    } finally {
      setLoading(false);
    }
  };

  // Gère le changement de production dans le dropdown
  const handleProductionChange = (e) => {
    const newProdId = e.target.value ? parseInt(e.target.value) : null;
    setProductionId(newProdId);
    if (newProdId) {
      fetchData(newProdId);
    } else {
      setData([]);
      setTotalProductionFinal(0);
    }
  };

  // Récupère la liste des productions au montage
  useEffect(() => {
    const initializeProduction = async () => {
      const list = await fetchProductions();
      const initialProductionId = list.length > 0 ? list[0].production_id : null;
      if (initialProductionId) {
        setProductionId(initialProductionId);
      }
    };
    
    initializeProduction();
  }, []);

  // Recharge le chart à chaque changement de production et toutes les 30 secondes
  useEffect(() => {
    if (!productionId) {
      return undefined;
    }

    fetchData(productionId);

    const dataInterval = setInterval(() => {
      fetchData(productionId);
    }, 30000);
    
    return () => {
      clearInterval(dataInterval);
    };
  }, [productionId]);

  // Tooltip moderne et élégant
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div 
          style={{
            borderRadius: '12px',
            border: 'none',
            boxShadow: '0 10px 32px rgba(0, 0, 0, 0.14)',
            backgroundColor: '#ffffff',
            padding: '14px 18px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <p style={{ color: '#1e293b', fontSize: 13, margin: 0, fontWeight: 700 }}>
            {dataPoint.nom_machine}
          </p>
          <p style={{ color: '#64748b', fontSize: 11, margin: '6px 0 0 0' }}>
            Production
          </p>
          <p style={{ color: '#2563eb', fontSize: 16, margin: '4px 0 0 0', fontWeight: 700 }}>
            {dataPoint.qte_sortie.toFixed(2)} u
          </p>
        </div>
      );
    }
    return null;
  };

  if (error) {
    return (
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex h-80 items-center justify-center">
          <div className="text-center">
            <p className="text-slate-500 font-medium mb-3">⚠️ {error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0 && !loading) {
    return (
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex h-80 items-center justify-center">
          <p className="text-sm text-slate-500">Aucune donnée disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Card Container avec design moderne premium */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
        
        {/* Header Section */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-slate-900 mb-1">
                Production Last 24H
              </h2>
              <p className="text-[11px] text-slate-500">
                Courbe de production par machine au cours des dernières 24 heures
              </p>
            </div>
            
            {/* Dropdown Production Filter */}
            <div className="w-full sm:w-auto">
              <label htmlFor="production-select" className="mb-1 block text-[10px] text-slate-600 uppercase font-semibold tracking-wider">
                Sélectionner une production
              </label>
              <select
                id="production-select"
                value={productionId || ''}
                onChange={handleProductionChange}
                disabled={loadingProductions}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-900 transition-all hover:border-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">-- Sélectionner --</option>
                {productions.map((prod) => (
                  <option key={prod.production_id} value={prod.production_id}>
                    {prod.of_numero}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Statistiques KPI */}
        <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-lg border border-slate-200/60 bg-gradient-to-br from-slate-50 to-slate-100/40 p-3 transition-all hover:border-slate-300 hover:bg-slate-100/40">
            <p className="text-[10px] text-slate-600 uppercase font-semibold tracking-wider">Total Machines</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{data.length}</p>
            <p className="mt-0.5 text-[10px] text-slate-500">Chaîne de production</p>
          </div>
          
          <div className="rounded-lg border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-emerald-100/30 p-3 transition-all hover:border-emerald-300 hover:bg-emerald-100/30">
            <p className="text-[10px] text-emerald-600 uppercase font-semibold tracking-wider">Production Finale</p>
            <p className="mt-1 text-xl font-bold text-emerald-900">
              {totalProductionFinal.toFixed(2)}
            </p>
            <p className="mt-0.5 text-[10px] text-emerald-600">Sortie étape 11</p>
          </div>
        </div>

        {/* Graphique avec styling moderne */}
        <div className="rounded-lg border border-slate-200/40 bg-gradient-to-b from-slate-50/60 to-white p-3">
          <div className="h-56 w-full">
            {loading && data.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="inline-block animate-spin mb-3">
                    <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full"></div>
                  </div>
                  <p className="text-sm text-slate-500">Chargement...</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{ top: 6, right: 10, left: 4, bottom: 34 }}
                >
                  <defs>
                    {/* Gradient bleu industriel moderne */}
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="50%" stopColor="#1e40af" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#1e40af" stopOpacity={0.02} />
                    </linearGradient>
                    
                    {/* Gradient pour la ligne */}
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#2563eb" />
                      <stop offset="50%" stopColor="#1e40af" />
                      <stop offset="100%" stopColor="#1e3a8a" />
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid 
                    strokeDasharray="4 4" 
                    stroke="#e2e8f0" 
                    vertical={false}
                    opacity={0.4}
                  />
                  
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
                    label={{
                      value: 'Quantité',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fill: '#94a3b8', fontSize: 9, fontWeight: 500, offset: 10 }
                    }}
                  />
                  
                  <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{ stroke: '#2563eb', strokeWidth: 2, opacity: 0.3, fill: 'rgba(37, 99, 235, 0.08)' }}
                  />
                  
                  <Area
                    type="monotone"
                    dataKey="qte_sortie"
                    stroke="url(#lineGradient)"
                    strokeWidth={2}
                    fill="url(#areaGradient)"
                    dot={false}
                    activeDot={{
                      r: 6,
                      fill: '#2563eb',
                      stroke: '#ffffff',
                      strokeWidth: 2,
                      filter: 'drop-shadow(0 2px 8px rgba(37, 99, 235, 0.3))'
                    }}
                    animationDuration={1000}
                    animationEasing="ease-in-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-700"></div>
            <span>Production en temps réel</span>
          </div>
          {loading && data.length > 0 && (
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              Actualisation...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductionLast24HChart;
