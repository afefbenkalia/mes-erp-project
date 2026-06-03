// OrdresFabrication.jsx — MES (Design moderne sans filtre produit)
import React, { useState, useEffect } from "react";
import axios from "axios";

const MES_OF_URL = "http://127.0.0.1:8000/api/ordres-fabrication";
const MES_PROD_URL = "http://127.0.0.1:8000/api/productions";

// ─── PALETTE DE COULEURS ────────────────────────────────────────────
const C = {
  bg: "#f4f6f9",
  surface: "#ffffff",
  border: "#e3e8ef",
  accent: "#2563eb",
  accentLt: "#eff4ff",
  green: "#16a34a",
  greenLt: "#f0fdf4",
  red: "#dc2626",
  redLt: "#fef2f2",
  amber: "#d97706",
  amberLt: "#fffbeb",
  text: "#111827",
  sub: "#374151",
  muted: "#6b7280",
  inputBg: "#f9fafb",
};

// ─── STYLES ─────────────────────────────────────────────────────────
const s = {
  app: {
    fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
    background: C.bg,
    minHeight: "100vh",
    color: C.text,
  },
  topbar: {
    background: C.surface,
    borderBottom: `1px solid ${C.border}`,
    padding: "0 2rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 60,
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  logoRow: { display: "flex", alignItems: "center", gap: "0.75rem" },
  logo: {
    width: 34, height: 34,
    background: C.accent,
    borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "1rem", fontWeight: 700, color: "#fff",
  },
  h1: { margin: 0, fontSize: "1rem", fontWeight: 600, color: C.text },
  h1sub: { margin: 0, fontSize: "0.75rem", color: C.muted },
  badgeOnline: {
    background: C.greenLt, color: C.green,
    border: `1px solid #bbf7d0`,
    borderRadius: 20, padding: "3px 10px",
    fontSize: "0.72rem", fontWeight: 600,
    display: "flex", alignItems: "center", gap: 4,
  },
  dot: { width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block" },
  badgeSync: {
    background: C.accentLt, color: C.accent,
    border: `1px solid #bfdbfe`,
    borderRadius: 20, padding: "3px 10px",
    fontSize: "0.72rem", fontWeight: 600,
  },

  main: { padding: "1.75rem 2rem", maxWidth: 1400, margin: "0 auto" },

  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "1rem",
    marginBottom: "1.75rem",
  },
  kpiCard: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "1.1rem 1.25rem",
    display: "flex", alignItems: "center", gap: "1rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  kpiIcon: (lt) => ({
    width: 40, height: 40, borderRadius: 8,
    background: lt,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "1.15rem", flexShrink: 0,
  }),
  kpiLabel: { margin: "0 0 2px", fontSize: "0.72rem", color: C.muted, fontWeight: 500 },
  kpiVal: (color) => ({ margin: 0, fontSize: "1.6rem", fontWeight: 700, color: color, lineHeight: 1 }),

  section: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "1.5rem",
    marginBottom: "1.25rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  sectionHeader: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: "1.25rem",
    paddingBottom: "0.75rem",
    borderBottom: `1px solid ${C.border}`,
  },
  sectionTitle: { margin: 0, fontSize: "0.9rem", fontWeight: 600, color: C.text },
  sectionSub: { margin: 0, fontSize: "0.78rem", color: C.muted },

  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" },
  thead: { background: C.bg },
  th: {
    textAlign: "left", padding: "0.6rem 0.9rem",
    borderBottom: `1px solid ${C.border}`,
    color: C.muted, fontWeight: 600, fontSize: "0.72rem",
    textTransform: "uppercase",
  },
  tr: (i) => ({
    background: i % 2 === 0 ? "#ffffff" : C.bg,
  }),
  td: { padding: "0.7rem 0.9rem", borderBottom: `1px solid ${C.border}`, color: C.sub },

  pill: (bg, color) => ({
    display: "inline-flex", alignItems: "center",
    padding: "2px 9px", borderRadius: 20,
    fontSize: "0.72rem", fontWeight: 600,
    background: bg, color: color,
  }),

  emptyState: {
    textAlign: "center", padding: "3rem",
    color: C.muted,
  },
  emptyIcon: { fontSize: "2.5rem" },
  filterRow: {
    display: "flex",
    gap: "1rem",
    marginBottom: "1.25rem",
    flexWrap: "wrap",
  },
  filterGroup: {
    flex: 1,
    minWidth: "200px",
  },
  label: { fontSize: "0.78rem", fontWeight: 500, color: C.sub, marginBottom: "0.25rem", display: "block" },
  input: {
    padding: "0.6rem 0.85rem",
    background: C.inputBg,
    border: `1px solid ${C.border}`,
    borderRadius: 7,
    color: C.text,
    fontSize: "0.875rem",
    fontFamily: "inherit",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  select: {
    padding: "0.6rem 0.85rem",
    background: C.inputBg,
    border: `1px solid ${C.border}`,
    borderRadius: 7,
    color: C.text,
    fontSize: "0.875rem",
    fontFamily: "inherit",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    cursor: "pointer",
  },
  ofTag: {
    background: C.accentLt,
    color: C.accent,
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: "0.8rem",
    fontFamily: "monospace",
    fontWeight: 600,
  },
  quantityInfo: {
    fontSize: "0.7rem",
    color: C.muted,
    marginLeft: "0.5rem",
  },
};

// ─── FONCTIONS ─────────────────────────────────────────────────────
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

