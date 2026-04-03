import React, { useState } from "react";
import {
  Search,
  LayoutDashboard,
  Cpu,
  Calendar,
  Package,
  Wrench,
  BarChart3,
  Settings,
  Users,
  Truck,
  AlertCircle,
  TrendingUp,
  Activity,
  Clock,
  Zap,
  UserCircle,
  Shield,
  Bell,
  Database,
  Mail,
  Phone,
  MapPin,
  Edit2,
  Trash2,
  Plus,
  Filter,
  Download,
  ChevronRight,
  MoreVertical,
  LogOut
} from "lucide-react";

// ✅ Import des composants MES
import Production from "../components/dashboard/Production";
import OrdresFabrication from "../components/dashboard/OrdresFabrication";
import Tracabilite from "../components/dashboard/Traceability";

// ✅ Import du module utilisateur séparé
import UserManagement from "./UserManagement";

// Fonction de déconnexion
const handleLogout = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userData');
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('userData');
  window.location.href = '/login';
};

const MESDashboard = () => {
  const [activeModule, setActiveModule] = useState("mes");
  const [activeERPModule, setActiveERPModule] = useState("production");
  const [activeMESTab, setActiveMESTab] = useState("tableau-de-bord");
  const [showERPMenu, setShowERPMenu] = useState(true);
  const [hoveredModule, setHoveredModule] = useState(null);

  const handleERPClick = () => {
    setActiveModule("erp");
    setShowERPMenu(true);
  };

  const handleMESClick = () => {
    setActiveModule("mes");
    setActiveMESTab("tableau-de-bord");
  };

  const handleUserClick = () => {
    setActiveModule("users");
  };

  const handleERPModuleClick = (module) => {
    setActiveERPModule(module);
  };

  const renderERPContent = () => {
    switch(activeERPModule) {
      case "production":
        return (
          <div className="mes-card animate-fadeIn">
            <h2 style={{marginBottom:"16px", color:"#1e293b"}}>
              📊 Gestion de Production ERP
            </h2>
            </div>
          
        );
      case "stock":
        return (
          <div className="mes-card animate-fadeIn">
            <h2 style={{marginBottom:"16px", color:"#1e293b"}}>
              📦 Gestion des Stocks
            </h2>
            <p>Gestion des inventaires et des mouvements de stock</p>
          </div>
        );
      case "maintenance":
        return (
          <div className="mes-card animate-fadeIn">
            <h2 style={{marginBottom:"16px", color:"#1e293b"}}>
              🔧 Gestion de Maintenance
            </h2>
            <p>Planification et suivi des interventions de maintenance</p>
          </div>
        );
      case "reporting":
        return (
          <div className="mes-card animate-fadeIn">
            <h2 style={{marginBottom:"16px", color:"#1e293b"}}>
              📈 Reporting & Analyses
            </h2>
            <p>Tableaux de bord et analyses de performance</p>
          </div>
        );
      default:
        return null;
    }
  };

  const mesModules = [
    { id: "tableau-de-bord", label: "Tableau de bord", icon: <LayoutDashboard size={20} />, description: "Vue d'ensemble" },
    { id: "machines", label: "Machines", icon: <Cpu size={20} />, description: "Supervision" },
    { id: "ordres", label: "Ordres", icon: <Package size={20} />, description: "Fabrication" },
    { id: "suivi", label: "Suivi", icon: <Activity size={20} />, description: "Production" },
    { id: "tracabilites", label: "Traçabilité", icon: <Database size={20} />, description: "Qualité" }
  ];

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Inter', 'Segoe UI', sans-serif;
        }

        body {
          background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
        }

        /* Animations */
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

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 5px rgba(59,130,246,0.2);
          }
          50% {
            box-shadow: 0 0 20px rgba(59,130,246,0.4);
          }
        }

        @keyframes rotateIcon {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }

        .animate-slideInLeft {
          animation: slideInLeft 0.5s ease-out;
        }

        .animate-slideInRight {
          animation: slideInRight 0.5s ease-out;
        }

        .mes-container {
          display: flex;
          height: 100vh;
          background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
          overflow: hidden;
        }

        /* Sidebar améliorée */
        .mes-sidebar {
          width: 280px;
          background: linear-gradient(180deg, #0f172a 0%, #020617 100%);
          backdrop-filter: blur(10px);
          color: white;
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          position: relative;
          transition: all 0.3s ease;
        }

        .mes-sidebar::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 20% 50%, rgba(59,130,246,0.1) 0%, transparent 50%);
          pointer-events: none;
        }

        .mes-logo {
          margin-bottom: 32px;
          padding: 0 12px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(59,130,246,0.3);
          position: relative;
          animation: slideInLeft 0.5s ease-out;
        }

        .mes-logo h2 {
          font-size: 26px;
          font-weight: 800;
          background: linear-gradient(135deg, #60a5fa, #3b82f6, #2563eb);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.5px;
        }

        .mes-logo p {
          font-size: 11px;
          color: #64748b;
          margin-top: 6px;
          letter-spacing: 1px;
        }

        .mes-nav {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
        }

        .mes-nav-section {
          margin-bottom: 8px;
        }

        .mes-nav-section-title {
          font-size: 11px;
          color: #475569;
          padding: 8px 16px;
          letter-spacing: 1px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .mes-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: #94a3b8;
          font-size: 14px;
          font-weight: 500;
          position: relative;
          overflow: hidden;
        }

        .mes-nav-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(59,130,246,0.2), transparent);
          transition: left 0.5s ease;
        }

        .mes-nav-item:hover::before {
          left: 100%;
        }

        .mes-nav-item:hover {
          background: rgba(59,130,246,0.15);
          color: white;
          transform: translateX(4px) scale(1.02);
        }

        .mes-nav-item.active {
          background: linear-gradient(90deg, #2563eb, #3b82f6);
          color: white;
          box-shadow: 0 4px 15px rgba(37,99,235,0.3);
          animation: glow 2s infinite;
        }

        .erp-submenu {
          margin-left: 32px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 8px;
          margin-bottom: 8px;
          animation: slideInRight 0.3s ease-out;
        }

        .erp-submenu-item {
          padding: 8px 12px;
          cursor: pointer;
          font-size: 13px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 8px;
          transition: all 0.3s ease;
          position: relative;
        }

        .erp-submenu-item:hover {
          color: #60a5fa;
          background: rgba(59,130,246,0.1);
          transform: translateX(6px);
        }

        .erp-submenu-item.active {
          background: rgba(59,130,246,0.2);
          color: #60a5fa;
          border-left: 2px solid #3b82f6;
        }

        /* Bouton déconnexion amélioré */
        .sidebar-footer {
          margin-top: auto;
          padding-top: 20px;
          border-top: 1px solid rgba(59,130,246,0.2);
        }

        .logout-sidebar-button {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          background: linear-gradient(135deg, rgba(239,68,68,0.2), rgba(220,38,38,0.15));
          border: 1px solid rgba(239,68,68,0.4);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: #fca5a5;
          font-size: 14px;
          font-weight: 600;
          position: relative;
          overflow: hidden;
        }

        .logout-sidebar-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          transition: left 0.5s ease;
        }

        .logout-sidebar-button:hover::before {
          left: 100%;
        }

        .logout-sidebar-button:hover {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border-color: #ef4444;
          color: white;
          transform: translateX(4px) scale(1.02);
          box-shadow: 0 4px 20px rgba(239,68,68,0.4);
        }

        .logout-sidebar-button:active {
          transform: translateX(4px) scale(0.98);
        }

        .logout-sidebar-button svg {
          transition: transform 0.3s ease;
        }

        .logout-sidebar-button:hover svg {
          transform: translateX(3px);
        }

        /* Main content */
        .mes-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        /* Header amélioré */
        .mes-header {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(10px);
          padding: 16px 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(59,130,246,0.2);
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          animation: slideInRight 0.5s ease-out;
        }

        .mes-search {
          display: flex;
          align-items: center;
          background: #f8fafc;
          padding: 8px 18px;
          border-radius: 30px;
          gap: 12px;
          width: 340px;
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
        }

        .mes-search:hover,
        .mes-search:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59,130,246,0.1);
          transform: scale(1.02);
        }

        .mes-search input {
          border: none;
          outline: none;
          background: transparent;
          width: 100%;
          font-size: 14px;
        }

        .mes-date {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: #475569;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          padding: 8px 20px;
          border-radius: 30px;
          font-weight: 500;
          border: 1px solid #e2e8f0;
        }

        /* Title section améliorée */
        .mes-title-section {
          background: linear-gradient(135deg, #1e3a8a, #1e40af, #2563eb);
          padding: 32px 35px;
          color: white;
          position: relative;
          overflow: hidden;
          animation: slideInLeft 0.5s ease-out;
        }

        .mes-title-section::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: pulse 8s infinite;
        }

        .mes-title-section h1 {
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 10px;
          letter-spacing: -0.5px;
          position: relative;
          z-index: 1;
        }

        .mes-title-section p {
          opacity: 0.9;
          font-size: 14px;
          font-weight: 500;
          position: relative;
          z-index: 1;
        }

        /* Modules MES améliorés */
        .mes-modules-container {
          background: white;
          padding: 20px 30px;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          animation: fadeIn 0.6s ease-out;
        }

        .mes-modules-grid {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .mes-module-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 28px;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.34, 1.2, 0.64, 1);
          background: white;
          border: 2px solid #e2e8f0;
          position: relative;
          overflow: hidden;
        }

        .mes-module-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          opacity: 0;
          transition: opacity 0.4s ease;
          z-index: 0;
        }

        .mes-module-card:hover {
          transform: translateY(-5px) scale(1.02);
          border-color: #3b82f6;
          box-shadow: 0 12px 30px rgba(59,130,246,0.25);
        }

        .mes-module-card.active {
          border-color: #3b82f6;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          box-shadow: 0 12px 30px rgba(59,130,246,0.35);
          transform: scale(1.02);
        }

        .mes-module-card.active::before {
          opacity: 1;
        }

        .module-icon {
          font-size: 22px;
          transition: all 0.4s ease;
          color: #3b82f6;
          position: relative;
          z-index: 1;
        }

        .mes-module-card:hover .module-icon {
          transform: rotate(10deg) scale(1.1);
        }

        .mes-module-card.active .module-icon {
          color: white;
          filter: drop-shadow(0 2px 6px rgba(0,0,0,0.2));
          animation: rotateIcon 0.5s ease;
        }

        .module-content {
          position: relative;
          z-index: 1;
        }

        .module-label {
          font-size: 14px;
          font-weight: 700;
          transition: all 0.3s ease;
          color: #1e293b;
        }

        .module-description {
          font-size: 11px;
          color: #64748b;
          margin-top: 3px;
          transition: all 0.3s ease;
          font-weight: 500;
        }

        .mes-module-card.active .module-label {
          color: white;
        }

        .mes-module-card.active .module-description {
          color: rgba(255,255,255,0.85);
        }

        .mes-module-card:hover .module-label {
          color: #3b82f6;
        }

        .mes-module-card.active:hover .module-label {
          color: white;
        }

        /* Content area */
        .mes-content {
          padding: 35px;
          flex: 1;
          overflow-y: auto;
          background: #f8fafc;
        }

        /* Cards améliorées */
        .mes-card {
          background: white;
          border-radius: 24px;
          padding: 35px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          transition: all 0.4s cubic-bezier(0.34, 1.2, 0.64, 1);
          animation: fadeIn 0.5s ease-out;
          border: 1px solid rgba(59,130,246,0.1);
        }

        .mes-card:hover {
          box-shadow: 0 12px 35px rgba(0,0,0,0.12);
          transform: translateY(-4px);
          border-color: rgba(59,130,246,0.2);
        }

        /* Scrollbar personnalisée */
        .mes-sidebar::-webkit-scrollbar,
        .mes-content::-webkit-scrollbar {
          width: 6px;
        }

        .mes-sidebar::-webkit-scrollbar-track {
          background: #1e293b;
          border-radius: 10px;
        }

        .mes-sidebar::-webkit-scrollbar-thumb {
          background: #3b82f6;
          border-radius: 10px;
        }

        .mes-content::-webkit-scrollbar-track {
          background: #e2e8f0;
          border-radius: 10px;
        }

        .mes-content::-webkit-scrollbar-thumb {
          background: #3b82f6;
          border-radius: 10px;
        }

        .mes-content::-webkit-scrollbar-thumb:hover {
          background: #2563eb;
        }
      `}</style>

      <div className="mes-container">
        {/* SIDEBAR */}
        <aside className="mes-sidebar">
          <div className="mes-logo">
            <h2>ERP-MES System</h2>
            <p>Industrie 4.0 intégrée</p>
          </div>

          <nav className="mes-nav">
            {/* SECTION ERP */}
            <div className="mes-nav-section">
              <div
                className={`mes-nav-item ${activeModule === "erp" ? "active" : ""}`}
                onClick={handleERPClick}
              >
                <LayoutDashboard size={18} />
                <span>Gestion Production</span>
              </div>

              {activeModule === "erp" && (
                <div className="erp-submenu">
                  <div 
                    className={`erp-submenu-item ${activeERPModule === "production" ? "active" : ""}`}
                    onClick={() => handleERPModuleClick("production")}
                  >
                    <TrendingUp size={14}/> Production
                  </div>
                  <div 
                    className={`erp-submenu-item ${activeERPModule === "stock" ? "active" : ""}`}
                    onClick={() => handleERPModuleClick("stock")}
                  >
                    <Package size={14}/> Stock
                  </div>
                  <div 
                    className={`erp-submenu-item ${activeERPModule === "maintenance" ? "active" : ""}`}
                    onClick={() => handleERPModuleClick("maintenance")}
                  >
                    <Wrench size={14}/> Maintenance
                  </div>
                  <div 
                    className={`erp-submenu-item ${activeERPModule === "reporting" ? "active" : ""}`}
                    onClick={() => handleERPModuleClick("reporting")}
                  >
                    <BarChart3 size={14}/> Reporting
                  </div>
                </div>
              )}
            </div>

            {/* SECTION MES */}
            <div className="mes-nav-section">
              <div
                className={`mes-nav-item ${activeModule === "mes" ? "active" : ""}`}
                onClick={handleMESClick}
              >
                <Cpu size={18} />
                <span>Exécution Production</span>
              </div>
            </div>

            {/* SECTION USER MANAGEMENT */}
            <div className="mes-nav-section">
              <div
                className={`mes-nav-item ${activeModule === "users" ? "active" : ""}`}
                onClick={handleUserClick}
              >
                <Users size={18} />
                <span>Gestion Utilisateurs</span>
              </div>
            </div>
          </nav>

          {/* SECTION DÉCONNEXION */}
          <div className="sidebar-footer">
            <button className="logout-sidebar-button" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Déconnexion</span>
            </button>
          </div>
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
              <span>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </header>

          {/* TITLE & CONTENT */}
          {activeModule === "erp" ? (
            <>
              <div className="mes-title-section">
                <h1>Système ERP - Gestion de production</h1>
                <p>Planification et gestion des ressources</p>
              </div>
              <div className="mes-content">
                {renderERPContent()}
              </div>
            </>
          ) : activeModule === "users" ? (
            <>
              <div className="mes-title-section">
                <h1>Gestion des Utilisateurs</h1>
                <p>Administration des accès, rôles et permissions • Sécurité et conformité</p>
              </div>
              <div className="mes-content">
                <UserManagement />
              </div>
            </>
          ) : (
            <>
              <div className="mes-title-section">
                <h1>Atelier de Production Industrielle</h1>
                <p>Exécution de la Production</p>
              </div>

              {/* DESIGN AMÉLIORÉ POUR LES MODULES MES */}
              <div className="mes-modules-container">
                <div className="mes-modules-grid">
                  {mesModules.map(module => (
                    <div
                      key={module.id}
                      className={`mes-module-card ${activeMESTab === module.id ? "active" : ""}`}
                      onClick={() => setActiveMESTab(module.id)}
                      onMouseEnter={() => setHoveredModule(module.id)}
                      onMouseLeave={() => setHoveredModule(null)}
                    >
                      <div className="module-icon">{module.icon}</div>
                      <div className="module-content">
                        <div className="module-label">{module.label}</div>
                        <div className="module-description">{module.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CONTENU MES */}
              <div className="mes-content">
                {activeMESTab === "tableau-de-bord" && (
                  <div className="mes-card">
                    <h2 style={{marginBottom:"16px", color:"#1e293b", display:"flex", alignItems:"center", gap:"12px"}}>
                      <LayoutDashboard size={24} color="#3b82f6" />
                      📊 Tableau de bord MES
                    </h2>
                    <p style={{color:"#64748b"}}>Indicateurs de performance en temps réel</p>
                    
                  </div>
                )}
                {activeMESTab === "machines" && (
                  <div className="mes-card">
                    <h2 style={{marginBottom:"16px", color:"#1e293b", display:"flex", alignItems:"center", gap:"12px"}}>
                      <Cpu size={24} color="#3b82f6" />
                      🏭 Gestion des Machines
                    </h2>
                    <p>Supervision des équipements industriels en temps réel</p>
                  </div>
                )}
                {activeMESTab === "ordres" && <OrdresFabrication />}
                {activeMESTab === "suivi" && <Production />}
                {activeMESTab === "tracabilites" && <Tracabilite />}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default MESDashboard;