// Production.jsx – Version avec affichage des données simulées pendant l'auto

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import {
  MACHINE_PARAMS,
  EQUIPES,
  simulateStep,
  precomputeProductionPlan,
} from "../../services/simulationMoteur";

// ═════════════════════════════════════════════════════════════════════════════
//  PALETTE DE COULEURS MODERNE
// ═════════════════════════════════════════════════════════════════════════════

const C = {
  bg: "#f4f6f9",
  surface: "#ffffff",
  card: "#ffffff",
  border: "#e3e8ef",
  accent: "#2563eb",
  accentLt: "#eff4ff",
  green: "#16a34a",
  greenLt: "#f0fdf4",
  red: "#dc2626",
  redLt: "#fef2f2",
  amber: "#d97706",
  amberLt: "#fffbeb",
  purple: "#7c3aed",
  purpleLt: "#f5f3ff",
  text: "#111827",
  sub: "#374151",
  muted: "#6b7280",
  inputBg: "#f9fafb",
  darkCard: "#1e293b",
  darkCardLt: "#334155",
};

// ═════════════════════════════════════════════════════════════════════════════
//  STYLES CSS-IN-JS
// ═════════════════════════════════════════════════════════════════════════════

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
  kpiCard: (color, lt) => ({
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "1.1rem 1.25rem",
    display: "flex", alignItems: "center", gap: "1rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  }),
  kpiIcon: (lt) => ({
    width: 40, height: 40, borderRadius: 8,
    background: lt,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "1.15rem", flexShrink: 0,
  }),
  kpiLabel: { margin: "0 0 2px", fontSize: "0.72rem", color: C.muted, fontWeight: 500 },
  kpiVal: (color) => ({ margin: 0, fontSize: "1.6rem", fontWeight: 700, color: color, lineHeight: 1 }),
  
  tabRow: {
    display: "flex", gap: "0.25rem", marginBottom: "1.5rem",
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "4px",
    width: "fit-content",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  tab: (active) => ({
    padding: "0.5rem 1.1rem",
    border: "none",
    borderRadius: 7,
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: active ? 600 : 400,
    background: active ? C.accent : "transparent",
    color: active ? "#fff" : C.muted,
    transition: "all 0.15s",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  }),
  
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
  
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  fg: { display: "flex", flexDirection: "column", gap: "0.35rem" },
  label: { fontSize: "0.78rem", fontWeight: 500, color: C.sub },
  req: { color: C.red, marginLeft: 2 },
  input: {
    padding: "0.6rem 0.85rem",
    background: C.inputBg,
    border: `1px solid ${C.border}`,
    borderRadius: 7,
    color: C.text,
    fontSize: "0.875rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  inputHighlight: {
    padding: "0.6rem 0.85rem",
    background: C.accentLt,
    border: `2px solid ${C.accent}`,
    borderRadius: 7,
    color: C.text,
    fontSize: "0.875rem",
    fontWeight: 600,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  inputDisabled: {
    padding: "0.6rem 0.85rem",
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 7,
    color: C.muted,
    fontSize: "0.875rem",
    width: "100%",
    boxSizing: "border-box",
  },
  inputAutoPreview: {
    padding: "0.6rem 0.85rem",
    background: C.accentLt,
    border: `2px solid ${C.green}`,
    borderRadius: 7,
    color: C.green,
    fontSize: "0.875rem",
    fontWeight: 600,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "monospace",
  },
  select: {
    padding: "0.6rem 0.85rem",
    background: C.inputBg,
    border: `1px solid ${C.border}`,
    borderRadius: 7,
    color: C.text,
    fontSize: "0.875rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    cursor: "pointer",
  },
  selectDisabled: {
    padding: "0.6rem 0.85rem",
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 7,
    color: C.muted,
    fontSize: "0.875rem",
    width: "100%",
    boxSizing: "border-box",
  },
  
  btnRow: { display: "flex", gap: "0.75rem", marginTop: "1.25rem", paddingTop: "1rem", borderTop: `1px solid ${C.border}` },
  btnPrimary: {
    background: C.accent, color: "#fff",
    border: "none", borderRadius: 7,
    padding: "0.6rem 1.5rem",
    fontFamily: "inherit", fontWeight: 600, fontSize: "0.875rem",
    cursor: "pointer",
  },
  btnWarning: {
    background: C.redLt, color: C.red,
    border: `1px solid #fecaca`,
    borderRadius: 7, padding: "0.6rem 1.5rem",
    fontFamily: "inherit", fontWeight: 600, fontSize: "0.875rem",
    cursor: "pointer",
  },
  btnGhost: {
    background: C.inputBg, color: C.sub,
    border: `1px solid ${C.border}`,
    borderRadius: 7, padding: "0.5rem 0.85rem",
    fontFamily: "inherit", fontWeight: 500, fontSize: "0.8rem",
    cursor: "pointer",
  },
  btnDisabled: {
    background: C.muted, color: "#fff",
    border: "none", borderRadius: 7,
    padding: "0.6rem 1.5rem",
    fontFamily: "inherit", fontWeight: 600, fontSize: "0.875rem",
    cursor: "not-allowed",
  },
  
  // Carte mode automatique RÉDUITE
  autoCardCompact: {
    background: C.darkCard,
    borderRadius: 8,
    padding: "0.5rem 0.75rem",
    minWidth: 200,
    border: `1px solid ${C.darkCardLt}`,
  },
  autoHeaderCompact: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  autoIconCompact: {
    width: 28, height: 28,
    background: "rgba(255,255,255,0.1)",
    borderRadius: 6,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "0.9rem",
  },
  autoTitleCompact: { fontSize: "0.7rem", fontWeight: 600, color: "#fff", margin: 0 },
  autoToggleCompact: {
    position: "relative",
    display: "inline-block",
    width: 36,
    height: 18,
    marginLeft: "auto",
  },
  autoToggleInputCompact: {
    opacity: 0,
    width: 0,
    height: 0,
  },
  autoToggleSliderCompact: {
    position: "absolute",
    cursor: "pointer",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#475569",
    borderRadius: 18,
    transition: "0.3s",
  },
  autoToggleSliderBeforeCompact: {
    position: "absolute",
    content: '""',
    height: 14,
    width: 14,
    left: 2,
    bottom: 2,
    backgroundColor: "#fff",
    borderRadius: "50%",
    transition: "0.3s",
  },
  autoBodyCompact: {
    borderTop: `1px solid ${C.darkCardLt}`,
    paddingTop: "0.5rem",
    marginTop: "0.5rem",
  },
  speedLabelCompact: {
    fontSize: "0.55rem",
    color: "#94a3b8",
    display: "block",
    marginBottom: "0.3rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  speedButtonsCompact: {
    display: "flex",
    gap: "0.3rem",
    flexWrap: "wrap",
    marginBottom: "0.5rem",
  },
  speedBtnCompact: (active) => ({
    background: active ? C.accent : "#334155",
    color: active ? "#fff" : "#94a3b8",
    border: "none",
    padding: "0.2rem 0.4rem",
    borderRadius: 4,
    fontSize: "0.6rem",
    cursor: "pointer",
    transition: "all 0.2s",
  }),
  autoActionsCompact: {
    display: "flex",
    alignItems: "center",
    gap: "0.3rem",
  },
  autoRunningBadgeCompact: {
    display: "flex",
    alignItems: "center",
    gap: "0.3rem",
    background: C.green,
    padding: "0.2rem 0.5rem",
    borderRadius: 4,
    fontSize: "0.6rem",
    fontWeight: 600,
    color: "#fff",
    flex: 1,
  },
  pulseDot: {
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: "#fff",
    animation: "pulse 1.5s infinite",
    display: "inline-block",
  },
  btnStopAutoCompact: {
    background: C.red,
    color: "#fff",
    border: "none",
    padding: "0.2rem 0.5rem",
    borderRadius: 4,
    fontSize: "0.6rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnStartAutoCompact: {
    background: C.green,
    color: "#fff",
    border: "none",
    padding: "0.2rem 0.5rem",
    borderRadius: 4,
    fontSize: "0.6rem",
    fontWeight: 600,
    cursor: "pointer",
    flex: 1,
  },
  autoReadyBadgeCompact: {
    marginTop: "0.3rem",
    background: C.accent,
    color: "#fff",
    padding: "0.2rem 0.4rem",
    borderRadius: 4,
    fontSize: "0.55rem",
    textAlign: "center",
  },
  autoBlockedBadgeCompact: {
    marginTop: "0.3rem",
    background: C.red,
    color: "#fff",
    padding: "0.2rem 0.4rem",
    borderRadius: 4,
    fontSize: "0.55rem",
    textAlign: "center",
  },
  
  alertBox: (bg, border, color) => ({
    background: bg,
    border: `1px solid ${border}`,
    borderLeft: `3px solid ${color}`,
    borderRadius: 8,
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
    fontSize: "0.85rem",
    color: color,
    display: "flex", alignItems: "flex-start", gap: "0.5rem",
  }),
  infoBox: {
    background: C.accentLt,
    border: `1px solid #bfdbfe`,
    borderLeft: `3px solid ${C.accent}`,
    borderRadius: 8,
    padding: "0.75rem 1rem",
    marginBottom: "1.25rem",
    fontSize: "0.85rem",
    color: "#1d4ed8",
  },
  
  pipelineCard: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "1.25rem",
    marginTop: "1rem",
  },
  pipelineActiveCard: {
    background: C.accentLt,
    border: `2px solid ${C.accent}`,
    borderRadius: 10,
    padding: "1.25rem",
    marginTop: "1rem",
  },
  pipelineHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  pipelineOrdre: {
    background: C.accent,
    color: "#fff",
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.9rem",
    fontWeight: 700,
  },
  progressBar: {
    background: C.bg,
    borderRadius: 99,
    height: 6,
    marginBottom: "0.75rem",
  },
  progressFill: (pct) => ({
    width: `${pct}%`,
    height: 6,
    borderRadius: 99,
    background: `linear-gradient(90deg, ${C.accent}, ${C.green})`,
    transition: "width 0.3s ease",
  }),
  stepChip: (status) => ({
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: "0.6rem",
    fontWeight: 600,
    background: status === "TERMINE" ? C.greenLt : status === "EN_COURS" ? C.amberLt : C.bg,
    color: status === "TERMINE" ? C.green : status === "EN_COURS" ? C.amber : C.muted,
  }),
  
  machineBlockCard: (color, bg) => ({
    border: `2px solid ${color}`,
    borderRadius: 10,
    background: bg,
    padding: "1rem",
    marginBottom: "1rem",
  }),
  
  machineGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
    gap: "0.5rem",
    marginBottom: "1rem",
  },
  machineCard: (color) => ({
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "0.5rem",
    borderLeft: `3px solid ${color}`,
  }),
  
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" },
  thead: { background: C.bg },
  th: {
    textAlign: "left", padding: "0.6rem 0.9rem",
    borderBottom: `1px solid ${C.border}`,
    color: C.muted, fontWeight: 600, fontSize: "0.72rem",
    textTransform: "uppercase",
  },
  tr: (i) => ({
    background: i % 2 === 0 ? "#fff" : C.bg,
  }),
  td: { padding: "0.7rem 0.9rem", borderBottom: `1px solid ${C.border}`, color: C.sub },
  
  pill: (bg, color, border) => ({
    display: "inline-flex", alignItems: "center",
    padding: "2px 9px", borderRadius: 20,
    fontSize: "0.72rem", fontWeight: 600,
    background: bg, color: color,
    border: `1px solid ${border}`,
  }),
  
  emptyState: {
    textAlign: "center", padding: "3rem",
    color: C.muted,
  },
  emptyIcon: { fontSize: "2.5rem" },
  
  pipelineHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1rem",
  },
  selectFlex: {
    flex: 1,
  },
  
  // Style pour l'aperçu des données simulées
  simPreviewCard: {
    background: C.accentLt,
    border: `1px solid ${C.accent}`,
    borderRadius: 8,
    padding: "0.5rem 0.75rem",
    marginBottom: "1rem",
    fontSize: "0.7rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  simPreviewItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    background: "#fff",
    padding: "0.2rem 0.5rem",
    borderRadius: 4,
  },
  simPreviewLabel: {
    fontWeight: 600,
    color: C.muted,
  },
  simPreviewValue: {
    fontWeight: 700,
    color: C.accent,
    fontFamily: "monospace",
  },
};

