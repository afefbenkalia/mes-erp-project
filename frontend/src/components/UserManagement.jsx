import React, { useState } from "react";
import {
  Search,
  Users,
  Activity,
  Shield,
  Plus,
  Edit2,
  Trash2
} from "lucide-react";

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

export default UserManagement;