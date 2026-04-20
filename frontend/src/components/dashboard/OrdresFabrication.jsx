// OrdresFabrication.jsx — MES (CORRIGÉ)
import React, { useState, useEffect } from "react";
import axios from "axios";

const MES_OF_URL = "http://127.0.0.1:8000/api/ordres-fabrication";
const MES_PROD_URL = "http://127.0.0.1:8000/api/productions";

const MACHINES = ["Carde 01", "Carde 02", "Carde 03", "Carde 04", "Carde 05"];

// ✅ CORRIGÉ: Utiliser quantite_produit_fini au lieu de quantite
const computeStatut = (of, productions = []) => {
  if (!productions || productions.length === 0) return "Planifié";
  
  const produced = productions.reduce((sum, p) => {
    const qty = Number(p.quantite_produit_fini || p.quantite || 0);
    return sum + qty;
  }, 0);
  
  const quantiteTotale = Number(of.quantite || 0);
  
  if (produced >= quantiteTotale && quantiteTotale > 0) return "Terminé";
  if (produced > 0) return "En cours";
  return "Planifié";
};

const STATUT_STYLE = {
  "Planifié": { bg: "#dbeafe", color: "#1e40af" },
  "En cours": { bg: "#fef3c7", color: "#92400e" },
  "Terminé":  { bg: "#d1fae5", color: "#065f46" },
};

const STATUT_ICON = { "Planifié": "📅", "En cours": "⚙️", "Terminé": "✅" };