const STATUT_ICON = { "Planifié": "📅", "En cours": "⚙️", "Terminé": "✅" };
const STATUT_COLOR = {
  "Planifié": { bg: C.amberLt, color: C.amber },
  "En cours": { bg: C.accentLt, color: C.accent },
  "Terminé": { bg: C.greenLt, color: C.green },
};

const fmt = (n) => Number(n || 0).toLocaleString("fr-FR");

// ─── COMPOSANT PRINCIPAL ───────────────────────────────────────────
const OrdresFabrication = () => {
  const [ofs, setOfs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterOF, setFilterOF] = useState("");
  const [filterStatut, setFilterStatut] = useState("");

  const fetchOF = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${MES_OF_URL}/`);
      const ofsData = res.data;

      const ofsWithStatus = await Promise.all(
        ofsData.map(async (of) => {
          try {
            const prodRes = await axios.get(`${MES_PROD_URL}/?of_id=${of.id}`);
            const productions = prodRes.data;
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

  const totalOF = ofs.length;
  const ofActif = ofs.filter(o => o.statut === "En cours").length;
  const ofTermine = ofs.filter(o => o.statut === "Terminé").length;
  const ofPlanifie = ofs.filter(o => o.statut === "Planifié").length;

  const filteredOFs = ofs.filter(o =>
    (!filterOF || o.numero?.toLowerCase().includes(filterOF.toLowerCase())) &&
    (!filterStatut || o.statut === filterStatut)
  );

  return (
    <div style={s.app}>
      {/* TOPBAR */}
      <div style={s.topbar}>
        <div style={s.logoRow}>
          <div style={s.logo}>M</div>
          <div>
            <p style={s.h1}>MES — Ordres de Fabrication</p>
            <p style={s.h1sub}>Module Consultation • Réception depuis ERP</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={s.badgeOnline}><span style={s.dot} />En ligne</span>
          <span style={s.badgeSync}>Sync MES</span>
        </div>
      </div>

      <div style={s.main}>
        {/* KPI CARDS */}
        <div style={s.kpiRow}>
          <div style={s.kpiCard}>
            <div style={s.kpiIcon(C.accentLt)}>📊</div>
            <div>
              <p style={s.kpiLabel}>Total OF</p>
              <p style={s.kpiVal(C.accent)}>{totalOF}</p>
            </div>
          </div>
          <div style={s.kpiCard}>
            <div style={s.kpiIcon(C.amberLt)}>📅</div>
            <div>
              <p style={s.kpiLabel}>Planifiés</p>
              <p style={s.kpiVal(C.amber)}>{ofPlanifie}</p>
            </div>
          </div>
          <div style={s.kpiCard}>
            <div style={s.kpiIcon(C.accentLt)}>⚙️</div>
            <div>
              <p style={s.kpiLabel}>En cours</p>
              <p style={s.kpiVal(C.accent)}>{ofActif}</p>
            </div>
          </div>
          <div style={s.kpiCard}>
            <div style={s.kpiIcon(C.greenLt)}>✅</div>
            <div>
              <p style={s.kpiLabel}>Terminés</p>
              <p style={s.kpiVal(C.green)}>{ofTermine}</p>
            </div>
          </div>
        </div>

        {/* TABLEAU */}
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <div>
              <p style={s.sectionTitle}>Liste des Ordres de Fabrication</p>
              <p style={s.sectionSub}>{filteredOFs.length} OF(s) affiché(s) sur {totalOF}</p>
            </div>
          </div>

          {/* FILTRES - Sans filtre produit */}
          <div style={s.filterRow}>
            <div style={s.filterGroup}>
              <label style={s.label}>🔍 Recherche N° OF</label>
              <input
                style={s.input}
                type="text"
                placeholder="N° OF..."
                value={filterOF}
                onChange={e => setFilterOF(e.target.value)}
              />
            </div>

            <div style={s.filterGroup}>
              <label style={s.label}>📊 Statut</label>
              <select style={s.select} value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
                <option value="">Tous statuts</option>
                <option value="Planifié">📅 Planifié</option>
                <option value="En cours">⚙️ En cours</option>
                <option value="Terminé">✅ Terminé</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>⏳</div>
              <p>Chargement des ordres de fabrication...</p>
            </div>
          ) : filteredOFs.length === 0 ? (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>📭</div>
              <p>Aucun ordre de fabrication trouvé</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead style={s.thead}>
                  <tr>
                    <th style={s.th}>N° OF</th>
                    <th style={s.th}>Produit</th>
                    <th style={s.th}>Quantité</th>
                    <th style={s.th}>Début</th>
                    <th style={s.th}>Fin</th>
                    <th style={s.th}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOFs.map((o, i) => {
                    const sc = STATUT_COLOR[o.statut] || STATUT_COLOR["Planifié"];
                    const totalProduit = o.productions?.reduce((sum, p) => 
                      sum + Number(p.quantite_produit_fini || 0), 0) || 0;
                    
                    return (
                      <tr key={o.id || i} style={s.tr(i)}>
                        <td style={s.td}>
                          <code style={s.ofTag}>{o.numero}</code>
                        </td>
                        <td style={s.td}>{o.produit}</td>
                        <td style={s.td}>
                          <strong>{fmt(o.quantite)} kg</strong>
                          {totalProduit > 0 && (
                            <span style={s.quantityInfo}>
                              ({fmt(totalProduit)} kg prod.)
                            </span>
                          )}
                        </td>
                        <td style={s.td}>{o.date_debut || "—"}</td>
                        <td style={s.td}>{o.date_fin || "—"}</td>
                        <td style={s.td}>
                          <span style={s.pill(sc.bg, sc.color)}>
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
    </div>
  );
};

export default OrdresFabrication;