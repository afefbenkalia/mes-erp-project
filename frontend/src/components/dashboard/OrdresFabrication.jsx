import React, { useState, useEffect } from "react";
import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000/ordres-fabrication";
const PROD_URL = "http://127.0.0.1:8000/productions";

const OrdresFabrication = () => {
  const [ofs, setOfs] = useState([]);
  const [activeTab, setActiveTab] = useState("creation");

const [formOF, setFormOF] = useState({
  numero: "",
  machine: "",
  produit: "",
  quantite: "",
  date_debut: "",
  date_fin: ""
});

  const machines = ["Carde 01", "Carde 02", "Carde 03", "Carde 04", "Carde 05"];
  const produits = ["Ruban coton", "Ruban polyester", "Ruban laine"];

  // États pour filtres et recherche
  const [filterMachine, setFilterMachine] = useState("");
  const [filterOF, setFilterOF] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    fetchOF();

    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(styleSheet);
  }, []);

  // Fonction pour calculer le statut selon les productions liées
  const computeStatut = (of) => {
    if (!of.productions || of.productions.length === 0) return "Planifié";

    const totalQty = Number(of.quantite);
    const producedQty = of.productions.reduce((sum, p) => sum + Number(p.quantite), 0);

    if (producedQty >= totalQty) return "Terminé";

    const inProgress = of.productions.some(p => p.statut === "En cours");
    if (inProgress || producedQty > 0) return "En cours";

    return "Planifié";
  };

  const fetchOF = async () => {
    try {
      const res = await axios.get(BASE_URL);
      const ofsData = res.data;

      // Récupérer les productions pour chaque OF et calculer le statut
      const ofsWithStatus = await Promise.all(
        ofsData.map(async (of) => {
          try {
            const prodRes = await axios.get(`${PROD_URL}?of_id=${of.id}`);
            of.productions = prodRes.data;
          } catch (err) {
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

    if (formOF.quantite <= 0) {
      alert("La quantité doit être supérieure à 0");
      return;
    }
    if (formOF.date_fin < formOF.date_debut) {
      alert("La date de fin doit être après la date de début");
      return;
    }

    try {
      const res = await axios.post(BASE_URL, formOF);

      if (res.status === 200 || res.status === 201) {
        const newOF = res.data;
        newOF.productions = [];
        newOF.statut = computeStatut(newOF);
        setOfs([...ofs, newOF]);
        setFormOF({
          numero: "",
          machine: "",
          produit: "",
          quantite: "",
          date_debut: "",
          date_fin: "",
          statut: "Planifié"
        });
      }
    } catch (err) {
      alert("Erreur création OF");
      console.error(err);
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

  // Styles - Design préservé
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
    }
  };

  return (
    <div style={styles.container}>
      {/* HEADER AVEC STATUT ET DATE */}
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
            Système Actif
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
          <span style={styles.tabIcon}>➕</span> Créer OF
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
          <span style={styles.tabIcon}>📋</span> Liste OF
        </button>
      </div>

      {/* CONTENU */}
      <div style={styles.content}>
        {/* ONGLET CRÉATION */}
        {activeTab === "creation" && (
          <div style={styles.formCard}>
            <h2 style={styles.formTitle}>Nouvel Ordre de Fabrication</h2>
            <form onSubmit={handleCreateOF} style={styles.form}>
              <div style={styles.formGrid}>
                <input 
                  style={styles.input} 
                  placeholder="Numéro OF" 
                  value={formOF.numero} 
                  onChange={e => setFormOF({ ...formOF, numero: e.target.value })} 
                  required 
                />
                <select 
                  style={styles.select} 
                  value={formOF.machine} 
                  onChange={e => setFormOF({ ...formOF, machine: e.target.value })} 
                  required
                >
                  <option value="">Sélectionner machine</option>
                  {machines.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select 
                  style={styles.select} 
                  value={formOF.produit} 
                  onChange={e => setFormOF({ ...formOF, produit: e.target.value })} 
                  required
                >
                  <option value="">Sélectionner produit</option>
                  {produits.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input 
                  style={styles.input} 
                  type="number" 
                  placeholder="Quantité" 
                  value={formOF.quantite} 
                  onChange={e => setFormOF({ ...formOF, quantite: e.target.value })} 
                  required 
                />
                <input 
                  style={styles.input} 
                  type="date" 
                  value={formOF.date_debut} 
                  onChange={e => setFormOF({ ...formOF, date_debut: e.target.value })} 
                  required 
                />
                <input 
                  style={styles.input} 
                  type="date" 
                  value={formOF.date_fin} 
                  onChange={e => setFormOF({ ...formOF, date_fin: e.target.value })} 
                  required 
                />
              </div>
              <div style={styles.buttonContainer}>
                <button type="submit" style={styles.primaryBtn}>
                  <span style={styles.btnIcon}>➕</span> Créer Ordre de Fabrication
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ONGLET LISTE */}
        {activeTab === "liste" && (
          <div style={styles.formCard}>
            <h2 style={styles.formTitle}>Liste des Ordres de Fabrication</h2>

            {/* FILTRES */}
            <div style={{display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap"}}>
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
                <option value="Planifié">Planifié</option>
                <option value="En cours">En cours</option>
                <option value="Terminé">Terminé</option>
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