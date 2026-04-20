// Production.jsx - Version corrigée (seulement les parties modifiées)
import React, { useState, useEffect } from "react";
import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000/api/productions";
const MES_OF_URL = "http://127.0.0.1:8000/api/ordres-fabrication";

const Production = () => {
  const [activeTab, setActiveTab] = useState("production");

  const [productions, setProductions] = useState([]);
  const [rebuts, setRebuts] = useState([]);
  const [ordresFabrication, setOrdresFabrication] = useState([]);
  const [loadingOFs, setLoadingOFs] = useState(false);
  const [errorOFs, setErrorOFs] = useState(false); // Ajouté

  // États pour les formulaires
  const [formProd, setFormProd] = useState({
    machine: "",
    of_id: "",
    of_numero: "",
    produit_fini: "",
    fibre: "",
    quantite_produit_fini: "",
    quantite_matiere_premiere: "",
    operateur: "",
    debut: "",
    fin: ""
  });

  const [formRebut, setFormRebut] = useState({
    machine: "",
    production_id: "",
    defaut: "",
    quantite: ""
  });

  // États pour les erreurs et soumission
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // =========================
  // DONNEES
  // =========================

  const machines = ["Carde 01","Carde 02","Carde 03","Carde 04","Carde 05"];
  const operateurs = ["Jean Dupont","Marie Martin","Pierre Durand","Sophie Lefebvre","Lucas Bernard"];
  const produitsFini = ["Ruban 100% coton","Ruban Laine","Ruban Polyester","Ruban Acrylique","Ruban Lin","Ruban Soie"];
  const fibres = ["Coton","Laine","Polyester","Acrylique","Lin","Soie","Mélange"];
  const typesDefaut = ["Néppes","Impuretés","Casses","Irrégularité","Souillure","Autre défaut"];

  // =========================
  // KPI
  // =========================

  const totalProd = productions.reduce((acc,p)=> acc + Number(p.quantite_produit_fini || 0),0);
  const totalMatierePremiere = productions.reduce((acc,p)=> acc + Number(p.quantite_matiere_premiere || 0),0);
  const totalRebut = rebuts.reduce((acc,r)=> acc + Number(r.quantite || 0),0);
  const tauxQualite = totalProd ? (((totalProd-totalRebut)/totalProd)*100).toFixed(1) : 0;
  const rendement = totalMatierePremiere ? ((totalProd / totalMatierePremiere) * 100).toFixed(1) : 0;

  // =========================
  // LOAD DATA
  // =========================

  const loadOrdresFabrication = async () => {
    setLoadingOFs(true);
    setErrorOFs(false);
    try {
      // Correction: Enlever le slash supplémentaire
      const response = await axios.get(MES_OF_URL);
      console.log("✅ OFs chargés:", response.data);
      setOrdresFabrication(response.data);
    } catch (err) {
      console.error("❌ Erreur lors du chargement des OFs MES:", err);
      setErrorOFs(true);
      // Données mockées en cas d'erreur pour que l'interface fonctionne quand même
      const mockOFs = [
        { id: 1, numero: "OF-001", machine: "Carde 01", produit: "Ruban cardé coton", quantite: 500 },
        { id: 2, numero: "OF-002", machine: "Carde 02", produit: "Ruban cardé polyester", quantite: 750 },
        { id: 3, numero: "OF-003", machine: "Carde 03", produit: "Ruban cardé mélange", quantite: 600 },
      ];
      setOrdresFabrication(mockOFs);
      console.log("📦 Utilisation des données mockées pour les OFs");
    } finally {
      setLoadingOFs(false);
    }
  };

  useEffect(()=>{
    const load = async ()=>{
      try{
        const prod = await axios.get(BASE_URL);
        setProductions(prod.data);

        try {
          const reb = await axios.get(`${BASE_URL}/rebuts`);
          setRebuts(reb.data);
        } catch (rebErr) {
          console.error("Erreur chargement rebuts:", rebErr);
          setRebuts([]);
        }

        await loadOrdresFabrication();
      }catch(err){
        console.error("Erreur générale:", err);
      }
    };
    load();
    
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(-10px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      .error-field {
        animation: shake 0.5s;
      }
      .success-message {
        animation: slideIn 0.3s ease;
      }
      .loading-pulse {
        animation: pulse 1.5s ease-in-out infinite;
      }
    `;
    document.head.appendChild(styleSheet);
  },[]);

  const handleOFChange = (e) => {
    const selectedId = parseInt(e.target.value);
    const selectedOF = ordresFabrication.find(of => of.id === selectedId);
    
    if (selectedOF) {
      setFormProd({
        ...formProd,
        of_id: selectedOF.id,
        of_numero: selectedOF.numero,
        machine: selectedOF.machine || formProd.machine,
        fibre: selectedOF.fibre || formProd.fibre
      });
      
      setSuccessMessage(`✅ OF sélectionné: ${selectedOF.numero}`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } else {
      setFormProd({
        ...formProd,
        of_id: "",
        of_numero: "",
        machine: ""
      });
    }
  };

  const validateProduction = () => {
    const errors = {};
    
    if (!formProd.machine) errors.machine = "Veuillez sélectionner une machine";
    if (!formProd.of_id) errors.of_id = "Veuillez sélectionner un OF valide";
    if (!formProd.produit_fini) errors.produit_fini = "Veuillez sélectionner un produit fini";
    if (!formProd.fibre) errors.fibre = "Veuillez sélectionner une fibre";
    if (!formProd.quantite_produit_fini || formProd.quantite_produit_fini <= 0) 
      errors.quantite_produit_fini = "La quantité produit fini doit être supérieure à 0";
    if (!formProd.quantite_matiere_premiere || formProd.quantite_matiere_premiere <= 0) 
      errors.quantite_matiere_premiere = "La quantité matière première doit être supérieure à 0";
    if (!formProd.operateur) errors.operateur = "Veuillez sélectionner un opérateur";
    if (!formProd.debut) errors.debut = "Veuillez saisir l'heure de début";
    if (!formProd.fin) errors.fin = "Veuillez saisir l'heure de fin";
    
    if (formProd.debut && formProd.fin && formProd.debut >= formProd.fin) {
      errors.fin = "L'heure de fin doit être après l'heure de début";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateRebut = () => {
    const errors = {};
    
    if (!formRebut.machine) errors.machine = "Veuillez sélectionner une machine";
    if (!formRebut.production_id) errors.production_id = "Veuillez sélectionner une production";
    if (!formRebut.defaut) errors.defaut = "Veuillez sélectionner un type de défaut";
    if (!formRebut.quantite || formRebut.quantite <= 0) errors.quantite = "La quantité doit être supérieure à 0";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProduction = async (e)=>{
    e.preventDefault();
    
    if (!validateProduction()) {
      const firstError = document.querySelector(".error-field");
      if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    
    setIsSubmitting(true);
    setSuccessMessage("");
    
    try{
      const res = await axios.post(BASE_URL,formProd);
      setProductions([...productions,res.data]);
      setFormProd({
        machine: "",
        of_id: "",
        of_numero: "",
        produit_fini: "",
        fibre: "",
        quantite_produit_fini: "",
        quantite_matiere_premiere: "",
        operateur: "",
        debut: "",
        fin: ""
      });
      setSuccessMessage("✅ Production enregistrée avec succès !");
      setTimeout(() => setSuccessMessage(""), 3000);
    }catch(err){
      console.error("Erreur détaillée:", err);
      alert("❌ Erreur lors de l'enregistrement de la production\n" + (err.response?.data?.detail || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRebut = async (e)=>{
    e.preventDefault();
    
    if (!validateRebut()) {
      const firstError = document.querySelector(".error-field");
      if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    
    setIsSubmitting(true);
    setSuccessMessage("");
    
    try{
      const res = await axios.post(`${BASE_URL}/rebuts`, formRebut);
      setRebuts([...rebuts,res.data]);
      setFormRebut({machine:"",production_id:"",defaut:"",quantite:""});
      setSuccessMessage("✅ Rebut enregistré avec succès !");
      setTimeout(() => setSuccessMessage(""), 3000);
    }catch(err){
      console.error("Erreur détaillée:", err);
      alert("❌ Erreur lors de l'enregistrement du rebut\n" + (err.response?.data?.detail || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Styles (gardez vos styles existants - je ne les répète pas pour la lisibilité)
  const styles = {
    container:{padding:"2rem",background:"#f8fafc",minHeight:"100vh",fontFamily:"'Inter', -apple-system, BlinkMacSystemFont, sans-serif"},
    header:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"2rem",background:"#fff",padding:"1.5rem 2rem",borderRadius:"16px",boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)"},
    logo:{display:"flex",alignItems:"center",gap:"1rem"},
    logoIcon:{fontSize:"2.5rem"},
    title:{margin:0,color:"#0f172a",fontSize:"1.8rem",fontWeight:"600"},
    subtitle:{margin:0,color:"#64748b",fontSize:"0.9rem"},
    kpiGrid:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1.5rem",marginBottom:"2rem"},
    kpiCard:{background:"#fff",padding:"1.5rem",borderRadius:"12px",boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)",display:"flex",alignItems:"center",gap:"1rem",borderLeft:"4px solid"},
    kpiIcon:{fontSize:"2rem",background:"#f1f5f9",padding:"0.75rem",borderRadius:"12px"},
    kpiLabel:{margin:"0 0 0.25rem 0",color:"#64748b",fontSize:"0.9rem",fontWeight:"500"},
    kpiValue:{margin:0,fontSize:"1.8rem",fontWeight:"700",color:"#0f172a"},
    tabs:{display:"flex",gap:"1rem",marginBottom:"2rem"},
    tabButton:{padding:"0.75rem 1.5rem",border:"none",cursor:"pointer",borderRadius:"8px",fontSize:"0.95rem",fontWeight:"500",display:"flex",alignItems:"center",gap:"0.5rem",transition:"all 0.2s"},
    content:{background:"#fff",borderRadius:"16px",padding:"2rem",boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)"},
    formTitle:{margin:"0 0 0.5rem 0",color:"#0f172a",fontSize:"1.3rem",fontWeight:"600"},
    formSubtitle:{margin:"0 0 1.5rem 0",color:"#64748b",fontSize:"0.9rem",borderBottom:"1px solid #e2e8f0",paddingBottom:"0.75rem"},
    formGrid:{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:"1.5rem"},
    formGroup:{display:"flex",flexDirection:"column",gap:"0.5rem"},
    label:{fontSize:"0.85rem",fontWeight:"600",color:"#334155",display:"flex",alignItems:"center",gap:"0.5rem"},
    requiredStar:{color:"#ef4444",fontSize:"0.8rem"},
    input:{padding:"0.75rem 1rem",border:"1px solid #e2e8f0",borderRadius:"8px",fontSize:"0.95rem",outline:"none",transition:"all 0.2s",width:"100%",boxSizing:"border-box",background:"#fff"},
    select:{padding:"0.75rem 1rem",border:"1px solid #e2e8f0",borderRadius:"8px",fontSize:"0.95rem",outline:"none",background:"#fff",cursor:"pointer",width:"100%",boxSizing:"border-box",transition:"all 0.2s"},
    inputError:{borderColor:"#ef4444",background:"#fef2f2"},
    errorMessage:{color:"#ef4444",fontSize:"0.75rem",marginTop:"0.25rem",display:"flex",alignItems:"center",gap:"0.25rem"},
    buttonContainer:{display:"flex",gap:"1rem",marginTop:"1rem",paddingTop:"1rem",borderTop:"1px solid #e2e8f0"},
    primaryBtn:{background:"#2563eb",color:"#fff",padding:"0.75rem 1.5rem",border:"none",borderRadius:"8px",fontSize:"0.95rem",fontWeight:"500",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"0.5rem",transition:"all 0.2s",flex:1},
    secondaryBtn:{background:"#f1f5f9",color:"#475569",padding:"0.75rem 1.5rem",border:"1px solid #e2e8f0",borderRadius:"8px",fontSize:"0.95rem",fontWeight:"500",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"0.5rem",transition:"all 0.2s"},
    disabledBtn:{background:"#94a3b8",color:"#fff",padding:"0.75rem 1.5rem",border:"none",borderRadius:"8px",fontSize:"0.95rem",fontWeight:"500",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"0.5rem",cursor:"not-allowed",opacity:0.7,flex:1},
    btnIcon:{fontSize:"1.1rem"},
    successMessage:{color:"#10b981",fontSize:"0.9rem",marginTop:"0.5rem",padding:"0.75rem",background:"#f0fdf4",borderRadius:"8px",borderLeft:"3px solid #10b981",display:"flex",alignItems:"center",gap:"0.5rem",animation:"slideIn 0.3s ease"},
    infoMessage:{color:"#3b82f6",fontSize:"0.9rem",marginTop:"0.5rem",padding:"0.75rem",background:"#eff6ff",borderRadius:"8px",borderLeft:"3px solid #3b82f6",display:"flex",alignItems:"center",gap:"0.5rem",animation:"slideIn 0.3s ease"},
    warningMessage:{color:"#d97706",fontSize:"0.9rem",marginTop:"0.5rem",padding:"0.75rem",background:"#fffbeb",borderRadius:"8px",borderLeft:"3px solid #f59e0b",display:"flex",alignItems:"center",gap:"0.5rem"},
    table:{width:"100%",borderCollapse:"collapse",fontSize:"0.95rem"},
    th:{textAlign:"left",padding:"0.75rem",borderBottom:"2px solid #e2e8f0",color:"#64748b",fontWeight:"600"},
    td:{padding:"0.75rem",borderBottom:"1px solid #e2e8f0",color:"#1e293b"},
    infoTooltip:{fontSize:"0.75rem",color:"#94a3b8",marginTop:"0.25rem",display:"flex",alignItems:"center",gap:"0.25rem"},
    autoBadge:{background:"#10b981",color:"#fff",padding:"2px 6px",borderRadius:"4px",fontSize:"0.7rem",fontWeight:"600",marginLeft:"0.5rem"},
    loadingText:{color:"#94a3b8",fontSize:"0.85rem",fontStyle:"italic"}
  };

  return(
    <div style={styles.container}>

      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🏭</span>
          <div>
            <h1 style={styles.title}>MES – ATELIER CARDAGE</h1>
            <p style={styles.subtitle}>Module Suivi Production • Version 2.0 • Intégration MES</p>
          </div>
        </div>
      </div>

      <div style={styles.kpiGrid}>
        <div style={{...styles.kpiCard, borderLeftColor: "#2563eb"}}>
          <div style={styles.kpiIcon}>📦</div>
          <div>
            <p style={styles.kpiLabel}>Production Totale</p>
            <p style={styles.kpiValue}>{totalProd} kg</p>
          </div>
        </div>
        <div style={{...styles.kpiCard, borderLeftColor: "#8b5cf6"}}>
          <div style={styles.kpiIcon}>🌾</div>
          <div>
            <p style={styles.kpiLabel}>Matière Première</p>
            <p style={styles.kpiValue}>{totalMatierePremiere} kg</p>
          </div>
        </div>
        <div style={{...styles.kpiCard, borderLeftColor: "#ef4444"}}>
          <div style={styles.kpiIcon}>⚠️</div>
          <div>
            <p style={styles.kpiLabel}>Rebuts</p>
            <p style={styles.kpiValue}>{totalRebut} kg</p>
          </div>
        </div>
        <div style={{...styles.kpiCard, borderLeftColor: "#10b981"}}>
          <div style={styles.kpiIcon}>✅</div>
          <div>
            <p style={styles.kpiLabel}>Rendement</p>
            <p style={styles.kpiValue}>{rendement}%</p>
          </div>
        </div>
      </div>

      <div style={styles.tabs}>
        <button 
          style={{
            ...styles.tabButton,
            background: activeTab === "production" ? "#1e293b" : "#fff",
            color: activeTab === "production" ? "#fff" : "#64748b",
            border: activeTab === "production" ? 'none' : '1px solid #e2e8f0'
          }}
          onClick={()=>{setActiveTab("production"); setSuccessMessage(""); setFormErrors({});}}
        >
          <span>🏭</span> Production
        </button>
        <button 
          style={{
            ...styles.tabButton,
            background: activeTab === "rebuts" ? "#1e293b" : "#fff",
            color: activeTab === "rebuts" ? "#fff" : "#64748b",
            border: activeTab === "rebuts" ? 'none' : '1px solid #e2e8f0'
          }}
          onClick={()=>{setActiveTab("rebuts"); setSuccessMessage(""); setFormErrors({});}}
        >
          <span>⚠️</span> Rebuts
        </button>
        <button 
          style={{
            ...styles.tabButton,
            background: activeTab === "historique" ? "#1e293b" : "#fff",
            color: activeTab === "historique" ? "#fff" : "#64748b",
            border: activeTab === "historique" ? 'none' : '1px solid #e2e8f0'
          }}
          onClick={()=>setActiveTab("historique")}
        >
          <span>📋</span> Historique
        </button>
      </div>

      <div style={styles.content}>

        {/* FORM PRODUCTION */}
        {activeTab === "production" && (
          <div style={{animation: "fadeIn 0.3s ease"}}>
            <h2 style={styles.formTitle}>📝 Saisie Production</h2>
            <p style={styles.formSubtitle}>Enregistrez une nouvelle production dans l'atelier</p>
            
            <form onSubmit={handleProduction}>
              <div style={styles.formGrid}>
                {/* N° Ordre de Fabrication */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    📋 N° Ordre de Fabrication <span style={styles.requiredStar}>*</span>
                  </label>
                  
                  <select
                    style={{...styles.select, ...(formErrors.of_id ? styles.inputError : {}), fontFamily: "monospace"}}
                    value={formProd.of_id || ""}
                    onChange={handleOFChange}
                    required
                    className={formErrors.of_id ? "error-field" : ""}
                  >
                    <option value="">-- Sélectionnez un OF --</option>
                    {!loadingOFs && !errorOFs && ordresFabrication.map(of => (
                      <option key={of.id} value={of.id}>
                        {of.numero} {of.machine ? `- ${of.machine}` : ''}
                      </option>
                    ))}
                  </select>
                  
                  {loadingOFs && (
                    <div style={styles.loadingText}>⏳ Chargement des OFs depuis le module MES...</div>
                  )}
                  
                  {!loadingOFs && errorOFs && (
                    <div style={styles.warningMessage}>
                      ⚠️ Impossible de charger les OFs. Vérifiez que le backend est démarré sur {MES_OF_URL}
                    </div>
                  )}
                  
                  {!loadingOFs && !errorOFs && ordresFabrication.length === 0 && (
                    <div style={styles.infoMessage}>
                      ℹ️ Aucun OF disponible. Veuillez créer des OF dans le module "Ordres de fabrication".
                    </div>
                  )}
                  
                  {!loadingOFs && !errorOFs && ordresFabrication.length > 0 && (
                    <div style={styles.infoTooltip}>
                      💡 {ordresFabrication.length} OF(s) disponible(s)
                    </div>
                  )}
                  
                  {formErrors.of_id && (
                    <div style={styles.errorMessage}>⚠️ {formErrors.of_id}</div>
                  )}
                </div>

                {/* Machine - auto-remplie et désactivée */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    🏭 Machine <span style={styles.requiredStar}>*</span>
                    {formProd.machine && formProd.of_id && <span style={styles.autoBadge}>Auto</span>}
                  </label>
                  <select 
                    style={{...styles.select, ...(formErrors.machine ? styles.inputError : {}), 
                      background: formProd.machine && formProd.of_id ? "#f0fdf4" : "#fff"}} 
                    value={formProd.machine} 
                    onChange={(e)=>setFormProd({...formProd,machine:e.target.value})} 
                    required 
                    disabled={!!formProd.of_id}
                    className={formErrors.machine ? "error-field" : ""}
                  >
                    <option value="">Sélectionner une machine</option>
                    {machines.map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                  {formProd.machine && formProd.of_id && (
                    <div style={styles.infoTooltip}>✅ Machine automatiquement renseignée depuis l'OF</div>
                  )}
                  {formErrors.machine && <div style={styles.errorMessage}>⚠️ {formErrors.machine}</div>}
                </div>

                {/* Produit fini */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>🧵 Produit fini <span style={styles.requiredStar}>*</span></label>
                  <select style={{...styles.select, ...(formErrors.produit_fini ? styles.inputError : {})}} value={formProd.produit_fini} onChange={(e)=>setFormProd({...formProd,produit_fini:e.target.value})} required className={formErrors.produit_fini ? "error-field" : ""}>
                    <option value="">Sélectionner un produit fini</option>
                    {produitsFini.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                  {formErrors.produit_fini && <div style={styles.errorMessage}>⚠️ {formErrors.produit_fini}</div>}
                </div>

                {/* Fibre */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>🧶 Fibre <span style={styles.requiredStar}>*</span></label>
                  <select
                    style={{...styles.select, ...(formErrors.fibre ? styles.inputError : {})}}
                    value={formProd.fibre}
                    onChange={(e)=>setFormProd({...formProd,fibre:e.target.value})}
                    required
                    className={formErrors.fibre ? "error-field" : ""}
                  >
                    <option value="">Sélectionner une fibre</option>
                    {fibres.map(f=><option key={f} value={f}>{f}</option>)}
                  </select>
                  {formErrors.fibre && <div style={styles.errorMessage}>⚠️ {formErrors.fibre}</div>}
                </div>

                {/* Quantité Produit Fini */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>⚖️ Quantité Produit Fini (kg) <span style={styles.requiredStar}>*</span></label>
                  <input 
                    style={{...styles.input, ...(formErrors.quantite_produit_fini ? styles.inputError : {})}} 
                    type="number" 
                    step="0.01"
                    placeholder="Ex: 450" 
                    value={formProd.quantite_produit_fini} 
                    onChange={(e)=>setFormProd({...formProd,quantite_produit_fini:e.target.value})} 
                    required 
                    className={formErrors.quantite_produit_fini ? "error-field" : ""}
                  />
                  {formErrors.quantite_produit_fini && <div style={styles.errorMessage}>⚠️ {formErrors.quantite_produit_fini}</div>}
                  <div style={styles.infoTooltip}>Quantité de produit fini en kilogrammes (kg)</div>
                </div>

                {/* Quantité Matière Première */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>🌾 Quantité Matière Première (kg) <span style={styles.requiredStar}>*</span></label>
                  <input 
                    style={{...styles.input, ...(formErrors.quantite_matiere_premiere ? styles.inputError : {})}} 
                    type="number" 
                    step="0.01"
                    placeholder="Ex: 500" 
                    value={formProd.quantite_matiere_premiere} 
                    onChange={(e)=>setFormProd({...formProd,quantite_matiere_premiere:e.target.value})} 
                    required 
                    className={formErrors.quantite_matiere_premiere ? "error-field" : ""}
                  />
                  {formErrors.quantite_matiere_premiere && <div style={styles.errorMessage}>⚠️ {formErrors.quantite_matiere_premiere}</div>}
                  <div style={styles.infoTooltip}>Quantité de matière première consommée en kilogrammes (kg)</div>
                </div>

                {/* Opérateur */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>👤 Opérateur <span style={styles.requiredStar}>*</span></label>
                  <select style={{...styles.select, ...(formErrors.operateur ? styles.inputError : {})}} value={formProd.operateur} onChange={(e)=>setFormProd({...formProd,operateur:e.target.value})} required className={formErrors.operateur ? "error-field" : ""}>
                    <option value="">Sélectionner un opérateur</option>
                    {operateurs.map(op=><option key={op} value={op}>{op}</option>)}
                  </select>
                  {formErrors.operateur && <div style={styles.errorMessage}>⚠️ {formErrors.operateur}</div>}
                </div>

                {/* Heure début */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>⏰ Heure début <span style={styles.requiredStar}>*</span></label>
                  <input style={{...styles.input, ...(formErrors.debut ? styles.inputError : {})}} type="time" value={formProd.debut} onChange={(e)=>setFormProd({...formProd,debut:e.target.value})} required className={formErrors.debut ? "error-field" : ""}/>
                  {formErrors.debut && <div style={styles.errorMessage}>⚠️ {formErrors.debut}</div>}
                </div>

                {/* Heure fin */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>⏰ Heure fin <span style={styles.requiredStar}>*</span></label>
                  <input style={{...styles.input, ...(formErrors.fin ? styles.inputError : {})}} type="time" value={formProd.fin} onChange={(e)=>setFormProd({...formProd,fin:e.target.value})} required className={formErrors.fin ? "error-field" : ""}/>
                  {formErrors.fin && <div style={styles.errorMessage}>⚠️ {formErrors.fin}</div>}
                </div>
              </div>
              
              <div style={styles.buttonContainer}>
                <button type="button" style={styles.secondaryBtn} onClick={()=>{
                  setFormProd({
                    machine: "",
                    of_id: "",
                    of_numero: "",
                    produit_fini: "",
                    fibre: "",
                    quantite_produit_fini: "",
                    quantite_matiere_premiere: "",
                    operateur: "",
                    debut: "",
                    fin: ""
                  });
                  setFormErrors({});
                }}>
                  🗑️ Réinitialiser
                </button>
                <button type="submit" style={isSubmitting ? styles.disabledBtn : styles.primaryBtn} disabled={isSubmitting}>
                  <span style={styles.btnIcon}>{isSubmitting ? "⏳" : "✅"}</span>
                  {isSubmitting ? "Enregistrement..." : "Enregistrer Production"}
                </button>
              </div>
              
              {successMessage && <div style={styles.successMessage}>{successMessage}</div>}
            </form>
          </div>
        )}

        {/* FORM REBUT */}
        {activeTab === "rebuts" && (
          <div style={{animation: "fadeIn 0.3s ease"}}>
            <h2 style={styles.formTitle}>⚠️ Saisie Rebuts</h2>
            <p style={styles.formSubtitle}>Enregistrez les rebuts de production</p>
            
            <form onSubmit={handleRebut}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>🏭 Machine <span style={styles.requiredStar}>*</span></label>
                  <select style={{...styles.select, ...(formErrors.machine ? styles.inputError : {})}} value={formRebut.machine} onChange={(e)=>setFormRebut({...formRebut,machine:e.target.value})} required className={formErrors.machine ? "error-field" : ""}>
                    <option value="">Sélectionner une machine</option>
                    {machines.map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                  {formErrors.machine && <div style={styles.errorMessage}>⚠️ {formErrors.machine}</div>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>📦 Production <span style={styles.requiredStar}>*</span></label>
                  <select style={{...styles.select, ...(formErrors.production_id ? styles.inputError : {})}} value={formRebut.production_id} onChange={(e)=>setFormRebut({...formRebut,production_id:e.target.value})} required className={formErrors.production_id ? "error-field" : ""}>
                    <option value="">Sélectionner une production</option>
                    {productions.map(p=>{
                      const of = ordresFabrication.find(o => o.id === p.of_id);
                      return (
                        <option key={p.id} value={p.id}>
                          {of?.numero || p.of_numero || p.of_id} - {p.machine} - {p.produit_fini} - {p.quantite_produit_fini} kg PF / {p.quantite_matiere_premiere} kg MP
                        </option>
                      );
                    })}
                  </select>
                  {formErrors.production_id && <div style={styles.errorMessage}>⚠️ {formErrors.production_id}</div>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>🔍 Type de défaut <span style={styles.requiredStar}>*</span></label>
                  <select style={{...styles.select, ...(formErrors.defaut ? styles.inputError : {})}} value={formRebut.defaut} onChange={(e)=>setFormRebut({...formRebut,defaut:e.target.value})} required className={formErrors.defaut ? "error-field" : ""}>
                    <option value="">Sélectionner un défaut</option>
                    {typesDefaut.map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                  {formErrors.defaut && <div style={styles.errorMessage}>⚠️ {formErrors.defaut}</div>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>⚖️ Quantité rebut (kg) <span style={styles.requiredStar}>*</span></label>
                  <input style={{...styles.input, ...(formErrors.quantite ? styles.inputError : {})}} type="number" step="0.01" placeholder="Ex: 50" value={formRebut.quantite} onChange={(e)=>setFormRebut({...formRebut,quantite:e.target.value})} required className={formErrors.quantite ? "error-field" : ""}/>
                  {formErrors.quantite && <div style={styles.errorMessage}>⚠️ {formErrors.quantite}</div>}
                  <div style={styles.infoTooltip}>Quantité en kilogrammes (kg)</div>
                </div>
              </div>
              
              <div style={styles.buttonContainer}>
                <button type="button" style={styles.secondaryBtn} onClick={()=>{
                  setFormRebut({machine:"",production_id:"",defaut:"",quantite:""});
                  setFormErrors({});
                }}>
                  🗑️ Réinitialiser
                </button>
                <button type="submit" style={isSubmitting ? styles.disabledBtn : styles.primaryBtn} disabled={isSubmitting}>
                  <span style={styles.btnIcon}>{isSubmitting ? "⏳" : "⚠️"}</span>
                  {isSubmitting ? "Enregistrement..." : "Enregistrer Rebut"}
                </button>
              </div>
              
              {successMessage && <div style={styles.successMessage}>{successMessage}</div>}
            </form>
          </div>
        )}

        {/* HISTORIQUE */}
        {activeTab === "historique" && (
          <div style={{animation: "fadeIn 0.3s ease"}}>
            <h2 style={styles.formTitle}>📋 Historique des Productions</h2>
            <p style={styles.formSubtitle}>Liste complète des productions enregistrées</p>
            
            {productions.length > 0 ? (
              <div style={{overflowX: "auto"}}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>🏭 Machine</th>
                      <th style={styles.th}>📋 N° OF</th>
                      <th style={styles.th}>🧵 Produit fini</th>
                      <th style={styles.th}>⚖️ Quantité PF</th>
                      <th style={styles.th}>🌾 Quantité MP</th>
                      <th style={styles.th}>📊 Rendement</th>
                      <th style={styles.th}>👤 Opérateur</th>
                      <th style={styles.th}>⏰ Début</th>
                      <th style={styles.th}>⏰ Fin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productions.map((p, index) => {
                      const of = ordresFabrication.find(o => o.id === p.of_id);
                      const rendementProd = p.quantite_matiere_premiere ? 
                        ((p.quantite_produit_fini / p.quantite_matiere_premiere) * 100).toFixed(1) : 0;
                      return (
                        <tr key={p.id} style={index % 2 === 0 ? {background: "#fff"} : {background: "#f8fafc"}}>
                          <td style={styles.td}>{p.machine}</td>
                          <td style={styles.td}>
                            <span style={{fontFamily: "monospace", fontWeight: "600"}}>
                              {of?.numero || p.of_numero || p.of_id}
                            </span>
                          </td>
                          <td style={styles.td}>{p.produit_fini}</td>
                          <td style={styles.td}><strong>{p.quantite_produit_fini}</strong> kg</td>
                          <td style={styles.td}>{p.quantite_matiere_premiere} kg</td>
                          <td style={styles.td}>
                            <span style={{
                              color: rendementProd >= 85 ? "#10b981" : rendementProd >= 70 ? "#f59e0b" : "#ef4444",
                              fontWeight: "600"
                            }}>
                              {rendementProd}%
                            </span>
                          </td>
                          <td style={styles.td}>{p.operateur}</td>
                          <td style={styles.td}>{p.debut}</td>
                          <td style={styles.td}>{p.fin}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{textAlign: "center", padding: "3rem", color: "#94a3b8"}}>
                <span style={{fontSize: "3rem", display: "block", marginBottom: "1rem"}}>📭</span>
                <p>Aucune production enregistrée</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default Production;