import React, { useState, useEffect } from "react";
import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000/productions";

const Production = () => {
  const [activeTab, setActiveTab] = useState("production");

  const [productions, setProductions] = useState([]);
  const [rebuts, setRebuts] = useState([]);
  const [tempsMachine, setTempsMachine] = useState([]);

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
  },[]);

  // =========================
  // HANDLERS
  // =========================

  const handleProduction = async (e)=>{
    e.preventDefault();
    try{
      const res = await axios.post(BASE_URL,formProd);
      setProductions([...productions,res.data]);
      setFormProd({machine:"",of_id:"",fibre:"",quantite:"",operateur:"",debut:"",fin:""});
    }catch(err){
      alert("Erreur enregistrement production");
      console.error(err);
    }
  };

  const handleRebut = async (e)=>{
    e.preventDefault();
    try{
      const res = await axios.post(`${BASE_URL}/rebuts`, formRebut);
      setRebuts([...rebuts,res.data]);
      setFormRebut({machine:"",production_id:"",defaut:"",quantite:""});
    }catch(err){
      alert("Erreur rebut");
      console.error(err);
    }
  };

  const handleTemps = async (e)=>{
    e.preventDefault();
    try{
      const res = await axios.post(`${BASE_URL}/temps`, formTemps);
      setTempsMachine([...tempsMachine,res.data]);
      setFormTemps({machine:"",fonctionnement:"",arret:""});
    }catch(err){
      alert("Erreur temps machine");
      console.error(err);
    }
  };

  // =========================
  // DESIGN
  // =========================

  const styles = {
    container:{padding:"2rem",background:"#f8fafc",minHeight:"100vh",fontFamily:"Inter"},
    header:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"2rem",background:"#fff",padding:"1.5rem 2rem",borderRadius:"16px",boxShadow:"0 4px 6px rgba(0,0,0,0.1)"},
    logo:{display:"flex",alignItems:"center",gap:"1rem"},
    logoIcon:{fontSize:"2.5rem"},
    title:{margin:0,fontSize:"1.8rem"},
    subtitle:{margin:0,color:"#64748b"},
    kpiGrid:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem",marginBottom:"2rem"},
    kpiCard:{background:"#fff",padding:"1.5rem",borderRadius:"12px",display:"flex",gap:"1rem"},
    tabs:{display:"flex",gap:"1rem",marginBottom:"2rem"},
    tabButton:{padding:"0.7rem 1.2rem",borderRadius:"8px",border:"none",cursor:"pointer"},
    content:{background:"#fff",padding:"2rem",borderRadius:"16px"},
    formGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"1rem"},
    input:{padding:"0.7rem",border:"1px solid #ddd",borderRadius:"8px"},
    select:{padding:"0.7rem",border:"1px solid #ddd",borderRadius:"8px"},
    btn:{background:"#2563eb",color:"#fff",padding:"0.7rem 1.5rem",border:"none",borderRadius:"8px",cursor:"pointer"}
  };

  return(
    <div style={styles.container}>

      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🏭</span>
          <div>
            <h1 style={styles.title}>MES – ATELIER CARDAGE</h1>
            <p style={styles.subtitle}>Module Suivi Production</p>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}><div>📦</div><div>Production Totale<h2>{totalProd} kg</h2></div></div>
        <div style={styles.kpiCard}><div>⚠️</div><div>Rebuts<h2>{totalRebut} kg</h2></div></div>
        <div style={styles.kpiCard}><div>✅</div><div>Qualité<h2>{tauxQualite}%</h2></div></div>
      </div>

      {/* TABS */}
      <div style={styles.tabs}>
        <button style={styles.tabButton} onClick={()=>setActiveTab("production")}>Production</button>
        <button style={styles.tabButton} onClick={()=>setActiveTab("rebuts")}>Rebuts</button>
        <button style={styles.tabButton} onClick={()=>setActiveTab("temps")}>Temps</button>
        <button style={styles.tabButton} onClick={()=>setActiveTab("historique")}>Historique</button>
      </div>

      <div style={styles.content}>

        {/* FORM PRODUCTION */}
        {activeTab === "production" && (
          <form onSubmit={handleProduction}>
            <div style={styles.formGrid}>
              <select style={styles.select} value={formProd.machine} onChange={(e)=>setFormProd({...formProd,machine:e.target.value})} required>
                <option value="">Machine</option>
                {machines.map(m=><option key={m} value={m}>{m}</option>)}
              </select>

              <select style={styles.select} value={formProd.of_id} onChange={(e)=>setFormProd({...formProd,of_id:e.target.value})} required>
                <option value="">OF</option>
                {ofs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
              </select>

              <select style={styles.select} value={formProd.fibre} onChange={(e)=>setFormProd({...formProd,fibre:e.target.value})} required>
                <option value="">Fibre</option>
                {typesFibre.map(f=><option key={f} value={f}>{f}</option>)}
              </select>

              <input style={styles.input} type="number" placeholder="Quantité" value={formProd.quantite} onChange={(e)=>setFormProd({...formProd,quantite:e.target.value})} required/>
              <select style={styles.select} value={formProd.operateur} onChange={(e)=>setFormProd({...formProd,operateur:e.target.value})} required>
                <option value="">Opérateur</option>
                {operateurs.map(op=><option key={op} value={op}>{op}</option>)}
              </select>
              <input style={styles.input} type="time" value={formProd.debut} onChange={(e)=>setFormProd({...formProd,debut:e.target.value})} required/>
              <input style={styles.input} type="time" value={formProd.fin} onChange={(e)=>setFormProd({...formProd,fin:e.target.value})} required/>
            </div>
            <br/>
            <button style={styles.btn}>Enregistrer</button>
          </form>
        )}

        {/* FORM REBUT */}
         {activeTab==="rebuts" && (
          <form onSubmit={handleRebut}>
            <div style={styles.formGrid}>
              <select style={styles.select} value={formRebut.machine} onChange={(e)=>setFormRebut({...formRebut,machine:e.target.value})} required>
                <option value="">Machine</option>
                {machines.map(m=><option key={m} value={m}>{m}</option>)}
              </select>

              <select style={styles.select} value={formRebut.production_id} onChange={(e)=>setFormRebut({...formRebut,production_id:e.target.value})} required>
                <option value="">Production</option>
                {productions.map(p=><option key={p.id} value={p.id}>{p.machine} - {p.fibre} - {p.quantite} kg</option>)}
              </select>

              <select style={styles.select} value={formRebut.defaut} onChange={(e)=>setFormRebut({...formRebut,defaut:e.target.value})} required>
                <option value="">Défaut</option>
                {typesDefaut.map(d=><option key={d} value={d}>{d}</option>)}
              </select>

              <input style={styles.input} type="number" placeholder="Quantité" value={formRebut.quantite} onChange={(e)=>setFormRebut({...formRebut,quantite:e.target.value})} required/>
            </div>
            <br/>
            <button style={styles.btn}>Enregistrer Rebut</button>
          </form>
        )}

        {/* FORM TEMPS MACHINE */}
        {activeTab==="temps" && (
          <form onSubmit={handleTemps}>
            <div style={styles.formGrid}>
              <select style={styles.select} value={formTemps.machine} onChange={(e)=>setFormTemps({...formTemps,machine:e.target.value})} required>
                <option value="">Machine</option>
                {machines.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
              <input style={styles.input} type="number" placeholder="Fonctionnement (min)" value={formTemps.fonctionnement} onChange={(e)=>setFormTemps({...formTemps,fonctionnement:e.target.value})} required/>
              <input style={styles.input} type="number" placeholder="Arrêt (min)" value={formTemps.arret} onChange={(e)=>setFormTemps({...formTemps,arret:e.target.value})} required/>
            </div>
            <br/>
            <button style={styles.btn}>Enregistrer Temps</button>
          </form>
        )}

        {/* HISTORIQUE */}
        {activeTab === "historique" && (
          <table width="100%">
            <thead>
              <tr>
                <th>Machine</th>
                <th>OF</th>
                <th>Fibre</th>
                <th>Quantité</th>
                <th>Opérateur</th>
                <th>Début</th>
                <th>Fin</th>
              </tr>
            </thead>
            <tbody>
              {productions.map(p=>(
                <tr key={p.id}>
                  <td>{p.machine}</td>
                  <td>{ofs.find(o => o.id === p.of_id)?.name || p.of_id}</td>
                  <td>{p.fibre}</td>
                  <td>{p.quantite}</td>
                  <td>{p.operateur}</td>
                  <td>{p.debut}</td>
                  <td>{p.fin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>
    </div>
  );
};

export default Production;