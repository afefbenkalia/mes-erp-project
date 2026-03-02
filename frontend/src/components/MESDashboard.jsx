import React, { useState } from "react";
import {
  Search,
  LayoutDashboard,
  Cpu,
  Calendar,
  ChevronRight,
  Package,
  Wrench,
  BarChart3,
  Activity,
  AlertOctagon,
  TrendingUp,
  Clock,
  Settings,
  QrCode,
  ClipboardList
} from "lucide-react";

const MESDashboard = () => {
  const [activeModule, setActiveModule] = useState('mes');
  const [showERPMenu, setShowERPMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('tableau-de-bord');

  const handleERPClick = () => {
    setActiveModule('erp');
    setShowERPMenu(!showERPMenu);
  };

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
          background-color: #f3f4f6;
        }

        .mes-container {
          display: flex;
          height: 100vh;
          background-color: #f3f4f6;
        }

        /* SIDEBAR */
        .mes-sidebar {
          width: 260px;
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          color: white;
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          box-shadow: 2px 0 10px rgba(0,0,0,0.1);
        }

        .mes-logo {
          margin-bottom: 32px;
          padding: 0 12px;
        }

        .mes-logo h2 {
          font-size: 24px;
          font-weight: 700;
          background: linear-gradient(135deg, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .mes-logo p {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 4px;
        }

        .mes-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .mes-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          color: #cbd5e1;
          font-size: 14px;
          font-weight: 500;
        }

        .mes-nav-item:hover {
          background-color: #334155;
          color: white;
          transform: translateX(4px);
        }

        .mes-nav-item.active {
          background: linear-gradient(90deg, #2563eb, #3b82f6);
          color: white;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .nav-arrow {
          margin-left: auto;
          transition: transform 0.3s;
        }

        .nav-arrow.rotated {
          transform: rotate(90deg);
        }

        /* ERP SUBMENU */
        .erp-submenu {
          margin-left: 32px;
          margin-top: 4px;
          margin-bottom: 4px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .erp-submenu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          color: #b0bec5;
          font-size: 13px;
        }

        .erp-submenu-item:hover {
          background-color: rgba(255,255,255,0.1);
          color: white;
          padding-left: 20px;
        }

        /* MAIN */
        .mes-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          background: #f8fafc;
        }

        /* HEADER */
        .mes-header {
          background: white;
          padding: 16px 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e5e7eb;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }

        .mes-search {
          display: flex;
          align-items: center;
          background: #f8fafc;
          padding: 10px 16px;
          border-radius: 30px;
          width: 350px;
          gap: 10px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }

        .mes-search:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }

        .mes-search input {
          border: none;
          outline: none;
          background: transparent;
          width: 100%;
          font-size: 14px;
        }

        .mes-search input::placeholder {
          color: #94a3b8;
        }

        .mes-date {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #1e293b;
          font-size: 14px;
          font-weight: 500;
          background: #f8fafc;
          padding: 8px 16px;
          border-radius: 30px;
          border: 1px solid #e2e8f0;
        }

        /* TITLE SECTION - Barre bleue */
        .mes-title-section {
          background: linear-gradient(90deg, #2563eb, #3b82f6);
          padding: 24px 30px;
          color: white;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .mes-title-section h1 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 4px;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .mes-title-section p {
          font-size: 14px;
          opacity: 0.95;
        }

        /* DASHBOARD NAV - Design comme dans la photo avec Traçabilités */
        .mes-dashboard-nav {
          background: white;
          padding: 0 30px;
          display: flex;
          gap: 24px;
          border-bottom: 1px solid #e0e0e0;
          overflow-x: auto;
        }

        .mes-dashboard-nav-item {
          padding: 14px 0;
          color: #64748b;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
          letter-spacing: 0.3px;
          white-space: nowrap;
        }

        .mes-dashboard-nav-item:hover {
          color: #2563eb;
          border-bottom-color: #2563eb;
        }

        .mes-dashboard-nav-item.active {
          color: #2563eb;
          border-bottom-color: #2563eb;
          font-weight: 600;
        }

        /* CONTENT */
        .mes-content {
          padding: 30px;
          flex: 1;
        }

        .mes-card {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
          text-align: center;
          color: #6b7280;
        }

        /* RESPONSIVE */
        @media (max-width: 900px) {
          .mes-sidebar {
            width: 80px;
          }
          .mes-nav-item span,
          .mes-logo p,
          .mes-logo h2,
          .erp-submenu-item span {
            display: none;
          }
          .mes-dashboard-nav {
            gap: 16px;
            padding: 0 15px;
          }
        }
      `}</style>

      <div className="mes-container">
        {/* Sidebar */}
        <aside className="mes-sidebar">
          <div className="mes-logo">
            <h2>ERP-MES System</h2>
            <p>Gestion intégrée</p>
          </div>

          <nav className="mes-nav">
            {/* ERP System avec sous-menu */}
            <div>
              <div 
                className={`mes-nav-item ${activeModule === 'erp' ? 'active' : ''}`}
                onClick={handleERPClick}
              >
                <LayoutDashboard size={18} />
                <span>ERP System</span>
                <ChevronRight size={16} className={`nav-arrow ${showERPMenu ? 'rotated' : ''}`} />
              </div>
              
              {showERPMenu && (
                <div className="erp-submenu">
                  <div className="erp-submenu-item">
                    <Cpu size={16} />
                    <span>Production</span>
                  </div>
                  <div className="erp-submenu-item">
                    <Package size={16} />
                    <span>Stock</span>
                  </div>
                  <div className="erp-submenu-item">
                    <Wrench size={16} />
                    <span>Maintenance</span>
                  </div>
                  <div className="erp-submenu-item">
                    <BarChart3 size={16} />
                    <span>Reporting</span>
                  </div>
                </div>
              )}
            </div>

            {/* MES Production */}
            <div 
              className={`mes-nav-item ${activeModule === 'mes' ? 'active' : ''}`}
              onClick={() => {
                setActiveModule('mes');
                setShowERPMenu(false);
              }}
            >
              <Cpu size={18} />
              <span>MES Production</span>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="mes-main">
          {/* Header */}
          <header className="mes-header">
            <div className="mes-search">
              <Search size={18} color="#64748b" />
              <input type="text" placeholder="Rechercher des commandes, clients, produits..." />
            </div>

            <div className="mes-date">
              <Calendar size={16} />
              <span>Dimanche, 28 février 2026</span>
            </div>
          </header>

          {/* Title - Barre bleue */}
          <div className="mes-title-section">
            <h1>Système MES - Atelier de Production</h1>
            <p>Manufacturing Execution System • Gestion complète de l'atelier</p>
          </div>

          {/* Dashboard Navigation - 7 éléments avec soulignement bleu */}
          <div className="mes-dashboard-nav">
            <span 
              className={`mes-dashboard-nav-item ${activeTab === 'tableau-de-bord' ? 'active' : ''}`}
              onClick={() => setActiveTab('tableau-de-bord')}
            >
              Tableau de bord
            </span>
            <span 
              className={`mes-dashboard-nav-item ${activeTab === 'machines' ? 'active' : ''}`}
              onClick={() => setActiveTab('machines')}
            >
              Machines
            </span>
            <span 
              className={`mes-dashboard-nav-item ${activeTab === 'ordres' ? 'active' : ''}`}
              onClick={() => setActiveTab('ordres')}
            >
              Ordres de fabrication
            </span>
            <span 
              className={`mes-dashboard-nav-item ${activeTab === 'suivi' ? 'active' : ''}`}
              onClick={() => setActiveTab('suivi')}
            >
              Suivi production
            </span>
            <span 
              className={`mes-dashboard-nav-item ${activeTab === 'arrets' ? 'active' : ''}`}
              onClick={() => setActiveTab('arrets')}
            >
              Arrêts & Pannes
            </span>
            <span 
              className={`mes-dashboard-nav-item ${activeTab === 'performance' ? 'active' : ''}`}
              onClick={() => setActiveTab('performance')}
            >
              Performance (TRS)
            </span>
            <span 
              className={`mes-dashboard-nav-item ${activeTab === 'tracabilites' ? 'active' : ''}`}
              onClick={() => setActiveTab('tracabilites')}
            >
              Traçabilités
            </span>
          </div>

          {/* Content */}
          <div className="mes-content">
            <div className="mes-card">
              <h2 style={{marginBottom: '16px', color: '#1e293b'}}>
                {activeTab === 'tableau-de-bord' && 'Tableau de bord MES'}
                {activeTab === 'machines' && 'Gestion des Machines'}
                {activeTab === 'ordres' && 'Ordres de Fabrication'}
                {activeTab === 'suivi' && 'Suivi de Production'}
                {activeTab === 'arrets' && 'Arrêts & Pannes'}
                {activeTab === 'performance' && 'Performance TRS'}
                {activeTab === 'tracabilites' && 'Traçabilités'}
              </h2>
              <p>Contenu à personnaliser</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MESDashboard;