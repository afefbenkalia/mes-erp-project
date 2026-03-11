import React, { useState } from "react";
import {
  Search,
  LayoutDashboard,
  Cpu,
  Calendar,
  Package,
  Wrench,
  BarChart3
} from "lucide-react";

// ✅ Import des composants
import Production from "../components/dashboard/Production";
import OrdresFabrication from "../components/dashboard/OrdresFabrication";

const MESDashboard = () => {
  const [activeModule, setActiveModule] = useState("mes");
  const [showERPMenu, setShowERPMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("tableau-de-bord");

  const handleERPClick = () => {
    setActiveModule("erp");
    setShowERPMenu(!showERPMenu);
  };

  return (
    <>
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; font-family: 'Inter','Segoe UI',sans-serif; }
        body { background-color:#f3f4f6; }

        .mes-container { display:flex; height:100vh; background-color:#f3f4f6; }

        .mes-sidebar {
          width:260px;
          background:linear-gradient(180deg,#1e293b 0%,#0f172a 100%);
          color:white;
          padding:24px 16px;
          display:flex;
          flex-direction:column;
        }

        .mes-logo { margin-bottom:32px; padding:0 12px; }
        .mes-logo h2 { font-size:24px; font-weight:700; }
        .mes-logo p { font-size:12px; color:#94a3b8; }

        .mes-nav { display:flex; flex-direction:column; gap:4px; }

        .mes-nav-item {
          display:flex;
          align-items:center;
          gap:12px;
          padding:12px 16px;
          border-radius:10px;
          cursor:pointer;
          transition:0.2s;
          color:#cbd5e1;
          font-size:14px;
        }

        .mes-nav-item:hover { background:#334155; color:white; }
        .mes-nav-item.active {
          background:linear-gradient(90deg,#2563eb,#3b82f6);
          color:white;
        }

        .erp-submenu {
          margin-left:32px;
          display:flex;
          flex-direction:column;
          gap:4px;
        }

        .erp-submenu-item {
          padding:8px 12px;
          cursor:pointer;
          font-size:13px;
          color:#b0bec5;
        }

        .erp-submenu-item:hover { color:white; }

        .mes-main { flex:1; display:flex; flex-direction:column; }

        .mes-header {
          background:white;
          padding:16px 30px;
          display:flex;
          justify-content:space-between;
          align-items:center;
          border-bottom:1px solid #e5e7eb;
        }

        .mes-search {
          display:flex;
          align-items:center;
          background:#f8fafc;
          padding:8px 16px;
          border-radius:30px;
          gap:10px;
          width:300px;
        }

        .mes-search input {
          border:none;
          outline:none;
          background:transparent;
          width:100%;
        }

        .mes-date {
          display:flex;
          align-items:center;
          gap:8px;
          font-size:14px;
        }

        .mes-title-section {
          background:linear-gradient(90deg,#2563eb,#3b82f6);
          padding:24px 30px;
          color:white;
        }

        .mes-dashboard-nav {
          background:white;
          padding:0 30px;
          display:flex;
          gap:24px;
          border-bottom:1px solid #e0e0e0;
        }

        .mes-dashboard-nav-item {
          padding:14px 0;
          cursor:pointer;
          font-size:14px;
          color:#64748b;
          border-bottom:2px solid transparent;
        }

        .mes-dashboard-nav-item.active {
          color:#2563eb;
          border-bottom-color:#2563eb;
        }

        .mes-content { padding:30px; flex:1; }

        .mes-card {
          background:white;
          padding:40px;
          border-radius:12px;
          text-align:center;
          color:#6b7280;
        }
      `}</style>

      <div className="mes-container">

        {/* SIDEBAR */}
        <aside className="mes-sidebar">
          <div className="mes-logo">
            <h2>ERP-MES System</h2>
            <p>Gestion intégrée</p>
          </div>

          <nav className="mes-nav">
            <div
              className={`mes-nav-item ${activeModule === "erp" ? "active" : ""}`}
              onClick={handleERPClick}
            >
              <LayoutDashboard size={18} />
              <span>ERP System</span>
            </div>

            {showERPMenu && (
              <div className="erp-submenu">
                <div className="erp-submenu-item"><Cpu size={16}/> Production</div>
                <div className="erp-submenu-item"><Package size={16}/> Stock</div>
                <div className="erp-submenu-item"><Wrench size={16}/> Maintenance</div>
                <div className="erp-submenu-item"><BarChart3 size={16}/> Reporting</div>
              </div>
            )}

            <div
              className={`mes-nav-item ${activeModule === "mes" ? "active" : ""}`}
              onClick={() => {
                setActiveModule("mes");
                setShowERPMenu(false);
              }}
            >
              <Cpu size={18} />
              <span>MES Production</span>
            </div>
          </nav>
        </aside>

        {/* MAIN */}
        <div className="mes-main">

          {/* HEADER */}
          <header className="mes-header">
            <div className="mes-search">
              <Search size={18} />
              <input type="text" placeholder="Rechercher..." />
            </div>

            <div className="mes-date">
              <Calendar size={16} />
              <span>Dimanche, 28 février 2026</span>
            </div>
          </header>

          {/* TITLE */}
          <div className="mes-title-section">
            <h1>Système MES - Atelier de Production</h1>
            <p>Manufacturing Execution System</p>
          </div>

          {/* NAV TABS */}
          <div className="mes-dashboard-nav">
            <span
              className={`mes-dashboard-nav-item ${activeTab === "tableau-de-bord" ? "active" : ""}`}
              onClick={() => setActiveTab("tableau-de-bord")}
            >
              Tableau de bord
            </span>
            <span
              className={`mes-dashboard-nav-item ${activeTab === "machines" ? "active" : ""}`}
              onClick={() => setActiveTab("machines")}
            >
              Machines
            </span>
            <span
              className={`mes-dashboard-nav-item ${activeTab === "ordres" ? "active" : ""}`}
              onClick={() => setActiveTab("ordres")}
            >
              Ordres de fabrication
            </span>
            <span
              className={`mes-dashboard-nav-item ${activeTab === "suivi" ? "active" : ""}`}
              onClick={() => setActiveTab("suivi")}
            >
              Suivi production
            </span>
            <span
              className={`mes-dashboard-nav-item ${activeTab === "arrets" ? "active" : ""}`}
              onClick={() => setActiveTab("arrets")}
            >
              Arrêts & Pannes
            </span>
            <span
              className={`mes-dashboard-nav-item ${activeTab === "performance" ? "active" : ""}`}
              onClick={() => setActiveTab("performance")}
            >
              Performance (TRS)
            </span>
            <span
              className={`mes-dashboard-nav-item ${activeTab === "tracabilites" ? "active" : ""}`}
              onClick={() => setActiveTab("tracabilites")}
            >
              Traçabilités
            </span>
          </div>

          {/* CONTENT */}
          <div className="mes-content">
            {activeTab === "ordres" ? (
              <OrdresFabrication />
            ) : activeTab === "suivi" ? (
              <Production />
            ) : (
              <div className="mes-card">
                <h2 style={{marginBottom:"16px", color:"#1e293b"}}>
                  {activeTab === "tableau-de-bord" && "Tableau de bord MES"}
                  {activeTab === "machines" && "Gestion des Machines"}
                  {activeTab === "arrets" && "Arrêts & Pannes"}
                  {activeTab === "performance" && "Performance TRS"}
                  {activeTab === "tracabilites" && "Traçabilités"}
                </h2>
                <p>Contenu à personnaliser</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MESDashboard;