const OrdresFabrication = () => {
  const [ofs, setOfs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterMachine, setFilterMachine] = useState("");
  const [filterOF, setFilterOF] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const fetchOF = async () => {
    setLoading(true);
    try {
      // ✅ Récupérer tous les OF
      const res = await axios.get(`${MES_OF_URL}/`);
      const ofsData = res.data;

      // ✅ Pour chaque OF, récupérer ses productions et calculer le statut
      const ofsWithStatus = await Promise.all(
        ofsData.map(async (of) => {
          try {
            // Récupérer les productions pour cet OF
            const prodRes = await axios.get(`${MES_PROD_URL}/?of_id=${of.id}`);
            const productions = prodRes.data;
            
            // ✅ Calculer le statut avec les productions
            const statut = computeStatut(of, productions);
            
            return {
              ...of,
              productions: productions,
              statut: statut
            };
          } catch (error) {
            console.error(`Erreur chargement productions OF ${of.id}:`, error);
            return {
              ...of,
              productions: [],
              statut: "Planifié"
            };
          }
        })
      );

      setOfs(ofsWithStatus);
    } catch (err) {
      console.error("Erreur fetch OFs MES:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchOF(); 
  }, []);

  const getCurrentDate = () => {
    const days = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
    const months = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    const d = new Date();
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const totalOF = ofs.length;
  const ofActif = ofs.filter(o => o.statut === "En cours").length;
  const ofTermine = ofs.filter(o => o.statut === "Terminé").length;
  const ofPlanifie = ofs.filter(o => o.statut === "Planifié").length;

  const filteredOFs = ofs.filter(o =>
    (!filterMachine || o.machine === filterMachine) &&
    (!filterOF || o.numero?.toLowerCase().includes(filterOF.toLowerCase())) &&
    (!filterStatut || o.statut === filterStatut) &&
    (!filterDate || o.date_debut === filterDate)
  );

  return (
    <div style={s.container}>
      {/* HEADER */}
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "2.2rem" }}>📋</span>
          <div>
            <h1 style={s.title}>MES – ORDRES DE FABRICATION</h1>
            <p style={s.subtitle}>Module Consultation • Réception depuis ERP • Version 2.1</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ color: "#64748b", fontSize: "0.9rem" }}>{getCurrentDate()}</span>
          <button style={s.btnRefresh} onClick={fetchOF} disabled={loading}>
            {loading ? "⏳" : "🔄"} Actualiser
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div style={s.kpiGrid}>
        {[
          { label: "Total OF", value: totalOF, icon: "📊", color: "#2563eb" },
          { label: "Planifiés", value: ofPlanifie, icon: "📅", color: "#6366f1" },
          { label: "En cours", value: ofActif, icon: "⚙️", color: "#f59e0b" },
          { label: "Terminés", value: ofTermine, icon: "✅", color: "#10b981" },
        ].map((k) => (
          <div key={k.label} style={{ ...s.kpiCard, borderLeft: `4px solid ${k.color}` }}>
            <span style={{ fontSize: "1.8rem", background: "#f1f5f9", padding: "0.6rem", borderRadius: "10px" }}>{k.icon}</span>
            <div>
              <p style={s.kpiLabel}>{k.label}</p>
              <p style={{ ...s.kpiValue, color: k.color }}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CONTENU */}
      <div style={s.content}>
        <h2 style={s.sectionTitle}>Liste des Ordres de Fabrication</h2>

        {/* FILTRES */}
        <div style={s.filterRow}>
          <select style={s.select} value={filterMachine} onChange={e => setFilterMachine(e.target.value)}>
            <option value="">Toutes les machines</option>
            {MACHINES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <input
            style={s.input}
            type="text"
            placeholder="🔍 Recherche N° OF..."
            value={filterOF}
            onChange={e => setFilterOF(e.target.value)}
          />

          <select style={s.select} value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
            <option value="">Tous statuts</option>
            <option value="Planifié">📅 Planifié</option>
            <option value="En cours">⚙️ En cours</option>
            <option value="Terminé">✅ Terminé</option>
          </select>

          <input
            style={s.input}
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
          />
        </div>

        {/* RÉSULTAT */}
        <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginBottom: "1rem" }}>
          {filteredOFs.length} OF(s) affiché(s) sur {totalOF}
        </p>

        {loading ? (
          <div style={s.empty}>⏳ Chargement des ordres de fabrication...</div>
        ) : filteredOFs.length === 0 ? (
          <div style={s.empty}>
            <span style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}>📭</span>
            Aucun ordre de fabrication trouvé
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["N° OF", "Machine", "Produit", "Quantité", "Produit", "Début", "Fin", "Statut"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOFs.map((o, i) => {
                  const ss = STATUT_STYLE[o.statut] || { bg: "#f1f5f9", color: "#475569" };
                  // Calculer la quantité totale produite pour affichage
                  const totalProduit = o.productions?.reduce((sum, p) => 
                    sum + Number(p.quantite_produit_fini || 0), 0) || 0;
                  
                  return (
                    <tr key={o.id || i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                      <td style={s.td}>
                        <span style={s.ofTag}>{o.numero}</span>
                      </td>
                      <td style={s.td}>{o.machine}</td>
                      <td style={s.td}>{o.produit}</td>
                      <td style={s.td}>
                        <strong>{o.quantite}</strong> kg
                        {totalProduit > 0 && (
                          <span style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: "0.5rem" }}>
                            ({totalProduit} kg prod.)
                          </span>
                        )}
                      </td>
                      <td style={s.td}>{o.date_debut || "—"}</td>
                      <td style={s.td}>{o.date_fin || "—"}</td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: ss.bg, color: ss.color }}>
                          {STATUT_ICON[o.statut]} {o.statut}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const s = {
  container: {
    padding: "2rem",
    background: "#f8fafc",
    minHeight: "100vh",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#fff",
    padding: "1.5rem 2rem",
    borderRadius: "16px",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.08)",
    marginBottom: "2rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  title: { margin: 0, color: "#0f172a", fontSize: "1.6rem", fontWeight: "700" },
  subtitle: { margin: 0, color: "#64748b", fontSize: "0.85rem" },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: "1.25rem",
    marginBottom: "2rem",
  },
  kpiCard: {
    background: "#fff",
    padding: "1.25rem",
    borderRadius: "12px",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.08)",
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  kpiLabel: { margin: "0 0 0.25rem", color: "#64748b", fontSize: "0.85rem" },
  kpiValue: { margin: 0, fontSize: "2rem", fontWeight: "700" },
  content: {
    background: "#fff",
    borderRadius: "16px",
    padding: "2rem",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.08)",
  },
  sectionTitle: { margin: "0 0 1.5rem", color: "#0f172a", fontSize: "1.2rem", fontWeight: "600" },
  filterRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: "1rem",
    marginBottom: "1.25rem",
  },
  input: {
    padding: "0.7rem 1rem",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "0.9rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    background: "#fff",
  },
  select: {
    padding: "0.7rem 1rem",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "0.9rem",
    background: "#fff",
    cursor: "pointer",
    width: "100%",
    boxSizing: "border-box",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" },
  th: {
    textAlign: "left",
    padding: "0.75rem 1rem",
    borderBottom: "2px solid #e2e8f0",
    color: "#64748b",
    fontWeight: "600",
    fontSize: "0.85rem",
    whiteSpace: "nowrap",
  },
  td: { padding: "0.75rem 1rem", borderBottom: "1px solid #f1f5f9", color: "#1e293b" },
  ofTag: {
    background: "#e2e8f0",
    color: "#334155",
    padding: "0.2rem 0.5rem",
    borderRadius: "4px",
    fontSize: "0.82rem",
    fontWeight: "600",
    fontFamily: "monospace",
  },
  badge: {
    padding: "0.25rem 0.75rem",
    borderRadius: "20px",
    fontSize: "0.82rem",
    fontWeight: "600",
    display: "inline-block",
    whiteSpace: "nowrap",
  },
  btnRefresh: {
    padding: "0.6rem 1.2rem",
    background: "#f1f5f9",
    color: "#475569",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "0.9rem",
  },
  empty: { textAlign: "center", padding: "3rem", color: "#94a3b8" },
};

export default OrdresFabrication;