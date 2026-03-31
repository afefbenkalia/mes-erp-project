import React, { useState, useEffect } from "react";
import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000/productions";

const Production = () => {
  const [activeTab, setActiveTab] = useState("production");

  const [productions, setProductions] = useState([]);
  const [rebuts, setRebuts] = useState([]);
  const [tempsMachine, setTempsMachine] = useState([]);

  // États pour les formulaires
  const [formProd, setFormProd] = useState({
    machine: "",
    of_id: "",
    fibre: "",
    quantite: "",
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

  const [formTemps, setFormTemps] = useState({
    machine: "",
    fonctionnement: "",
    arret: ""
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
  const typesFibre = ["Coton","Laine","Polyester","Acrylique","Lin","Soie"];
  const typesDefaut = ["Néppes","Impuretés","Casses","Irrégularité","Souillure","Autre défaut"];
  const ofs = [
    {id:1,name:"OF-2024-001"},
    {id:2,name:"OF-2024-002"},
    {id:3,name:"OF-2024-003"},
    {id:4,name:"OF-2024-004"},
    {id:5,name:"OF-2024-005"}
  ];

  // =========================
  // KPI
  // =========================

  const totalProd = productions.reduce((acc,p)=> acc + Number(p.quantite || 0),0);
  const totalRebut = rebuts.reduce((acc,r)=> acc + Number(r.quantite || 0),0);
  const tauxQualite = totalProd ? (((totalProd-totalRebut)/totalProd)*100).toFixed(1) : 0;
  const totalTempsFonctionnement = tempsMachine.reduce((acc,t)=> acc + Number(t.fonctionnement || 0),0);
  const totalTempsArret = tempsMachine.reduce((acc,t)=> acc + Number(t.arret || 0),0);
  const tauxDisponibilite = totalTempsFonctionnement + totalTempsArret ? 
    ((totalTempsFonctionnement / (totalTempsFonctionnement + totalTempsArret)) * 100).toFixed(1) : 0;

  // =========================
  // LOAD DATA
  // =========================

  useEffect(()=>{
    const load = async ()=>{
      try{
        const prod = await axios.get(BASE_URL);
        setProductions(prod.data);

        const reb = await axios.get(`${BASE_URL}/rebuts`);
        setRebuts(reb.data);

        const temps = await axios.get(`${BASE_URL}/temps`);
        setTempsMachine(temps.data);

      }catch(err){
        console.error(err);
      }
    };
    load();
    
    // Ajouter les animations CSS
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
      .error-field {
        animation: shake 0.5s;
      }
      .success-message {
        animation: slideIn 0.3s ease;
      }
    `;
    document.head.appendChild(styleSheet);
  },[]);

  // =========================
  // VALIDATION DES FORMULAIRES
  // =========================

  const validateProduction = () => {
    const errors = {};
    
    if (!formProd.machine) errors.machine = "Veuillez sélectionner une machine";
    if (!formProd.of_id) errors.of_id = "Veuillez sélectionner un OF";
    if (!formProd.fibre) errors.fibre = "Veuillez sélectionner une fibre";
    if (!formProd.quantite || formProd.quantite <= 0) errors.quantite = "La quantité doit être supérieure à 0";
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

  const validateTemps = () => {
    const errors = {};
    
    if (!formTemps.machine) errors.machine = "Veuillez sélectionner une machine";
    if (!formTemps.fonctionnement || formTemps.fonctionnement < 0) errors.fonctionnement = "Le temps de fonctionnement doit être ≥ 0";
    if (!formTemps.arret || formTemps.arret < 0) errors.arret = "Le temps d'arrêt doit être ≥ 0";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // =========================
  // HANDLERS
  // =========================

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
      setFormProd({machine:"",of_id:"",fibre:"",quantite:"",operateur:"",debut:"",fin:""});
      setSuccessMessage("✅ Production enregistrée avec succès !");
      setTimeout(() => setSuccessMessage(""), 3000);
    }catch(err){
      alert("❌ Erreur lors de l'enregistrement de la production");
      console.error(err);
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
      alert("❌ Erreur lors de l'enregistrement du rebut");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTemps = async (e)=>{
    e.preventDefault();
    
    if (!validateTemps()) {
      const firstError = document.querySelector(".error-field");
      if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    
    setIsSubmitting(true);
    setSuccessMessage("");
    
    try{
      const res = await axios.post(`${BASE_URL}/temps`, formTemps);
      setTempsMachine([...tempsMachine,res.data]);
      setFormTemps({machine:"",fonctionnement:"",arret:""});
      setSuccessMessage("✅ Temps machine enregistré avec succès !");
      setTimeout(() => setSuccessMessage(""), 3000);
    }catch(err){
      alert("❌ Erreur lors de l'enregistrement du temps machine");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================
  // STYLES AMÉLIORÉS
  // =========================

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
    table:{width:"100%",borderCollapse:"collapse",fontSize:"0.95rem"},
    th:{textAlign:"left",padding:"0.75rem",borderBottom:"2px solid #e2e8f0",color:"#64748b",fontWeight:"600"},
    td:{padding:"0.75rem",borderBottom:"1px solid #e2e8f0",color:"#1e293b"},
    infoTooltip:{fontSize:"0.75rem",color:"#94a3b8",marginTop:"0.25rem"}
  };

  return(
    <div style={styles.container}>

      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🏭</span>
          <div>
            <h1 style={styles.title}>MES – ATELIER CARDAGE</h1>
            <p style={styles.subtitle}>Module Suivi Production • Version 2.0</p>
          </div>
        </div>
      </div>

      {/* KPI - 4 indicateurs */}
      <div style={styles.kpiGrid}>
        <div style={{...styles.kpiCard, borderLeftColor: "#2563eb"}}>
          <div style={styles.kpiIcon}>📦</div>
          <div>
            <p style={styles.kpiLabel}>Production Totale</p>
            <p style={styles.kpiValue}>{totalProd} kg</p>
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
            <p style={styles.kpiLabel}>Taux Qualité</p>
            <p style={styles.kpiValue}>{tauxQualite}%</p>
          </div>
        </div>
        <div style={{...styles.kpiCard, borderLeftColor: "#f59e0b"}}>
          <div style={styles.kpiIcon}>⏱️</div>
          <div>
            <p style={styles.kpiLabel}>Disponibilité</p>
            <p style={styles.kpiValue}>{tauxDisponibilite}%</p>
          </div>
        </div>
      </div>

      {/* TABS */}
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
            background: activeTab === "temps" ? "#1e293b" : "#fff",
            color: activeTab === "temps" ? "#fff" : "#64748b",
            border: activeTab === "temps" ? 'none' : '1px solid #e2e8f0'
          }}
          onClick={()=>{setActiveTab("temps"); setSuccessMessage(""); setFormErrors({});}}
        >
          <span>⏱️</span> Temps
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

        {/* FORM PRODUCTION AMÉLIORÉ */}
        {activeTab === "production" && (
          <div style={{animation: "fadeIn 0.3s ease"}}>
            <h2 style={styles.formTitle}>📝 Saisie Production</h2>
            <p style={styles.formSubtitle}>Enregistrez une nouvelle production dans l'atelier</p>
            
            <form onSubmit={handleProduction}>
              <div style={styles.formGrid}>
                {/* Machine */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>🏭 Machine <span style={styles.requiredStar}>*</span></label>
                  <select style={{...styles.select, ...(formErrors.machine ? styles.inputError : {})}} value={formProd.machine} onChange={(e)=>setFormProd({...formProd,machine:e.target.value})} required className={formErrors.machine ? "error-field" : ""}>
                    <option value="">Sélectionner une machine</option>
                    {machines.map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                  {formErrors.machine && <div style={styles.errorMessage}>⚠️ {formErrors.machine}</div>}
                </div>

                {/* OF */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>📋 Ordre de Fabrication <span style={styles.requiredStar}>*</span></label>
                  <select style={{...styles.select, ...(formErrors.of_id ? styles.inputError : {})}} value={formProd.of_id} onChange={(e)=>setFormProd({...formProd,of_id:e.target.value})} required className={formErrors.of_id ? "error-field" : ""}>
                    <option value="">Sélectionner un OF</option>
                    {ofs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                  {formErrors.of_id && <div style={styles.errorMessage}>⚠️ {formErrors.of_id}</div>}
                </div>

                {/* Fibre */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>🧵 Fibre <span style={styles.requiredStar}>*</span></label>
                  <select style={{...styles.select, ...(formErrors.fibre ? styles.inputError : {})}} value={formProd.fibre} onChange={(e)=>setFormProd({...formProd,fibre:e.target.value})} required className={formErrors.fibre ? "error-field" : ""}>
                    <option value="">Sélectionner une fibre</option>
                    {typesFibre.map(f=><option key={f} value={f}>{f}</option>)}
                  </select>
                  {formErrors.fibre && <div style={styles.errorMessage}>⚠️ {formErrors.fibre}</div>}
                </div>

                {/* Quantité */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>⚖️ Quantité (kg) <span style={styles.requiredStar}>*</span></label>
                  <input style={{...styles.input, ...(formErrors.quantite ? styles.inputError : {})}} type="number" placeholder="Ex: 500" value={formProd.quantite} onChange={(e)=>setFormProd({...formProd,quantite:e.target.value})} required className={formErrors.quantite ? "error-field" : ""}/>
                  {formErrors.quantite && <div style={styles.errorMessage}>⚠️ {formErrors.quantite}</div>}
                  <div style={styles.infoTooltip}>Quantité en kilogrammes (kg)</div>
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
                  setFormProd({machine:"",of_id:"",fibre:"",quantite:"",operateur:"",debut:"",fin:""});
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

        {/* FORM REBUT AMÉLIORÉ */}
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
                    {productions.map(p=><option key={p.id} value={p.id}>{p.machine} - {p.fibre} - {p.quantite} kg</option>)}
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
                  <input style={{...styles.input, ...(formErrors.quantite ? styles.inputError : {})}} type="number" placeholder="Ex: 50" value={formRebut.quantite} onChange={(e)=>setFormRebut({...formRebut,quantite:e.target.value})} required className={formErrors.quantite ? "error-field" : ""}/>
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

        {/* FORM TEMPS MACHINE AMÉLIORÉ */}
        {activeTab === "temps" && (
          <div style={{animation: "fadeIn 0.3s ease"}}>
            <h2 style={styles.formTitle}>⏱️ Saisie Temps Machine</h2>
            <p style={styles.formSubtitle}>Enregistrez les temps de fonctionnement et d'arrêt</p>
            
            <form onSubmit={handleTemps}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>🏭 Machine <span style={styles.requiredStar}>*</span></label>
                  <select style={{...styles.select, ...(formErrors.machine ? styles.inputError : {})}} value={formTemps.machine} onChange={(e)=>setFormTemps({...formTemps,machine:e.target.value})} required className={formErrors.machine ? "error-field" : ""}>
                    <option value="">Sélectionner une machine</option>
                    {machines.map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                  {formErrors.machine && <div style={styles.errorMessage}>⚠️ {formErrors.machine}</div>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>▶️ Fonctionnement (min) <span style={styles.requiredStar}>*</span></label>
                  <input style={{...styles.input, ...(formErrors.fonctionnement ? styles.inputError : {})}} type="number" placeholder="Ex: 480" value={formTemps.fonctionnement} onChange={(e)=>setFormTemps({...formTemps,fonctionnement:e.target.value})} required className={formErrors.fonctionnement ? "error-field" : ""}/>
                  {formErrors.fonctionnement && <div style={styles.errorMessage}>⚠️ {formErrors.fonctionnement}</div>}
                  <div style={styles.infoTooltip}>Temps de fonctionnement en minutes</div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>⏸️ Arrêt (min) <span style={styles.requiredStar}>*</span></label>
                  <input style={{...styles.input, ...(formErrors.arret ? styles.inputError : {})}} type="number" placeholder="Ex: 60" value={formTemps.arret} onChange={(e)=>setFormTemps({...formTemps,arret:e.target.value})} required className={formErrors.arret ? "error-field" : ""}/>
                  {formErrors.arret && <div style={styles.errorMessage}>⚠️ {formErrors.arret}</div>}
                  <div style={styles.infoTooltip}>Temps d'arrêt en minutes</div>
                </div>
              </div>
              
              <div style={styles.buttonContainer}>
                <button type="button" style={styles.secondaryBtn} onClick={()=>{
                  setFormTemps({machine:"",fonctionnement:"",arret:""});
                  setFormErrors({});
                }}>
                  🗑️ Réinitialiser
                </button>
                <button type="submit" style={isSubmitting ? styles.disabledBtn : styles.primaryBtn} disabled={isSubmitting}>
                  <span style={styles.btnIcon}>{isSubmitting ? "⏳" : "⏱️"}</span>
                  {isSubmitting ? "Enregistrement..." : "Enregistrer Temps"}
                </button>
              </div>
              
              {successMessage && <div style={styles.successMessage}>{successMessage}</div>}
            </form>
          </div>
        )}

        {/* HISTORIQUE AMÉLIORÉ */}
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
                      <th style={styles.th}>📋 OF</th>
                      <th style={styles.th}>🧵 Fibre</th>
                      <th style={styles.th}>⚖️ Quantité</th>
                      <th style={styles.th}>👤 Opérateur</th>
                      <th style={styles.th}>⏰ Début</th>
                      <th style={styles.th}>⏰ Fin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productions.map((p, index) => (
                      <tr key={p.id} style={index % 2 === 0 ? {background: "#fff"} : {background: "#f8fafc"}}>
                        <td style={styles.td}>{p.machine}</td>
                        <td style={styles.td}>{ofs.find(o => o.id === p.of_id)?.name || p.of_id}</td>
                        <td style={styles.td}>{p.fibre}</td>
                        <td style={styles.td}>{p.quantite} kg</td>
                        <td style={styles.td}>{p.operateur}</td>
                        <td style={styles.td}>{p.debut}</td>
                        <td style={styles.td}>{p.fin}</td>
                      </tr>
                    ))}
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