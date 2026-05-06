/**
 * Traceability.jsx – Module Traçabilité MES
 * 3 onglets : Suivi par lot | Historisation | Association Machines
 * Association Machines : paramètres temps réel depuis le simulateur MQTT
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { subscribeMachineRealtime } from "../../services/telemetrySocket";

// ── URLs API ──────────────────────────────────────────────────────────────────
const BASE      = "http://127.0.0.1:8000/api";
const TRACE_URL = `${BASE}/traceability`;
const PROD_URL  = `${BASE}/productions/`;

// ── Séquence machines atelier cardage ─────────────────────────────────────────
const SEQUENCE_MACHINES = [
  { ordre:1,  code:"CT-ALIM-01", nom:"Alimentation" },
  { ordre:2,  code:"CT-COND-01", nom:"Condenseur 1" },
  { ordre:3,  code:"CT-NET-01",  nom:"Nettoyeuse"   },
  { ordre:4,  code:"CT-COND-02", nom:"Condenseur 2" },
  { ordre:5,  code:"CT-CARD-01", nom:"Cardage 1"    },
  { ordre:6,  code:"CT-CARD-02", nom:"Cardage 2"    },
  { ordre:7,  code:"CT-CARD-03", nom:"Cardage 3"    },
  { ordre:8,  code:"CT-COND-03", nom:"Condenseur 3" },
  { ordre:9,  code:"CT-INJ-01",  nom:"Injection"    },
  { ordre:10, code:"CT-SEC-01",  nom:"Séchage"      },
  { ordre:11, code:"CT-BOB-01",  nom:"Bobinage"     },
];

// Le simulateur publie avec machine_reference = machine.reference (depuis DB)
// On mappe code MES → reference DB pour faire le join avec les données MQTT
// Exemples : "CT-ALIM-01" → cherché dans realtimeData par référence ou par code
const STATUT_COLORS = {
  TERMINE    : { bg:"#d1fae5", text:"#065f46", dot:"#10b981" },
  EN_COURS   : { bg:"#fef3c7", text:"#92400e", dot:"#f59e0b" },
  EN_ATTENTE : { bg:"#e2e8f0", text:"#475569", dot:"#94a3b8" },
};

const ETAT_COLORS = {
  MARCHE     : { color:"#10b981", bg:"#d1fae5" },
  PAUSE      : { color:"#ef4444", bg:"#fee2e2" },
  ERREUR     : { color:"#991b1b", bg:"#fee2e2" },
  MAINTENANCE: { color:"#d97706", bg:"#fef3c7" },
};

const EVENEMENT_LABELS = {
  production_lancee : "🚀 Lancement",
  etape_validee     : "✅ Étape validée",
  rebut             : "⚠️ Rebut",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt    = (v, suffix="") => v != null && !isNaN(v) ? `${parseFloat(v).toFixed(2)}${suffix}` : "—";
const fmtPct = (v) => v != null && !isNaN(v) ? `${parseFloat(v).toFixed(1)}%` : "—";
const fmtTs  = (ts) => ts ? new Date(ts).toLocaleTimeString("fr-FR") : "—";

// ── Composants UI ─────────────────────────────────────────────────────────────

const StatutBadge = ({ statut }) => {
  const c = STATUT_COLORS[statut] || STATUT_COLORS.EN_ATTENTE;
  return (
    <span style={{ background:c.bg, color:c.text, padding:"2px 10px",
      borderRadius:20, fontSize:12, fontWeight:600,
      display:"inline-flex", alignItems:"center", gap:5 }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:c.dot, flexShrink:0 }} />
      {statut?.replace("_"," ")}
    </span>
  );
};

const EtatBadge = ({ etat }) => {
  if (!etat) return <span style={{ color:"#cbd5e1", fontSize:12 }}>—</span>;
  const c = ETAT_COLORS[etat] || { color:"#64748b", bg:"#f1f5f9" };
  return (
    <span style={{ background:c.bg, color:c.color, padding:"2px 10px",
      borderRadius:20, fontSize:11, fontWeight:700,
      display:"inline-flex", alignItems:"center", gap:4 }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:c.color }} />
      {etat}
    </span>
  );
};

const KpiCard = ({ label, value, sub, color="#2563eb", icon }) => (
  <div style={{ background:"#fff", borderRadius:12, padding:"1.1rem 1.25rem",
    boxShadow:"0 1px 4px rgba(0,0,0,0.07)", borderLeft:`4px solid ${color}`,
    display:"flex", alignItems:"center", gap:"1rem" }}>
    <span style={{ fontSize:22 }}>{icon}</span>
    <div>
      <div style={{ fontSize:11, color:"#64748b", fontWeight:600,
        textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color, lineHeight:1.2 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{sub}</div>}
    </div>
  </div>
);

// ── Jauge mini (pour température / pression / vitesse) ───────────────────────
const MiniGauge = ({ label, value, unit, min, max, color }) => {
  const pct = value != null ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11 }}>
        <span style={{ color:"#64748b", fontWeight:600 }}>{label}</span>
        <span style={{ color, fontWeight:700 }}>
         {value != null
         ? `${value % 1 !== 0 ? value.toFixed(1) : value} ${unit}`
           : "—"}
        </span>
      </div>
      <div style={{ background:"#e2e8f0", borderRadius:99, height:6, overflow:"hidden" }}>
        <div style={{
          width:`${pct}%`, height:6, borderRadius:99,
          background: color, transition:"width 1s ease",
        }} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  ONGLET 1 – SUIVI PAR LOT
// ─────────────────────────────────────────────────────────────────────────────

const SuiviLot = ({ productions }) => {
  const [selectedId, setSelectedId] = useState(null);
  const [lot, setLot]               = useState(null);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState("");
  const [filterStatut, setFilterStatut] = useState("TOUS");

  const filtered = useMemo(() => {
    let list = [...productions];
    if (filterStatut !== "TOUS") list = list.filter(p => p.statut === filterStatut);
    if (search) list = list.filter(p =>
      p.of_numero?.toLowerCase().includes(search.toLowerCase()) ||
      p.produit_fini?.toLowerCase().includes(search.toLowerCase())
    );
    return list;
  }, [productions, filterStatut, search]);

  const loadLot = useCallback(async (id) => {
    setLoading(true);
    try {
      let data;
      try {
        const r = await axios.get(`${TRACE_URL}/lots/${id}`);
        data = r.data;
      } catch {
        const r = await axios.get(`${PROD_URL}${id}`);
        const p = r.data;
        data = {
          ...p,
          date_production: p.date,
          rendement_global: p.quantite_matiere_premiere && p.quantite_produit_fini
            ? ((p.quantite_produit_fini / p.quantite_matiere_premiere) * 100).toFixed(1)
            : null,
          total_rebuts: 0,
          etapes: (p.etapes || []).map(e => ({
            ...e,
            perte: e.qte_entree != null && e.qte_sortie != null
              ? (e.qte_entree - e.qte_sortie).toFixed(3) : null,
            rendement: e.qte_entree && e.qte_sortie
              ? ((e.qte_sortie / e.qte_entree) * 100).toFixed(1) : null,
          })),
        };
      }
      setLot(data);
      setSelectedId(id);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div style={{ display:"grid", gridTemplateColumns:"360px 1fr", gap:"1.5rem", alignItems:"start" }}>
      {/* Liste */}
      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(0,0,0,0.07)", overflow:"hidden" }}>
        <div style={{ padding:"1rem", borderBottom:"1px solid #f1f5f9" }}>
          <input placeholder="🔍  Rechercher OF, produit…" value={search}
            onChange={e => setSearch(e.target.value)} style={s.inputSm} />
          <div style={{ display:"flex", gap:6, marginTop:8 }}>
            {["TOUS","EN_COURS","TERMINE"].map(st => (
              <button key={st} onClick={() => setFilterStatut(st)}
                style={{ ...s.filterBtn, ...(filterStatut===st ? s.filterBtnActive : {}) }}>
                {st==="TOUS"?"Tous":st==="EN_COURS"?"En cours":"Terminés"}
              </button>
            ))}
          </div>
        </div>
        <div style={{ maxHeight:520, overflowY:"auto" }}>
          {filtered.length === 0 && (
            <div style={{ padding:"2rem", textAlign:"center", color:"#94a3b8" }}>Aucune production</div>
          )}
          {filtered.map(p => (
            <div key={p.production_id||p.id} onClick={() => loadLot(p.production_id||p.id)}
              style={{ padding:"0.85rem 1rem", borderBottom:"1px solid #f8fafc", cursor:"pointer",
                background: selectedId===(p.production_id||p.id) ? "#eff6ff" : "transparent",
                borderLeft: selectedId===(p.production_id||p.id) ? "3px solid #2563eb" : "3px solid transparent" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontWeight:700, fontSize:13, color:"#0f172a" }}>{p.of_numero}</span>
                <StatutBadge statut={p.statut} />
              </div>
              <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>{p.produit_fini}</div>
              <div style={{ display:"flex", gap:12, marginTop:4, fontSize:11, color:"#94a3b8" }}>
                <span>🎯 {fmt(p.quantite_produit_fini)} kg</span>
                <span>📊 {fmtPct(p.rendement_global)}</span>
                <span>📅 {p.date_production||p.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fiche détail */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"4rem", color:"#94a3b8" }}>⏳ Chargement…</div>
      ) : lot ? (
        <LotDetail lot={lot} />
      ) : (
        <div style={{ textAlign:"center", padding:"4rem", color:"#94a3b8" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
          <div>Sélectionnez une production pour voir sa fiche de traçabilité</div>
        </div>
      )}
    </div>
  );
};