// ═════════════════════════════════════════════════════════════════════════════
//  CONSTANTES & CONFIG
// ═════════════════════════════════════════════════════════════════════════════

const BASE_URL   = "http://127.0.0.1:8000/api/productions/";
const REBUTS_URL = "http://127.0.0.1:8000/api/productions/rebuts/";
const MES_OF_URL = "http://127.0.0.1:8000/api/ordres-fabrication/";

const MACHINE_POLL_INTERVAL = 5000;

const SEQUENCE_MACHINES = [
  { ordre: 1,  code: "CT-ALIM-01", nom: "Alimentation" },
  { ordre: 2,  code: "CT-COND-01", nom: "Condenseur 1"  },
  { ordre: 3,  code: "CT-NET-01",  nom: "Nettoyeuse"    },
  { ordre: 4,  code: "CT-COND-02", nom: "Condenseur 2"  },
  { ordre: 5,  code: "CT-CARD-01", nom: "Cardage 1"     },
  { ordre: 6,  code: "CT-CARD-02", nom: "Cardage 2"     },
  { ordre: 7,  code: "CT-CARD-03", nom: "Cardage 3"     },
  { ordre: 8,  code: "CT-COND-03", nom: "Condenseur 3"  },
  { ordre: 9,  code: "CT-INJ-01",  nom: "Injection"     },
  { ordre: 10, code: "CT-SEC-01",  nom: "Séchage"       },
  { ordre: 11, code: "CT-BOB-01",  nom: "Bobinage"      },
];
const NB_ETAPES = SEQUENCE_MACHINES.length;

const TYPES_DEFAUT = ["Néppes", "Impuretés", "Casses", "Irrégularité", "Souillure", "Autre défaut"];

const MACHINE_STATE_CONFIG = {
  MARCHE     : { label: "En marche",   color: C.green, bg: C.greenLt, icon: "✅", blocking: false },
  PAUSE      : { label: "À l'arrêt",   color: C.amber, bg: C.amberLt, icon: "⏸️", blocking: true  },
  ERREUR     : { label: "En panne",    color: C.red,   bg: C.redLt,   icon: "🔴", blocking: true  },
  MAINTENANCE: { label: "Maintenance", color: C.accent, bg: C.accentLt, icon: "🔧", blocking: true  },
  UNKNOWN    : { label: "Inconnu",     color: C.muted, bg: C.bg,       icon: "❓", blocking: false },
};

const getMachineCfg = (state) =>
  MACHINE_STATE_CONFIG[state?.toUpperCase()] || MACHINE_STATE_CONFIG.UNKNOWN;

const TAB_CONFIG = [
  { id: "lancer",     label: "🚀 Lancer Production", roles: ["operator"] },
  { id: "pipeline",   label: "⚙️ Pipeline",           roles: ["operator"] },
  { id: "rebuts",     label: "⚠️ Rebuts",             roles: ["operator"] },
  { id: "historique", label: "📋 Historique",         roles: ["manager", "admin"] },
];

