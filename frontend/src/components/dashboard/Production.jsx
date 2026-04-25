// Production.jsx – MES Atelier Cardage · Pipeline Automatique + Mode Auto
// FIXES:
//  1. REBUTS_URL séparé → plus de 307 redirect ni 422 (rebuts capturé comme int)
//  2. loadAll() → spread [...data] → re-render garanti
//  3. KPIs → useMemo([productions, rebuts]) → recalcul réactif
//  4. Historique → key composite `${p.id}-${p.statut}` → remount sur changement statut
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import axios from "axios";

// FIX 1 : URLs explicites sans ambiguïté
const BASE_URL   = "http://127.0.0.1:8000/api/productions/";
const REBUTS_URL = "http://127.0.0.1:8000/api/productions/rebuts/";
const MES_OF_URL = "http://127.0.0.1:8000/api/ordres-fabrication/";

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

const OPERATEURS   = ["Jean Dupont","Marie Martin","Pierre Durand","Sophie Lefebvre","Lucas Bernard"];
const TYPES_DEFAUT = ["Néppes","Impuretés","Casses","Irrégularité","Souillure","Autre défaut"];
const NB_ETAPES    = SEQUENCE_MACHINES.length;

const generateSimulatedStep = (stepOrder, qteEntree, isFirst, isLast, targetPF) => {
  let qteSortie;
  if (isLast) {
    qteSortie = targetPF;
  } else {
    const maxLoss = qteEntree * 0.03;
    const perte   = maxLoss * Math.random();
    qteSortie = Math.max(targetPF, parseFloat((qteEntree - perte).toFixed(2)));
  }
  return {
    qte_entree : parseFloat(qteEntree.toFixed(2)),
    qte_sortie : parseFloat(qteSortie.toFixed(2)),
    operateur  : OPERATEURS[Math.floor(Math.random() * OPERATEURS.length)],
    debut      : `${String(8  + Math.floor(Math.random() * 4)).padStart(2,"0")}:${String(Math.floor(Math.random() * 60)).padStart(2,"0")}`,
    fin        : `${String(12 + Math.floor(Math.random() * 6)).padStart(2,"0")}:${String(Math.floor(Math.random() * 60)).padStart(2,"0")}`,
  };
};

const Production = () => {
  const [activeTab, setActiveTab]         = useState("lancer");
  const [productions, setProductions]     = useState([]);
  const [rebuts, setRebuts]               = useState([]);
  const [ofs, setOfs]                     = useState([]);
  const [autoMode, setAutoMode]           = useState(false);
  const [autoSpeed, setAutoSpeed]         = useState(500);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const autoIntervalRef    = useRef(null);
  const isAutoRunningRef   = useRef(false);
  const pipelineTermineRef = useRef(false);

  const [selectedProdId, setSelectedProdId]   = useState(null);
  const [selectedProd, setSelectedProd]       = useState(null);
  const [etapeCourante, setEtapeCourante]     = useState(null);
  const [pipelineTermine, setPipelineTermine] = useState(false);

  const [formLancer, setFormLancer] = useState({
    of_id: "", produit_fini: "", quantite_produit_fini: "",
  });
  const emptyEtapeForm = { qte_entree:"", qte_sortie:"", operateur:"", debut:"", fin:"" };
  const [etapeForm, setEtapeForm] = useState(emptyEtapeForm);
  const [formRebut, setFormRebut] = useState({ production_id:"", machine:"", defaut:"", quantite:"" });

  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [successMsg, setSuccessMsg]           = useState("");
  const [errorMsg, setErrorMsg]               = useState("");
  const [loadingPipeline, setLoadingPipeline] = useState(false);

  // FIX 3 : KPIs dans useMemo — recalcul réactif garanti après chaque loadAll
  const { totalPF, totalMP, totalReb, rendement } = useMemo(() => {
    const pf  = productions.reduce((a,p) => a + Number(p.quantite_produit_fini       || 0), 0);
    const mp  = productions.reduce((a,p) => a + Number(p.quantite_matiere_premiere   || 0), 0);
    const reb = rebuts.reduce     ((a,r) => a + Number(r.quantite                    || 0), 0);
    return {
      totalPF  : pf,
      totalMP  : mp,
      totalReb : reb,
      rendement: mp > 0 ? ((pf / mp) * 100).toFixed(1) : "–",
    };
  }, [productions, rebuts]);

  const stopAutoMode = useCallback(() => {
    if (autoIntervalRef.current) {
      clearInterval(autoIntervalRef.current);
      autoIntervalRef.current = null;
    }
    isAutoRunningRef.current = false;
    setIsAutoRunning(false);
  }, []);

  // FIX 2 : spread [...data] → nouvelle référence → re-render garanti
  // FIX 1 : REBUTS_URL explicite → plus jamais de 307 / 422
  const loadAll = useCallback(async () => {
    try {
      const [prodRes, rebRes] = await Promise.all([
        axios.get(BASE_URL),
        axios.get(REBUTS_URL),
      ]);
      setProductions([...prodRes.data]);
      setRebuts([...rebRes.data]);
    } catch (err) {
      console.error("Erreur chargement:", err);
    }
  }, []);

  const loadOFs = useCallback(async () => {
    try {
      const res = await axios.get(MES_OF_URL);
      setOfs(res.data);
    } catch (err) {
      console.error("Erreur OFs:", err);
    }
  }, []);

  const loadPipeline = useCallback(async (prodId) => {
    if (!prodId) return;
    setLoadingPipeline(true);
    try {
      const detailRes = await axios.get(`${BASE_URL}${prodId}`);
      setSelectedProd(detailRes.data);
      const termine = detailRes.data.statut === "TERMINE";
      setPipelineTermine(termine);
      pipelineTermineRef.current = termine;
      setEtapeForm(emptyEtapeForm);

      if (!termine) {
        try {
          const etapeRes = await axios.get(`${BASE_URL}${prodId}/etape-courante`);
          setEtapeCourante(etapeRes.data);
        } catch { setEtapeCourante(null); }
      } else {
        setEtapeCourante(null);
        stopAutoMode();
      }
    } catch (err) {
      console.error("Erreur pipeline:", err);
      flash("Erreur chargement de la production", true);
    } finally {
      setLoadingPipeline(false);
    }
  }, [stopAutoMode]);

  const startAutoMode = useCallback(async (prodId, targetPF) => {
    if (!prodId) return;
    stopAutoMode();
    isAutoRunningRef.current   = true;
    pipelineTermineRef.current = false;
    setIsAutoRunning(true);

    let lastQteSortie = targetPF * 1.1;

    const processNextStep = async () => {
      if (!isAutoRunningRef.current || pipelineTermineRef.current) {
        stopAutoMode();
        return;
      }
      try {
        const etapeRes     = await axios.get(`${BASE_URL}${prodId}/etape-courante`);
        const currentEtape = etapeRes.data;
        const isFirst      = currentEtape.ordre === 1;
        const isLast       = currentEtape.ordre === NB_ETAPES;
        const simulated    = generateSimulatedStep(
          currentEtape.ordre, lastQteSortie, isFirst, isLast, targetPF
        );
        lastQteSortie = simulated.qte_sortie;

        const res   = await axios.post(`${BASE_URL}${prodId}/avancer`, simulated);
        const state = res.data;

        await loadAll();
        const detailRes = await axios.get(`${BASE_URL}${prodId}`);
        setSelectedProd(detailRes.data);
        const termine = detailRes.data.statut === "TERMINE";
        setPipelineTermine(termine);
        pipelineTermineRef.current = termine;

        if (state.pipeline_termine || termine) {
          pipelineTermineRef.current = true;
          stopAutoMode();
          flash("🎉 Production terminée automatiquement !");
          setEtapeCourante(null);
          return;
        }

        try {
          const etRes = await axios.get(`${BASE_URL}${prodId}/etape-courante`);
          setEtapeCourante(etRes.data);
        } catch { setEtapeCourante(null); }

      } catch (err) {
        if (err.response?.status === 404) {
          pipelineTermineRef.current = true;
          stopAutoMode();
          flash("🎉 Production terminée !");
          await loadAll();
          await loadPipeline(prodId);
        } else {
          console.error("Erreur auto-mode:", err);
          flash("❌ Erreur en mode automatique", true);
          stopAutoMode();
        }
      }
    };

    await processNextStep();

    if (isAutoRunningRef.current) {
      autoIntervalRef.current = setInterval(async () => {
        if (!isAutoRunningRef.current || pipelineTermineRef.current) {
          stopAutoMode();
          return;
        }
        await processNextStep();
      }, autoSpeed);
    }
  }, [autoSpeed, stopAutoMode, loadAll, loadPipeline]);

  useEffect(() => { loadAll(); loadOFs(); }, [loadAll, loadOFs]);
  useEffect(() => () => stopAutoMode(), [stopAutoMode]);

  const flash = (msg, isError = false) => {
    if (isError) { setErrorMsg(msg);   setTimeout(() => setErrorMsg(""),   4500); }
    else         { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 4500); }
  };

  const handleOFChange = (ofId) => {
    const of = ofs.find(o => String(o.id) === String(ofId));
    setFormLancer({
      of_id                : ofId,
      produit_fini         : of?.produit  || "",
      quantite_produit_fini: of?.quantite || "",
    });
  };

  const handleLancer = async (e) => {
    e.preventDefault();
    if (!formLancer.of_id || !formLancer.produit_fini || !formLancer.quantite_produit_fini)
      return flash("Veuillez remplir tous les champs", true);

    setIsSubmitting(true);
    try {
      const quantitePF = parseFloat(formLancer.quantite_produit_fini);
      const res = await axios.post(BASE_URL, {
        of_id                : parseInt(formLancer.of_id),
        produit_fini         : formLancer.produit_fini,
        quantite_produit_fini: quantitePF,
      });
      await loadAll();
      flash(`✅ Production lancée – ${res.data.of_numero} – Objectif PF: ${quantitePF} kg`);
      setFormLancer({ of_id:"", produit_fini:"", quantite_produit_fini:"" });
      const newId = res.data.id;
      setSelectedProdId(newId);
      setActiveTab("pipeline");
      await loadPipeline(newId);
      if (autoMode) setTimeout(() => startAutoMode(newId, quantitePF), 300);
    } catch (err) {
      flash("❌ " + (err.response?.data?.detail || err.message), true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvancer = async () => {
    if (!etapeForm.qte_entree || !etapeForm.qte_sortie)
      return flash("Quantités entrée/sortie obligatoires", true);

    setIsSubmitting(true);
    try {
      const res   = await axios.post(`${BASE_URL}${selectedProdId}/avancer`, {
        qte_entree: parseFloat(etapeForm.qte_entree),
        qte_sortie: parseFloat(etapeForm.qte_sortie),
        operateur : etapeForm.operateur || null,
        debut     : etapeForm.debut     || null,
        fin       : etapeForm.fin       || null,
      });
      const state = res.data;

      if (state.pipeline_termine) {
        setEtapeCourante(null);
        setPipelineTermine(true);
        pipelineTermineRef.current = true;
        stopAutoMode();
        flash("🎉 Production terminée !");
      } else {
        setEtapeCourante(state.etape_suivante);
        flash(`✅ ${state.etape_validee.machine} validée → ${state.etape_suivante?.machine} activée`);
      }

      setEtapeForm(emptyEtapeForm);
      await loadAll();
      const detailRes = await axios.get(`${BASE_URL}${selectedProdId}`);
      setSelectedProd(detailRes.data);
    } catch (err) {
      flash("❌ " + JSON.stringify(err.response?.data), true);
    } finally {
      setIsSubmitting(false);
    }
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
      setRebuts(prev => [...prev, res.data]);
      setFormRebut({ production_id:"", machine:"", defaut:"", quantite:"" });
      flash("✅ Rebut enregistré");
      await loadAll();
    } catch (err) {
      flash("❌ " + (err.response?.data?.detail || err.message), true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectProd = async (id) => {
    stopAutoMode();
    const numId = parseInt(id);
    setSelectedProdId(numId);
    await loadPipeline(numId);
  };

  const handleAutoModeToggle = () => {
    if (autoMode) { stopAutoMode(); setAutoMode(false); }
    else { setAutoMode(true); }
  };

  const handleStartAuto = () => {
    if (selectedProdId && !pipelineTermine && selectedProd)
      startAutoMode(selectedProdId, selectedProd.quantite_produit_fini);
  };

  const progression = useMemo(() => {
    if (!selectedProd?.etapes) return 0;
    const done = selectedProd.etapes.filter(e => e.statut === "TERMINE").length;
    return Math.round((done / NB_ETAPES) * 100);
  }, [selectedProd]);

  return (
    <div style={s.container}>
      {/* ══ HEADER ══ */}
      <div style={s.header}>
        <div style={{ display:"flex", alignItems:"center", gap:"1rem" }}>
          <span style={{ fontSize:"2.5rem" }}>🏭</span>
          <div>
            <h1 style={s.title}>MES – ATELIER CARDAGE</h1>
            <p style={s.subtitle}>Pipeline automatique · {NB_ETAPES} étapes · workflow séquentiel</p>
          </div>
        </div>

        <div style={s.autoModeControl}>
          <label style={{ display:"flex", alignItems:"center", gap:"0.5rem", cursor:"pointer" }}>
            <input type="checkbox" checked={autoMode} onChange={handleAutoModeToggle}
              style={{ width:"18px", height:"18px", cursor:"pointer" }} />
            <span style={{ fontWeight:"600", color: autoMode ? "#10b981" : "#64748b" }}>
              🤖 Mode Automatique
            </span>
          </label>
          {autoMode && (
            <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginLeft:"1rem" }}>
              <span style={{ fontSize:"0.75rem", color:"#64748b" }}>Vitesse:</span>
              <select value={autoSpeed} onChange={e => setAutoSpeed(Number(e.target.value))}
                style={s.speedSelect} disabled={isAutoRunning}>
                <option value={1000}>🐢 Lente (1s)</option>
                <option value={500}>⚡ Normale (0.5s)</option>
                <option value={200}>🚀 Rapide (0.2s)</option>
                <option value={50}>💨 Turbo (0.05s)</option>
              </select>
              {isAutoRunning
                ? <button onClick={stopAutoMode} style={s.btnStopAuto}>⏹️ Stop</button>
                : selectedProdId && !pipelineTermine
                  ? <button onClick={handleStartAuto} style={s.btnStartAuto}>▶️ Démarrer</button>
                  : null
              }
            </div>
          )}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:"3px", flexWrap:"wrap" }}>
          {SEQUENCE_MACHINES.map((m,i) => (
            <React.Fragment key={m.code}>
              <span style={s.machineChip} title={m.nom}>{m.code.split("-")[1]}</span>
              {i < NB_ETAPES - 1 && <span style={{ color:"#94a3b8", fontSize:"0.65rem" }}>→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ══ KPIs ══ */}
      <div style={s.kpiGrid}>
        {[
          { label:"Produit Fini",     value:`${totalPF.toFixed(1)} kg`,  icon:"📦", color:"#2563eb" },
          { label:"Matière Première", value:`${totalMP.toFixed(1)} kg`,  icon:"🌾", color:"#8b5cf6" },
          { label:"Rebuts",           value:`${totalReb.toFixed(1)} kg`, icon:"⚠️", color:"#ef4444" },
          { label:"Rendement global", value:`${rendement}%`,             icon:"📊", color:"#10b981" },
        ].map(k => (
          <div key={k.label} style={{ ...s.kpiCard, borderLeft:`4px solid ${k.color}` }}>
            <span style={s.kpiIcon}>{k.icon}</span>
            <div>
              <p style={s.kpiLabel}>{k.label}</p>
              <p style={{ ...s.kpiValue, color:k.color }}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {successMsg && <div style={s.successBanner}>{successMsg}</div>}
      {errorMsg   && <div style={s.errorBanner}>{errorMsg}</div>}

      {/* ══ TABS ══ */}
      <div style={s.tabs}>
        {[
          { id:"lancer",     label:"🚀 Lancer Production" },
          { id:"pipeline",   label:"⚙️ Pipeline"          },
          { id:"rebuts",     label:"⚠️ Rebuts"            },
          { id:"historique", label:"📋 Historique"        },
        ].map(t => (
          <button key={t.id}
            style={{ ...s.tabBtn, ...(activeTab === t.id ? s.tabActive : s.tabInactive) }}
            onClick={() => { setActiveTab(t.id); setSuccessMsg(""); setErrorMsg(""); }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={s.card}>

        {/* ══ LANCER ══ */}
        {activeTab === "lancer" && (
          <div>
            <h2 style={s.sectionTitle}>🚀 Lancer une nouvelle production</h2>
            <p style={s.sectionSub}>
              Sélectionnez un OF pour auto-remplir le produit et la quantité.
              {autoMode && <span style={{ color:"#10b981" }}> Mode auto actif — simulation automatique !</span>}
            </p>

            <div style={s.fluxContainer}>
              {SEQUENCE_MACHINES.map((m,i) => (
                <React.Fragment key={m.code}>
                  <div style={s.fluxStep}>
                    <div style={s.fluxBox}>
                      <div style={{ fontSize:"0.6rem", color:"#64748b", fontWeight:"700" }}>#{m.ordre}</div>
                      <div style={{ fontSize:"0.7rem", fontWeight:"700", color:"#0f172a" }}>{m.code}</div>
                      <div style={{ fontSize:"0.6rem", color:"#475569" }}>{m.nom}</div>
                    </div>
                  </div>
                  {i < NB_ETAPES - 1 && <div style={s.fluxArrow}>→</div>}
                </React.Fragment>
              ))}
            </div>

            <form onSubmit={handleLancer} style={{ marginTop:"2rem" }}>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label style={s.label}>📋 Ordre de Fabrication <span style={s.star}>*</span></label>
                  <select style={s.select} value={formLancer.of_id}
                    onChange={e => handleOFChange(e.target.value)} required>
                    <option value="">-- Sélectionnez un OF --</option>
                    {ofs.map(o => (
                      <option key={o.id} value={o.id}>{o.numero} </option>
                    ))}
                  </select>
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>🧵 Produit fini <span style={s.star}>*</span></label>
                  <input style={{ ...s.input, background: formLancer.produit_fini ? "#eff6ff" : "#fff" }}
                    type="text" value={formLancer.produit_fini} readOnly
                    placeholder="Auto-rempli depuis l'OF" />
                  <small style={{ color:"#64748b", fontSize:"0.7rem" }}>Récupéré automatiquement depuis l'OF</small>
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>📦 Quantité Produit Fini (kg) <span style={s.star}>*</span></label>
                  <input style={{ ...s.input, background: formLancer.quantite_produit_fini ? "#eff6ff" : "#fff" }}
                    type="number" step="0.01" placeholder="Auto-rempli depuis l'OF"
                    value={formLancer.quantite_produit_fini}
                    onChange={e => setFormLancer({ ...formLancer, quantite_produit_fini: e.target.value })} required />
                  <small style={{ color:"#64748b", fontSize:"0.7rem" }}>Quantité PF attendue en sortie (modifiable)</small>
                </div>
              </div>

              <button type="submit" style={isSubmitting ? s.btnDisabled : s.btnPrimary} disabled={isSubmitting}>
                {isSubmitting ? "⏳ Lancement…" : "🚀 Lancer le Pipeline"}
              </button>
            </form>
          </div>
        )}

        {/* ══ PIPELINE ══ */}
        {activeTab === "pipeline" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
              <h2 style={s.sectionTitle}>⚙️ Pipeline de Production</h2>
              {autoMode && isAutoRunning && (
                <div style={s.autoBadge}>🤖 Mode Auto actif • Simulation en cours…</div>
              )}
            </div>
            <p style={s.sectionSub}>
              Sélectionnez une production. Le pipeline affiche <strong>uniquement l'étape active</strong>.
            </p>

            <div style={{ display:"flex", gap:"1rem", alignItems:"center", marginBottom:"1.5rem", flexWrap:"wrap" }}>
              <select style={{ ...s.select, maxWidth:"420px" }}
                value={selectedProdId || ""}
                onChange={e => e.target.value && handleSelectProd(e.target.value)}>
                <option value="">-- Choisir une production --</option>
                {productions.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.of_numero} – {p.produit_fini} – {p.quantite_produit_fini}kg – {p.statut?.replace("_"," ")}
                  </option>
                ))}
              </select>
              {loadingPipeline && <span style={{ color:"#64748b" }}>⏳ Chargement…</span>}
            </div>

            {selectedProd && (
              <>
                <div style={{ ...s.infoCard, marginBottom:"1rem" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span>🎯 Objectif Produit Fini :</span>
                    <strong style={{ fontSize:"1.2rem", color:"#2563eb" }}>{selectedProd.quantite_produit_fini} kg</strong>
                  </div>
                  {selectedProd.quantite_matiere_premiere != null && (
                    <div style={{ display:"flex", justifyContent:"space-between", marginTop:"0.5rem" }}>
                      <span>🌾 Matière Première engagée :</span>
                      <strong>{selectedProd.quantite_matiere_premiere} kg</strong>
                    </div>
                  )}
                </div>

                <PipelineProgressBar etapes={selectedProd.etapes || []} />

                {pipelineTermine ? (
                  <div style={s.completedBox}>
                    <div style={{ fontSize:"3rem", marginBottom:"0.75rem" }}>🎉</div>
                    <div style={{ fontSize:"1.3rem", fontWeight:"700", color:"#065f46", marginBottom:"0.5rem" }}>
                      Production Terminée !
                    </div>
                    <div style={{ fontSize:"0.95rem", color:"#047857" }}>
                      ✅ Produit fini réel : <strong>{selectedProd.quantite_produit_fini} kg</strong>
                    </div>
                    {selectedProd.quantite_matiere_premiere && (
                      <div style={{ fontSize:"0.85rem", color:"#047857", marginTop:"0.5rem" }}>
                        MP consommée : {selectedProd.quantite_matiere_premiere} kg — Rendement :{" "}
                        <strong>
                          {((selectedProd.quantite_produit_fini / selectedProd.quantite_matiere_premiere) * 100).toFixed(1)}%
                        </strong>
                      </div>
                    )}
                    <div style={{ fontSize:"0.8rem", color:"#059669", marginTop:"0.5rem" }}>
                      📡 Notification ERP envoyée automatiquement
                    </div>
                  </div>
                ) : etapeCourante ? (
                  <EtapeActiveForm
                    etape={etapeCourante}
                    form={etapeForm}
                    setForm={setEtapeForm}
                    onSubmit={handleAvancer}
                    isSubmitting={isSubmitting}
                    progression={progression}
                    nbEtapes={NB_ETAPES}
                    isAutoMode={autoMode && isAutoRunning}
                    targetPF={selectedProd.quantite_produit_fini}
                  />
                ) : (
                  <div style={s.empty}>⏳ Chargement de l'étape active…</div>
                )}
              </>
            )}

            {!selectedProd && !loadingPipeline && (
              <div style={s.empty}>
                <span style={{ fontSize:"3rem", display:"block", marginBottom:"1rem" }}>⚙️</span>
                Sélectionnez une production pour démarrer le pipeline
              </div>
            )}
          </div>
        )}

        {/* ══ REBUTS ══ */}
        {activeTab === "rebuts" && (
          <div>
            <h2 style={s.sectionTitle}>⚠️ Enregistrement des Rebuts</h2>
            <p style={s.sectionSub}>Rattachez un rebut à une production et une machine spécifique.</p>

            <form onSubmit={handleRebut}>
              <div style={s.formGrid}>
                <div style={s.formGroup}>
                  <label style={s.label}>📦 Production <span style={s.star}>*</span></label>
                  <select style={s.select} value={formRebut.production_id}
                    onChange={e => setFormRebut({ ...formRebut, production_id: e.target.value })} required>
                    <option value="">Sélectionner</option>
                    {productions.map(p => (
                      <option key={p.id} value={p.id}>{p.of_numero} – {p.produit_fini}</option>
                    ))}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>🏭 Machine <span style={s.star}>*</span></label>
                  <select style={s.select} value={formRebut.machine}
                    onChange={e => setFormRebut({ ...formRebut, machine: e.target.value })} required>
                    <option value="">Sélectionner</option>
                    {SEQUENCE_MACHINES.map(m => (
                      <option key={m.code} value={m.code}>{m.code} – {m.nom}</option>
                    ))}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>🔍 Type de défaut <span style={s.star}>*</span></label>
                  <select style={s.select} value={formRebut.defaut}
                    onChange={e => setFormRebut({ ...formRebut, defaut: e.target.value })} required>
                    <option value="">Sélectionner</option>
                    {TYPES_DEFAUT.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>⚖️ Quantité (kg) <span style={s.star}>*</span></label>
                  <input style={s.input} type="number" step="0.01" placeholder="Ex: 25"
                    value={formRebut.quantite}
                    onChange={e => setFormRebut({ ...formRebut, quantite: e.target.value })} required />
                </div>
              </div>
              <div style={{ marginTop:"1.5rem" }}>
                <button type="submit" style={isSubmitting ? s.btnDisabled : s.btnWarning} disabled={isSubmitting}>
                  {isSubmitting ? "⏳ Enregistrement…" : "⚠️ Enregistrer le Rebut"}
                </button>
              </div>
            </form>

            {rebuts.length > 0 && (
              <div style={{ marginTop:"2rem", overflowX:"auto" }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {["Production","Machine","Défaut","Quantité","Date"].map(h =>
                        <th key={h} style={s.th}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rebuts.map((r,i) => (
                      <tr key={r.id} style={{ background: i%2===0?"#fff":"#f8fafc" }}>
                        <td style={s.td}>#{r.production_id}</td>
                        <td style={s.td}><span style={s.codeBadge}>{r.machine}</span></td>
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

        {/* ══ HISTORIQUE ══ */}
        {activeTab === "historique" && (
          <div>
            <h2 style={s.sectionTitle}>📋 Historique des Productions</h2>
            <p style={s.sectionSub}>Vue d'ensemble de toutes les productions et leur progression.</p>
            {productions.length > 0 ? (
              <div style={{ overflowX:"auto" }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>OF</th>
                      <th style={s.th}>Produit</th>
                      <th style={s.th}>Objectif PF (kg)</th>
                      <th style={s.th}>MP (kg)</th>
                      <th style={s.th}>Statut</th>
                      <th style={s.th}>Rendement</th>
                      <th style={s.th}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productions.map((p,i) => {
                      const rend = p.quantite_matiere_premiere
                        ? ((p.quantite_produit_fini / p.quantite_matiere_premiere) * 100).toFixed(1)
                        : "–";
                      return (
                        // FIX 4 : key composite → remount forcé si statut change
                        <tr key={`${p.id}-${p.statut}`} style={{ background: i%2===0?"#fff":"#f8fafc" }}>
                          <td style={s.td}>{p.of_numero}</td>
                          <td style={s.td}>{p.produit_fini}</td>
                          <td style={s.td}><strong>{p.quantite_produit_fini}</strong></td>
                          <td style={s.td}>{p.quantite_matiere_premiere ?? "–"}</td>
                          <td style={s.td}>
                            <span style={{
                              ...s.statutBadge,
                              background: p.statut==="TERMINE"  ? "#d1fae5"
                                        : p.statut==="EN_COURS" ? "#fef3c7" : "#e2e8f0",
                              color:      p.statut==="TERMINE"  ? "#065f46"
                                        : p.statut==="EN_COURS" ? "#92400e" : "#475569",
                            }}>
                              {p.statut?.replace("_"," ")}
                            </span>
                          </td>
                          <td style={s.td}>{rend !== "–" ? `${rend}%` : "–"}</td>
                          <td style={s.td}>{p.date}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={s.empty}>Aucune production pour le moment</div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

// ── EtapeActiveForm ───────────────────────────────────────────────────────────

const EtapeActiveForm = ({ etape, form, setForm, onSubmit, isSubmitting, nbEtapes, isAutoMode, targetPF }) => {
  const isFirst = etape.ordre === 1;
  const isLast  = etape.ordre === nbEtapes;

  return (
    <div style={s.pipelineActiveCard}>
      <div style={s.pipelineActiveHeader}>
        <div style={{ display:"flex", alignItems:"center", gap:"1rem" }}>
          <div style={s.pipelineOrdreBig}>{etape.ordre}</div>
          <div>
            <div style={{ fontSize:"1.3rem", fontWeight:"800", color:"#0f172a" }}>{etape.machine}</div>
            <div style={{ fontSize:"0.9rem", color:"#64748b" }}>{etape.nom_machine}</div>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          {isAutoMode && (
            <div style={{ fontSize:"0.7rem", color:"#10b981", fontWeight:"700", background:"#d1fae5",
              padding:"2px 8px", borderRadius:"20px", marginBottom:"4px" }}>
              🤖 Simulation auto
            </div>
          )}
          <div style={{ fontSize:"0.75rem", color:"#f59e0b", fontWeight:"700" }}>⚙️ ÉTAPE ACTIVE</div>
          <div style={{ fontSize:"0.8rem", color:"#64748b" }}>Étape {etape.ordre} sur {nbEtapes}</div>
        </div>
      </div>

      <div style={s.pipelineContext}>
        {isFirst && <span style={s.contextTag}>🌾 Saisir la matière première en entrée</span>}
        {isLast  && (
          <span style={{ ...s.contextTag, background:"#d1fae5", color:"#065f46" }}>
            📦 Dernière étape – objectif: {targetPF} kg PF
          </span>
        )}
        {!isFirst && !isLast && (
          <span style={{ ...s.contextTag, background:"#e0e7ff", color:"#3730a3" }}>
            → Entrée = sortie de {SEQUENCE_MACHINES[etape.ordre-2]?.nom}
          </span>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", marginTop:"1.25rem" }}>
        <div style={s.formGroup}>
          <label style={s.label}>
            📥 {isFirst ? "Matière première entrante (kg)" : "Qté entrante (kg)"}
            <span style={s.star}> *</span>
          </label>
          <input style={isAutoMode ? s.inputDisabled : s.inputHighlight}
            type="number" step="0.01" placeholder="Ex: 500"
            value={form.qte_entree}
            onChange={e => setForm({ ...form, qte_entree: e.target.value })}
            disabled={isAutoMode} />
        </div>

        <div style={s.formGroup}>
          <label style={s.label}>
            📤 {isLast ? `Produit fini sortant (kg) – Objectif: ${targetPF} kg` : "Qté sortante (kg)"}
            <span style={s.star}> *</span>
          </label>
          <input style={isAutoMode ? s.inputDisabled : s.inputHighlight}
            type="number" step="0.01" placeholder="Ex: 490"
            value={form.qte_sortie}
            onChange={e => setForm({ ...form, qte_sortie: e.target.value })}
            disabled={isAutoMode} />
          {isLast && targetPF && (
            <small style={{ color:"#64748b", fontSize:"0.65rem" }}>Doit correspondre à l'objectif : {targetPF} kg</small>
          )}
        </div>

        {form.qte_entree && form.qte_sortie && (
          <div style={{ gridColumn:"1/-1", ...s.rendLive }}>
            📊 Rendement étape :{" "}
            <strong style={{ color:(form.qte_sortie/form.qte_entree)>=0.9?"#10b981":"#f59e0b" }}>
              {((parseFloat(form.qte_sortie)/parseFloat(form.qte_entree))*100).toFixed(1)}%
            </strong>
            {"  · Perte : "}
            <strong style={{ color:"#ef4444" }}>
              {(parseFloat(form.qte_entree)-parseFloat(form.qte_sortie)).toFixed(2)} kg
            </strong>
          </div>
        )}

        <div style={s.formGroup}>
          <label style={s.label}>👤 Opérateur</label>
          <select style={isAutoMode ? s.selectDisabled : s.select}
            value={form.operateur} onChange={e => setForm({ ...form, operateur: e.target.value })}
            disabled={isAutoMode}>
            <option value="">Sélectionner</option>
            {OPERATEURS.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
        </div>

        <div style={{ display:"flex", gap:"0.75rem" }}>
          <div style={{ ...s.formGroup, flex:1 }}>
            <label style={s.label}>⏰ Début</label>
            <input style={isAutoMode ? s.inputDisabled : s.input} type="time"
              value={form.debut} onChange={e => setForm({ ...form, debut: e.target.value })}
              disabled={isAutoMode} />
          </div>
          <div style={{ ...s.formGroup, flex:1 }}>
            <label style={s.label}>⏰ Fin</label>
            <input style={isAutoMode ? s.inputDisabled : s.input} type="time"
              value={form.fin} onChange={e => setForm({ ...form, fin: e.target.value })}
              disabled={isAutoMode} />
          </div>
        </div>
      </div>

      {!isAutoMode ? (
        <div style={{ marginTop:"1.5rem" }}>
          <button style={isSubmitting ? s.btnDisabled : s.btnPipelineNext}
            disabled={isSubmitting} onClick={onSubmit}>
            {isSubmitting
              ? "⏳ Validation en cours…"
              : isLast
                ? "🏁 Valider & Terminer la Production"
                : `✅ Valider ${etape.machine} → ${SEQUENCE_MACHINES[etape.ordre]?.nom || "suivant"}`
            }
          </button>
          <div style={{ fontSize:"0.75rem", color:"#94a3b8", marginTop:"0.5rem" }}>
            Le pipeline avancera automatiquement vers l'étape suivante
          </div>
        </div>
      ) : (
        <div style={{ marginTop:"1.5rem", textAlign:"center", padding:"1rem",
          background:"#e0e7ff", borderRadius:"8px" }}>
          🤖 <strong>Mode Automatique actif</strong> — Simulation en cours pour atteindre {targetPF} kg de PF
        </div>
      )}
    </div>
  );
};

// ── PipelineProgressBar ───────────────────────────────────────────────────────

const PipelineProgressBar = ({ etapes }) => {
  const done  = etapes.filter(e => e.statut==="TERMINE").length;
  const total = NB_ETAPES;
  const pct   = Math.round((done/total)*100);

  return (
    <div style={{ marginBottom:"2rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.5rem" }}>
        <span style={{ fontSize:"0.85rem", color:"#64748b", fontWeight:"600" }}>Progression du pipeline</span>
        <span style={{ fontSize:"0.85rem", fontWeight:"700", color: pct===100?"#10b981":"#2563eb" }}>
          {done}/{total} étapes — {pct}%
        </span>
      </div>
      <div style={{ background:"#e2e8f0", borderRadius:"99px", height:"8px", marginBottom:"1rem" }}>
        <div style={{
          width:`${pct}%`, height:"8px", borderRadius:"99px",
          background: pct===100 ? "#10b981" : "linear-gradient(90deg,#2563eb,#3b82f6)",
          transition:"width 0.5s ease",
        }} />
      </div>
      <div style={{ display:"flex", gap:"4px", flexWrap:"wrap" }}>
        {etapes.map(e => {
          const color     = e.statut==="TERMINE" ? "#10b981" : e.statut==="EN_COURS" ? "#f59e0b" : "#e2e8f0";
          const textColor = e.statut==="EN_ATTENTE" ? "#94a3b8" : "#fff";
          return (
            <div key={e.id} title={`${e.machine} – ${e.nom_machine}\n${e.statut}`}
              style={{
                background:color, color:textColor, padding:"3px 7px", borderRadius:"5px",
                fontSize:"0.6rem", fontWeight:"700", fontFamily:"monospace",
                cursor:"default", transition:"background 0.3s",
                boxShadow: e.statut==="EN_COURS" ? "0 0 0 2px #f59e0b55" : "none",
              }}>
              {e.machine.split("-")[1]}
              {e.statut==="EN_COURS"  && " ⚙"}
              {e.statut==="TERMINE"   && " ✓"}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  container          :{ padding:"2rem", background:"#f8fafc", minHeight:"100vh", fontFamily:"'Inter',-apple-system,sans-serif" },
  header             :{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#fff", padding:"1.5rem 2rem", borderRadius:"16px", boxShadow:"0 4px 6px -1px rgba(0,0,0,0.08)", marginBottom:"2rem", flexWrap:"wrap", gap:"1rem" },
  title              :{ margin:0, color:"#0f172a", fontSize:"1.6rem", fontWeight:"700" },
  subtitle           :{ margin:0, color:"#64748b", fontSize:"0.85rem" },
  machineChip        :{ background:"#e2e8f0", color:"#334155", padding:"2px 6px", borderRadius:"4px", fontSize:"0.6rem", fontWeight:"700", fontFamily:"monospace" },
  kpiGrid            :{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"1.25rem", marginBottom:"2rem" },
  kpiCard            :{ background:"#fff", padding:"1.25rem", borderRadius:"12px", boxShadow:"0 4px 6px -1px rgba(0,0,0,0.08)", display:"flex", alignItems:"center", gap:"1rem" },
  kpiIcon            :{ fontSize:"1.8rem", background:"#f1f5f9", padding:"0.6rem", borderRadius:"10px" },
  kpiLabel           :{ margin:"0 0 .25rem", color:"#64748b", fontSize:"0.85rem" },
  kpiValue           :{ margin:0, fontSize:"1.8rem", fontWeight:"700" },
  successBanner      :{ background:"#d1fae5", color:"#065f46", padding:"0.75rem 1rem", borderRadius:"8px", marginBottom:"1rem", borderLeft:"3px solid #10b981" },
  errorBanner        :{ background:"#fee2e2", color:"#991b1b", padding:"0.75rem 1rem", borderRadius:"8px", marginBottom:"1rem", borderLeft:"3px solid #ef4444" },
  tabs               :{ display:"flex", gap:"0.75rem", marginBottom:"1.5rem", flexWrap:"wrap" },
  tabBtn             :{ padding:"0.65rem 1.25rem", border:"none", cursor:"pointer", borderRadius:"8px", fontSize:"0.9rem", fontWeight:"500" },
  tabActive          :{ background:"#1e293b", color:"#fff" },
  tabInactive        :{ background:"#fff", color:"#64748b", border:"1px solid #e2e8f0" },
  card               :{ background:"#fff", borderRadius:"16px", padding:"2rem", boxShadow:"0 4px 6px -1px rgba(0,0,0,0.08)" },
  sectionTitle       :{ margin:"0 0 0.5rem", color:"#0f172a", fontSize:"1.2rem", fontWeight:"600" },
  sectionSub         :{ margin:"0 0 1.5rem", color:"#64748b", fontSize:"0.9rem", borderBottom:"1px solid #e2e8f0", paddingBottom:"0.75rem" },
  fluxContainer      :{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:0, background:"#f8fafc", borderRadius:"10px", padding:"1rem" },
  fluxStep           :{ textAlign:"center" },
  fluxBox            :{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"0.4rem 0.5rem", minWidth:"68px", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" },
  fluxArrow          :{ color:"#94a3b8", fontSize:"0.9rem", margin:"0 2px" },
  formGrid           :{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"1.5rem" },
  formGroup          :{ display:"flex", flexDirection:"column", gap:"0.4rem" },
  label              :{ fontSize:"0.85rem", fontWeight:"600", color:"#334155" },
  star               :{ color:"#ef4444" },
  input              :{ padding:"0.7rem 1rem", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"0.9rem", outline:"none", width:"100%", boxSizing:"border-box" },
  inputHighlight     :{ padding:"0.85rem 1rem", border:"2px solid #2563eb", borderRadius:"8px", fontSize:"1rem", fontWeight:"600", outline:"none", width:"100%", boxSizing:"border-box", background:"#eff6ff" },
  inputDisabled      :{ padding:"0.85rem 1rem", border:"2px solid #cbd5e1", borderRadius:"8px", fontSize:"1rem", outline:"none", width:"100%", boxSizing:"border-box", background:"#f1f5f9", color:"#64748b" },
  select             :{ padding:"0.7rem 1rem", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"0.9rem", background:"#fff", width:"100%", boxSizing:"border-box" },
  selectDisabled     :{ padding:"0.7rem 1rem", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"0.9rem", background:"#f1f5f9", width:"100%", boxSizing:"border-box", color:"#64748b" },
  btnPrimary         :{ background:"#2563eb", color:"#fff", padding:"0.75rem 1.5rem", border:"none", borderRadius:"8px", fontSize:"0.95rem", fontWeight:"600", cursor:"pointer", marginTop:"1.5rem" },
  btnWarning         :{ background:"#d97706", color:"#fff", padding:"0.75rem 1.5rem", border:"none", borderRadius:"8px", fontSize:"0.95rem", fontWeight:"600", cursor:"pointer" },
  btnPipelineNext    :{ background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", padding:"0.9rem 2rem", border:"none", borderRadius:"10px", fontSize:"1rem", fontWeight:"700", cursor:"pointer", width:"100%" },
  btnDisabled        :{ background:"#94a3b8", color:"#fff", padding:"0.9rem 2rem", border:"none", borderRadius:"10px", fontSize:"1rem", fontWeight:"700", cursor:"not-allowed", width:"100%" },
  btnStopAuto        :{ background:"#ef4444", color:"#fff", padding:"0.5rem 1rem", border:"none", borderRadius:"6px", fontSize:"0.8rem", fontWeight:"600", cursor:"pointer" },
  btnStartAuto       :{ background:"#10b981", color:"#fff", padding:"0.5rem 1rem", border:"none", borderRadius:"6px", fontSize:"0.8rem", fontWeight:"600", cursor:"pointer" },
  autoModeControl    :{ display:"flex", alignItems:"center", gap:"0.5rem", background:"#f1f5f9", padding:"0.5rem 1rem", borderRadius:"10px" },
  speedSelect        :{ padding:"0.25rem 0.5rem", borderRadius:"6px", border:"1px solid #cbd5e1", fontSize:"0.75rem", background:"#fff" },
  autoBadge          :{ background:"#d1fae5", color:"#065f46", padding:"0.25rem 0.75rem", borderRadius:"20px", fontSize:"0.75rem", fontWeight:"600" },
  pipelineActiveCard :{ background:"#f8fafc", border:"2px solid #f59e0b", borderRadius:"14px", padding:"1.5rem" },
  pipelineActiveHeader:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" },
  pipelineOrdreBig   :{ background:"#f59e0b", color:"#fff", width:"44px", height:"44px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem", fontWeight:"800", flexShrink:0 },
  pipelineContext    :{ display:"flex", gap:"0.5rem", flexWrap:"wrap" },
  contextTag         :{ background:"#fef3c7", color:"#92400e", padding:"3px 10px", borderRadius:"20px", fontSize:"0.8rem", fontWeight:"600" },
  rendLive           :{ background:"#f1f5f9", borderRadius:"8px", padding:"0.6rem 1rem", fontSize:"0.85rem", color:"#334155" },
  completedBox       :{ background:"#d1fae5", border:"2px solid #10b981", borderRadius:"14px", padding:"2rem", textAlign:"center" },
  infoCard           :{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:"10px", padding:"0.75rem 1rem" },
  statutBadge        :{ padding:"0.2rem 0.7rem", borderRadius:"20px", fontSize:"0.78rem", fontWeight:"600", display:"inline-block" },
  codeBadge          :{ background:"#e2e8f0", color:"#334155", padding:"2px 6px", borderRadius:"4px", fontSize:"0.82rem", fontWeight:"600", fontFamily:"monospace" },
  table              :{ width:"100%", borderCollapse:"collapse", fontSize:"0.9rem" },
  th                 :{ textAlign:"left", padding:"0.75rem", borderBottom:"2px solid #e2e8f0", color:"#64748b", fontWeight:"600", fontSize:"0.85rem" },
  td                 :{ padding:"0.75rem", borderBottom:"1px solid #f1f5f9", color:"#1e293b" },
  empty              :{ textAlign:"center", padding:"3rem", color:"#94a3b8" },
};

export default Production;