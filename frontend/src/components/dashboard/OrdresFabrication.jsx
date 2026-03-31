import React, { useState, useEffect } from "react";
import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000/ordres-fabrication";
const PROD_URL = "http://127.0.0.1:8000/productions";

// Données OF pour la sélection
const ofOptions = [
  { id: 1, name: "OF-2024-001" },
  { id: 2, name: "OF-2024-002" },
  { id: 3, name: "OF-2024-003" },
  { id: 4, name: "OF-2024-004" },
  { id: 5, name: "OF-2024-005" }
];

const OrdresFabrication = () => {
  const [ofs, setOfs] = useState([]);
  const [activeTab, setActiveTab] = useState("creation");
  
  // 🔹 état ERP
  const [erpDisponible, setErpDisponible] = useState(true);
  
  const [formOF, setFormOF] = useState({
    numero: "",
    machine: "",
    produit: "",
    quantite: "",
    date_debut: "",
    date_fin: "",
    source: "MES"
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const machines = ["Carde 01", "Carde 02", "Carde 03", "Carde 04", "Carde 05"];
  const produits = ["Ruban coton", "Ruban polyester", "Ruban laine"];
  
  // États pour filtres - 4 filtres horizontaux
  const [filterMachine, setFilterMachine] = useState("");
  const [filterOF, setFilterOF] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [filterDate, setFilterDate] = useState("");
  
  useEffect(() => {
    fetchOF();
    
    const checkERP = async () => {
      try {
        await axios.get("http://127.0.0.1:8000/erp-status");
        setErpDisponible(true);
      } catch {
        setErpDisponible(false);
      }
    };
    checkERP();
    
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      .error-shake {
        animation: shake 0.5s;
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }
    `;
    document.head.appendChild(styleSheet);
  }, []);
  
  // Fonction de sélection d'OF
  const handleOFSelect = (e) => {
    const selectedName = e.target.value;
    setFormOF({
      ...formOF,
      numero: selectedName
    });
    // Effacer l'erreur si elle existe
    if (formErrors.numero) {
      setFormErrors({ ...formErrors, numero: "" });
    }
  };
  
  // Validation du formulaire
  const validateForm = () => {
    const errors = {};
    
    if (!formOF.numero) {
      errors.numero = "Veuillez sélectionner un OF";
    }
    
    if (!formOF.machine) {
      errors.machine = "Veuillez sélectionner une machine";
    }
    
    if (!formOF.produit) {
      errors.produit = "Veuillez sélectionner un produit";
    }
    
    if (!formOF.quantite || formOF.quantite <= 0) {
      errors.quantite = "La quantité doit être supérieure à 0";
    }
    
    if (!formOF.date_debut) {
      errors.date_debut = "Veuillez sélectionner une date de début";
    }
    
    if (!formOF.date_fin) {
      errors.date_fin = "Veuillez sélectionner une date de fin";
    } else if (formOF.date_fin < formOF.date_debut) {
      errors.date_fin = "La date de fin doit être après la date de début";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Fonction pour calculer le statut selon les productions liées
  const computeStatut = (of) => {
    if (!of.productions || of.productions.length === 0) return "Planifié";
    const totalQty = Number(of.quantite);
    const producedQty = of.productions.reduce((sum, p) => sum + Number(p.quantite), 0);
    if (producedQty >= totalQty) return "Terminé";
    if (producedQty > 0) return "En cours";
    return "Planifié";
  };
  
  const fetchOF = async () => {
    try {
      const res = await axios.get(BASE_URL);
      const ofsData = res.data;
      
      const ofsWithStatus = await Promise.all(
        ofsData.map(async (of) => {
          try {
            const prodRes = await axios.get(`${PROD_URL}?of_id=${of.id}`);
            of.productions = prodRes.data;
          } catch {
            of.productions = [];
          }
          of.statut = computeStatut(of);
          return of;
        })
      );
      setOfs(ofsWithStatus);
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleCreateOF = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Faire défiler jusqu'au premier champ en erreur
      const firstError = document.querySelector(".error-field");
      if (firstError) {
        firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    
    if (erpDisponible) {
      alert("Les OF sont envoyés par l'ERP");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const res = await axios.post(BASE_URL, {
        ...formOF,
        source: "MES"
      });
      
      if (res.status === 200 || res.status === 201) {
        const newOF = res.data;
        newOF.productions = [];
        newOF.statut = computeStatut(newOF);
        setOfs([...ofs, newOF]);
        
        // Réinitialiser le formulaire
        setFormOF({
          numero: "",
          machine: "",
          produit: "",
          quantite: "",
          date_debut: "",
          date_fin: "",
          source: "MES"
        });
        
        // Afficher un message de succès
        alert("✅ OF créé avec succès !");
        
        // Optionnel : basculer vers l'onglet liste
        // setActiveTab("liste");
      }
    } catch (error) {
      console.error("Erreur création OF:", error);
      alert("❌ Erreur lors de la création de l'OF");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getStatutColor = (statut) => {
    if (statut === "Planifié") return "#3b82f6";
    if (statut === "En cours") return "#f59e0b";
    if (statut === "Terminé") return "#10b981";
    return "#94a3b8";
  };
  
  const totalOF = ofs.length;
  const ofActif = ofs.filter(o => o.statut === "En cours").length;
  const ofTermine = ofs.filter(o => o.statut === "Terminé").length;
  
  const filteredOFs = ofs.filter(o =>
    (filterMachine ? o.machine === filterMachine : true) &&
    (filterOF ? o.numero.toLowerCase().includes(filterOF.toLowerCase()) : true) &&
    (filterStatut ? o.statut === filterStatut : true) &&
    (filterDate ? o.date_debut === filterDate : true)
  );
  
  const getCurrentDate = () => {
    const days = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
    const months = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    const date = new Date();
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };
  
  // Styles améliorés pour le formulaire
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
      padding: "0.5rem 1.2rem",
      borderRadius: "30px",
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      background: erpDisponible ? "#dcfce7" : "#fee2e2",
      color: erpDisponible ? "#166534" : "#991b1b"
    },
    statusDot: {
      width: "8px",
      height: "8px",
      background: erpDisponible ? "#22c55e" : "#ef4444",
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
      gap: "1rem",
      transition: "transform 0.2s, box-shadow 0.2s",
      cursor: "pointer",
      ":hover": {
        transform: "translateY(-2px)",
        boxShadow: "0 6px 12px -2px rgba(0,0,0,0.15)"
      }
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
      margin: "0 0 0.5rem 0",
      color: "#0f172a",
      fontSize: "1.3rem",
      fontWeight: "600"
    },
    formSubtitle: {
      margin: "0 0 1.5rem 0",
      color: "#64748b",
      fontSize: "0.9rem",
      borderBottom: "1px solid #e2e8f0",
      paddingBottom: "0.75rem"
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "1.5rem"
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: "1.5rem"
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem"
    },
    label: {
      fontSize: "0.85rem",
      fontWeight: "600",
      color: "#334155",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem"
    },
    requiredStar: {
      color: "#ef4444",
      fontSize: "0.8rem"
    },
    input: {
      padding: "0.75rem 1rem",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      fontSize: "0.95rem",
      outline: "none",
      transition: "all 0.2s",
      width: "100%",
      boxSizing: "border-box",
      background: "#fff"
    },
    inputFocus: {
      borderColor: "#2563eb",
      boxShadow: "0 0 0 3px rgba(37,99,235,0.1)"
    },
    inputError: {
      borderColor: "#ef4444",
      background: "#fef2f2"
    },
    select: {
      padding: "0.75rem 1rem",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      fontSize: "0.95rem",
      outline: "none",
      background: "#fff",
      cursor: "pointer",
      width: "100%",
      boxSizing: "border-box",
      transition: "all 0.2s"
    },
    errorMessage: {
      color: "#ef4444",
      fontSize: "0.75rem",
      marginTop: "0.25rem",
      display: "flex",
      alignItems: "center",
      gap: "0.25rem"
    },
    buttonContainer: {
      display: "flex",
      gap: "1rem",
      marginTop: "1rem",
      paddingTop: "1rem",
      borderTop: "1px solid #e2e8f0"
    },
    primaryBtn: {
      background: "#2563eb",
      color: "#fff",
      padding: "0.75rem 1.5rem",
      border: "none",
      borderRadius: "8px",
      fontSize: "0.95rem",
      fontWeight: "500",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem",
      transition: "all 0.2s",
      flex: 1
    },
    secondaryBtn: {
      background: "#f1f5f9",
      color: "#475569",
      padding: "0.75rem 1.5rem",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      fontSize: "0.95rem",
      fontWeight: "500",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem",
      transition: "all 0.2s"
    },
    disabledBtn: {
      background: "#94a3b8",
      color: "#fff",
      padding: "0.75rem 1.5rem",
      border: "none",
      borderRadius: "8px",
      fontSize: "0.95rem",
      fontWeight: "500",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem",
      cursor: "not-allowed",
      opacity: 0.7,
      flex: 1
    },
    btnIcon: {
      fontSize: "1.1rem"
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
      fontSize: "0.85rem",
      fontWeight: "500"
    },
    sourceTag: {
      background: "#dbeafe",
      color: "#1e40af",
      padding: "0.25rem 0.5rem",
      borderRadius: "4px",
      fontSize: "0.85rem",
      fontWeight: "500"
    },
    statutBadge: {
      padding: "0.25rem 0.75rem",
      borderRadius: "20px",
      color: "#fff",
      fontSize: "0.85rem",
      fontWeight: "500",
      display: "inline-block"
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
    },
    alertMessage: {
      color: "#ef4444",
      fontSize: "0.9rem",
      marginTop: "0.5rem",
      padding: "0.75rem",
      background: "#fef2f2",
      borderRadius: "8px",
      borderLeft: "3px solid #ef4444",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem"
    },
    successMessage: {
      color: "#10b981",
      fontSize: "0.9rem",
      marginTop: "0.5rem",
      padding: "0.75rem",
      background: "#f0fdf4",
      borderRadius: "8px",
      borderLeft: "3px solid #10b981",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem"
    },
    filterContainer: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "1rem",
      marginBottom: "2rem"
    },
    infoTooltip: {
      fontSize: "0.75rem",
      color: "#94a3b8",
      marginTop: "0.25rem"
    }
  };
  
  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>📋</span>
          <div>
            <h1 style={styles.title}>MES – ORDRES DE FABRICATION</h1>
            <p style={styles.subtitle}>Module Planification • Version 2.0</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.status}>
            <span style={styles.statusDot}></span>
            {erpDisponible ? "ERP connecté" : "Mode manuel MES"}
          </div>
          <div style={styles.date}>{getCurrentDate()}</div>
        </div>
      </div>
      
      {/* KPI CARDS */}
      <div style={styles.kpiGrid}>
        <div style={{...styles.kpiCard, borderLeft: '4px solid #2563eb'}}>
          <div style={styles.kpiIcon}>📊</div>
          <div>
            <p style={styles.kpiLabel}>Total OF</p>
            <p style={styles.kpiValue}>{totalOF}</p>
          </div>
        </div>
        <div style={{...styles.kpiCard, borderLeft: '4px solid #f59e0b'}}>
          <div style={styles.kpiIcon}>⚙️</div>
          <div>
            <p style={styles.kpiLabel}>En cours</p>
            <p style={styles.kpiValue}>{ofActif}</p>
          </div>
        </div>
        <div style={{...styles.kpiCard, borderLeft: '4px solid #10b981'}}>
          <div style={styles.kpiIcon}>✅</div>
          <div>
            <p style={styles.kpiLabel}>Terminés</p>
            <p style={styles.kpiValue}>{ofTermine}</p>
          </div>
        </div>
      </div>
      
      {/* TABS */}
      <div style={styles.tabs}>
        <button 
          style={{
            ...styles.tabButton,
            background: activeTab === "creation" ? "#1e293b" : "#fff",
            color: activeTab === "creation" ? "#fff" : "#64748b",
            border: activeTab === "creation" ? 'none' : '1px solid #e2e8f0'
          }}
          onClick={() => setActiveTab("creation")}
        >
          <span style={styles.tabIcon}>➕</span>
          Créer OF
        </button>
        <button 
          style={{
            ...styles.tabButton,
            background: activeTab === "liste" ? "#1e293b" : "#fff",
            color: activeTab === "liste" ? "#fff" : "#64748b",
            border: activeTab === "liste" ? 'none' : '1px solid #e2e8f0'
          }}
          onClick={() => setActiveTab("liste")}
        >
          <span style={styles.tabIcon}>📋</span>
          Liste OF
        </button>
      </div>
      
      {/* CONTENU */}
      <div style={styles.content}>
        {/* ONGLET CRÉATION - FORMULAIRE AMÉLIORÉ */}
        {activeTab === "creation" && (
          <div style={styles.formCard}>
            <h2 style={styles.formTitle}>Nouvel Ordre de Fabrication</h2>
            <p style={styles.formSubtitle}>
              Renseignez les informations ci-dessous pour créer un nouvel ordre de fabrication
            </p>
            
            <form onSubmit={handleCreateOF} style={styles.form}>
              <div style={styles.formGrid}>
                {/* Sélecteur OF */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    📌 Ordre de Fabrication
                    <span style={styles.requiredStar}>*</span>
                  </label>
                  <select
                    style={{
                      ...styles.select,
                      ...(formErrors.numero ? styles.inputError : {})
                    }}
                    value={formOF.numero}
                    onChange={handleOFSelect}
                    required
                    disabled={erpDisponible}
                    className={formErrors.numero ? "error-field" : ""}
                  >
                    <option value="">Sélectionner un OF</option>
                    {ofOptions.map(of => (
                      <option key={of.id} value={of.name}>
                        {of.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.numero && (
                    <div style={styles.errorMessage}>
                      ⚠️ {formErrors.numero}
                    </div>
                  )}
                </div>
                
                {/* Machine */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    🏭 Machine
                    <span style={styles.requiredStar}>*</span>
                  </label>
                  <select
                    style={{
                      ...styles.select,
                      ...(formErrors.machine ? styles.inputError : {})
                    }}
                    value={formOF.machine}
                    onChange={e => {
                      setFormOF({ ...formOF, machine: e.target.value });
                      if (formErrors.machine) setFormErrors({ ...formErrors, machine: "" });
                    }}
                    required
                    disabled={erpDisponible}
                    className={formErrors.machine ? "error-field" : ""}
                  >
                    <option value="">Sélectionner une machine</option>
                    {machines.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {formErrors.machine && (
                    <div style={styles.errorMessage}>
                      ⚠️ {formErrors.machine}
                    </div>
                  )}
                </div>
                
                {/* Produit */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    🧵 Produit
                    <span style={styles.requiredStar}>*</span>
                  </label>
                  <select
                    style={{
                      ...styles.select,
                      ...(formErrors.produit ? styles.inputError : {})
                    }}
                    value={formOF.produit}
                    onChange={e => {
                      setFormOF({ ...formOF, produit: e.target.value });
                      if (formErrors.produit) setFormErrors({ ...formErrors, produit: "" });
                    }}
                    required
                    disabled={erpDisponible}
                    className={formErrors.produit ? "error-field" : ""}
                  >
                    <option value="">Sélectionner un produit</option>
                    {produits.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {formErrors.produit && (
                    <div style={styles.errorMessage}>
                      ⚠️ {formErrors.produit}
                    </div>
                  )}
                </div>
                
                {/* Quantité */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    ⚖️ Quantité (kg)
                    <span style={styles.requiredStar}>*</span>
                  </label>
                  <input
                    style={{
                      ...styles.input,
                      ...(formErrors.quantite ? styles.inputError : {})
                    }}
                    type="number"
                    placeholder="Ex: 1000"
                    value={formOF.quantite}
                    onChange={e => {
                      setFormOF({ ...formOF, quantite: e.target.value });
                      if (formErrors.quantite) setFormErrors({ ...formErrors, quantite: "" });
                    }}
                    required
                    disabled={erpDisponible}
                    className={formErrors.quantite ? "error-field" : ""}
                  />
                  {formErrors.quantite && (
                    <div style={styles.errorMessage}>
                      ⚠️ {formErrors.quantite}
                    </div>
                  )}
                  <div style={styles.infoTooltip}>Quantité en kilogrammes (kg)</div>
                </div>
                
                {/* Date début */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    📅 Date de début
                    <span style={styles.requiredStar}>*</span>
                  </label>
                  <input
                    style={{
                      ...styles.input,
                      ...(formErrors.date_debut ? styles.inputError : {})
                    }}
                    type="date"
                    value={formOF.date_debut}
                    onChange={e => {
                      setFormOF({ ...formOF, date_debut: e.target.value });
                      if (formErrors.date_debut) setFormErrors({ ...formErrors, date_debut: "" });
                    }}
                    required
                    disabled={erpDisponible}
                    className={formErrors.date_debut ? "error-field" : ""}
                  />
                  {formErrors.date_debut && (
                    <div style={styles.errorMessage}>
                      ⚠️ {formErrors.date_debut}
                    </div>
                  )}
                </div>
                
                {/* Date fin */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    📅 Date de fin
                    <span style={styles.requiredStar}>*</span>
                  </label>
                  <input
                    style={{
                      ...styles.input,
                      ...(formErrors.date_fin ? styles.inputError : {})
                    }}
                    type="date"
                    value={formOF.date_fin}
                    onChange={e => {
                      setFormOF({ ...formOF, date_fin: e.target.value });
                      if (formErrors.date_fin) setFormErrors({ ...formErrors, date_fin: "" });
                    }}
                    required
                    disabled={erpDisponible}
                    className={formErrors.date_fin ? "error-field" : ""}
                  />
                  {formErrors.date_fin && (
                    <div style={styles.errorMessage}>
                      ⚠️ {formErrors.date_fin}
                    </div>
                  )}
                </div>
              </div>
              
              <div style={styles.buttonContainer}>
                <button
                  type="button"
                  style={styles.secondaryBtn}
                  onClick={() => {
                    setFormOF({
                      numero: "",
                      machine: "",
                      produit: "",
                      quantite: "",
                      date_debut: "",
                      date_fin: "",
                      source: "MES"
                    });
                    setFormErrors({});
                  }}
                  disabled={erpDisponible || isSubmitting}
                >
                  🗑️ Réinitialiser
                </button>
                <button
                  type="submit"
                  style={erpDisponible ? styles.disabledBtn : styles.primaryBtn}
                  disabled={erpDisponible || isSubmitting}
                >
                  <span style={styles.btnIcon}>
                    {isSubmitting ? "⏳" : "✅"}
                  </span>
                  {isSubmitting ? "Création en cours..." : "Créer l'OF"}
                </button>
              </div>
              
              {erpDisponible && (
                <div style={styles.alertMessage}>
                  ⚠️ Création désactivée : Les OF sont envoyés par l'ERP
                </div>
              )}
            </form>
          </div>
        )}
        
        {/* ONGLET LISTE - 4 FILTRES SUR LA MÊME LIGNE HORIZONTALE */}
        {activeTab === "liste" && (
          <div style={styles.formCard}>
            <h2 style={styles.formTitle}>Liste des Ordres de Fabrication</h2>
            
            {/* 4 FILTRES EN HORIZONTALE */}
            <div style={styles.filterContainer}>
              <select
                style={styles.select}
                value={filterMachine}
                onChange={e => setFilterMachine(e.target.value)}
              >
                <option value="">Toutes les machines</option>
                {machines.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              
              <input
                style={styles.input}
                type="text"
                placeholder="Recherche OF"
                value={filterOF}
                onChange={e => setFilterOF(e.target.value)}
              />
              
              <select
                style={styles.select}
                value={filterStatut}
                onChange={e => setFilterStatut(e.target.value)}
              >
                <option value="">Tous statuts</option>
                <option value="Planifié">📅 Planifié</option>
                <option value="En cours">⚙️ En cours</option>
                <option value="Terminé">✅ Terminé</option>
              </select>
              
              <input
                style={styles.input}
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
              />
            </div>
            
            {filteredOFs.length > 0 ? (
              <div style={{overflowX: "auto"}}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>OF</th>
                      <th style={styles.th}>Machine</th>
                      <th style={styles.th}>Produit</th>
                      <th style={styles.th}>Quantité</th>
                      <th style={styles.th}>Début</th>
                      <th style={styles.th}>Fin</th>
                      <th style={styles.th}>Source</th>
                      <th style={styles.th}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOFs.map((o, index) => (
                      <tr key={o.id || index} style={index % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                        <td style={styles.td}><span style={styles.ofTag}>{o.numero}</span></td>
                        <td style={styles.td}>{o.machine}</td>
                        <td style={styles.td}>{o.produit}</td>
                        <td style={styles.td}>{o.quantite} kg</td>
                        <td style={styles.td}>{o.date_debut}</td>
                        <td style={styles.td}>{o.date_fin}</td>
                        <td style={styles.td}>
                          <span style={styles.sourceTag}>
                            {o.source || "ERP"}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.statutBadge,
                            background: getStatutColor(o.statut)
                          }}>
                            {o.statut}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>📭</span>
                <p>Aucun ordre de fabrication</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdresFabrication;