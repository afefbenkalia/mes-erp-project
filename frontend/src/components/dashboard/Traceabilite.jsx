// Traceabilite.jsx – MES Atelier Cardage · Module Traçabilité
// Design : industriel-clair, typographie technique

import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";

const BASE_URL   = "http://127.0.0.1:8000/api/traceabilite/";
const PROD_URL   = "http://127.0.0.1:8000/api/productions/";

// ── Palette claire industrielle ───────────────────────────────────────────────
const C = {
  bg       : "#f3f4f6",      // fond principal gris clair
  surface  : "#ffffff",      // surfaces cartes blanches
  border   : "#d1d5db",      // bordures grises
  amber    : "#d97706",      // orange/ambre pour accès
  amberDim : "#fef3c7",      // jaune pâle pour highlights
  green    : "#059669",      // vert foncé
  red      : "#dc2626",      // rouge
  blue     : "#2563eb",      // bleu
  muted    : "#6b7280",      // texte grisé
  text     : "#1f2937",      // texte principal
  textSub  : "#4b5563",      // texte secondaire
};

const font = "'JetBrains Mono', 'Fira Code', 'Courier New', monospace";
const fontSans = "'IBM Plex Sans', 'Segoe UI', sans-serif";

// ── Helpers ───────────────────────────────────────────────────────────────────

const statutColor = (s) => ({
  EN_COURS    : { bg: "#e0f2fe", col: "#0369a1", border: "#7dd3fc" },
  CONFORME    : { bg: "#dcfce7", col: "#166534", border: "#86efac" },
  NON_CONFORME: { bg: "#fee2e2", col: "#991b1b", border: "#fca5a5" },
  BLOQUE      : { bg: "#fef3c7", col: "#92400e", border: "#fde047" },
}[s] || { bg: "#f9fafb", col: "#4b5563", border: "#e5e7eb" });

const niveauColor = (n) => ({
  INFO         : { col: "#2563eb", icon: "ℹ" },
  AVERTISSEMENT: { col: "#d97706", icon: "⚠" },
  CRITIQUE     : { col: "#dc2626", icon: "✖" },
}[n] || { col: "#6b7280", icon: "?" });

const fmtDate = (d) => d ? new Date(d).toLocaleString("fr-FR", {
  day:"2-digit", month:"2-digit", year:"2-digit",
  hour:"2-digit", minute:"2-digit"
}) : "—";

const fmtRend = (r) => r != null ? `${r.toFixed(1)}%` : "—";

// ── Components ─────────────────────────────────────────────────────────────────

const Badge = ({ statut }) => {
  const c = statutColor(statut);
  return (
    <span style={{
      display:"inline-block", padding:"2px 10px", borderRadius:"4px",
      background:c.bg, color:c.col, border:`1px solid ${c.border}`,
      fontSize:"0.72rem", fontFamily:font, fontWeight:700, letterSpacing:"0.05em",
    }}>{statut.replace("_"," ")}</span>
  );
};

