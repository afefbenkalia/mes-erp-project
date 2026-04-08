import React, { useEffect, useState } from "react";
import API from "../api/api";
import {
  Search,
  UserPlus,
  Trash2,
  Edit3,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Shield,
  UserCog,
  User,
  Wrench,
  Power,
  PowerOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  RefreshCw,
  Mail,
  Phone,
  Calendar,
  Users,
  Activity,
  TrendingUp
} from "lucide-react";

const ROLES = {
  admin: { label: "Administrateur", icon: Shield, color: "#8b5cf6", bgColor: "#f3e8ff" },
  manager: { label: "Responsable", icon: UserCog, color: "#3b82f6", bgColor: "#dbeafe" },
  operator: { label: "Opérateur", icon: User, color: "#10b981", bgColor: "#d1fae5" },
  maintenance: { label: "Maintenance", icon: Wrench, color: "#f59e0b", bgColor: "#fed7aa" }
};

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  role: "operator",
  password: "",
  status: "active",
  is_active: true
};

const normalize = (r) => r?.toLowerCase().trim();
const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const getInitials = (name) => {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getAvatarColor = (id) => {
  const colors = [
    "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"
  ];
  return colors[id % colors.length];
};

// Statistiques Component
const StatisticsCards = ({ users }) => {
  const stats = {
    total: users.length,
    admin: users.filter(u => normalize(u.role) === "admin").length,
    manager: users.filter(u => normalize(u.role) === "manager").length,
    operator: users.filter(u => normalize(u.role) === "operator").length,
    maintenance: users.filter(u => normalize(u.role) === "maintenance").length,
    active: users.filter(u => u.status === "active" || u.is_active === true).length,
    inactive: users.filter(u => u.status === "inactive" || u.is_active === false).length
  };

  const statCards = [
    { title: "Total", value: stats.total, icon: Users, color: "#64748b", bgColor: "#f1f5f9" },
    { title: "Admins", value: stats.admin, icon: Shield, color: "#8b5cf6", bgColor: "#f3e8ff" },
    { title: "Responsables", value: stats.manager, icon: UserCog, color: "#3b82f6", bgColor: "#dbeafe" },
    { title: "Opérateurs", value: stats.operator, icon: User, color: "#10b981", bgColor: "#d1fae5" },
    { title: "Maintenance", value: stats.maintenance, icon: Wrench, color: "#f59e0b", bgColor: "#fed7aa" },
    { title: "Actifs", value: stats.active, icon: Activity, color: "#06b6d4", bgColor: "#cffafe", subtitle: `${stats.inactive} inactifs` }
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "16px",
      marginBottom: "24px"
    }}>
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid #e2e8f0",
              transition: "all 0.2s",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{
                padding: "8px",
                borderRadius: "10px",
                background: card.bgColor,
                color: card.color
              }}>
                <Icon size={20} />
              </div>
              <span style={{ fontSize: "24px", fontWeight: "bold", color: "#1e293b" }}>{card.value}</span>
            </div>
            <h3 style={{ fontSize: "13px", fontWeight: "500", color: "#64748b", margin: 0 }}>{card.title}</h3>
            {card.subtitle && (
              <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", marginBottom: 0 }}>{card.subtitle}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: { icon: CheckCircle, bg: "#10b981" },
    error: { icon: XCircle, bg: "#ef4444" },
    info: { icon: AlertCircle, bg: "#3b82f6" }
  };

  const Icon = config[type].icon;

  return (
    <div style={{
      position: "fixed",
      top: "20px",
      right: "20px",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      gap: "12px",
      background: config[type].bg,
      color: "white",
      padding: "12px 20px",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      animation: "slideIn 0.3s ease-out"
    }}>
      <Icon size={20} />
      <span>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
        <X size={16} />
      </button>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

// Modal Component
const UserModal = ({ isOpen, onClose, onSave, editMode, form, setForm, loading }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)"
      }} onClick={onClose} />
      <div style={{
        position: "relative",
        background: "white",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "500px",
        margin: "16px",
        overflow: "hidden",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
      }}>
        <div style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          padding: "20px 24px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ color: "white", fontSize: "20px", fontWeight: "bold", margin: 0 }}>
              {editMode ? "Modifier l'utilisateur" : "Créer un utilisateur"}
            </h2>
            <button onClick={onClose} style={{ color: "white", background: "none", border: "none", cursor: "pointer" }}>
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(); }} style={{ padding: "24px" }}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#334155", marginBottom: "8px" }}>Nom complet *</label>
            <input
              type="text"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                outline: "none",
                fontSize: "14px"
              }}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
              onBlur={(e) => e.target.style.borderColor = "#cbd5e1"}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#334155", marginBottom: "8px" }}>Email *</label>
            <input
              type="email"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                outline: "none",
                fontSize: "14px"
              }}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#334155", marginBottom: "8px" }}>Téléphone</label>
            <input
              type="tel"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                outline: "none",
                fontSize: "14px"
              }}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#334155", marginBottom: "8px" }}>
              Mot de passe {!editMode && "*"}
              {editMode && <span style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "8px" }}>(Laisser vide pour ne pas changer)</span>}
            </label>
            <input
              type="password"
              required={!editMode}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                outline: "none",
                fontSize: "14px"
              }}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#334155", marginBottom: "8px" }}>Rôle</label>
            <select
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                outline: "none",
                fontSize: "14px",
                background: "white"
              }}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="admin">Administrateur</option>
              <option value="manager">Responsable</option>
              <option value="operator">Opérateur</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#334155", marginBottom: "8px" }}>Statut</label>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setForm({ ...form, status: "active", is_active: true })}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: `1px solid ${form.status === "active" ? "#10b981" : "#cbd5e1"}`,
                  background: form.status === "active" ? "#d1fae5" : "white",
                  color: form.status === "active" ? "#065f46" : "#64748b",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                Actif
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, status: "inactive", is_active: false })}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: `1px solid ${form.status === "inactive" ? "#ef4444" : "#cbd5e1"}`,
                  background: form.status === "inactive" ? "#fee2e2" : "white",
                  color: form.status === "inactive" ? "#991b1b" : "#64748b",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                Inactif
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "white",
                color: "#64748b",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                color: "white",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s"
              }}
            >
              {loading ? <Loader size={20} style={{ animation: "spin 1s linear infinite", margin: "0 auto" }} /> : (editMode ? "Mettre à jour" : "Créer")}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Composant principal
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await API.get("/auth/users/all");
      setUsers(res.data);
    } catch (err) {
      showToast(err.response?.data?.detail || "Erreur lors du chargement", "error");
      try {
        const res2 = await API.get("/auth/users");
        setUsers(res2.data);
      } catch (err2) {
        console.error("Fallback also failed:", err2);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const openAdd = () => {
    setForm({ ...emptyForm, password: "" });
    setEditMode(false);
    setShowModal(true);
  };

  const openEdit = (u) => {
    setForm({
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      role: normalize(u.role),
      password: "",
      status: u.status,
      is_active: u.is_active
    });
    setSelectedUser(u);
    setEditMode(true);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (editMode) {
        const updateData = { ...form };
        if (!updateData.password) delete updateData.password;

        await API.put(`/auth/users/${selectedUser.id}`, {
          ...updateData,
          phone: updateData.phone || null
        });
        showToast("Utilisateur modifié avec succès", "success");
      } else {
        if (!form.name || !form.email || form.password.length < 6) {
          showToast("Remplir les champs correctement (password ≥ 6)", "error");
          return;
        }

        await API.post("/auth/users", {
          ...form,
          phone: form.phone || null
        });
        showToast("Utilisateur créé avec succès", "success");
      }

      setShowModal(false);
      await fetchUsers();
    } catch (err) {
      const message = typeof err.response?.data?.detail === "string"
        ? err.response.data.detail
        : err.response?.data?.detail?.[0]?.msg;
      showToast(message || "Erreur lors de l'enregistrement", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (id, name) => {
    if (!window.confirm(`Supprimer "${name}" ?`)) return;
    try {
      await API.delete(`/auth/users/${id}`);
      showToast("Utilisateur supprimé", "success");
      await fetchUsers();
    } catch (err) {
      showToast("Erreur lors de la suppression", "error");
    }
  };

  const toggleUserStatus = async (user) => {
    try {
      const newStatus = user.status === "active" ? "inactive" : "active";
      await API.put(`/auth/users/${user.id}`, {
        status: newStatus,
        is_active: newStatus === "active"
      });
      showToast(`Utilisateur ${newStatus === "active" ? "activé" : "désactivé"}`, "success");
      await fetchUsers();
    } catch (err) {
      showToast("Erreur lors du changement de statut", "error");
    }
  };

  const filtered = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  ).filter((u) => roleFilter === "all" || normalize(u.role) === roleFilter);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedUsers = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter]);

  const RoleBadge = ({ role }) => {
    const config = ROLES[normalize(role)] || ROLES.operator;
    const Icon = config.icon;
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "8px",
        fontSize: "12px",
        fontWeight: "500",
        background: config.bgColor,
        color: config.color
      }}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "400px"
      }}>
        <Loader size={48} style={{ animation: "spin 1s linear infinite", color: "#0f172a" }} />
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <UserModal isOpen={showModal} onClose={() => setShowModal(false)} onSave={handleSave} editMode={editMode} form={form} setForm={setForm} loading={saving} />

      {/* En-tête */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#0f172a", margin: 0 }}>Gestion des utilisateurs</h1>
            <p style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>Gérez les comptes et les permissions</p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={fetchUsers}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                color: "#64748b",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "white" }}
            >
              <RefreshCw size={16} /> Rafraîchir
            </button>
            <button
              onClick={openAdd}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                border: "none",
                borderRadius: "8px",
                color: "white",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              <UserPlus size={16} /> Créer
            </button>
          </div>
        </div>

        {/* Cartes statistiques */}
        <StatisticsCards users={users} />
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "0 12px"
        }}>
          <Search size={16} style={{ color: "#94a3b8" }} />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            style={{
              flex: 1,
              padding: "10px 0",
              border: "none",
              outline: "none",
              fontSize: "14px",
              background: "transparent"
            }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          style={{
            padding: "8px 12px",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            background: "white",
            outline: "none",
            fontSize: "14px",
            cursor: "pointer"
          }}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">📊 Tous les rôles</option>
          <option value="admin">🛡️ Administrateurs</option>
          <option value="manager">⚙️ Responsables</option>
          <option value="operator">👤 Opérateurs</option>
          <option value="maintenance">🔧 Maintenance</option>
        </select>
      </div>

      {/* Tableau */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        overflow: "hidden"
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <tr>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Utilisateur</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Contact</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Rôle</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Statut</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Inscription</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((u, index) => (
                <tr key={u.id} style={{ borderTop: "1px solid #e2e8f0", background: index % 2 === 0 ? "white" : "#fafafa" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: getAvatarColor(u.id),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "bold",
                        fontSize: "14px"
                      }}>
                        {getInitials(u.name)}
                      </div>
                      <span style={{ fontWeight: "500", color: "#0f172a" }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#64748b" }}>
                      <Mail size={12} /> {u.email}
                    </div>
                    {u.phone && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                        <Phone size={11} /> {u.phone}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <RoleBadge role={u.role} />
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      onClick={() => toggleUserStatus(u)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 10px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "500",
                        border: "none",
                        cursor: "pointer",
                        background: u.status === "active" ? "#d1fae5" : "#fee2e2",
                        color: u.status === "active" ? "#065f46" : "#991b1b"
                      }}
                    >
                      {u.status === "active" ? <Power size={12} /> : <PowerOff size={12} />}
                      {u.status === "active" ? "Actif" : "Inactif"}
                    </button>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "#64748b" }}>
                    <Calendar size={12} style={{ display: "inline", marginRight: "6px" }} />
                    {formatDate(u.created_at)}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      <button
                        onClick={() => openEdit(u)}
                        style={{
                          padding: "6px",
                          borderRadius: "6px",
                          border: "none",
                          background: "#fef3c7",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center"
                        }}
                      >
                        <Edit3 size={14} style={{ color: "#d97706" }} />
                      </button>
                      <button
                        onClick={() => deleteUser(u.id, u.name)}
                        style={{
                          padding: "6px",
                          borderRadius: "6px",
                          border: "none",
                          background: "#fee2e2",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center"
                        }}
                      >
                        <Trash2 size={14} style={{ color: "#dc2626" }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {paginatedUsers.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px", color: "#94a3b8" }}>
              <Users size={48} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
              Aucun utilisateur trouvé
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            borderTop: "1px solid #e2e8f0",
            background: "#f8fafc"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "13px", color: "#64748b" }}>
                {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filtered.length)} sur {filtered.length}
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                style={{
                  padding: "4px 8px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontSize: "12px",
                  background: "white",
                  cursor: "pointer"
                }}
              >
                <option value={10}>10/page</option>
                <option value={20}>20/page</option>
                <option value={50}>50/page</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{
                  padding: "6px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  background: "white",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  opacity: currentPage === 1 ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: "6px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  background: "white",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  opacity: currentPage === 1 ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{
                padding: "4px 12px",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                color: "white",
                borderRadius: "6px",
                fontSize: "13px"
              }}>
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: "6px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  background: "white",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                style={{
                  padding: "6px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  background: "white",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;