const LotDetail = ({ lot }) => {
  const etapesDone = (lot.etapes||[]).filter(e => String(e.statut).includes("TERMINE")).length;
  const pct = lot.nb_etapes_total ? Math.round((etapesDone/lot.nb_etapes_total)*100) : 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div style={{ background:"#fff", borderRadius:14, padding:"1.25rem 1.5rem", boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:11, color:"#94a3b8", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em" }}>
              Ordre de fabrication
            </div>
            <div style={{ fontSize:20, fontWeight:800, color:"#0f172a" }}>{lot.of_numero}</div>
            <div style={{ fontSize:14, color:"#64748b", marginTop:2 }}>{lot.produit_fini}</div>
          </div>
          <StatutBadge statut={lot.statut} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"1rem", marginTop:"1.25rem" }}>
          {[
            { label:"Produit fini",     value:fmt(lot.quantite_produit_fini," kg"),     color:"#2563eb" },
            { label:"Matière première", value:fmt(lot.quantite_matiere_premiere," kg"), color:"#8b5cf6" },
            { label:"Rendement global", value:fmtPct(lot.rendement_global),             color:"#10b981" },
            { label:"Total rebuts",     value:fmt(lot.total_rebuts," kg"),              color:"#ef4444" },
          ].map(k => (
            <div key={k.label} style={{ textAlign:"center", padding:"0.6rem",
              background:"#f8fafc", borderRadius:10 }}>
              <div style={{ fontSize:11, color:"#94a3b8", fontWeight:600 }}>{k.label}</div>
              <div style={{ fontSize:16, fontWeight:700, color:k.color, marginTop:2 }}>{k.value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:"1.25rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#64748b", marginBottom:6 }}>
            <span>Avancement pipeline</span>
            <span style={{ fontWeight:700 }}>{etapesDone}/{lot.nb_etapes_total||11} étapes — {pct}%</span>
          </div>
          <div style={{ background:"#e2e8f0", borderRadius:99, height:8 }}>
            <div style={{ width:`${pct}%`, height:8, borderRadius:99,
              background:pct===100?"#10b981":"linear-gradient(90deg,#2563eb,#3b82f6)",
              transition:"width 0.5s" }} />
          </div>
        </div>
      </div>

      {/* Tableau étapes */}
      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(0,0,0,0.07)", overflow:"hidden" }}>
        <div style={{ padding:"1rem 1.25rem", borderBottom:"1px solid #f1f5f9" }}>
          <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:"#0f172a" }}>🔗 Suivi étape par étape</h3>
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                {["#","Machine","Opérateur","Entrée (kg)","Sortie (kg)","Perte (kg)","Rendement","Début","Fin","Statut"].map(h =>
                  <th key={h} style={s.th}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {(lot.etapes||[]).map((e,i) => {
                const isTermine = String(e.statut).includes("TERMINE");
                const isEnCours = String(e.statut).includes("EN_COURS");
                const rend = parseFloat(e.rendement);
                const rendColor = rend>=95?"#10b981":rend>=85?"#f59e0b":"#ef4444";
                return (
                  <tr key={e.ordre} style={{ background:i%2===0?"#fff":"#fafafa" }}>
                    <td style={{ ...s.td, fontWeight:700, color:"#475569", width:32 }}>{e.ordre}</td>
                    <td style={s.td}>
                      <div style={{ fontWeight:600, fontSize:12, fontFamily:"monospace", color:"#0f172a" }}>{e.machine}</div>
                      <div style={{ fontSize:11, color:"#94a3b8" }}>{e.nom_machine}</div>
                    </td>
                    <td style={{ ...s.td, fontSize:12 }}>{e.operateur||"—"}</td>
                    <td style={{ ...s.td, textAlign:"right", fontFamily:"monospace" }}>
                      {isTermine||isEnCours ? fmt(e.qte_entree) : <span style={{ color:"#cbd5e1" }}>—</span>}
                    </td>
                    <td style={{ ...s.td, textAlign:"right", fontFamily:"monospace" }}>
                      {isTermine ? fmt(e.qte_sortie) : <span style={{ color:"#cbd5e1" }}>—</span>}
                    </td>
                    <td style={{ ...s.td, textAlign:"right", fontFamily:"monospace", color:"#ef4444" }}>
                      {isTermine ? fmt(e.perte) : <span style={{ color:"#cbd5e1" }}>—</span>}
                    </td>
                    <td style={{ ...s.td, textAlign:"right" }}>
                      {isTermine && e.rendement
                        ? <span style={{ color:rendColor, fontWeight:700 }}>{fmtPct(e.rendement)}</span>
                        : <span style={{ color:"#cbd5e1" }}>—</span>}
                    </td>
                    <td style={{ ...s.td, fontSize:11, color:"#64748b" }}>{e.debut||"—"}</td>
                    <td style={{ ...s.td, fontSize:11, color:"#64748b" }}>{e.fin||"—"}</td>
                    <td style={s.td}>
                      <StatutBadge statut={isTermine?"TERMINE":isEnCours?"EN_COURS":"EN_ATTENTE"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rebuts */}
      {lot.rebuts?.length > 0 && (
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 1px 4px rgba(0,0,0,0.07)", overflow:"hidden" }}>
          <div style={{ padding:"1rem 1.25rem", borderBottom:"1px solid #f1f5f9" }}>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:"#0f172a" }}>
              ⚠️ Rebuts ({lot.rebuts.length})
            </h3>
          </div>
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                {["Machine","Type de défaut","Quantité (kg)","Date"].map(h => <th key={h} style={s.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {lot.rebuts.map((r,i) => (
                <tr key={r.id} style={{ background:i%2===0?"#fff":"#fafafa" }}>
                  <td style={s.td}><span style={s.codeBadge}>{r.machine}</span></td>
                  <td style={s.td}>{r.defaut}</td>
                  <td style={{ ...s.td, fontFamily:"monospace", color:"#ef4444", fontWeight:700 }}>{fmt(r.quantite)} kg</td>
                  <td style={{ ...s.td, fontSize:12, color:"#64748b" }}>{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  ONGLET 2 – HISTORISATION
// ─────────────────────────────────────────────────────────────────────────────

const Historisation = ({ productions }) => {
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [filterProd, setFilterProd] = useState("");
  const [filterMachine, setFilterMachine] = useState("");
  const [filterEvt, setFilterEvt]   = useState("");

  const loadHistorique = useCallback(async () => {
    setLoading(true);
    try {
      try {
        const params = {};
        if (filterProd)    params.production_id = parseInt(filterProd);
        if (filterMachine) params.machine = filterMachine;
        if (filterEvt)     params.evenement = filterEvt;
        const r = await axios.get(`${TRACE_URL}/historique`, { params });
        setHistorique(r.data);
      } catch {
        const r = await axios.get(PROD_URL);
        const hist = [];
        for (const p of r.data) {
          try {
            const det = await axios.get(`${PROD_URL}${p.id}`);
            hist.push({ id:`launch-${p.id}`, evenement:"production_lancee",
              of_id:p.of_id, production_id:p.id, machine:null, etape_id:null,
              quantite_produit_fini:p.quantite_produit_fini,
              quantite_matiere_premiere:p.quantite_matiere_premiere, date:p.date });
            for (const e of (det.data.etapes||[])) {
              if (String(e.statut).includes("TERMINE"))
                hist.push({ id:`etape-${e.id}`, evenement:"etape_validee",
                  of_id:p.of_id, production_id:p.id, etape_id:e.id, machine:e.machine,
                  quantite_produit_fini:e.qte_sortie, quantite_matiere_premiere:e.qte_entree, date:e.date });
            }
          } catch { /* ignore */ }
        }
        hist.sort((a,b) => new Date(b.date) - new Date(a.date));
        setHistorique(hist);
      }
    } finally { setLoading(false); }
  }, [filterProd, filterMachine, filterEvt]);

  useEffect(() => { loadHistorique(); }, [loadHistorique]);

  const grouped = useMemo(() => {
    const map = {};
    historique.forEach(h => { const d=h.date||"?"; if (!map[d]) map[d]=[]; map[d].push(h); });
    return Object.entries(map).sort((a,b) => new Date(b[0]) - new Date(a[0]));
  }, [historique]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div style={{ background:"#fff", borderRadius:14, padding:"1rem 1.25rem",
        boxShadow:"0 1px 4px rgba(0,0,0,0.07)", display:"flex", gap:"1rem", flexWrap:"wrap" }}>
        <select style={{ ...s.selectSm, minWidth:200 }} value={filterProd}
          onChange={e => setFilterProd(e.target.value)}>
          <option value="">📋 Toutes les productions</option>
          {productions.map(p => (
            <option key={p.production_id||p.id} value={p.production_id||p.id}>
              {p.of_numero} – {p.produit_fini}
            </option>
          ))}
        </select>
        <select style={{ ...s.selectSm, minWidth:180 }} value={filterMachine}
          onChange={e => setFilterMachine(e.target.value)}>
          <option value="">🏭 Toutes les machines</option>
          {SEQUENCE_MACHINES.map(m => <option key={m.code} value={m.code}>{m.code} – {m.nom}</option>)}
        </select>
        <select style={{ ...s.selectSm, minWidth:160 }} value={filterEvt}
          onChange={e => setFilterEvt(e.target.value)}>
          <option value="">📌 Tous les événements</option>
          <option value="production_lancee">🚀 Lancement</option>
          <option value="etape_validee">✅ Étape validée</option>
          <option value="rebut">⚠️ Rebut</option>
        </select>
        <button onClick={loadHistorique} style={s.btnRefresh}>↻ Actualiser</button>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem", color:"#94a3b8" }}>⏳ Chargement…</div>
      ) : grouped.length === 0 ? (
        <div style={{ textAlign:"center", padding:"3rem", color:"#94a3b8" }}>Aucun événement trouvé</div>
      ) : (
        grouped.map(([date, events]) => (
          <div key={date}>
            <div style={{ fontSize:12, fontWeight:700, color:"#64748b", textTransform:"uppercase",
              letterSpacing:"0.1em", marginBottom:8, paddingLeft:4 }}>📅 {date}</div>
            <div style={{ background:"#fff", borderRadius:14, overflow:"hidden",
              boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
              {events.map((h,i) => (
                <div key={h.id} style={{ display:"grid", gridTemplateColumns:"36px 1fr auto",
                  gap:"0.75rem", alignItems:"center", padding:"0.75rem 1.25rem",
                  borderBottom:i===events.length-1?"none":"1px solid #f8fafc",
                  background:h.evenement==="rebut"?"#fff5f5":"transparent" }}>
                  <div style={{ width:32, height:32, borderRadius:"50%",
                    background:h.evenement==="production_lancee"?"#eff6ff":h.evenement==="etape_validee"?"#f0fdf4":"#fff5f5",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>
                    {h.evenement==="production_lancee"?"🚀":h.evenement==="etape_validee"?"✅":"⚠️"}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#0f172a" }}>
                      {EVENEMENT_LABELS[h.evenement]||h.evenement}
                    </div>
                    <div style={{ fontSize:11, color:"#94a3b8", marginTop:2, display:"flex", gap:12 }}>
                      {h.production_id && <span>Prod #{h.production_id}</span>}
                      {h.machine && <span><span style={s.codeBadge}>{h.machine}</span></span>}
                    </div>
                  </div>
                  <div style={{ textAlign:"right", fontSize:11, color:"#64748b" }}>
                    {h.quantite_produit_fini != null &&
                      <div>PF : <strong>{fmt(h.quantite_produit_fini)} kg</strong></div>}
                    {h.quantite_matiere_premiere != null &&
                      <div>MP : <strong>{fmt(h.quantite_matiere_premiere)} kg</strong></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  ONGLET 3 – ASSOCIATION MACHINES  (avec données MQTT simulateur)
// ─────────────────────────────────────────────────────────────────────────────

const AssociationMachines = ({ realtimeByRef, mqttStatus }) => {
  const [machinesTrace, setMachinesTrace] = useState([]);
  const [loading, setLoading]             = useState(false);
  const [selected, setSelected]           = useState(null);

  // Charge les stats de traçabilité depuis le backend
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        try {
          const r = await axios.get(`${TRACE_URL}/machines`);
          setMachinesTrace(r.data);
        } catch {
          // Fallback local
          const r = await axios.get(PROD_URL);
          const prods = r.data;
          const machMap = {};
          SEQUENCE_MACHINES.forEach(m => {
            machMap[m.code] = { machine_code:m.code, nom_machine:m.nom,
              nb_productions:0, qte_entree_total:0, qte_sortie_total:0,
              total_rebuts:0, derniere_date:null };
          });
          for (const p of prods) {
            try {
              const det = await axios.get(`${PROD_URL}${p.id}`);
              for (const e of (det.data.etapes||[])) {
                if (!machMap[e.machine]) continue;
                machMap[e.machine].nb_productions++;
                machMap[e.machine].qte_entree_total += e.qte_entree||0;
                machMap[e.machine].qte_sortie_total += e.qte_sortie||0;
                if (!machMap[e.machine].derniere_date||e.date>machMap[e.machine].derniere_date)
                  machMap[e.machine].derniere_date = e.date;
              }
            } catch { /* ignore */ }
          }
          setMachinesTrace(Object.values(machMap).map(m => ({
            ...m,
            rendement_moyen: m.qte_entree_total > 0
              ? parseFloat(((m.qte_sortie_total/m.qte_entree_total)*100).toFixed(1)) : null,
          })));
        }
      } finally { setLoading(false); }
    };
    load();
  }, []);

  // ── Join traçabilité DB + MQTT simulateur ─────────────────────────────────
  // Le simulateur publie avec machine_reference (= reference DB, ex: "CT-ALIM-01")
  // realtimeByRef est indexé par machineId qui vient du payload MQTT :
  //   payload.machineId = machine_reference  (normalisé en uppercase dans telemetrySocket)
  const enriched = useMemo(() => {
    return machinesTrace.map(m => {
      // Cherche dans realtimeByRef par code machine (CT-ALIM-01, etc.)
      const key  = m.machine_code?.toUpperCase();
      const rt   = realtimeByRef[key] || realtimeByRef[m.machine_code] || null;
      return {
        ...m,
        // Données MQTT simulateur
        temperature : rt?.temperature  ?? null,
        pression    : rt?.pressure     ?? null,  // payload simulateur : "pressure"
        vitesse     : rt?.speed        ?? null,  // payload simulateur : "speed"
        vibration   : rt?.vibration    ?? null,
        production  : rt?.production   ?? null,  // cumul depuis boot
        etat        : rt?.state        ?? null,  // MARCHE | PAUSE | ERREUR | MAINTENANCE
        lastUpdate  : rt?.lastUpdate   ?? null,
        hasMqtt     : rt !== null,
      };
    });
  }, [machinesTrace, realtimeByRef]);

  const selectedMachine = enriched.find(m => m.machine_code === selected);

  if (loading) return (
    <div style={{ textAlign:"center", padding:"3rem", color:"#94a3b8" }}>⏳ Chargement…</div>
  );

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:"1.5rem", alignItems:"start" }}>

      {/* ── Gauche : pipeline + tableau ── */}
      <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>

        {/* Bandeau MQTT status */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          background:"#fff", borderRadius:12, padding:"0.6rem 1rem",
          boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
          <span style={{ fontSize:12, color:"#64748b", fontWeight:500 }}>
            🔌 Simulateur MQTT
          </span>
          <span style={{
            display:"inline-flex", alignItems:"center", gap:6,
            fontSize:12, fontWeight:700,
            color: mqttStatus==="connected" ? "#10b981" : "#ef4444",
          }}>
            <span style={{ width:7, height:7, borderRadius:"50%",
              background: mqttStatus==="connected" ? "#10b981" : "#ef4444",
              animation: mqttStatus==="connected" ? "pulse 2s infinite" : "none" }} />
            {mqttStatus==="connected" ? "Connecté — données en temps réel" : "Déconnecté"}
          </span>
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
        </div>

        {/* Pipeline visuel */}
        <div style={{ background:"#fff", borderRadius:14, padding:"1.25rem",
          boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
          <h3 style={{ margin:"0 0 1rem", fontSize:14, fontWeight:700, color:"#0f172a" }}>
            🔗 Séquence de production — Atelier Cardage
          </h3>
          <div style={{ display:"flex", alignItems:"stretch", flexWrap:"wrap", gap:0 }}>
            {SEQUENCE_MACHINES.map((m,i) => {
              const data = enriched.find(d => d.machine_code===m.code);
              const rend = data?.rendement_moyen;
              const rendColor = rend==null?"#e2e8f0":rend>=95?"#10b981":rend>=85?"#f59e0b":"#ef4444";
              const etatC = data?.etat ? ETAT_COLORS[data.etat] : null;
              const isSelected = selected===m.code;
              return (
                <React.Fragment key={m.code}>
                  <div onClick={() => setSelected(isSelected?null:m.code)} style={{
                    background: isSelected?"#eff6ff":"#f8fafc",
                    border: isSelected?"2px solid #2563eb":"1.5px solid #e2e8f0",
                    borderRadius:10, padding:"0.5rem 0.55rem", textAlign:"center",
                    minWidth:68, cursor:"pointer", transition:"all 0.12s",
                    position:"relative",
                  }}>
                    {/* Point état MQTT */}
                    {data?.hasMqtt && (
                      <span style={{ position:"absolute", top:4, right:4,
                        width:6, height:6, borderRadius:"50%",
                        background: etatC?.color || "#94a3b8" }} />
                    )}
                    <div style={{ fontSize:9, color:"#94a3b8", fontWeight:700 }}>#{m.ordre}</div>
                    <div style={{ fontSize:10, fontWeight:700, color:"#0f172a", fontFamily:"monospace" }}>
                      {m.code.split("-")[1]}
                    </div>
                    <div style={{ fontSize:9, color:"#64748b" }}>{m.nom}</div>
                    {rend != null && (
                      <div style={{ fontSize:10, fontWeight:700, color:rendColor, marginTop:2 }}>
                        {rend.toFixed(0)}%
                      </div>
                    )}
                    {/* Température mini si MQTT dispo */}
                    {data?.temperature != null && (
                      <div style={{ fontSize:9, color:"#ef4444", marginTop:1 }}>
                        {data.temperature}°C
                      </div>
                    )}
                  </div>
                  {i < SEQUENCE_MACHINES.length-1 && (
                    <span style={{ color:"#94a3b8", fontSize:10, margin:"0 1px", alignSelf:"center" }}>→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div style={{ fontSize:11, color:"#94a3b8", marginTop:8 }}>
            Le point coloré indique l'état MQTT. Cliquez pour voir le détail.
          </div>
        </div>

        {/* Tableau récap */}
        <div style={{ background:"#fff", borderRadius:14, overflow:"hidden",
          boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  {["Machine","Nom","Nb prod.","Rend. moy.","Rebuts","État MQTT","Temp.","Pression","Vitesse","Dernier signal"].map(h =>
                    <th key={h} style={s.th}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {enriched.map((m,i) => {
                  const rendColor = m.rendement_moyen==null?"#94a3b8"
                    :m.rendement_moyen>=95?"#10b981":m.rendement_moyen>=85?"#f59e0b":"#ef4444";
                  return (
                    <tr key={m.machine_code}
                      onClick={() => setSelected(m.machine_code===selected?null:m.machine_code)}
                      style={{ background:m.machine_code===selected?"#eff6ff":i%2===0?"#fff":"#fafafa",
                        cursor:"pointer" }}>
                      <td style={s.td}><span style={s.codeBadge}>{m.machine_code}</span></td>
                      <td style={{ ...s.td, fontSize:12 }}>{m.nom_machine}</td>
                      <td style={{ ...s.td, textAlign:"center", fontWeight:600 }}>{m.nb_productions}</td>
                      <td style={{ ...s.td, textAlign:"right", color:rendColor, fontWeight:700 }}>
                        {fmtPct(m.rendement_moyen)}
                      </td>
                      <td style={{ ...s.td, textAlign:"right", color:"#ef4444", fontFamily:"monospace" }}>
                        {fmt(m.total_rebuts)} kg
                      </td>
                      <td style={s.td}><EtatBadge etat={m.etat} /></td>
                      {/* Données simulateur */}
                      <td style={{ ...s.td, textAlign:"right", fontFamily:"monospace",
                        color: m.temperature!=null?"#ef4444":"#cbd5e1" }}>
                        {m.temperature!=null ? `${m.temperature}°C` : "—"}
                      </td>
                      <td style={{ ...s.td, textAlign:"right", fontFamily:"monospace",
                        color: m.pression!=null?"#2563eb":"#cbd5e1" }}>
                        {m.pression!=null ? `${m.pression} bar` : "—"}
                      </td>
                      <td style={{ ...s.td, textAlign:"right", fontFamily:"monospace",
                        color: m.vitesse!=null?"#8b5cf6":"#cbd5e1" }}>
                        {m.vitesse!=null ? `${m.vitesse} rpm` : "—"}
                      </td>
                      <td style={{ ...s.td, fontSize:11, color:"#94a3b8" }}>
                        {fmtTs(m.lastUpdate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Droite : panneau détail machine ── */}
      <div>
        {selectedMachine
          ? <MachineDetailPanel machine={selectedMachine} />
          : (
            <div style={{ background:"#fff", borderRadius:14, padding:"3rem 2rem",
              boxShadow:"0 1px 4px rgba(0,0,0,0.07)", textAlign:"center", color:"#94a3b8" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🏭</div>
              <div style={{ fontSize:13 }}>Sélectionnez une machine<br />pour voir ses paramètres</div>
            </div>
          )}
      </div>
    </div>
  );
};

// ── Panneau détail machine (traçabilité + MQTT) ───────────────────────────────
const MachineDetailPanel = ({ machine: m }) => {
  const rendColor = m.rendement_moyen==null?"#64748b"
    :m.rendement_moyen>=95?"#10b981":m.rendement_moyen>=85?"#f59e0b":"#ef4444";

  return (
    <div style={{ background:"#fff", borderRadius:14, overflow:"hidden",
      boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>

      {/* Header */}
      <div style={{ padding:"1.25rem", background:"#0f172a", color:"#fff" }}>
        <div style={{ fontSize:11, color:"#94a3b8", fontWeight:600, textTransform:"uppercase" }}>Machine</div>
        <div style={{ fontSize:18, fontWeight:800, fontFamily:"monospace" }}>{m.machine_code}</div>
        <div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>{m.nom_machine}</div>
        {m.hasMqtt && <div style={{ marginTop:8 }}><EtatBadge etat={m.etat} /></div>}
      </div>

      <div style={{ padding:"1.25rem", display:"flex", flexDirection:"column", gap:"0.75rem" }}>

        {/* ── Paramètres MQTT simulateur ── */}
        {m.hasMqtt ? (
          <>
            <div style={{ fontSize:12, fontWeight:700, color:"#0f172a", textTransform:"uppercase",
              letterSpacing:"0.08em", marginBottom:4 }}>
              📡 Paramètres temps réel (simulateur)
            </div>

            {/* Jauge Température */}
            <MiniGauge
              label="Température"
              value={m.temperature}
              unit="°C"
              min={20}
              max={180}
              color={m.temperature>130?"#ef4444":m.temperature>80?"#f59e0b":"#10b981"}
            />
            {/* Jauge Pression */}
            <MiniGauge
              label="Pression"
              value={m.pression}
              unit="bar"
              min={0}
              max={5}
              color="#2563eb"
            />
            {/* Jauge Vitesse */}
            <MiniGauge
              label="Vitesse"
              value={m.vitesse}
              unit="RPM"
              min={0}
              max={1500}
              color="#8b5cf6"
            />
            {/* Vibration */}
            {m.vibration != null && (
              <MiniGauge
                label="Vibration"
                value={m.vibration}
                unit="g"
                min={0}
                max={0.2}
                color={m.vibration>0.08?"#ef4444":"#10b981"}
              />
            )}
            {/* Production cumulée */}
            {m.production != null && (
              <div style={{ display:"flex", justifyContent:"space-between", padding:"0.5rem 0",
                borderTop:"1px solid #f1f5f9", marginTop:4 }}>
                <span style={{ fontSize:12, color:"#64748b" }}>Production (session)</span>
                <span style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>
                  {m.production} unités
                </span>
              </div>
            )}
            <div style={{ fontSize:10, color:"#94a3b8", marginTop:4 }}>
              Dernier signal : {fmtTs(m.lastUpdate)}
            </div>
          </>
        ) : (
          <div style={{ padding:"1rem", background:"#f8fafc", borderRadius:8, textAlign:"center",
            fontSize:12, color:"#94a3b8" }}>
            📡 En attente des données MQTT du simulateur…
          </div>
        )}

        <div style={{ borderTop:"1px solid #f1f5f9", paddingTop:"0.75rem", marginTop:4 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#0f172a", textTransform:"uppercase",
            letterSpacing:"0.08em", marginBottom:8 }}>
            📊 Traçabilité production
          </div>
          {[
            { label:"Productions passées", value:m.nb_productions },
            { label:"Qté entrante totale", value:fmt(m.qte_entree_total," kg") },
            { label:"Qté sortante totale", value:fmt(m.qte_sortie_total," kg") },
            { label:"Rendement moyen",     value:fmtPct(m.rendement_moyen), color:rendColor },
            { label:"Total rebuts",        value:fmt(m.total_rebuts," kg"), color:"#ef4444" },
            { label:"Dernier usage",       value:m.derniere_date||"—" },
          ].map(row => (
            <div key={row.label} style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", padding:"0.45rem 0", borderBottom:"1px solid #f8fafc" }}>
              <span style={{ fontSize:12, color:"#64748b" }}>{row.label}</span>
              <span style={{ fontSize:13, fontWeight:700, color:row.color||"#0f172a" }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

const Traceability = () => {
  const [activeTab, setActiveTab]       = useState("lot");
  const [productions, setProductions]   = useState([]);
  const [summary, setSummary]           = useState(null);
  const [loading, setLoading]           = useState(true);

  // ── MQTT : abonnement au simulateur ──────────────────────────────────────
  // realtimeByRef : { "CT-ALIM-01": { temperature, pressure, speed, state, ... } }
  const [realtimeByRef, setRealtimeByRef] = useState({});
  const [mqttStatus, setMqttStatus]       = useState("disconnected");

  useEffect(() => {
    const unsubscribe = subscribeMachineRealtime({
      onConnectionChange: (status) => setMqttStatus(status),
      onMessage: (payload) => {
        // payload.machineId correspond à machine_reference publié par le simulateur
        // telemetrySocket normalise en uppercase → ex: "CT-ALIM-01"
        if (!payload?.machineId) return;
        const key = String(payload.machineId).toUpperCase();
        setRealtimeByRef(prev => ({
          ...prev,
          [key]: {
            ...payload,
            lastUpdate: new Date().toISOString(),
          },
        }));
      },
    });
    return unsubscribe;
  }, []);

  // ── Chargement productions + résumé ──────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const prodRes = await axios.get(PROD_URL);
        const prods = prodRes.data.map(p => ({
          ...p,
          production_id   : p.id,
          date_production : p.date,
          rendement_global: p.quantite_matiere_premiere && p.quantite_produit_fini
            ? parseFloat(((p.quantite_produit_fini/p.quantite_matiere_premiere)*100).toFixed(1))
            : null,
        }));
        setProductions(prods);

        try {
          const sumRes = await axios.get(`${TRACE_URL}/summary`);
          setSummary(sumRes.data);
        } catch {
          const termine = prods.filter(p => p.statut==="TERMINE");
          const totalPF = termine.reduce((a,p) => a+(p.quantite_produit_fini||0), 0);
          const totalMP = termine.reduce((a,p) => a+(p.quantite_matiere_premiere||0), 0);
          setSummary({
            total_productions    : prods.length,
            productions_terminees: termine.length,
            productions_en_cours : prods.filter(p=>p.statut==="EN_COURS").length,
            total_pf_produit     : totalPF,
            total_mp_consomme    : totalMP,
            rendement_global     : totalMP>0 ? parseFloat(((totalPF/totalMP)*100).toFixed(1)) : null,
            total_rebuts         : 0,
            machines_actives     : SEQUENCE_MACHINES.length,
          });
        }
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const TABS = [
    { id:"lot",         label:"🔍 Suivi par lot"       },
    { id:"historique",  label:"📋 Historisation"        },
    { id:"association", label:"🏭 Machines" },
  ];

  return (
    <div style={{ padding:"2rem", background:"#f8fafc", minHeight:"100vh",
      fontFamily:"'Inter',-apple-system,sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom:"1.5rem" }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:"#0f172a", letterSpacing:"-0.03em" }}>
          🔗 Traçabilité
        </h1>
        <p style={{ margin:"4px 0 0", color:"#64748b", fontSize:14 }}>
          Suivi complet des lots · Historisation ·  machines + MQTT
        </p>
      </div>

      {/* KPIs globaux */}
      {summary && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"1rem", marginBottom:"1.5rem" }}>
          <KpiCard label="Productions totales"
            value={summary.total_productions}
            sub={`${summary.productions_terminees} terminées · ${summary.productions_en_cours} en cours`}
            color="#2563eb" icon="📦" />
          <KpiCard label="Produit fini total"
            value={`${fmt(summary.total_pf_produit)} kg`}
            sub="Toutes productions terminées" color="#10b981" icon="🧵" />
          <KpiCard label="Rendement global"
            value={fmtPct(summary.rendement_global)}
            sub="PF / MP consommée" color="#8b5cf6" icon="📊" />
          <KpiCard label="Total rebuts"
            value={`${fmt(summary.total_rebuts)} kg`}
            sub="Toutes productions" color="#ef4444" icon="⚠️" />
        </div>
      )}

      {/* Onglets */}
      <div style={{ display:"flex", gap:"0.5rem", marginBottom:"1.5rem" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding:"0.6rem 1.25rem", borderRadius:8, border:"none", cursor:"pointer",
            fontSize:13, fontWeight:500, transition:"all 0.12s",
            background: activeTab===t.id ? "#1e293b" : "#fff",
            color:      activeTab===t.id ? "#fff"    : "#64748b",
            boxShadow:  activeTab===t.id ? "none"    : "0 1px 3px rgba(0,0,0,0.07)",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Contenu */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"4rem", color:"#94a3b8" }}>⏳ Chargement…</div>
      ) : (
        <>
          {activeTab==="lot"         && <SuiviLot productions={productions} />}
          {activeTab==="historique"  && <Historisation productions={productions} />}
          {activeTab==="association" && (
            <AssociationMachines
              realtimeByRef={realtimeByRef}
              mqttStatus={mqttStatus}
            />
          )}
        </>
      )}
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  table         : { width:"100%", borderCollapse:"collapse", fontSize:13 },
  thead         : { background:"#f8fafc" },
  th            : { textAlign:"left", padding:"0.65rem 0.75rem", borderBottom:"2px solid #e2e8f0",
                    color:"#64748b", fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:"0.06em" },
  td            : { padding:"0.65rem 0.75rem", borderBottom:"1px solid #f1f5f9", color:"#1e293b", fontSize:13 },
  codeBadge     : { background:"#e2e8f0", color:"#334155", padding:"2px 7px", borderRadius:5,
                    fontSize:11, fontWeight:700, fontFamily:"monospace" },
  inputSm       : { width:"100%", padding:"0.55rem 0.85rem", border:"1px solid #e2e8f0",
                    borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box",
                    background:"#f8fafc", color:"#0f172a" },
  selectSm      : { padding:"0.55rem 0.85rem", border:"1px solid #e2e8f0",
                    borderRadius:8, fontSize:13, background:"#f8fafc", color:"#0f172a", outline:"none" },
  filterBtn     : { padding:"0.3rem 0.75rem", borderRadius:20, border:"1px solid #e2e8f0",
                    background:"#f8fafc", color:"#64748b", fontSize:12, fontWeight:500, cursor:"pointer" },
  filterBtnActive: { background:"#1e293b", color:"#fff", border:"1px solid #1e293b" },
  btnRefresh    : { padding:"0.55rem 1rem", borderRadius:8, border:"1px solid #e2e8f0",
                    background:"#fff", color:"#64748b", fontSize:13, cursor:"pointer", fontWeight:500 },
};

export default Traceability;