const KpiBox = ({ label, value, color, icon }) => (
  <div style={{
    background:C.surface, border:`1px solid ${C.border}`, borderRadius:"8px",
    padding:"1rem 1.25rem", display:"flex", flexDirection:"column", gap:"0.35rem",
    borderLeft:`3px solid ${color}`,
  }}>
    <span style={{ fontSize:"1.3rem" }}>{icon}</span>
    <span style={{ color:C.muted, fontSize:"0.72rem", fontFamily:font, textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</span>
    <span style={{ color, fontSize:"1.5rem", fontWeight:700, fontFamily:font }}>{value}</span>
  </div>
);

const RendBar = ({ value }) => {
  const pct = value ?? 0;
  const col = pct >= 90 ? C.green : pct >= 80 ? C.amber : C.red;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
      <div style={{ flex:1, background:"#e5e7eb", borderRadius:"2px", height:"5px" }}>
        <div style={{ width:`${Math.min(pct,100)}%`, height:"5px", borderRadius:"2px", background:col, transition:"width 0.4s" }} />
      </div>
      <span style={{ fontFamily:font, fontSize:"0.75rem", color:col, minWidth:"42px", textAlign:"right" }}>
        {fmtRend(value)}
      </span>
    </div>
  );
};

// ── Timeline des événements ──────────────────────────────────────────────────

const typeIcon = {
  DEBUT_PRODUCTION : "🚀",
  FIN_PRODUCTION   : "🏁",
  DEBUT_ETAPE      : "▶",
  FIN_ETAPE        : "✓",
  REBUT_ENREGISTRE : "⚠",
  ALERTE_QUALITE   : "🔔",
  BLOCAGE          : "🔒",
  DEBLOCAGE        : "🔓",
  NOTIFICATION_ERP : "📡",
  CORRECTION       : "✏",
};

const Timeline = ({ evenements }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
    {evenements.map((ev, i) => (
      <div key={ev.id} style={{ display:"flex", gap:"1rem", position:"relative" }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
          <div style={{
            width:"28px", height:"28px", borderRadius:"50%",
            background:C.surface, border:`2px solid ${C.amber}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"0.8rem", flexShrink:0, zIndex:1,
          }}>{typeIcon[ev.type_evenement] || "•"}</div>
          {i < evenements.length - 1 && (
            <div style={{ width:"2px", background:C.border, flex:1, minHeight:"24px" }} />
          )}
        </div>
        <div style={{ paddingBottom:"1.25rem", flex:1, minWidth:0 }}>
          <div style={{ display:"flex", gap:"0.75rem", alignItems:"baseline", flexWrap:"wrap" }}>
            <span style={{ fontFamily:font, fontSize:"0.7rem", color:C.amber }}>
              {fmtDate(ev.horodatage)}
            </span>
            {ev.machine && (
              <span style={{
                fontFamily:font, fontSize:"0.7rem", color:C.muted,
                background:"#f3f4f6", padding:"1px 6px", borderRadius:"3px",
              }}>{ev.machine}</span>
            )}
            {ev.operateur && (
              <span style={{ fontFamily:font, fontSize:"0.7rem", color:C.textSub }}>
                👤 {ev.operateur}
              </span>
            )}
          </div>
          <p style={{ margin:"0.25rem 0 0", color:C.text, fontSize:"0.85rem", fontFamily:fontSans }}>
            {ev.description}
          </p>
        </div>
      </div>
    ))}
  </div>
);

// ── Carte d'étape ────────────────────────────────────────────────────────────

const EtapeCard = ({ etape, idx }) => {
  const [open, setOpen] = useState(false);
  const rend = etape.rendement_etape;
  const col = rend == null ? C.muted : rend >= 90 ? C.green : rend >= 80 ? C.amber : C.red;

  return (
    <div style={{
      background:C.surface, border:`1px solid ${etape.conforme ? C.border : C.red}`,
      borderRadius:"8px", overflow:"hidden",
      boxShadow: etape.conforme ? "0 1px 2px rgba(0,0,0,0.05)" : `0 0 0 1px ${C.red}22`,
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width:"100%", background:"transparent", border:"none", cursor:"pointer",
          padding:"0.75rem 1rem", display:"flex", alignItems:"center", gap:"0.75rem",
          textAlign:"left",
        }}
      >
        <span style={{
          fontFamily:font, fontSize:"0.7rem", color:C.amber,
          background:C.amberDim, padding:"2px 6px", borderRadius:"3px",
          flexShrink:0, minWidth:"28px", textAlign:"center",
        }}>{String(etape.ordre).padStart(2,"0")}</span>

        <span style={{ fontFamily:font, fontSize:"0.8rem", color:C.text, flex:1 }}>
          {etape.machine}
          {etape.nom_machine && (
            <span style={{ color:C.muted, fontWeight:400 }}> · {etape.nom_machine}</span>
          )}
        </span>

        <span style={{ fontFamily:font, fontSize:"0.8rem", color:col, minWidth:"50px", textAlign:"right" }}>
          {fmtRend(rend)}
        </span>

        {etape.qte_rebut > 0 && (
          <span style={{
            fontFamily:font, fontSize:"0.7rem", color:C.red,
            background:"#fee2e2", padding:"1px 6px", borderRadius:"3px",
          }}>⚠ {etape.qte_rebut} kg</span>
        )}

        <span style={{ color:C.muted, fontSize:"0.7rem" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ borderTop:`1px solid ${C.border}`, padding:"0.75rem 1rem" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"0.75rem", marginBottom:"0.75rem" }}>
            {[
              { l:"Entrée",    v: etape.qte_entree  != null ? `${etape.qte_entree} kg` : "—" },
              { l:"Sortie",    v: etape.qte_sortie  != null ? `${etape.qte_sortie} kg` : "—" },
              { l:"Perte",     v: etape.qte_entree && etape.qte_sortie
                  ? `${(etape.qte_entree - etape.qte_sortie).toFixed(3)} kg` : "—" },
              { l:"Opérateur", v: etape.operateur || "—" },
              { l:"Début",     v: etape.debut || "—" },
              { l:"Fin",       v: etape.fin   || "—" },
              { l:"Durée",     v: etape.duree_minutes ? `${etape.duree_minutes} min` : "—" },
              { l:"Rebuts",    v: `${etape.qte_rebut} kg` },
              { l:"Horodatage",v: fmtDate(etape.horodatage) },
            ].map(({ l, v }) => (
              <div key={l}>
                <div style={{ fontFamily:font, fontSize:"0.65rem", color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
                <div style={{ fontFamily:font, fontSize:"0.82rem", color:C.text }}>{v}</div>
              </div>
            ))}
          </div>

          <RendBar value={rend} />

          {etape.rebuts_trace?.length > 0 && (
            <div style={{ marginTop:"0.75rem", background:C.bg, borderRadius:"6px", padding:"0.6rem 0.75rem" }}>
              <p style={{ fontFamily:font, fontSize:"0.7rem", color:C.red, margin:"0 0 0.4rem", textTransform:"uppercase" }}>
                Rebuts détaillés
              </p>
              {etape.rebuts_trace.map(r => (
                <div key={r.id} style={{ display:"flex", gap:"0.5rem", fontSize:"0.78rem", fontFamily:fontSans, color:C.text, marginBottom:"2px" }}>
                  <span style={{ color:C.muted }}>{r.machine}</span>
                  <span>·</span>
                  <span>{r.defaut}</span>
                  <span style={{ color:C.red, marginLeft:"auto", fontFamily:font }}>{r.quantite} kg</span>
                </div>
              ))}
            </div>
          )}

          {etape.observations && (
            <p style={{ fontFamily:fontSans, fontSize:"0.8rem", color:C.textSub, marginTop:"0.5rem", fontStyle:"italic" }}>
              📝 {etape.observations}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ── Rapport ──────────────────────────────────────────────────────────────────

const RapportView = ({ lotId }) => {
  const [rapport, setRapport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    setLoading(true);
    axios.get(`${BASE_URL}${lotId}/rapport`)
      .then(r => setRapport(r.data))
      .catch(() => setErr("Rapport indisponible (lot en cours ou erreur serveur)"))
      .finally(() => setLoading(false));
  }, [lotId]);

  if (loading) return <p style={{ color:C.muted, fontFamily:font, fontSize:"0.85rem" }}>⏳ Génération du rapport…</p>;
  if (err) return <p style={{ color:C.red, fontFamily:font, fontSize:"0.85rem" }}>{err}</p>;
  if (!rapport) return null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
      <div style={{
        background: rapport.conformite ? "#dcfce7" : "#fee2e2",
        border:`1px solid ${rapport.conformite ? "#86efac" : C.red}`,
        borderRadius:"8px", padding:"1rem",
      }}>
        <p style={{ fontFamily:font, fontSize:"0.85rem", color:C.text, margin:0 }}>
          {rapport.resume}
        </p>
        {rapport.duree_totale_min && (
          <p style={{ fontFamily:font, fontSize:"0.75rem", color:C.muted, margin:"0.5rem 0 0" }}>
            ⏱ Durée totale mesurée : {rapport.duree_totale_min} min
          </p>
        )}
      </div>

      <div>
        <p style={sLabel}>Rendement par étape</p>
        <div style={{ display:"flex", flexDirection:"column", gap:"0.4rem" }}>
          {rapport.rendement_par_etape.map(e => (
            <div key={e.machine} style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
              <span style={{ fontFamily:font, fontSize:"0.72rem", color:C.muted, minWidth:"100px" }}>
                {e.machine}
              </span>
              <div style={{ flex:1 }}>
                <RendBar value={e.rendement} />
              </div>
              <span style={{ fontFamily:font, fontSize:"0.72rem", color:C.red, minWidth:"60px", textAlign:"right" }}>
                -{e.perte_kg.toFixed(2)} kg
              </span>
            </div>
          ))}
        </div>
      </div>

      {rapport.rebuts_par_defaut.length > 0 && (
        <div>
          <p style={sLabel}>Rebuts par type de défaut</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:"0.6rem" }}>
            {rapport.rebuts_par_defaut.map(r => (
              <div key={r.defaut} style={{
                background:C.bg, border:`1px solid ${C.border}`, borderRadius:"6px",
                padding:"0.6rem 0.75rem",
              }}>
                <p style={{ fontFamily:fontSans, fontSize:"0.82rem", color:C.text, margin:"0 0 0.25rem" }}>{r.defaut}</p>
                <p style={{ fontFamily:font, fontSize:"0.75rem", color:C.red, margin:0 }}>
                  {r.total_kg} kg · {r.nb_occurrences} occurrence{r.nb_occurrences > 1 ? "s" : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const sLabel = { fontFamily:font, fontSize:"0.7rem", color:C.muted, textTransform:"uppercase",
  letterSpacing:"0.08em", margin:"0 0 0.6rem" };

// ── Composant principal ───────────────────────────────────────────────────────

const Traceabilite = () => {
  const [lots, setLots]           = useState([]);
  const [selectedLot, setSelected]= useState(null);
  const [activeTab, setActiveTab] = useState("lot");
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filterStatut, setFilterStatut] = useState("");

  const loadLots = useCallback(async () => {
    try {
      const params = {};
      if (filterStatut) params.statut = filterStatut;
      const res = await axios.get(BASE_URL, { params });
      setLots([...res.data]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterStatut]);

  const loadLot = useCallback(async (id) => {
    try {
      const res = await axios.get(`${BASE_URL}${id}`);
      setSelected(res.data);
      setActiveTab("lot");
    } catch (err) {
      console.error(err);
    }
  }, []);

  const acquitterAlerte = async (alerteId) => {
    try {
      await axios.patch(`${BASE_URL}alertes/${alerteId}/acquitter`, { acquittee: true });
      if (selectedLot) await loadLot(selectedLot.id);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadLots(); }, [loadLots]);

  const filteredLots = useMemo(() =>
    lots.filter(l =>
      (!search || l.numero_lot.toLowerCase().includes(search.toLowerCase()) ||
        l.of_numero.toLowerCase().includes(search.toLowerCase()) ||
        l.produit_fini.toLowerCase().includes(search.toLowerCase()))
    ),
    [lots, search]
  );

  const tabs = [
    { id:"lot",     label:"Lot" },
    { id:"etapes",  label:`Étapes (${selectedLot?.etapes_trace?.length ?? 0})` },
    { id:"journal", label:`Journal (${selectedLot?.evenements?.length ?? 0})` },
    { id:"alertes", label:`Alertes (${selectedLot?.alertes?.length ?? 0})` },
    { id:"rapport", label:"Rapport" },
  ];

  return (
    <div style={{ background:C.bg, minHeight:"100vh", fontFamily:fontSans, color:C.text }}>

      <div style={{
        background:C.surface, borderBottom:`1px solid ${C.border}`,
        padding:"1rem 2rem", display:"flex", alignItems:"center",
        gap:"1rem", flexWrap:"wrap",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
          <span style={{ fontFamily:font, fontSize:"1.1rem", color:C.amber, fontWeight:700 }}>
            ◈ TRAÇABILITÉ MES
          </span>
          <span style={{ color:C.muted, fontSize:"0.75rem", fontFamily:font }}>
            ATELIER CARDAGE · v1.0
          </span>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:"0.75rem", alignItems:"center" }}>
          <button
            onClick={loadLots}
            style={{
              background:C.border, color:C.text, border:"none",
              padding:"0.4rem 0.85rem", borderRadius:"5px", cursor:"pointer",
              fontFamily:font, fontSize:"0.75rem",
            }}
          >⟳ Actualiser</button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"320px 1fr", minHeight:"calc(100vh - 56px)" }}>

        <div style={{ borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column" }}>

          <div style={{ padding:"1rem", borderBottom:`1px solid ${C.border}`, display:"flex", flexDirection:"column", gap:"0.5rem" }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Rechercher N° lot, OF, produit…"
              style={{
                background:C.surface, border:`1px solid ${C.border}`, color:C.text,
                padding:"0.5rem 0.75rem", borderRadius:"5px", fontFamily:font,
                fontSize:"0.78rem", outline:"none", width:"100%", boxSizing:"border-box",
              }}
            />
            <select
              value={filterStatut}
              onChange={e => { setFilterStatut(e.target.value); }}
              style={{
                background:C.surface, border:`1px solid ${C.border}`, color:C.text,
                padding:"0.4rem 0.6rem", borderRadius:"5px", fontFamily:font,
                fontSize:"0.75rem", width:"100%", boxSizing:"border-box",
              }}
            >
              <option value="">Tous statuts</option>
              <option value="EN_COURS">EN COURS</option>
              <option value="CONFORME">CONFORME</option>
              <option value="NON_CONFORME">NON CONFORME</option>
              <option value="BLOQUE">BLOQUÉ</option>
            </select>
          </div>

          <div style={{ flex:1, overflowY:"auto" }}>
            {loading ? (
              <p style={{ color:C.muted, fontFamily:font, fontSize:"0.8rem", padding:"1rem" }}>⏳ Chargement…</p>
            ) : filteredLots.length === 0 ? (
              <p style={{ color:C.muted, fontFamily:font, fontSize:"0.8rem", padding:"1rem" }}>
                Aucun lot trouvé
              </p>
            ) : (
              filteredLots.map(lot => (
                <button
                  key={lot.id}
                  onClick={() => loadLot(lot.id)}
                  style={{
                    width:"100%", background: selectedLot?.id === lot.id ? "#e5e7eb" : "transparent",
                    border:"none", borderBottom:`1px solid ${C.border}`, cursor:"pointer",
                    padding:"0.85rem 1rem", textAlign:"left", display:"flex", flexDirection:"column", gap:"0.35rem",
                    borderLeft: selectedLot?.id === lot.id ? `3px solid ${C.amber}` : "3px solid transparent",
                  }}
                >
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontFamily:font, fontSize:"0.72rem", color:C.amber }}>
                      {lot.numero_lot}
                    </span>
                    <Badge statut={lot.statut} />
                  </div>
                  <span style={{ fontSize:"0.82rem", color:C.text }}>{lot.produit_fini}</span>
                  <div style={{ display:"flex", gap:"0.5rem", fontSize:"0.72rem", fontFamily:font, color:C.muted }}>
                    <span>OF: {lot.of_numero}</span>
                    <span>·</span>
                    <span>{fmtRend(lot.rendement_global)}</span>
                    {lot.nb_alertes > 0 && (
                      <>
                        <span>·</span>
                        <span style={{ color:C.red }}>🔔 {lot.nb_alertes}</span>
                      </>
                    )}
                  </div>
                  <span style={{ fontSize:"0.7rem", fontFamily:font, color:C.textSub }}>
                    {fmtDate(lot.date_debut)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", overflowY:"auto" }}>
          {!selectedLot ? (
            <div style={{
              flex:1, display:"flex", alignItems:"center", justifyContent:"center",
              flexDirection:"column", gap:"0.75rem",
            }}>
              <span style={{ fontSize:"3rem" }}>◈</span>
              <span style={{ color:C.muted, fontFamily:font, fontSize:"0.85rem" }}>
                Sélectionnez un lot dans la liste
              </span>
            </div>
          ) : (
            <>
              <div style={{
                padding:"1.25rem 1.5rem", borderBottom:`1px solid ${C.border}`,
                display:"flex", gap:"1.5rem", alignItems:"flex-start", flexWrap:"wrap",
              }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"0.4rem" }}>
                    <span style={{ fontFamily:font, fontSize:"1rem", color:C.amber, fontWeight:700 }}>
                      {selectedLot.numero_lot}
                    </span>
                    <Badge statut={selectedLot.statut} />
                  </div>
                  <p style={{ fontFamily:fontSans, fontSize:"0.95rem", color:C.text, margin:0 }}>
                    {selectedLot.produit_fini}
                  </p>
                  <p style={{ fontFamily:font, fontSize:"0.72rem", color:C.muted, margin:"0.25rem 0 0" }}>
                    OF: {selectedLot.of_numero} · Prod #{selectedLot.production_id}
                    {selectedLot.code_produit_fini && ` · ${selectedLot.code_produit_fini}`}
                    {selectedLot.code_mp && ` · MP: ${selectedLot.code_mp}`}
                  </p>
                </div>
                <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
                  <div style={sKpi}>
                    <span style={{ color:C.muted, fontSize:"0.65rem", fontFamily:font }}>MP RÉELLE</span>
                    <span style={{ color:C.blue, fontFamily:font, fontWeight:700 }}>
                      {selectedLot.qte_mp_reelle ?? "—"} kg
                    </span>
                  </div>
                  <div style={sKpi}>
                    <span style={{ color:C.muted, fontSize:"0.65rem", fontFamily:font }}>PF RÉEL</span>
                    <span style={{ color:C.green, fontFamily:font, fontWeight:700 }}>
                      {selectedLot.qte_pf_reelle ?? "—"} kg
                    </span>
                  </div>
                  <div style={sKpi}>
                    <span style={{ color:C.muted, fontSize:"0.65rem", fontFamily:font }}>RENDEMENT</span>
                    <span style={{
                      fontFamily:font, fontWeight:700,
                      color: selectedLot.rendement_global >= 90 ? C.green
                           : selectedLot.rendement_global >= 80 ? C.amber : C.red,
                    }}>
                      {fmtRend(selectedLot.rendement_global)}
                    </span>
                  </div>
                  <div style={sKpi}>
                    <span style={{ color:C.muted, fontSize:"0.65rem", fontFamily:font }}>REBUTS</span>
                    <span style={{ color: selectedLot.total_rebuts > 0 ? C.red : C.muted, fontFamily:font, fontWeight:700 }}>
                      {selectedLot.total_rebuts} kg
                    </span>
                  </div>
                </div>
              </div>

              <div style={{
                display:"flex", gap:0, borderBottom:`1px solid ${C.border}`,
                padding:"0 1.5rem",
              }}>
                {tabs.map(t => (
                  <button key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    style={{
                      background:"transparent", border:"none", cursor:"pointer",
                      padding:"0.6rem 1rem", fontFamily:font, fontSize:"0.75rem",
                      color: activeTab === t.id ? C.amber : C.muted,
                      borderBottom: activeTab === t.id ? `2px solid ${C.amber}` : "2px solid transparent",
                      transition:"color 0.2s",
                    }}
                  >{t.label}</button>
                ))}
              </div>

              <div style={{ padding:"1.5rem", flex:1, overflowY:"auto" }}>

                {activeTab === "lot" && (
                  <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"0.75rem" }}>
                      {[
                        { l:"Début production",  v: fmtDate(selectedLot.date_debut) },
                        { l:"Fin production",    v: fmtDate(selectedLot.date_fin)   },
                        { l:"Date création",     v: selectedLot.date_creation },
                        { l:"MP prévue",         v: selectedLot.qte_mp_prevue ? `${selectedLot.qte_mp_prevue} kg` : "—" },
                        { l:"PF prévu",          v: selectedLot.qte_pf_prevue ? `${selectedLot.qte_pf_prevue} kg` : "—" },
                        { l:"Nb alertes",        v: selectedLot.nb_alertes },
                      ].map(({ l, v }) => (
                        <div key={l} style={{
                          background:C.surface, border:`1px solid ${C.border}`,
                          borderRadius:"6px", padding:"0.65rem 0.85rem",
                        }}>
                          <div style={{ fontFamily:font, fontSize:"0.65rem", color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"0.25rem" }}>{l}</div>
                          <div style={{ fontFamily:font, fontSize:"0.82rem", color:C.text }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "etapes" && (
                  <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
                    {selectedLot.etapes_trace?.length === 0 && (
                      <p style={{ color:C.muted, fontFamily:font, fontSize:"0.82rem" }}>
                        Aucune étape enregistrée pour le moment.
                      </p>
                    )}
                    {selectedLot.etapes_trace?.map((e, i) => (
                      <EtapeCard key={e.id} etape={e} idx={i} />
                    ))}
                  </div>
                )}

                {activeTab === "journal" && (
                  selectedLot.evenements?.length === 0 ? (
                    <p style={{ color:C.muted, fontFamily:font, fontSize:"0.82rem" }}>Journal vide.</p>
                  ) : (
                    <Timeline evenements={selectedLot.evenements} />
                  )
                )}

                {activeTab === "alertes" && (
                  <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
                    {selectedLot.alertes?.length === 0 && (
                      <p style={{ color:C.green, fontFamily:font, fontSize:"0.82rem" }}>
                        ✓ Aucune alerte qualité sur ce lot.
                      </p>
                    )}
                    {selectedLot.alertes?.map(a => {
                      const nc = niveauColor(a.niveau);
                      return (
                        <div key={a.id} style={{
                          background:C.surface, border:`1px solid ${nc.col}44`,
                          borderRadius:"8px", padding:"0.85rem 1rem",
                          opacity: a.acquittee ? 0.5 : 1,
                        }}>
                          <div style={{ display:"flex", alignItems:"flex-start", gap:"0.75rem" }}>
                            <span style={{ fontSize:"1rem", color:nc.col }}>{nc.icon}</span>
                            <div style={{ flex:1 }}>
                              <div style={{ display:"flex", gap:"0.5rem", alignItems:"center", marginBottom:"0.3rem" }}>
                                <span style={{ fontFamily:font, fontSize:"0.7rem", color:nc.col, fontWeight:700 }}>
                                  {a.niveau}
                                </span>
                                {a.machine && (
                                  <span style={{
                                    fontFamily:font, fontSize:"0.7rem", color:C.muted,
                                    background:C.bg, padding:"1px 6px", borderRadius:"3px",
                                  }}>{a.machine}</span>
                                )}
                                <span style={{ fontFamily:font, fontSize:"0.7rem", color:C.muted, marginLeft:"auto" }}>
                                  {fmtDate(a.horodatage)}
                                </span>
                              </div>
                              <p style={{ fontFamily:fontSans, fontSize:"0.85rem", color:C.text, margin:"0 0 0.3rem" }}>
                                {a.message}
                              </p>
                              {a.valeur_mesuree != null && a.seuil != null && (
                                <p style={{ fontFamily:font, fontSize:"0.72rem", color:C.muted, margin:0 }}>
                                  Mesuré: {a.valeur_mesuree.toFixed(1)} · Seuil: {a.seuil}
                                </p>
                              )}
                            </div>
                            {!a.acquittee && (
                              <button
                                onClick={() => acquitterAlerte(a.id)}
                                style={{
                                  background:C.border, border:`1px solid ${C.border}`,
                                  color:C.text, padding:"0.3rem 0.65rem", borderRadius:"4px",
                                  cursor:"pointer", fontFamily:font, fontSize:"0.7rem", flexShrink:0,
                                }}
                              >Acquitter</button>
                            )}
                            {a.acquittee && (
                              <span style={{ fontFamily:font, fontSize:"0.7rem", color:C.green }}>✓ Acquitté</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeTab === "rapport" && (
                  <RapportView lotId={selectedLot.id} />
                )}

              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const sKpi = {
  background:C.surface, border:`1px solid ${C.border}`,
  borderRadius:"6px", padding:"0.5rem 0.75rem",
  display:"flex", flexDirection:"column", gap:"0.2rem", minWidth:"90px",
};

export default Traceabilite;