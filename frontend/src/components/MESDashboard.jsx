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
  MoreVertical
} from "lucide-react";

// ✅ Import des composants MES
import Production from "../components/dashboard/Production";
import OrdresFabrication from "../components/dashboard/OrdresFabrication";
import Tracabilite from "../components/dashboard/Traceability";

// ✅ Module utilisateur VIDE (sans données)
const UserManagement = () => {
  // Tableau vide au départ
  const [users, setUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [newUser, setNewUser] = useState({ 
    name: "", 
    email: "",
    phone: "",
    role: "Opérateur", 
    department: "Production", 
    status: "Actif" 
  });

  const handleAddUser = () => {
    if (newUser.name && newUser.email && newUser.role) {
      const newId = users.length + 1;
      const initials = newUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
      const newUserData = { 
        ...newUser, 
        id: newId, 
        avatar: initials.slice(0, 2),
        lastLogin: new Date().toLocaleString('fr-FR'),
        permissions: ["lecture"]
      };
      setUsers([...users, newUserData]);
      setNewUser({ name: "", email: "", phone: "", role: "Opérateur", department: "Production", status: "Actif" });
      setShowAddUser(false);
    }
  };

  const handleDeleteUser = (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
      setUsers(users.filter(user => user.id !== id));
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesStatus = filterStatus === "all" || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusColor = (status) => {
    return status === "Actif" ? "#10b981" : "#ef4444";
  };

  const getStatusBgColor = (status) => {
    return status === "Actif" ? "#d1fae5" : "#fee2e2";
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      "Opérateur": "#3b82f6",
      "Superviseur": "#8b5cf6",
      "Technicien": "#f59e0b",
      "Chef d'équipe": "#10b981",
      "Ingénieur": "#ec489a",
      "Responsable Qualité": "#06b6d4",
      "Admin": "#ef4444"
    };
    return colors[role] || "#6b7280";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Statistiques */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "20px"
      }}>
        <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "24px", borderRadius: "20px", color: "white" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ opacity: 0.9, fontSize: "14px" }}>Total Utilisateurs</p>
              <h2 style={{ fontSize: "36px", fontWeight: "bold", marginTop: "8px" }}>{users.length}</h2>
            </div>
            <Users size={48} style={{ opacity: 0.8 }} />
          </div>
        </div>
        <div style={{ background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", padding: "24px", borderRadius: "20px", color: "white" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ opacity: 0.9, fontSize: "14px" }}>Utilisateurs Actifs</p>
              <h2 style={{ fontSize: "36px", fontWeight: "bold", marginTop: "8px" }}>{users.filter(u => u.status === "Actif").length}</h2>
            </div>
            <Activity size={48} style={{ opacity: 0.8 }} />
          </div>
        </div>
        <div style={{ background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", padding: "24px", borderRadius: "20px", color: "white" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ opacity: 0.9, fontSize: "14px" }}>Rôles Différents</p>
              <h2 style={{ fontSize: "36px", fontWeight: "bold", marginTop: "8px" }}>{new Set(users.map(u => u.role)).size}</h2>
            </div>
            <Shield size={48} style={{ opacity: 0.8 }} />
          </div>
        </div>
      </div>

      {/* Filtres et actions */}
      <div style={{ 
        background: "white", 
        borderRadius: "16px", 
        padding: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", gap: "12px", flex: 1, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", background: "#f1f5f9", padding: "10px 16px", borderRadius: "12px", gap: "8px", flex: 1, minWidth: "200px" }}>
              <Search size={18} color="#64748b" />
              <input 
                type="text" 
                placeholder="Rechercher par nom, email ou rôle..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: "none", background: "transparent", outline: "none", fontSize: "14px", width: "100%" }}
                disabled={users.length === 0}
              />
            </div>
            <select 
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={{ padding: "10px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "white", outline: "none", cursor: "pointer" }}
              disabled={users.length === 0}
            >
              <option value="all">Tous les rôles</option>
              {[...new Set(users.map(u => u.role))].map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: "10px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "white", outline: "none", cursor: "pointer" }}
              disabled={users.length === 0}
            >
              <option value="all">Tous les statuts</option>
              <option value="Actif">Actif</option>
              <option value="Inactif">Inactif</option>
            </select>
          </div>
          <button 
            onClick={() => setShowAddUser(true)}
            style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              color: "white",
              border: "none",
              padding: "10px 24px",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.3s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            <Plus size={18} /> Ajouter utilisateur
          </button>
        </div>
      </div>

      {/* Tableau des utilisateurs */}
      <div style={{ 
        background: "white", 
        borderRadius: "20px", 
        overflow: "hidden", 
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid #e2e8f0"
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              <tr>
                {["Utilisateur", "Contact", "Rôle", "Département", "Statut", "Dernière connexion", "Actions"].map(header => (
                  <th key={header} style={{ padding: "16px 20px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#475569" }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} style={{ borderBottom: "1px solid #e2e8f0", transition: "background 0.2s" }} 
                    onMouseEnter={(e) => e.currentTarget.style.background = "#fafbff"} 
                    onMouseLeave={(e) => e.currentTarget.style.background = "white"}>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ 
                        width: "48px", 
                        height: "48px", 
                        background: `linear-gradient(135deg, ${getRoleBadgeColor(user.role)} 0%, ${getRoleBadgeColor(user.role)}cc 100%)`, 
                        borderRadius: "50%", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        color: "white", 
                        fontWeight: "bold",
                        fontSize: "16px"
                      }}>
                        {user.avatar}
                      </div>
                      <div>
                        <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "15px" }}>{user.name}</div>
                        <div style={{ fontSize: "12px", color: "#94a3b8" }}>ID: #{user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ fontSize: "13px", color: "#334155" }}>{user.email}</div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>{user.phone}</div>
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "600",
                      background: `${getRoleBadgeColor(user.role)}20`,
                      color: getRoleBadgeColor(user.role)
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: "16px 20px", color: "#334155", fontSize: "13px" }}>{user.department}</td>
                  <td style={{ padding: "16px 20px" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "600",
                      background: getStatusBgColor(user.status),
                      color: getStatusColor(user.status)
                    }}>
                      {user.status}
                    </span>
                  </td>
                  <td style={{ padding: "16px 20px", color: "#64748b", fontSize: "13px" }}>{user.lastLogin}</td>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        style={{ 
                          background: "none", 
                          border: "none", 
                          color: "#ef4444", 
                          cursor: "pointer", 
                          padding: "6px",
                          borderRadius: "8px",
                          transition: "all 0.2s",
                          display: "flex",
                          alignItems: "center"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#fee2e2"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <Trash2 size={16} />
                      </button>
                      <button 
                        style={{ 
                          background: "none", 
                          border: "none", 
                          color: "#3b82f6", 
                          cursor: "pointer", 
                          padding: "6px",
                          borderRadius: "8px",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#dbeafe"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div style={{ padding: "80px 60px", textAlign: "center" }}>
            <div style={{ 
              width: "120px", 
              height: "120px", 
              background: "#f1f5f9", 
              borderRadius: "50%", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              margin: "0 auto 24px"
            }}>
              <Users size={48} color="#94a3b8" />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1e293b", marginBottom: "8px" }}>
              Aucun utilisateur
            </h3>
            <p style={{ color: "#64748b", marginBottom: "24px" }}>
              Commencez par ajouter votre premier utilisateur
            </p>
            <button 
              onClick={() => setShowAddUser(true)}
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                color: "white",
                border: "none",
                padding: "12px 32px",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.3s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              <Plus size={18} /> Ajouter un utilisateur
            </button>
          </div>
        )}
        {users.length > 0 && filteredUsers.length === 0 && (
          <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
            <Search size={48} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
            <p>Aucun utilisateur ne correspond à votre recherche</p>
          </div>
        )}
      </div>

      {/* Modal Ajout Utilisateur */}
      {showAddUser && (
        <div style={{ 
          position: "fixed", 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: "rgba(0,0,0,0.5)", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          zIndex: 1000,
          backdropFilter: "blur(4px)"
        }}>
          <div style={{ 
            background: "white", 
            borderRadius: "24px", 
            padding: "32px", 
            width: "550px", 
            maxWidth: "90%",
            animation: "slideUp 0.3s ease"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "24px", color: "#1e293b" }}>Ajouter un utilisateur</h2>
              <button onClick={() => setShowAddUser(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", fontSize: "20px" }}>
                ✕
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <input 
                type="text" 
                placeholder="Nom complet *" 
                value={newUser.name} 
                onChange={(e) => setNewUser({...newUser, name: e.target.value})} 
                style={{ padding: "12px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", outline: "none", fontSize: "14px" }}
              />
              <input 
                type="email" 
                placeholder="Email *" 
                value={newUser.email} 
                onChange={(e) => setNewUser({...newUser, email: e.target.value})} 
                style={{ padding: "12px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", outline: "none", fontSize: "14px" }}
              />
              <input 
                type="tel" 
                placeholder="Téléphone" 
                value={newUser.phone} 
                onChange={(e) => setNewUser({...newUser, phone: e.target.value})} 
                style={{ padding: "12px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", outline: "none", fontSize: "14px" }}
              />
              <select 
                value={newUser.role} 
                onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                style={{ padding: "12px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", outline: "none", fontSize: "14px", cursor: "pointer" }}
              >
                <option value="Opérateur">Opérateur</option>
                <option value="Superviseur">Superviseur</option>
                <option value="Technicien">Technicien</option>
                <option value="Chef d'équipe">Chef d'équipe</option>
                <option value="Ingénieur">Ingénieur</option>
                <option value="Responsable Qualité">Responsable Qualité</option>
                <option value="Admin">Administrateur</option>
              </select>
              <select 
                value={newUser.department} 
                onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                style={{ padding: "12px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", outline: "none", fontSize: "14px", cursor: "pointer" }}
              >
                <option value="Production">Production</option>
                <option value="Qualité">Qualité</option>
                <option value="Maintenance">Maintenance</option>
                <option value="R&D">R&D</option>
                <option value="Logistique">Logistique</option>
                <option value="Administration">Administration</option>
              </select>
              <select 
                value={newUser.status} 
                onChange={(e) => setNewUser({...newUser, status: e.target.value})}
                style={{ padding: "12px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", outline: "none", fontSize: "14px", cursor: "pointer" }}
              >
                <option value="Actif">Actif</option>
                <option value="Inactif">Inactif</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "12px", marginTop: "28px", justifyContent: "flex-end" }}>
              <button 
                onClick={() => setShowAddUser(false)} 
                style={{ 
                  padding: "10px 24px", 
                  borderRadius: "12px", 
                  border: "1px solid #e2e8f0", 
                  background: "white", 
                  cursor: "pointer",
                  fontWeight: "500"
                }}
              >
                Annuler
              </button>
              <button 
                onClick={handleAddUser} 
                style={{ 
                  padding: "10px 24px", 
                  borderRadius: "12px", 
                  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", 
                  color: "white", 
                  border: "none", 
                  cursor: "pointer",
                  fontWeight: "500",
                  transition: "all 0.3s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

const MESDashboard = () => {
  const [activeModule, setActiveModule] = useState("mes");
  const [activeERPModule, setActiveERPModule] = useState("production");
  const [activeMESTab, setActiveMESTab] = useState("tableau-de-bord");
  const [showERPMenu, setShowERPMenu] = useState(true);
  const [hoveredModule, setHoveredModule] = useState(null);

  // Gestion du clic sur ERP System
  const handleERPClick = () => {
    setActiveModule("erp");
    setShowERPMenu(true);
  };

  // Gestion du clic sur MES Production
  const handleMESClick = () => {
    setActiveModule("mes");
    setActiveMESTab("tableau-de-bord");
  };

  // Gestion du clic sur User Management
  const handleUserClick = () => {
    setActiveModule("users");
  };

  // Gestion des modules ERP
  const handleERPModuleClick = (module) => {
    setActiveERPModule(module);
  };

  // Rendu du contenu ERP
  const renderERPContent = () => {
    switch(activeERPModule) {
      case "production":
        return (
          <div className="mes-card">
            <h2 style={{marginBottom:"16px", color:"#1e293b"}}>
              📊 Gestion de Production ERP
            </h2>
            <p>Planification des besoins matières (MRP), planning de production, suivi des lots</p>
            <div style={{marginTop:20, padding:20, background:"#f8fafc", borderRadius:8}}>
              <h3>Indicateurs clés</h3>
              <p>Plan de production semaine 14: 2,500 unités</p>
              <p>Taux de couverture des commandes: 95%</p>
              <p>Lead time moyen: 3.2 jours</p>
            </div>
          </div>
        );
      case "stock":
        return (
          <div className="mes-card">
            <h2 style={{marginBottom:"16px", color:"#1e293b"}}>
              📦 Gestion des Stocks
            </h2>
            <p>Gestion des inventaires et des mouvements de stock</p>
          </div>
        );
      case "maintenance":
        return (
          <div className="mes-card">
            <h2 style={{marginBottom:"16px", color:"#1e293b"}}>
              🔧 Gestion de Maintenance
            </h2>
            <p>Planification et suivi des interventions de maintenance</p>
          </div>
        );
      case "reporting":
        return (
          <div className="mes-card">
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

  // Configuration des modules MES avec thème bleu
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
        * { margin:0; padding:0; box-sizing:border-box; font-family: 'Inter','Segoe UI',sans-serif; }
        body { background-color:#f3f4f6; }

        .mes-container { display:flex; height:100vh; background-color:#f3f4f6; overflow:hidden; }

        .mes-sidebar {
          width:280px;
          background:linear-gradient(180deg,#1e293b 0%,#0f172a 100%);
          color:white;
          padding:24px 16px;
          display:flex;
          flex-direction:column;
          overflow-y:auto;
        }

        .mes-logo { margin-bottom:32px; padding:0 12px; border-bottom:1px solid #334155; padding-bottom:20px; }
        .mes-logo h2 { font-size:24px; font-weight:700; background:linear-gradient(135deg,#60a5fa,#3b82f6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .mes-logo p { font-size:12px; color:#94a3b8; margin-top:4px; }

        .mes-nav { display:flex; flex-direction:column; gap:12px; }

        .mes-nav-section {
          margin-bottom:8px;
        }

        .mes-nav-section-title {
          font-size:12px;
          color:#94a3b8;
          padding:8px 16px;
          letter-spacing:0.5px;
          font-weight:600;
        }

        .mes-nav-item {
          display:flex;
          align-items:center;
          gap:12px;
          padding:12px 16px;
          border-radius:10px;
          cursor:pointer;
          transition:all 0.2s;
          color:#cbd5e1;
          font-size:14px;
          font-weight:500;
        }

        .mes-nav-item:hover { background:#334155; color:white; transform:translateX(4px); }
        .mes-nav-item.active {
          background:linear-gradient(90deg,#2563eb,#3b82f6);
          color:white;
          box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);
        }

        .erp-submenu {
          margin-left:32px;
          display:flex;
          flex-direction:column;
          gap:4px;
          margin-top:4px;
          margin-bottom:8px;
        }

        .erp-submenu-item {
          padding:8px 12px;
          cursor:pointer;
          font-size:13px;
          color:#b0bec5;
          display:flex;
          align-items:center;
          gap:8px;
          border-radius:6px;
          transition:all 0.2s;
        }

        .erp-submenu-item:hover { 
          color:white; 
          background:#334155;
          transform:translateX(4px);
        }

        .erp-submenu-item.active {
          background:#334155;
          color:white;
        }

        .mes-main { flex:1; display:flex; flex-direction:column; overflow-y:auto; }

        .mes-header {
          background:white;
          padding:16px 30px;
          display:flex;
          justify-content:space-between;
          align-items:center;
          border-bottom:1px solid #e5e7eb;
          box-shadow:0 1px 2px rgba(0,0,0,0.05);
        }

        .mes-search {
          display:flex;
          align-items:center;
          background:#f8fafc;
          padding:8px 16px;
          border-radius:30px;
          gap:10px;
          width:320px;
          border:1px solid #e2e8f0;
          transition:all 0.2s;
        }

        .mes-search:hover, .mes-search:focus-within {
          border-color:#3b82f6;
          box-shadow:0 0 0 3px rgba(59,130,246,0.1);
        }

        .mes-search input {
          border:none;
          outline:none;
          background:transparent;
          width:100%;
          font-size:14px;
        }

        .mes-date {
          display:flex;
          align-items:center;
          gap:8px;
          font-size:14px;
          color:#64748b;
          background:#f8fafc;
          padding:8px 16px;
          border-radius:30px;
        }

        .mes-title-section {
          background:linear-gradient(135deg,#2563eb,#1e40af);
          padding:24px 30px;
          color:white;
        }

        .mes-title-section h1 {
          font-size:28px;
          font-weight:700;
          margin-bottom:8px;
        }

        .mes-title-section p {
          opacity:0.9;
          font-size:14px;
        }

        /* Nouveau design pour les modules MES - Thème bleu */
        .mes-modules-container {
          background: white;
          padding: 20px 30px;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }

        .mes-modules-grid {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .mes-module-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 24px;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: white;
          border: 1.5px solid #e2e8f0;
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
          transition: opacity 0.3s ease;
          z-index: 0;
        }

        .mes-module-card:hover {
          transform: translateY(-3px);
          border-color: #3b82f6;
          box-shadow: 0 8px 20px rgba(59,130,246,0.2);
        }

        .mes-module-card.active {
          border-color: #3b82f6;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          box-shadow: 0 8px 20px rgba(59,130,246,0.3);
        }

        .mes-module-card.active::before {
          opacity: 1;
        }

        .module-icon {
          font-size: 20px;
          transition: all 0.3s ease;
          color: #3b82f6;
          position: relative;
          z-index: 1;
        }

        .mes-module-card.active .module-icon {
          color: white;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }

        .module-content {
          position: relative;
          z-index: 1;
        }

        .module-label {
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
          color: #1e293b;
        }

        .module-description {
          font-size: 11px;
          color: #64748b;
          margin-top: 2px;
          transition: all 0.3s ease;
        }

        .mes-module-card.active .module-label {
          color: white;
        }

        .mes-module-card.active .module-description {
          color: rgba(255,255,255,0.8);
        }

        .mes-module-card:hover .module-label {
          color: #3b82f6;
        }

        .mes-module-card.active:hover .module-label {
          color: white;
        }

        .mes-content { 
          padding: 30px; 
          flex: 1;
          overflow-y: auto;
          background: #f8fafc;
        }

        .mes-card {
          background: white;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        }

        .mes-card:hover {
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
          transform: translateY(-2px);
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
                <h1>Système ERP - Gestion Intégrée</h1>
                <p>Enterprise Resource Planning • Planification et gestion des ressources</p>
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
                <p>Exécution de la Production • Suivi en temps réel • Performance et qualité</p>
              </div>

              {/* NOUVEAU DESIGN POUR LES MODULES MES - THÈME BLEU */}
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
                    <div style={{marginTop:24, padding:20, background:"#f8fafc", borderRadius:12}}>
                      <h3>Indicateurs clés</h3>
                      <p>Productivité: 94%</p>
                      <p>Qualité: 98.5%</p>
                      <p>Disponibilité: 87%</p>
                    </div>
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