const canAccess = (tabId, role) =>
  TAB_CONFIG.find((t) => t.id === tabId)?.roles.includes(role) ?? false;

// ═════════════════════════════════════════════════════════════════════════════
//  COMPOSANT PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════════

const Production = ({ role = "operator" }) => {
  const visibleTabs = TAB_CONFIG.filter((t) => canAccess(t.id, role));
  const [activeTab, setActiveTab] = useState(() => visibleTabs[0]?.id ?? "lancer");

  const [productions, setProductions] = useState([]);
  const [rebuts, setRebuts]           = useState([]);
  const [ofs, setOfs]                 = useState([]);

  const [selectedProdId, setSelectedProdId]   = useState(null);
  const [selectedProd, setSelectedProd]       = useState(null);
  const [etapeCourante, setEtapeCourante]     = useState(null);
  const [pipelineTermine, setPipelineTermine] = useState(false);

  const simulationPlanRef = useRef(null);
  const simStepIndexRef   = useRef(0);
  const [simPlanMeta, setSimPlanMeta] = useState(null);

  const [machineBlocked, setMachineBlocked] = useState(false);
  const [machineStatus, setMachineStatus]   = useState(null);
  const [machinePolling, setMachinePolling] = useState(false);
  const machinePollIntervalRef              = useRef(null);
  const machineBlockedRef                   = useRef(false);

  const [autoMode, setAutoMode]           = useState(false);
  const [autoSpeed, setAutoSpeed]         = useState(800);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const autoIntervalRef    = useRef(null);
  const isAutoRunningRef   = useRef(false);
  const pipelineTermineRef = useRef(false);

  // État pour stocker les données simulées actuelles à afficher
  const [simulatedData, setSimulatedData] = useState({
    qte_entree: "",
    qte_sortie: "",
    debut: "",
    fin: "",
    operateur: "",
  });

  const [formLancer, setFormLancer] = useState({
    of_id: "", produit_fini: "", quantite_produit_fini: "",
  });
  const emptyEtapeForm = { qte_entree: "", qte_sortie: "", operateur: "", debut: "", fin: "" };
  const [etapeForm, setEtapeForm] = useState(emptyEtapeForm);
  const [formRebut, setFormRebut] = useState({
    production_id: "", machine: "", defaut: "", quantite: "",
  });

  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [successMsg, setSuccessMsg]           = useState("");
  const [errorMsg, setErrorMsg]               = useState("");
  const [loadingPipeline, setLoadingPipeline] = useState(false);

  const { totalPF, totalMP, totalReb, rendement } = useMemo(() => {
    const pf  = productions.reduce((a, p) => a + Number(p.quantite_produit_fini     || 0), 0);
    const mp  = productions.reduce((a, p) => a + Number(p.quantite_matiere_premiere || 0), 0);
    const reb = rebuts.reduce     ((a, r) => a + Number(r.quantite                  || 0), 0);
    return {
      totalPF: pf, totalMP: mp, totalReb: reb,
      rendement: mp > 0 ? ((pf / mp) * 100).toFixed(1) : "–",
    };
  }, [productions, rebuts]);

  const ofsFiltres = useMemo(() => {
    return ofs.filter((o) => {
      const statut = (o.statut || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return ["planifie", "en cours", "en_cours"].includes(statut);
    });
  }, [ofs]);

  // ═════════════════════════════════════════════════════════════════════════════
  //  POLLING ÉTAT MACHINE
  // ═════════════════════════════════════════════════════════════════════════════

  const stopMachinePoll = useCallback(() => {
    if (machinePollIntervalRef.current) {
      clearInterval(machinePollIntervalRef.current);
      machinePollIntervalRef.current = null;
    }
    setMachinePolling(false);
  }, []);

  const pollMachineStatus = useCallback(
    async (prodId, resumeAutoMode, targetPF) => {
      if (!prodId) return;
      try {
        const res    = await axios.get(`${BASE_URL}${prodId}/machine-status`);
        const status = res.data;
        setMachineStatus(status);

        if (status.pipeline_can_proceed && machineBlockedRef.current) {
          machineBlockedRef.current = false;
          setMachineBlocked(false);
          stopMachinePoll();
          flash(`✅ Machine ${status.machine_code} revenue en MARCHE — pipeline reprend.`);

          if (resumeAutoMode && !isAutoRunningRef.current && !pipelineTermineRef.current) {
            setTimeout(() => startAutoMode(prodId, targetPF), 500);
          }
        }
      } catch (err) {
        console.error("Erreur polling machine-status:", err);
      }
    },
    [stopMachinePoll],
  );

  const startMachinePoll = useCallback(
    (prodId, resumeAutoMode = false, targetPF = null) => {
      stopMachinePoll();
      if (!prodId) return;
      machineBlockedRef.current = true;
      setMachinePolling(true);
      pollMachineStatus(prodId, resumeAutoMode, targetPF);
      machinePollIntervalRef.current = setInterval(() => {
        if (!machineBlockedRef.current) { stopMachinePoll(); return; }
        pollMachineStatus(prodId, resumeAutoMode, targetPF);
      }, MACHINE_POLL_INTERVAL);
    },
    [stopMachinePoll, pollMachineStatus],
  );

  const handleMachineBlockError = useCallback(
    (error, prodId, wasAutoMode, targetPF) => {
      const detail = error.response?.data?.detail;
      if (error.response?.status === 409 && detail?.code === "MACHINE_NOT_READY") {
        setMachineStatus({
          production_id    : prodId,
          machine_code     : detail.machine_code,
          machine_name     : detail.machine_name,
          machine_state    : detail.machine_state,
          is_blocking      : true,
          pipeline_can_proceed: false,
          message          : detail.message,
        });
        setMachineBlocked(true);
        machineBlockedRef.current = true;
        if (wasAutoMode) stopAutoMode();
        startMachinePoll(prodId, wasAutoMode, targetPF);
        return true;
      }
      return false;
    },
    [startMachinePoll],
  );

  // ═════════════════════════════════════════════════════════════════════════════
  //  UTILITAIRES
  // ═════════════════════════════════════════════════════════════════════════════

  const stopAutoMode = useCallback(() => {
    if (autoIntervalRef.current) {
      clearInterval(autoIntervalRef.current);
      autoIntervalRef.current = null;
    }
    isAutoRunningRef.current = false;
    setIsAutoRunning(false);
    setSimulatedData(emptyEtapeForm);
  }, []);

  const flash = (msg, isError = false) => {
    if (isError) { setErrorMsg(msg); setTimeout(() => setErrorMsg(""), 4500); }
    else         { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 4500); }
  };

  const loadAll = useCallback(async () => {
    try {
      const [pR, rR] = await Promise.all([axios.get(BASE_URL), axios.get(REBUTS_URL)]);
      setProductions([...pR.data]);
      setRebuts([...rR.data]);
    } catch (e) { console.error(e); }
  }, []);

  const loadOFs = useCallback(async () => {
    try {
      const r = await axios.get(MES_OF_URL);
      setOfs(r.data);
    } catch (e) { console.error(e); }
  }, []);

  const loadPipeline = useCallback(
    async (prodId) => {
      if (!prodId) return;
      setLoadingPipeline(true);
      try {
        const det = await axios.get(`${BASE_URL}${prodId}`);
        setSelectedProd(det.data);
        const fin = det.data.statut === "TERMINE";
        setPipelineTermine(fin);
        pipelineTermineRef.current = fin;
        setEtapeForm(emptyEtapeForm);
        setSimulatedData(emptyEtapeForm);

        if (!fin) {
          try {
            const eR = await axios.get(`${BASE_URL}${prodId}/etape-courante`);
            setEtapeCourante(eR.data);
          } catch { setEtapeCourante(null); }
          try {
            const sR = await axios.get(`${BASE_URL}${prodId}/machine-status`);
            setMachineStatus(sR.data);
            const blocking = sR.data.is_blocking;
            setMachineBlocked(blocking);
            machineBlockedRef.current = blocking;
          } catch { /* non critique */ }
        } else {
          setEtapeCourante(null);
          stopAutoMode(); stopMachinePoll();
          setMachineBlocked(false); machineBlockedRef.current = false;
          setMachineStatus(null);
          simulationPlanRef.current = null; simStepIndexRef.current = 0;
          setSimPlanMeta(null);
        }
      } catch (e) { flash("Erreur chargement production", true); }
      finally { setLoadingPipeline(false); }
    },
    [stopAutoMode, stopMachinePoll],
  );

  // ═════════════════════════════════════════════════════════════════════════════
  //  MODE AUTOMATIQUE
  // ═════════════════════════════════════════════════════════════════════════════

  const startAutoMode = useCallback(
    async (prodId, targetPF) => {
      if (!prodId) return;
      stopAutoMode();
      isAutoRunningRef.current   = true;
      pipelineTermineRef.current = false;
      setIsAutoRunning(true);

      if (!simulationPlanRef.current || simulationPlanRef.current._targetPF !== targetPF) {
        const now    = new Date();
        const startH = now.getHours();
        const startM = now.getMinutes() < 30 ? 0 : 30;
        const result = precomputeProductionPlan(targetPF, startH, startM);
        simulationPlanRef.current = { ...result, _targetPF: targetPF };
        simStepIndexRef.current   = 0;
        setSimPlanMeta({ qteMP: result.qteMP, rendementGlobal: result.rendementGlobal });
      }

      const processNextStep = async () => {
        if (!isAutoRunningRef.current || pipelineTermineRef.current) { stopAutoMode(); return; }
        if (machineBlockedRef.current) return;

        try {
          const etapeRes     = await axios.get(`${BASE_URL}${prodId}/etape-courante`);
          const currentEtape = etapeRes.data;
          const stepIdx      = simStepIndexRef.current;
          const plan         = simulationPlanRef.current?.plan;
          const planStep     = plan?.[stepIdx];
          const isLastEtape  = currentEtape.ordre === NB_ETAPES;

          let payload;
          if (planStep && planStep.machineCode === currentEtape.machine) {
            payload = {
              qte_entree : planStep.qte_entree,
              qte_sortie : isLastEtape ? targetPF : planStep.qte_sortie,
              operateur  : planStep.operateur,
              debut      : planStep.debut,
              fin        : planStep.fin,
            };
            // Mettre à jour les données simulées à afficher
            setSimulatedData({
              qte_entree: planStep.qte_entree,
              qte_sortie: isLastEtape ? targetPF : planStep.qte_sortie,
              debut: planStep.debut,
              fin: planStep.fin,
              operateur: planStep.operateur,
            });
          } else {
            const fallback = simulateStep(
              currentEtape.machine,
              planStep?.qte_entree ?? targetPF * 1.05,
              6 * 60 + stepIdx * 30,
              isLastEtape,
              targetPF,
              stepIdx,
            );
            payload = {
              qte_entree : fallback.qte_entree,
              qte_sortie : isLastEtape ? targetPF : fallback.qte_sortie,
              operateur  : fallback.operateur,
              debut      : fallback.debut,
              fin        : fallback.fin,
            };
            setSimulatedData({
              qte_entree: fallback.qte_entree,
              qte_sortie: isLastEtape ? targetPF : fallback.qte_sortie,
              debut: fallback.debut,
              fin: fallback.fin,
              operateur: fallback.operateur,
            });
          }

          // Mettre à jour également le formulaire pour l'affichage
          setEtapeForm({
            qte_entree: payload.qte_entree.toString(),
            qte_sortie: payload.qte_sortie.toString(),
            operateur: payload.operateur,
            debut: payload.debut,
            fin: payload.fin,
          });

          const res   = await axios.post(`${BASE_URL}${prodId}/avancer`, payload);
          const state = res.data;
          simStepIndexRef.current = stepIdx + 1;

          if (state.machine_status?.is_blocking) {
            stopAutoMode();
            setMachineBlocked(true); machineBlockedRef.current = true;
            setMachineStatus(state.machine_status);
            startMachinePoll(prodId, true, targetPF);
            flash(`⚠️ Pipeline suspendu — ${state.machine_status.message}`, true);
            await loadAll();
            const det = await axios.get(`${BASE_URL}${prodId}`);
            setSelectedProd(det.data);
            return;
          }

          await loadAll();
          const det = await axios.get(`${BASE_URL}${prodId}`);
          setSelectedProd(det.data);
          const fin = det.data.statut === "TERMINE";
          setPipelineTermine(fin); pipelineTermineRef.current = fin;

          if (state.pipeline_termine || fin) {
            pipelineTermineRef.current = true;
            stopAutoMode(); stopMachinePoll();
            setSimPlanMeta((prev) => (prev ? { ...prev, done: true } : null));
            setSimulatedData(emptyEtapeForm);
            flash("🎉 Production terminée automatiquement !");
            setEtapeCourante(null); setMachineStatus(null);
            return;
          }

          try {
            const eR = await axios.get(`${BASE_URL}${prodId}/etape-courante`);
            setEtapeCourante(eR.data);
          } catch { setEtapeCourante(null); }

        } catch (err) {
          if (err.response?.status === 409) {
            const wasMB = handleMachineBlockError(err, prodId, true, targetPF);
            if (wasMB) {
              stopAutoMode();
              await loadAll();
              try {
                const det = await axios.get(`${BASE_URL}${prodId}`);
                setSelectedProd(det.data);
                const eR  = await axios.get(`${BASE_URL}${prodId}/etape-courante`);
                setEtapeCourante(eR.data);
              } catch { /* ok */ }
            }
            return;
          }
          if (err.response?.status === 404) {
            pipelineTermineRef.current = true; stopAutoMode();
            flash("🎉 Production terminée !"); await loadAll(); await loadPipeline(prodId);
          } else {
            console.error("Auto-mode error:", err);
            flash("❌ Erreur en mode automatique", true); stopAutoMode();
          }
        }
      };

      await processNextStep();

      if (isAutoRunningRef.current && !machineBlockedRef.current) {
        autoIntervalRef.current = setInterval(async () => {
          if (!isAutoRunningRef.current || pipelineTermineRef.current || machineBlockedRef.current) {
            if (!machineBlockedRef.current) stopAutoMode();
            return;
          }
          await processNextStep();
        }, autoSpeed);
      }
    },
    [autoSpeed, stopAutoMode, loadAll, loadPipeline, handleMachineBlockError, startMachinePoll, stopMachinePoll],
  );

  // ═════════════════════════════════════════════════════════════════════════════
  //  EFFETS
  // ═════════════════════════════════════════════════════════════════════════════

  useEffect(() => { loadAll(); loadOFs(); }, [loadAll, loadOFs]);
  useEffect(() => () => { stopAutoMode(); stopMachinePoll(); }, [stopAutoMode, stopMachinePoll]);

  // ═════════════════════════════════════════════════════════════════════════════
  //  HANDLERS
  // ═════════════════════════════════════════════════════════════════════════════

  const handleOFChange = (ofId) => {
    const of = ofs.find((o) => String(o.id) === String(ofId));
    setFormLancer({
      of_id                : ofId,
      produit_fini         : of?.produit || of?.produit_fini || "",
      quantite_produit_fini: of?.quantite || of?.quantite_produit_fini || "",
    });
  };

  const handleLancer = async (e) => {
    e.preventDefault();
    if (!formLancer.of_id || !formLancer.produit_fini || !formLancer.quantite_produit_fini)
      return flash("Veuillez remplir tous les champs", true);

    setIsSubmitting(true);
    try {
      const qPF = parseFloat(formLancer.quantite_produit_fini);
      const res = await axios.post(BASE_URL, {
        of_id                : parseInt(formLancer.of_id),
        produit_fini         : formLancer.produit_fini,
        quantite_produit_fini: qPF,
      });
      await loadAll();
      flash(`✅ Production lancée – ${res.data.of_numero} – Objectif PF: ${qPF} kg`);
      setFormLancer({ of_id: "", produit_fini: "", quantite_produit_fini: "" });
      simulationPlanRef.current = null; simStepIndexRef.current = 0; setSimPlanMeta(null);
      const newId = res.data.id;
      setSelectedProdId(newId); setMachineBlocked(false); machineBlockedRef.current = false;
      setMachineStatus(null); setActiveTab("pipeline");
      await loadPipeline(newId);
    } catch (err) {
      flash("❌ " + (err.response?.data?.detail || err.message), true);
    } finally { setIsSubmitting(false); }
  };

  const handleAvancer = async () => {
    if (!etapeForm.qte_entree || !etapeForm.qte_sortie)
      return flash("Quantités entrée/sortie obligatoires", true);
    if (machineBlocked && machineStatus)
      return flash(`⚠️ Pipeline bloqué : ${machineStatus.message}`, true);

    const isLastEtape = etapeCourante?.ordre === NB_ETAPES;
    const qteSortieFinale = isLastEtape
      ? parseFloat(selectedProd.quantite_produit_fini)
      : parseFloat(etapeForm.qte_sortie);

    setIsSubmitting(true);
    try {
      const res   = await axios.post(`${BASE_URL}${selectedProdId}/avancer`, {
        qte_entree : parseFloat(etapeForm.qte_entree),
        qte_sortie : qteSortieFinale,
        operateur  : etapeForm.operateur || null,
        debut      : etapeForm.debut     || null,
        fin        : etapeForm.fin       || null,
      });
      const state = res.data;

      if (state.machine_status?.is_blocking) {
        setMachineBlocked(true); machineBlockedRef.current = true;
        setMachineStatus(state.machine_status);
        startMachinePoll(selectedProdId, false, selectedProd?.quantite_produit_fini);
        flash("⚠️ Étape validée mais prochaine machine bloquée.", true);
      } else {
        setMachineBlocked(false); machineBlockedRef.current = false;
      }

      if (state.pipeline_termine) {
        setEtapeCourante(null); setPipelineTermine(true); pipelineTermineRef.current = true;
        stopAutoMode(); stopMachinePoll(); setMachineStatus(null);
        flash("🎉 Production terminée !");
      } else if (!state.machine_status?.is_blocking) {
        setEtapeCourante(state.etape_suivante);
        flash(`✅ ${state.etape_validee.machine} → ${state.etape_suivante?.machine}`);
      }

      setEtapeForm(emptyEtapeForm);
      await loadAll();
      const det = await axios.get(`${BASE_URL}${selectedProdId}`);
      setSelectedProd(det.data);
    } catch (err) {
      if (err.response?.status === 409) {
        handleMachineBlockError(err, selectedProdId, false, selectedProd?.quantite_produit_fini);
        return;
      }
      flash("❌ " + JSON.stringify(err.response?.data), true);
    } finally { setIsSubmitting(false); }
  };

  const handleRebut = async (e) => {
    e.preventDefault();
    if (!formRebut.production_id || !formRebut.machine || !formRebut.defaut || !formRebut.quantite)
      return flash("Veuillez remplir tous les champs", true);
    setIsSubmitting(true);
    try {
      const res = await axios.post(REBUTS_URL, {
        production_id: parseInt(formRebut.production_id),
        machine      : formRebut.machine,
        defaut       : formRebut.defaut,
        quantite     : parseFloat(formRebut.quantite),
      });
      setRebuts((prev) => [...prev, res.data]);
      setFormRebut({ production_id: "", machine: "", defaut: "", quantite: "" });
      flash("✅ Rebut enregistré"); await loadAll();
    } catch (err) {
      flash("❌ " + (err.response?.data?.detail || err.message), true);
    } finally { setIsSubmitting(false); }
  };

  const handleSelectProd = async (id) => {
    stopAutoMode(); stopMachinePoll();
    setMachineBlocked(false); machineBlockedRef.current = false; setMachineStatus(null);
    simulationPlanRef.current = null; simStepIndexRef.current = 0; setSimPlanMeta(null);
    setSelectedProdId(parseInt(id));
    await loadPipeline(parseInt(id));
  };

  const handleStartAuto = () => {
    if (selectedProdId && !pipelineTermine && selectedProd && !machineBlocked)
      startAutoMode(selectedProdId, selectedProd.quantite_produit_fini);
  };

  const safeActiveTab =
    visibleTabs.some((t) => t.id === activeTab) ? activeTab : (visibleTabs[0]?.id ?? "");

  // ═════════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════════════════════════════════

  return (
    <div style={s.app}>
      {/* TOPBAR */}
      <div style={s.topbar}>
        <div style={s.logoRow}>
          <div style={s.logo}>M</div>
          <div>
            <p style={s.h1}>MES — Atelier Cardage</p>
            <p style={s.h1sub}>Simulation industrielle · Pipeline automatique</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={s.badgeOnline}><span style={s.dot}/>En ligne</span>
          <span style={s.badgeSync}>⚙️ {NB_ETAPES} étapes</span>
        </div>
      </div>

      <div style={s.main}>
        {/* MESSAGES */}
        {successMsg && (
          <div style={s.alertBox(C.greenLt, "#bbf7d0", C.green)}>
            ✅ {successMsg}
          </div>
        )}
        {errorMsg && (
          <div style={s.alertBox(C.redLt, "#fecaca", C.red)}>
            ❌ {errorMsg}
          </div>
        )}

        {/* KPI ROW */}
        <div style={s.kpiRow}>
          {[
            { label: "Produit Fini",     value: `${totalPF.toFixed(1)} kg`, icon: "📦", color: C.accent, lt: C.accentLt },
            { label: "Matière Première", value: `${totalMP.toFixed(1)} kg`, icon: "🌾", color: C.purple, lt: C.purpleLt },
            { label: "Rebuts",           value: `${totalReb.toFixed(1)} kg`, icon: "⚠️", color: C.red, lt: C.redLt },
            { label: "Rendement global", value: `${rendement}%`,             icon: "📊", color: C.green, lt: C.greenLt },
          ].map((k) => (
            <div key={k.label} style={s.kpiCard(k.color, k.lt)}>
              <div style={s.kpiIcon(k.lt)}>{k.icon}</div>
              <div>
                <p style={s.kpiLabel}>{k.label}</p>
                <p style={s.kpiVal(k.color)}>{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div style={s.tabRow}>
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              style={s.tab(safeActiveTab === t.id)}
              onClick={() => { setActiveTab(t.id); setSuccessMsg(""); setErrorMsg(""); }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ONGLET : LANCER PRODUCTION */}
        {safeActiveTab === "lancer" && canAccess("lancer", role) && (
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <div>
                <p style={s.sectionTitle}>🚀 Lancer une nouvelle production</p>
                <p style={s.sectionSub}>
                  Seuls les ordres de fabrication au statut{" "}
                  <strong style={{ color: C.accent }}>Planifié</strong> ou{" "}
                  <strong style={{ color: C.green }}>En cours</strong> sont disponibles.
                </p>
              </div>
            </div>

            {/* Légende machines */}
            <div style={s.machineGrid}>
              {SEQUENCE_MACHINES.map((m) => {
                const p = MACHINE_PARAMS[m.code];
                if (!p) return null;
                const rendMoy = ((p.rendementMin + p.rendementMax) / 2 * 100).toFixed(1);
                const isHigh = parseFloat(rendMoy) >= 99;
                const isMed = parseFloat(rendMoy) >= 97;
                return (
                  <div key={m.code} style={s.machineCard(isHigh ? C.green : isMed ? C.amber : C.red)}>
                    <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.7rem", color: C.text }}>
                      {m.code}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: C.muted }}>{p.nom}</div>
                    <div style={{
                      fontSize: "0.7rem", fontWeight: 700, marginTop: "2px",
                      color: isHigh ? C.green : isMed ? C.amber : C.red,
                    }}>
                      Rend. {rendMoy}%
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleLancer}>
              <div style={s.grid2}>
                <div style={s.fg}>
                  <label style={s.label}>📋 Ordre de Fabrication <span style={s.req}>*</span></label>
                  <select
                    style={s.select}
                    value={formLancer.of_id}
                    onChange={(e) => handleOFChange(e.target.value)}
                    required
                  >
                    <option value="">-- Sélectionnez un OF --</option>
                    {ofsFiltres.map((o) => (
                      <option key={o.id} value={o.id}>{o.numero}</option>
                    ))}
                  </select>
                </div>
                <div style={s.fg}>
                  <label style={s.label}>🧵 Produit fini</label>
                  <input
                    style={{ ...s.input, background: C.bg }}
                    type="text"
                    value={formLancer.produit_fini}
                    readOnly
                    placeholder="Auto-rempli"
                  />
                </div>
                <div style={s.fg}>
                  <label style={s.label}>📦 Quantité PF (kg) <span style={s.req}>*</span></label>
                  <input
                    style={formLancer.quantite_produit_fini ? s.inputHighlight : s.input}
                    type="number"
                    step="0.01"
                    placeholder="Ex: 500"
                    value={formLancer.quantite_produit_fini}
                    onChange={(e) => setFormLancer({ ...formLancer, quantite_produit_fini: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div style={s.btnRow}>
                <button type="submit" style={s.btnPrimary} disabled={isSubmitting}>
                  {isSubmitting ? "⏳ Lancement..." : "🚀 Lancer le Pipeline"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ONGLET : PIPELINE */}
        {safeActiveTab === "pipeline" && canAccess("pipeline", role) && (
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <div>
                <p style={s.sectionTitle}>⚙️ Pipeline de Production</p>
                <p style={s.sectionSub}>Sélectionnez une production et pilotez le pipeline</p>
              </div>
            </div>

            {/* Ligne avec select à gauche et carte auto à droite */}
            <div style={s.pipelineHeaderRow}>
              <select
                style={s.selectFlex}
                value={selectedProdId || ""}
                onChange={(e) => e.target.value && handleSelectProd(e.target.value)}
              >
                <option value="">-- Choisir une production --</option>
                {productions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.of_numero} – {p.produit_fini} – {p.quantite_produit_fini} kg – {p.statut?.replace("_", " ")}
                  </option>
                ))}
              </select>

              {/* CARTE MODE AUTOMATIQUE RÉDUITE À DROITE */}
              <div style={s.autoCardCompact}>
                <div style={s.autoHeaderCompact}>
                  <div style={s.autoIconCompact}>🤖</div>
                  <div>
                    <p style={s.autoTitleCompact}>Auto</p>
                  </div>
                  <label style={s.autoToggleCompact}>
                    <input
                      type="checkbox"
                      checked={autoMode}
                      onChange={() => {
                        if (autoMode) {
                          stopAutoMode();
                          setAutoMode(false);
                          flash("Mode automatique désactivé");
                        } else {
                          setAutoMode(true);
                          flash("Mode automatique activé");
                        }
                      }}
                      style={s.autoToggleInputCompact}
                    />
                    <span style={s.autoToggleSliderCompact}>
                      <span style={s.autoToggleSliderBeforeCompact} />
                    </span>
                  </label>
                </div>
                
                {autoMode && (
                  <div style={s.autoBodyCompact}>
                    <div style={s.speedLabelCompact}>⚡ Vitesse</div>
                    <div style={s.speedButtonsCompact}>
                      {[
                        { value: 1500, label: "🐢" },
                        { value: 800, label: "⚡" },
                        { value: 300, label: "🚀" },
                        { value: 80, label: "💨" },
                      ].map((speed) => (
                        <button
                          key={speed.value}
                          onClick={() => setAutoSpeed(speed.value)}
                          style={s.speedBtnCompact(autoSpeed === speed.value)}
                          disabled={isAutoRunning}
                          title={speed.label === "🐢" ? "Lente" : speed.label === "⚡" ? "Normale" : speed.label === "🚀" ? "Rapide" : "Turbo"}
                        >
                          {speed.label}
                        </button>
                      ))}
                    </div>
                    
                    <div style={s.autoActionsCompact}>
                      {isAutoRunning ? (
                        <>
                          <div style={s.autoRunningBadgeCompact}>
                            <span style={s.pulseDot}></span>
                            Auto
                          </div>
                          <button onClick={stopAutoMode} style={s.btnStopAutoCompact}>
                            ⏹️
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleStartAuto}
                          style={s.btnStartAutoCompact}
                          disabled={!selectedProdId || pipelineTermine || machineBlocked}
                        >
                          ▶️ Démarrer
                        </button>
                      )}
                    </div>
                    
                    {selectedProdId && autoMode && !isAutoRunning && !pipelineTermine && !machineBlocked && (
                      <div style={s.autoReadyBadgeCompact}>✅ Prêt</div>
                    )}
                    {machineBlocked && autoMode && (
                      <div style={s.autoBlockedBadgeCompact}>🔴 Bloqué</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {loadingPipeline && <div style={{ marginTop: "1rem", textAlign: "center", color: C.muted }}>⏳ Chargement...</div>}

            {selectedProd && (
              <div style={{ marginTop: "1.5rem" }}>
                {/* Info production */}
                <div style={s.infoBox}>
                  <div>🎯 Objectif PF : <strong>{selectedProd.quantite_produit_fini} kg</strong></div>
                  {selectedProd.quantite_matiere_premiere && (
                    <div>🌾 MP engagée : <strong>{selectedProd.quantite_matiere_premiere} kg</strong></div>
                  )}
                </div>

                {/* Progression */}
                <PipelineProgressBar etapes={selectedProd.etapes || []} />

                {/* Machine bloquée */}
                {machineBlocked && machineStatus && (
                  <MachineBlockAlert status={machineStatus} polling={machinePolling} />
                )}

                {/* Étape active ou terminée */}
                {pipelineTermine ? (
                  <div style={{ textAlign: "center", padding: "2rem", background: C.greenLt, borderRadius: 10 }}>
                    <div style={{ fontSize: "3rem" }}>🎉</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: C.green }}>Production Terminée !</div>
                    <div>PF réel : <strong>{selectedProd.quantite_produit_fini} kg</strong></div>
                  </div>
                ) : etapeCourante ? (
                  <EtapeActiveForm
                    etape={etapeCourante}
                    form={etapeForm}
                    setForm={setEtapeForm}
                    onSubmit={handleAvancer}
                    isSubmitting={isSubmitting}
                    nbEtapes={NB_ETAPES}
                    isAutoMode={autoMode && isAutoRunning}
                    targetPF={selectedProd.quantite_produit_fini}
                    machineBlocked={machineBlocked}
                    simulatedData={simulatedData}
                  />
                ) : (
                  <div style={s.emptyState}>
                    <div style={s.emptyIcon}>⏳</div>
                    <p>Chargement de l'étape active...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ONGLET : REBUTS */}
        {safeActiveTab === "rebuts" && canAccess("rebuts", role) && (
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <div>
                <p style={s.sectionTitle}>⚠️ Enregistrement des Rebuts</p>
                <p style={s.sectionSub}>Rattachez un rebut à une production et une machine spécifique</p>
              </div>
            </div>

            <form onSubmit={handleRebut}>
              <div style={s.grid2}>
                <div style={s.fg}>
                  <label style={s.label}>📦 Production <span style={s.req}>*</span></label>
                  <select style={s.select} value={formRebut.production_id} onChange={(e) => setFormRebut({ ...formRebut, production_id: e.target.value })} required>
                    <option value="">Sélectionner</option>
                    {productions.map((p) => <option key={p.id} value={p.id}>{p.of_numero} – {p.produit_fini}</option>)}
                  </select>
                </div>
                <div style={s.fg}>
                  <label style={s.label}>🏭 Machine <span style={s.req}>*</span></label>
                  <select style={s.select} value={formRebut.machine} onChange={(e) => setFormRebut({ ...formRebut, machine: e.target.value })} required>
                    <option value="">Sélectionner</option>
                    {SEQUENCE_MACHINES.map((m) => <option key={m.code} value={m.code}>{m.code}</option>)}
                  </select>
                </div>
                <div style={s.fg}>
                  <label style={s.label}>🔍 Type de défaut <span style={s.req}>*</span></label>
                  <select style={s.select} value={formRebut.defaut} onChange={(e) => setFormRebut({ ...formRebut, defaut: e.target.value })} required>
                    <option value="">Sélectionner</option>
                    {TYPES_DEFAUT.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div style={s.fg}>
                  <label style={s.label}>⚖️ Quantité (kg) <span style={s.req}>*</span></label>
                  <input style={s.input} type="number" step="0.01" placeholder="Ex: 25" value={formRebut.quantite} onChange={(e) => setFormRebut({ ...formRebut, quantite: e.target.value })} required />
                </div>
              </div>
              <div style={s.btnRow}>
                <button type="submit" style={s.btnWarning} disabled={isSubmitting}>
                  {isSubmitting ? "⏳ Enregistrement..." : "⚠️ Enregistrer le Rebut"}
                </button>
              </div>
            </form>

            {rebuts.length > 0 && (
              <div style={{ marginTop: "1.5rem", overflowX: "auto" }}>
                <table style={s.table}>
                  <thead style={s.thead}>
                    <tr><th style={s.th}>Production</th><th style={s.th}>Machine</th><th style={s.th}>Défaut</th><th style={s.th}>Quantité</th><th style={s.th}>Date</th></tr>
                  </thead>
                  <tbody>
                    {rebuts.map((r, i) => (
                      <tr key={r.id} style={s.tr(i)}>
                        <td style={s.td}>#{r.production_id}</td>
                        <td style={s.td}><code>{r.machine}</code></td>
                        <td style={s.td}>{r.defaut}</td>
                        <td style={s.td}><strong>{r.quantite}</strong> kg</td>
                        <td style={s.td}>{r.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ONGLET : HISTORIQUE */}
        {safeActiveTab === "historique" && canAccess("historique", role) && (
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <div>
                <p style={s.sectionTitle}>📋 Historique des Productions</p>
                <p style={s.sectionSub}>Bilan complet avec rendement calculé par production</p>
              </div>
            </div>

            {productions.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={s.table}>
                  <thead style={s.thead}>
                    <tr>{["OF", "Produit", "PF (kg)", "MP (kg)", "Rendement", "Statut", "Date"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {productions.map((p, i) => {
                      const rend = p.quantite_matiere_premiere ? ((p.quantite_produit_fini / p.quantite_matiere_premiere) * 100).toFixed(1) : "–";
                      const rendColor = parseFloat(rend) >= 88 ? C.green : parseFloat(rend) >= 80 ? C.amber : C.red;
                      return (
                        <tr key={p.id} style={s.tr(i)}>
                          <td style={s.td}><code>{p.of_numero}</code></td>
                          <td style={s.td}>{p.produit_fini}</td>
                          <td style={s.td}><strong>{p.quantite_produit_fini}</strong></td>
                          <td style={s.td}>{p.quantite_matiere_premiere ?? "–"}</td>
                          <td style={s.td}><span style={{ fontWeight: 700, color: rendColor }}>{rend !== "–" ? `${rend}%` : "–"}</span></td>
                          <td style={s.td}>{p.statut?.replace("_", " ")}</td>
                          <td style={s.td}>{p.date}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={s.emptyState}><div style={s.emptyIcon}>📭</div><p>Aucune production pour le moment</p></div>
            )}
          </div>
        )}
      </div>

      {/* Animation CSS pour le pulse dot */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}} />
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  COMPOSANT : ALERTE MACHINE BLOQUÉE
// ═════════════════════════════════════════════════════════════════════════════

const MachineBlockAlert = ({ status, polling }) => {
  const cfg = getMachineCfg(status.machine_state);
  return (
    <div style={s.machineBlockCard(cfg.color, cfg.bg)}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "1.5rem" }}>{cfg.icon}</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: "0.9rem", color: cfg.color }}>PIPELINE INTERROMPU</div>
          <div style={{ fontSize: "0.8rem", color: C.sub }}>{status.message}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <div><div style={{ fontSize: "0.6rem", color: C.muted }}>Machine</div><div style={{ fontWeight: 600, fontSize: "0.8rem" }}>{status.machine_code}</div></div>
        <div><div style={{ fontSize: "0.6rem", color: C.muted }}>État</div><div style={{ fontWeight: 600, fontSize: "0.8rem", color: cfg.color }}>{cfg.label}</div></div>
        <div><div style={{ fontSize: "0.6rem", color: C.muted }}>Surveillance</div><div style={{ fontSize: "0.75rem" }}>{polling ? "🔄 Active" : "⏸️ En attente"}</div></div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  COMPOSANT : BARRE DE PROGRESSION
// ═════════════════════════════════════════════════════════════════════════════

const PipelineProgressBar = ({ etapes }) => {
  const done = etapes.filter((e) => e.statut === "TERMINE").length;
  const pct = Math.round((done / NB_ETAPES) * 100);
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: "0.75rem", color: C.muted }}>Progression du pipeline</span>
        <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{done}/{NB_ETAPES} étapes — {pct}%</span>
      </div>
      <div style={s.progressBar}>
        <div style={s.progressFill(pct)} />
      </div>
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
        {etapes.map((e) => (
          <span key={e.id} style={s.stepChip(e.statut)}>
            {e.machine.split("-")[1]}
            {e.statut === "EN_COURS" && " ⚙"}
            {e.statut === "TERMINE" && " ✓"}
          </span>
        ))}
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  COMPOSANT : FORMULAIRE ÉTAPE ACTIVE AVEC AFFICHAGE DES DONNÉES SIMULÉES
// ═════════════════════════════════════════════════════════════════════════════

const EtapeActiveForm = ({
  etape, form, setForm, onSubmit, isSubmitting,
  nbEtapes, isAutoMode, targetPF, machineBlocked,
  simulatedData,
}) => {
  const isFirst = etape.ordre === 1;
  const isLast = etape.ordre === nbEtapes;
  const isDisabled = isAutoMode || machineBlocked;
  const params = MACHINE_PARAMS[etape.machine];

  // Utiliser les données simulées si disponibles, sinon les données du formulaire
  const displayQteEntree = isAutoMode && simulatedData.qte_entree ? simulatedData.qte_entree : form.qte_entree;
  const displayQteSortie = isAutoMode && simulatedData.qte_sortie ? simulatedData.qte_sortie : form.qte_sortie;
  const displayDebut = isAutoMode && simulatedData.debut ? simulatedData.debut : form.debut;
  const displayFin = isAutoMode && simulatedData.fin ? simulatedData.fin : form.fin;
  const displayOperateur = isAutoMode && simulatedData.operateur ? simulatedData.operateur : form.operateur;

  return (
    <div style={isAutoMode && !machineBlocked ? s.pipelineActiveCard : s.pipelineCard}>
      <div style={s.pipelineHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={s.pipelineOrdre}>{etape.ordre}</div>
          <div>
            <div style={{ fontWeight: 700 }}>{etape.machine}</div>
            <div style={{ fontSize: "0.7rem", color: C.muted }}>{etape.nom_machine}</div>
          </div>
        </div>
        <div>
          {isAutoMode && !machineBlocked && <span style={s.pill(C.greenLt, C.green, "#bbf7d0")}>🤖 Auto</span>}
          {machineBlocked && <span style={s.pill(C.redLt, C.red, "#fecaca")}>🔴 Bloqué</span>}
        </div>
      </div>

      {/* Aperçu des données simulées en mode auto */}
      {isAutoMode && !machineBlocked && simulatedData.qte_entree && (
        <div style={s.simPreviewCard}>
          <div style={s.simPreviewItem}>
            <span style={s.simPreviewLabel}>📊 Simulation:</span>
          </div>
          <div style={s.simPreviewItem}>
            <span style={s.simPreviewLabel}>Rendement:</span>
            <span style={s.simPreviewValue}>
              {((parseFloat(simulatedData.qte_sortie) / parseFloat(simulatedData.qte_entree)) * 100).toFixed(1)}%
            </span>
          </div>
          <div style={s.simPreviewItem}>
            <span style={s.simPreviewLabel}>👤 Opérateur:</span>
            <span style={s.simPreviewValue}>{simulatedData.operateur || "Auto"}</span>
          </div>
          <div style={s.simPreviewItem}>
            <span style={s.simPreviewLabel}>⏰ {simulatedData.debut} → {simulatedData.fin}</span>
          </div>
        </div>
      )}

      <div style={s.grid2}>
        <div style={s.fg}>
          <label style={s.label}>
            📥 {isFirst ? "Matière première (kg)" : "Quantité entrée (kg)"}
            {isAutoMode && <span style={{ marginLeft: "0.5rem", fontSize: "0.6rem", color: C.green }}>🤖 Auto</span>}
          </label>
          <input 
            style={isAutoMode && !machineBlocked ? s.inputAutoPreview : (isDisabled ? s.inputDisabled : s.input)} 
            type="number" 
            step="0.01" 
            value={displayQteEntree}
            onChange={(e) => setForm({ ...form, qte_entree: e.target.value })} 
            disabled={isDisabled}
            required 
            placeholder={isAutoMode ? "Calcul automatique..." : "Ex: 530"}
          />
          {isAutoMode && !machineBlocked && (
            <small style={{ color: C.green, fontSize: "0.65rem" }}>
              🤖 Valeur optimisée par simulation
            </small>
          )}
        </div>
        
        <div style={s.fg}>
          <label style={s.label}>
            📤 {isLast ? `PF sortant (kg) — ${targetPF} kg` : "Quantité sortie (kg)"}
            {isAutoMode && !isLast && <span style={{ marginLeft: "0.5rem", fontSize: "0.6rem", color: C.green }}>🤖 Auto</span>}
          </label>
          {isLast ? (
            <input style={{ ...s.input, background: C.accentLt, fontWeight: 600 }} type="number" value={targetPF} readOnly />
          ) : (
            <input 
              style={isAutoMode && !machineBlocked ? s.inputAutoPreview : (isDisabled ? s.inputDisabled : s.input)} 
              type="number" 
              step="0.01" 
              value={displayQteSortie}
              onChange={(e) => setForm({ ...form, qte_sortie: e.target.value })} 
              disabled={isDisabled} 
              required 
              placeholder={isAutoMode ? "Calcul automatique..." : "Ex: 510"}
            />
          )}
          {isAutoMode && !machineBlocked && !isLast && (
            <small style={{ color: C.green, fontSize: "0.65rem" }}>
              🤖 Calculé avec rendement théorique
            </small>
          )}
        </div>
        
        <div style={s.fg}>
          <label style={s.label}>
            👤 Opérateur
            {isAutoMode && <span style={{ marginLeft: "0.5rem", fontSize: "0.6rem", color: C.green }}>🤖 Auto</span>}
          </label>
          <select 
            style={isAutoMode && !machineBlocked ? s.inputAutoPreview : (isDisabled ? s.selectDisabled : s.select)} 
            value={displayOperateur}
            onChange={(e) => setForm({ ...form, operateur: e.target.value })} 
            disabled={isDisabled}
          >
            <option value="">{isAutoMode ? "Sélection automatique" : "Sélectionner"}</option>
            {EQUIPES.flatMap((eq) => eq.operateurs.map((op) => <option key={op} value={op}>{op}</option>))}
          </select>
        </div>
        
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <div style={s.fg}>
            <label style={s.label}>
              ⏰ Début
              {isAutoMode && <span style={{ marginLeft: "0.5rem", fontSize: "0.6rem", color: C.green }}>🤖 Auto</span>}
            </label>
            <input 
              style={isAutoMode && !machineBlocked ? s.inputAutoPreview : (isDisabled ? s.inputDisabled : s.input)} 
              type="time" 
              value={displayDebut}
              onChange={(e) => setForm({ ...form, debut: e.target.value })} 
              disabled={isDisabled} 
            />
          </div>
          <div style={s.fg}>
            <label style={s.label}>
              ⏰ Fin
              {isAutoMode && <span style={{ marginLeft: "0.5rem", fontSize: "0.6rem", color: C.green }}>🤖 Auto</span>}
            </label>
            <input 
              style={isAutoMode && !machineBlocked ? s.inputAutoPreview : (isDisabled ? s.inputDisabled : s.input)} 
              type="time" 
              value={displayFin}
              onChange={(e) => setForm({ ...form, fin: e.target.value })} 
              disabled={isDisabled} 
            />
          </div>
        </div>
      </div>

      {params && !isDisabled && !isAutoMode && (
        <div style={{ marginTop: "0.5rem", fontSize: "0.65rem", color: C.muted, background: C.bg, padding: "0.3rem 0.6rem", borderRadius: 4 }}>
          ℹ️ Rendement attendu : {(params.rendementMin * 100).toFixed(1)}–{(params.rendementMax * 100).toFixed(1)}% · 
          Durée : {params.dureeBaseMin}–{params.dureeBaseMax} min
        </div>
      )}

      {!machineBlocked && !isAutoMode && (
        <div style={s.btnRow}>
          <button onClick={onSubmit} style={s.btnPrimary} disabled={isSubmitting}>
            {isSubmitting ? "⏳ Validation..." : `✅ Valider ${isLast ? "& Terminer" : etape.machine}`}
          </button>
        </div>
      )}
      {isAutoMode && !machineBlocked && (
        <div style={{ marginTop: "0.75rem", padding: "0.5rem", background: C.greenLt, borderRadius: 6, textAlign: "center", fontSize: "0.7rem", color: C.green, fontWeight: 500 }}>
          🤖 Simulation automatique en cours — Les données sont calculées et affichées dynamiquement
        </div>
      )}
      {machineBlocked && !isAutoMode && (
        <div style={{ marginTop: "0.75rem", padding: "0.5rem", background: C.redLt, borderRadius: 6, textAlign: "center", fontSize: "0.7rem", color: C.red }}>
          🔴 Machine bloquée — Pipeline en attente
        </div>
      )}
    </div>
  );
};

export default Production;