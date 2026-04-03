import React, { useState, useEffect } from "react";
import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000/productions";

const Production = () => {
  const [activeTab, setActiveTab] = useState("production");
  const [productions, setProductions] = useState([]);
  const [rebuts, setRebuts] = useState([]);
  const [tempsMachine, setTempsMachine] = useState([]);

  const [formProd, setFormProd] = useState({ machine: "", of: "", fibre: "", quantite: "", operateur: "", debut: "", fin: "" });
  const [formRebut, setFormRebut] = useState({ machine: "", of: "", defaut: "", quantite: "" });
  const [formTemps, setFormTemps] = useState({ machine: "", fonctionnement: "", arret: "" });

  const machines = ["Carde 01", "Carde 02", "Carde 03", "Carde 04", "Carde 05"];
  const operateurs = ["Jean Dupont", "Marie Martin", "Pierre Durand", "Sophie Lefebvre", "Lucas Bernard"];
  const typesFibre = ["Coton", "Laine", "Polyester", "Acrylique", "Lin", "Soie"];
  const typesDefaut = ["Néppes", "Impuretés", "Casses", "Irrégularité", "Souillure", "Autre défaut"];
  const ofs = ["OF-2024-001","OF-2024-002","OF-2024-003","OF-2024-004","OF-2024-005"];

  // KPI calcul
  const totalProd = productions.reduce((acc,p)=>acc+Number(p.quantite||0),0);
  const totalRebut = rebuts.reduce((acc,r)=>acc+Number(r.quantite||0),0);
  const tauxQualite = totalProd ? (((totalProd-totalRebut)/totalProd)*100).toFixed(1):0;

  useEffect(()=>{
    const fetchProductions = async ()=>{
      try{
        const res = await axios.get(BASE_URL);
        setProductions(res.data);
      }catch(err){
        console.error(err);
      }
    }
    fetchProductions();
  },[]);

  const handleProduction = async (e)=>{
    e.preventDefault();
    try{
      const res = await axios.post(BASE_URL, formProd);
      if(res.status===200||res.status===201){
        setProductions([...productions, res.data]);
        setFormProd({ machine: "", of: "", fibre: "", quantite: "", operateur: "", debut: "", fin: "" });
      }
    }catch(err){
      alert("Erreur enregistrement production");
      console.error(err);
    }
  }

  const handleRebut = async (e)=>{
    e.preventDefault();
    try{
      const res = await axios.post(`${BASE_URL}/rebuts`, formRebut);
      if(res.status===200||res.status===201){
        setRebuts([...rebuts,res.data]);
        setFormRebut({ machine: "", of: "", defaut: "", quantite: "" });
      }
    }catch(err){
      alert("Erreur enregistrement rebut");
      console.error(err);
    }
  }

  const handleTemps = async (e)=>{
    e.preventDefault();
    try{
      const res = await axios.post(`${BASE_URL}/temps`, formTemps);
      if(res.status===200||res.status===201){
        setTempsMachine([...tempsMachine,res.data]);
        setFormTemps({ machine: "", fonctionnement: "", arret: "" });
      }
    }catch(err){
      alert("Erreur enregistrement temps");
      console.error(err);
    }
  }

  // === DESIGN AMÉLIORÉ ===
  const styles = {
    container: { 
      padding: "2rem", 
      background: "#f8fafc", 
      minHeight: "100vh", 
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" 
    },
    
    header: { 
      display: "flex", 
      justifyContent: "space-between", 
      alignItems: "center",
      marginBottom: "2rem",
      background: "#fff",
      padding: "1.5rem 2rem",
      borderRadius: "16px",
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"
    },
    
    logo: { 
      display: "flex", 
      alignItems: "center", 
      gap: "1rem" 
    },
    
    logoIcon: { 
      fontSize: "2.5rem" 
    },
    
    title: { 
      margin: 0, 
      color: "#0f172a",
      fontSize: "1.8rem",
      fontWeight: "600"
    },
    
    subtitle: { 
      margin: 0, 
      color: "#64748b",
      fontSize: "0.9rem"
    },
    
    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: "1.5rem"
    },
    
    status: { 
      background: "#dcfce7", 
      padding: "0.5rem 1.2rem", 
      borderRadius: "30px",
      color: "#166534",
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem"
    },
    
    statusDot: {
      width: "8px",
      height: "8px",
      background: "#22c55e",
      borderRadius: "50%",
      display: "inline-block"
    },
    
    date: {
      color: "#64748b",
      fontSize: "0.9rem",
      textTransform: "capitalize"
    },

    kpiGrid: { 
      display: "grid", 
      gridTemplateColumns: "repeat(3,1fr)", 
      gap: "1.5rem", 
      marginBottom: "2rem" 
    },
    
    kpiCard: { 
      background: "#fff", 
      padding: "1.5rem", 
      borderRadius: "12px", 
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
      display: "flex",
      alignItems: "center",
      gap: "1rem"
    },
    
    kpiIcon: {
      fontSize: "2rem",
      background: "#f1f5f9",
      padding: "0.75rem",
      borderRadius: "12px"
    },
    
    kpiLabel: {
      margin: "0 0 0.25rem 0",
      color: "#64748b",
      fontSize: "0.9rem",
      fontWeight: "500"
    },
    
    kpiValue: {
      margin: 0,
      fontSize: "1.8rem",
      fontWeight: "700",
      color: "#0f172a"
    },
    
    kpiUnit: {
      fontSize: "0.9rem",
      color: "#94a3b8",
      fontWeight: "400"
    },

    tabs: { 
      display: "flex", 
      gap: "1rem", 
      marginBottom: "2rem" 
    },
    
    tabButton: { 
      padding: "0.75rem 1.5rem", 
      border: "none", 
      cursor: "pointer", 
      borderRadius: "8px",
      fontSize: "0.95rem",
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      transition: "all 0.2s"
    },
    
    tabIcon: {
      fontSize: "1.1rem"
    },
    
    content: {
      background: "#fff",
      borderRadius: "16px",
      padding: "2rem",
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"
    },
    
    formCard: {
      animation: "fadeIn 0.3s ease"
    },
    
    formTitle: {
      margin: "0 0 1.5rem 0",
      color: "#0f172a",
      fontSize: "1.3rem",
      fontWeight: "600"
    },
    
    form: { 
      display: "flex",
      flexDirection: "column",
      gap: "1.5rem"
    },
    
    formGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "1rem"
    },
    
    formRow: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "1rem"
    },
    
    input: { 
      padding: "0.75rem 1rem", 
      border: "1px solid #e2e8f0", 
      borderRadius: "8px",
      fontSize: "0.95rem",
      outline: "none",
      transition: "border-color 0.2s"
    },
    
    select: {
      padding: "0.75rem 1rem", 
      border: "1px solid #e2e8f0", 
      borderRadius: "8px",
      fontSize: "0.95rem",
      outline: "none",
      background: "#fff",
      cursor: "pointer"
    },
    
    timeGroup: {
      display: "flex",
      gap: "0.5rem",
      gridColumn: "span 2"
    },

    buttonContainer: {
      marginTop: "1rem"
    },

    primaryBtn: { 
      background: "#2563eb", 
      color: "#fff", 
      padding: "0.75rem 1.5rem", 
      border: "none",
      borderRadius: "8px",
      fontSize: "1rem",
      fontWeight: "500",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem",
      transition: "background 0.2s"
    },
    
    warningBtn: { 
      background: "#f59e0b", 
      color: "#fff", 
      padding: "0.75rem 1.5rem", 
      border: "none",
      borderRadius: "8px",
      fontSize: "1rem",
      fontWeight: "500",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem"
    },
    
    secondaryBtn: { 
      background: "#0f766e", 
      color: "#fff", 
      padding: "0.75rem 1.5rem", 
      border: "none",
      borderRadius: "8px",
      fontSize: "1rem",
      fontWeight: "500",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem"
    },
    
    btnIcon: {
      fontSize: "1.2rem"
    },
    
    table: { 
      width: "100%", 
      borderCollapse: "collapse",
      fontSize: "0.95rem"
    },
    
    th: { 
      textAlign: "left",
      padding: "0.75rem",
      borderBottom: "2px solid #e2e8f0",
      color: "#64748b",
      fontWeight: "600"
    },
    
    td: { 
      padding: "0.75rem",
      borderBottom: "1px solid #e2e8f0",
      color: "#1e293b"
    },
    
    rowEven: {
      background: "#fff"
    },
    
    rowOdd: {
      background: "#f8fafc"
    },
    
    ofTag: {
      background: "#e2e8f0",
      padding: "0.25rem 0.5rem",
      borderRadius: "4px",
      fontSize: "0.85rem"
    },
    
    prodCell: {
      color: "#2563eb",
      fontWeight: "500"
    },
    
    rebutCell: {
      color: "#dc2626",
      fontWeight: "500"
    },
    
    emptyState: {
      textAlign: "center",
      padding: "3rem",
      color: "#94a3b8"
    },
    
    emptyIcon: {
      fontSize: "3rem",
      display: "block",
      marginBottom: "1rem"
    }
  };

  // Fonction pour formater la date
  const getCurrentDate = () => {
    const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const date = new Date();
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Ajout de l'animation
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(styleSheet);

  return (
    <div style={styles.container}>
      
      {/* HEADER AVEC STATUT ET DATE */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🏭</span>
          <div>
            <h1 style={styles.title}>MES – ATELIER CARDAGE</h1>
            <p style={styles.subtitle}>Module Suivi Production • Version 2.0</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.status}>
            <span style={styles.statusDot}></span>
            Système Actif
          </div>
          <div style={styles.date}>
            {getCurrentDate()}
          </div>
        </div>
      </div>

      {/* KPI CARDS AVEC COULEURS */}
      <div style={styles.kpiGrid}>
        <div style={{...styles.kpiCard, borderLeft: '4px solid #2563eb'}}>
          <div style={styles.kpiIcon}>📦</div>
          <div>
            <p style={styles.kpiLabel}>Production Totale</p>
            <p style={styles.kpiValue}>{totalProd} <span style={styles.kpiUnit}>kg</span></p>
          </div>
        </div>
        <div style={{...styles.kpiCard, borderLeft: '4px solid #dc2626'}}>
          <div style={styles.kpiIcon}>⚠️</div>
          <div>
            <p style={styles.kpiLabel}>Total Rebuts</p>
            <p style={styles.kpiValue}>{totalRebut} <span style={styles.kpiUnit}>kg</span></p>
          </div>
        </div>
        <div style={{...styles.kpiCard, borderLeft: '4px solid #16a34a'}}>
          <div style={styles.kpiIcon}>✅</div>
          <div>
            <p style={styles.kpiLabel}>Taux Qualité</p>
            <p style={styles.kpiValue}>{tauxQualite} <span style={styles.kpiUnit}>%</span></p>
          </div>
        </div>
      </div>

      {/* TABS AVEC ICÔNES */}
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab("production")}
          style={{
            ...styles.tabButton,
            background: activeTab === "production" ? "#1e293b" : "#fff",
            color: activeTab === "production" ? "#fff" : "#64748b",
            border: activeTab === "production" ? 'none' : '1px solid #e2e8f0'
          }}
        >
          <span style={styles.tabIcon}>⚙️</span>
          Production
        </button>
        <button
          onClick={() => setActiveTab("rebuts")}
          style={{
            ...styles.tabButton,
            background: activeTab === "rebuts" ? "#1e293b" : "#fff",
            color: activeTab === "rebuts" ? "#fff" : "#64748b",
            border: activeTab === "rebuts" ? 'none' : '1px solid #e2e8f0'
          }}
        >
          <span style={styles.tabIcon}>🗑️</span>
          Rebuts
        </button>
        <button
          onClick={() => setActiveTab("historique")}
          style={{
            ...styles.tabButton,
            background: activeTab === "historique" ? "#1e293b" : "#fff",
            color: activeTab === "historique" ? "#fff" : "#64748b",
            border: activeTab === "historique" ? 'none' : '1px solid #e2e8f0'
          }}
        >
          <span style={styles.tabIcon}>📊</span>
          Historique
        </button>
        <button
          onClick={() => setActiveTab("temps")}
          style={{
            ...styles.tabButton,
            background: activeTab === "temps" ? "#1e293b" : "#fff",
            color: activeTab === "temps" ? "#fff" : "#64748b",
            border: activeTab === "temps" ? 'none' : '1px solid #e2e8f0'
          }}
        >
          <span style={styles.tabIcon}>⏱️</span>
          Temps Machine
        </button>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div style={styles.content}>
        
        {/* === ONGLET PRODUCTION === */}
        {activeTab === "production" && (
          <div style={styles.formCard}>
            <h2 style={styles.formTitle}>Nouvelle Production</h2>
            <form onSubmit={handleProduction} style={styles.form}>
              <div style={styles.formGrid}>
                <select 
                  style={styles.select}
                  value={formProd.machine}
                  onChange={e=>setFormProd({...formProd, machine:e.target.value})}
                  required
                >
                  <option value="">Sélectionner une machine</option>
                  {machines.map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                <select 
                  style={styles.select}
                  value={formProd.of}
                  onChange={e=>setFormProd({...formProd, of:e.target.value})}
                  required
                >
                  <option value="">Sélectionner un OF</option>
                  {ofs.map(of => <option key={of} value={of}>{of}</option>)}
                </select>

                <select 
                  style={styles.select}
                  value={formProd.fibre}
                  onChange={e=>setFormProd({...formProd, fibre:e.target.value})}
                  required
                >
                  <option value="">Type de fibre</option>
                  {typesFibre.map(f => <option key={f} value={f}>{f}</option>)}
                </select>

                <input 
                  style={styles.input} 
                  type="number" 
                  placeholder="Quantité (kg)" 
                  value={formProd.quantite}
                  onChange={e=>setFormProd({...formProd, quantite:e.target.value})}
                  required
                />
              </div>

              <div style={styles.formRow}>
                <select 
                  style={styles.select}
                  value={formProd.operateur}
                  onChange={e=>setFormProd({...formProd, operateur:e.target.value})}
                  required
                >
                  <option value="">Sélectionner opérateur</option>
                  {operateurs.map(op => <option key={op} value={op}>{op}</option>)}
                </select>

                <input 
                  style={styles.input} 
                  type="time" 
                  value={formProd.debut}
                  onChange={e=>setFormProd({...formProd, debut:e.target.value})}
                  required
                />

                <input 
                  style={styles.input} 
                  type="time" 
                  value={formProd.fin}
                  onChange={e=>setFormProd({...formProd, fin:e.target.value})}
                  required
                />
              </div>

              <div style={styles.buttonContainer}>
                <button type="submit" style={styles.primaryBtn}>
                  <span style={styles.btnIcon}>➕</span>
                  Enregistrer Production
                </button>
              </div>
            </form>
          </div>
        )}

        {/* === ONGLET REBUTS === */}
        {activeTab === "rebuts" && (
          <div style={styles.formCard}>
            <h2 style={styles.formTitle}>Déclaration Rebut</h2>
            <form onSubmit={handleRebut} style={styles.form}>
              <div style={styles.formGrid}>
                <select 
                  style={styles.select}
                  value={formRebut.machine}
                  onChange={e=>setFormRebut({...formRebut, machine:e.target.value})}
                  required
                >
                  <option value="">Sélectionner une machine</option>
                  {machines.map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                <select 
                  style={styles.select}
                  value={formRebut.of}
                  onChange={e=>setFormRebut({...formRebut, of:e.target.value})}
                  required
                >
                  <option value="">Sélectionner un OF</option>
                  {ofs.map(of => <option key={of} value={of}>{of}</option>)}
                </select>

                <select 
                  style={styles.select}
                  value={formRebut.defaut}
                  onChange={e=>setFormRebut({...formRebut, defaut:e.target.value})}
                  required
                >
                  <option value="">Type de défaut</option>
                  {typesDefaut.map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                <input 
                  style={styles.input} 
                  type="number" 
                  placeholder="Quantité (kg)" 
                  value={formRebut.quantite}
                  onChange={e=>setFormRebut({...formRebut, quantite:e.target.value})}
                  required
                />
              </div>

              <div style={styles.buttonContainer}>
                <button type="submit" style={styles.warningBtn}>
                  <span style={styles.btnIcon}>⚠️</span>
                  Enregistrer Rebut
                </button>
              </div>
            </form>
          </div>
        )}

        {/* === ONGLET HISTORIQUE === */}
        {activeTab === "historique" && (
          <div style={styles.formCard}>
            <h2 style={styles.formTitle}>Historique Production</h2>
            {productions.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Machine</th>
                      <th style={styles.th}>OF</th>
                      <th style={styles.th}>Fibre</th>
                      <th style={styles.th}>Quantité</th>
                      <th style={styles.th}>Opérateur</th>
                      <th style={styles.th}>Début</th>
                      <th style={styles.th}>Fin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productions.map((p, i) => (
                      <tr key={i} style={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                        <td style={styles.td}>{p.machine}</td>
                        <td style={styles.td}><span style={styles.ofTag}>{p.of}</span></td>
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
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>📭</span>
                <p>Aucune production enregistrée</p>
              </div>
            )}
          </div>
        )}

        {/* === ONGLET TEMPS === */}
        {activeTab === "temps" && (
          <div style={styles.formCard}>
            <h2 style={styles.formTitle}>Suivi Temps Machine</h2>
            <form onSubmit={handleTemps} style={styles.form}>
              <div style={styles.formGrid}>
                <select 
                  style={styles.select}
                  value={formTemps.machine}
                  onChange={e=>setFormTemps({...formTemps, machine:e.target.value})}
                  required
                >
                  <option value="">Sélectionner une machine</option>
                  {machines.map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                <input 
                  style={styles.input} 
                  type="number" 
                  placeholder="Temps fonctionnement (min)" 
                  value={formTemps.fonctionnement}
                  onChange={e=>setFormTemps({...formTemps, fonctionnement:e.target.value})}
                  required
                />

                <input 
                  style={styles.input} 
                  type="number" 
                  placeholder="Temps arrêt (min)" 
                  value={formTemps.arret}
                  onChange={e=>setFormTemps({...formTemps, arret:e.target.value})}
                  required
                />
              </div>

              <div style={styles.buttonContainer}>
                <button type="submit" style={styles.secondaryBtn}>
                  <span style={styles.btnIcon}>⏱️</span>
                  Enregistrer Temps
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Production;