import React, { useEffect, useMemo, useState } from "react";
import API from "../api/api";
import {
  Search,
  UserPlus,
  Pencil,
  Trash2,
  KeyRound,
  X,
  Shield,
  UserCog,
  User,
  Wrench,
  TrendingUp,
  Clock3,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  Mail,
  Calendar,
  Users,
  Activity,
  IdCard,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";

const ROLES = {
  admin: { label: "Administrateur", icon: Shield, color: "#8b5cf6", bgColor: "#f3e8ff" },
  manager: { label: "Manager", icon: UserCog, color: "#3b82f6", bgColor: "#dbeafe" },
  operator: { label: "Operator", icon: User, color: "#10b981", bgColor: "#d1fae5" },
  maintenance: { label: "Maintenance", icon: Wrench, color: "#f59e0b", bgColor: "#fed7aa" }
};

const emptyForm = {
  cin: "",
  nom: "",
  prenom: "",
  email: "",
  role: "operator"
};

const normalize = (value) => value?.toLowerCase().trim();

const formatDate = (dateValue) => {
  if (!dateValue) return "—";
  return new Date(dateValue).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const getInitials = (nom, prenom) => {
  const first = prenom?.trim()?.[0] || "";
  const last = nom?.trim()?.[0] || "";
  return `${first}${last}`.toUpperCase() || "U";
};

const getAvatarColor = (id) => {
  const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];
  return colors[id % colors.length];
};

const Toast = ({ message, type = "success", onClose }) => {
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
      top: 24,
      right: 24,
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: config[type].bg,
      color: "white",
      padding: "12px 16px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.15)",
      boxShadow: "0 14px 40px rgba(2, 6, 23, 0.28)"
    }}>
      <Icon size={18} />
      <span>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
        <X size={16} />
      </button>
    </div>
  );
};

const UserModal = ({
  isOpen,
  onClose,
  onSave,
  form,
  setForm,
  loading,
  mode = "create"
}) => {
  if (!isOpen) return null;

  const isEdit = mode === "edit";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(6px)", background: "rgba(15, 23, 42, 0.55)" }} onClick={onClose} />
      <div style={{ position: "relative", width: "100%", maxWidth: 620, margin: 16, background: "white", borderRadius: 20, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 28px 80px rgba(15, 23, 42, 0.28)" }}>
        <div style={{ padding: "22px 26px", background: "linear-gradient(140deg, #0f172a 0%, #1e293b 55%, #334155 100%)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{isEdit ? "Modifier utilisateur" : "Créer un utilisateur"}</h2>
            <p style={{ margin: "4px 0 0", opacity: 0.86, fontSize: 13 }}>
              {isEdit
                ? "Mettez à jour les détails du compte utilisateur."
                : "Le mot de passe temporaire sera généré automatiquement et envoyé par email."}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.24)", width: 34, height: 34, borderRadius: 10, color: "white", cursor: "pointer", display: "grid", placeItems: "center" }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(); }} style={{ padding: 26, display: "grid", gap: 16 }}>
          <Field label="CIN *">
            <input value={form.cin} onChange={(e) => setForm({ ...form, cin: e.target.value })} required placeholder="ABC12345" className="mes-input" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Nom *">
              <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required placeholder="Ben Ali" className="mes-input" />
            </Field>
            <Field label="Prénom *">
              <input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required placeholder="Amine" className="mes-input" />
            </Field>
          </div>
          <Field label="Email *">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="amine@company.com" className="mes-input" />
          </Field>
          <Field label="Rôle *">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="mes-input">
              <option value="admin">Administrateur</option>
              <option value="manager">Manager</option>
              <option value="operator">Operator</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </Field>

          {isEdit && (
            <Field label="Statut">
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#334155", fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={Boolean(form.is_active)}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Compte actif
              </label>
            </Field>
          )}

          {!isEdit && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", borderRadius: 12, padding: 12, fontSize: 13 }}>
              Temporary password generation, bcrypt hashing, first-login enforcement, and SMTP onboarding email are handled automatically.
            </div>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={buttonStyle.secondary} className="um-btn um-btn-secondary">Annuler</button>
            <button type="submit" disabled={loading} style={buttonStyle.primary} className="um-btn um-btn-primary">
              {loading ? <Loader size={18} className="spin" /> : (isEdit ? "Enregistrer" : "Créer")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <label style={{ display: "grid", gap: 8 }}>
    <span style={{ fontSize: 13, letterSpacing: 0.2, fontWeight: 700, color: "#334155" }}>{label}</span>
    {children}
  </label>
);

const buttonStyle = {
  primary: {
    minWidth: 132,
    padding: "10px 16px",
    border: "none",
    borderRadius: 12,
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #334155 100%)",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.22)"
  },
  secondary: {
    minWidth: 132,
    padding: "10px 16px",
    border: "1px solid #d1d9e6",
    borderRadius: 12,
    background: "#ffffff",
    color: "#334155",
    cursor: "pointer",
    fontWeight: 700,
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)"
  }
};

const defaultStats = {
  total: 0,
  active: 0,
  inactive: 0,
  created_this_month: 0,
  growth_percentage: 0,
  per_role: []
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({ ...emptyForm, is_active: true });
  const [editingUserId, setEditingUserId] = useState(null);
  const [toast, setToast] = useState(null);
  const [stats, setStats] = useState(defaultStats);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = normalize(currentUser.role) === "admin";

  const showToast = (message, type = "success") => setToast({ message, type });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await API.get("/auth/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      showToast(error.response?.data?.detail || "Erreur lors du chargement des utilisateurs", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersStats = async () => {
    try {
      const response = await API.get("/auth/users/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data || defaultStats);
    } catch {
      setStats(defaultStats);
    }
  };

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchUsers(), fetchUsersStats()]);
    };
    load();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !term || [user.cin, user.nom, user.prenom, user.email]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term));
      const matchesRole = roleFilter === "all" || normalize(user.role) === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter]);

  const roleStats = (stats.per_role || [])
    .map((entry) => ({
      role: normalize(entry.role) || "operator",
      count: entry.count || 0
    }))
    .filter((entry) => ROLES[entry.role]);

  const activityLabel = (count) => {
    if (!count) return "New / Low";
    if (count < 5) return "Medium";
    if (count < 15) return "High";
    return "Very High";
  };

  const createUser = async () => {
    if (!form.cin || !form.nom || !form.prenom || !form.email) {
      showToast("Veuillez remplir tous les champs obligatoires.", "error");
      return;
    }

    try {
      setSaving(true);
      await API.post("/auth/create-user", {
        cin: form.cin.trim(),
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        email: form.email.trim(),
        role: form.role
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast("Utilisateur créé. Le mot de passe temporaire a été envoyé par email.", "success");
      setForm(emptyForm);
      setShowModal(false);
      await Promise.all([fetchUsers(), fetchUsersStats()]);
    } catch (error) {
      showToast(error.response?.data?.detail || "Erreur lors de la création.", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Supprimer ${user.prenom} ${user.nom} ?`)) return;

    try {
      await API.delete(`/auth/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Utilisateur supprimé.", "success");
      await Promise.all([fetchUsers(), fetchUsersStats()]);
    } catch (error) {
      showToast(error.response?.data?.detail || "Erreur lors de la suppression.", "error");
    }
  };

  const resetPassword = async (user) => {
    if (!window.confirm(`Reinitialiser le mot de passe de ${user.prenom} ${user.nom} ?`)) return;

    try {
      setSaving(true);
      await API.post(`/auth/users/${user.id}/reset-password`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast("Mot de passe temporaire regenere et envoye par email. L'utilisateur devra le changer a la prochaine connexion.", "success");
      await Promise.all([fetchUsers(), fetchUsersStats()]);
    } catch (error) {
      showToast(error.response?.data?.detail || "Erreur lors de la reinitialisation du mot de passe.", "error");
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (user) => {
    setEditingUserId(user.id);
    setEditForm({
      cin: user.cin || "",
      nom: user.nom || "",
      prenom: user.prenom || "",
      email: user.email || "",
      role: normalize(user.role) || "operator",
      is_active: Boolean(user.is_active)
    });
    setShowEditModal(true);
  };

  const updateUser = async () => {
    if (!editingUserId) {
      showToast("Utilisateur invalide.", "error");
      return;
    }

    if (!editForm.cin || !editForm.nom || !editForm.prenom || !editForm.email) {
      showToast("Veuillez remplir tous les champs obligatoires.", "error");
      return;
    }

    try {
      setSaving(true);
      await API.put(`/auth/users/${editingUserId}`, {
        cin: editForm.cin.trim(),
        nom: editForm.nom.trim(),
        prenom: editForm.prenom.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        is_active: Boolean(editForm.is_active)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast("Utilisateur mis à jour.", "success");
      setShowEditModal(false);
      setEditingUserId(null);
      await Promise.all([fetchUsers(), fetchUsersStats()]);
    } catch (error) {
      showToast(error.response?.data?.detail || "Erreur lors de la mise à jour.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Loader size={42} className="spin" />
      </div>
    );
  }

  return (
    <div className="um-page" style={{ display: "grid", gap: 24 }}>
      <style>{`
        .um-page {
          padding: 8px;
          background:
            radial-gradient(1200px 260px at 10% -20%, rgba(59,130,246,.12), transparent 60%),
            radial-gradient(900px 200px at 90% -10%, rgba(139,92,246,.12), transparent 55%),
            #f8fafc;
        }

        .um-btn {
          transition: transform .16s ease, box-shadow .16s ease, filter .16s ease;
        }
        .um-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.01);
        }

        .um-stat-card {
          transition: transform .18s ease, box-shadow .18s ease;
        }
        .um-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.10);
        }

        .um-toolbar,
        .um-table-wrap,
        .um-block {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 6px 24px rgba(15, 23, 42, 0.04);
        }

        .um-toolbar {
          padding: 14px;
        }

        .mes-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d7dfeb;
          border-radius: 12px;
          outline: none;
          font-size: 14px;
          transition: border-color .15s ease, box-shadow .15s ease;
          background: #ffffff;
        }
        .mes-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59,130,246,.12);
        }

        .um-search {
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .um-search:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59,130,246,.12);
        }

        .um-table thead th {
          position: sticky;
          top: 0;
          z-index: 1;
          background: #f8fafc;
        }
        .um-table tbody tr {
          transition: background-color .15s ease;
        }
        .um-table tbody tr:hover {
          background: #f8fbff;
        }

        .um-action-btn {
          border: none;
          border-radius: 10px;
          padding: 8px;
          cursor: pointer;
          transition: transform .14s ease, box-shadow .14s ease, filter .14s ease;
        }
        .um-action-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.02);
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.14);
        }

        @media (max-width: 860px) {
          .um-page {
            padding: 2px;
          }
        }

        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <UserModal isOpen={showModal} onClose={() => setShowModal(false)} onSave={createUser} form={form} setForm={setForm} loading={saving} />
      <UserModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingUserId(null);
        }}
        onSave={updateUser}
        form={editForm}
        setForm={setEditForm}
        loading={saving}
        mode="edit"
      />

      <section className="um-block" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", padding: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: -0.35, color: "#0f172a" }}>Gestion des utilisateurs</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b" }}>Création admin, onboarding email, et contrôle des comptes.</p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {isAdmin && (
            <button onClick={() => setShowModal(true)} style={buttonStyle.primary} className="um-btn um-btn-primary">
              <UserPlus size={16} /> Créer un utilisateur
            </button>
          )}
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        {[
          { title: "Total", value: stats.total, icon: Users, color: "#64748b", bg: "#f1f5f9" },
          { title: "Actifs", value: stats.active, icon: Activity, color: "#10b981", bg: "#d1fae5" },
          { title: "Inactifs", value: stats.inactive, icon: AlertCircle, color: "#ef4444", bg: "#fee2e2" },
          { title: "Users This Month", value: stats.created_this_month, icon: Calendar, color: "#2563eb", bg: "#dbeafe" },
          {
            title: "Growth %",
            value: `${stats.growth_percentage > 0 ? "+" : ""}${stats.growth_percentage}%`,
            icon: TrendingUp,
            color: stats.growth_percentage >= 0 ? "#16a34a" : "#dc2626",
            bg: stats.growth_percentage >= 0 ? "#dcfce7" : "#fee2e2"
          }
        ].map((card) => {
          const Icon = card.icon;
          return (
            <article className="um-stat-card" key={card.title} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, boxShadow: "0 5px 18px rgba(15, 23, 42, 0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ padding: 10, borderRadius: 12, background: card.bg, color: card.color }}>
                  <Icon size={18} />
                </div>
                <strong style={{ fontSize: 28, color: "#0f172a" }}>{card.value}</strong>
              </div>
              <div style={{ marginTop: 12, color: "#64748b", fontSize: 13, fontWeight: 600 }}>{card.title}</div>
            </article>
          );
        })}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        {roleStats.map((entry) => {
          const role = ROLES[entry.role] || ROLES.operator;
          const RoleIcon = role.icon;
          return (
            <article className="um-stat-card" key={entry.role} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, boxShadow: "0 5px 18px rgba(15, 23, 42, 0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ padding: 10, borderRadius: 12, background: role.bgColor, color: role.color }}>
                  <RoleIcon size={18} />
                </div>
                <strong style={{ fontSize: 28, color: "#0f172a" }}>{entry.count}</strong>
              </div>
              <div style={{ marginTop: 12, color: "#64748b", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <BarChart3 size={14} /> {role.label}
              </div>
              
            </article>
          );
        })}
      </section>

      <section className="um-toolbar" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div className="um-search" style={{ flex: "1 1 320px", display: "flex", alignItems: "center", gap: 8, background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: "0 12px" }}>
          <Search size={16} style={{ color: "#94a3b8" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par CIN, nom, prénom ou email"
            style={{ border: "none", outline: "none", padding: "12px 0", flex: 1, fontSize: 14 }}
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="mes-input" style={{ maxWidth: 220 }}>
          <option value="all">Tous les rôles</option>
          <option value="admin">Administrateur</option>
          <option value="manager">Manager</option>
          <option value="operator">Operator</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </section>

      <section className="um-table-wrap" style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="um-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <Th>User</Th>
                <Th>Contact</Th>
                <Th>CIN</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th>Last Login</Th>
                <Th>User Activity</Th>
                <Th align="center">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user) => {
                const role = ROLES[normalize(user.role)] || ROLES.operator;
                const RoleIcon = role.icon;
                return (
                  <tr key={user.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                    <Td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: getAvatarColor(user.id), color: "white", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13 }}>
                          {getInitials(user.nom, user.prenom)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{user.prenom} {user.nom}</div>
                          {user.is_first_login && <div style={{ fontSize: 12, color: "#f59e0b" }}>First login pending</div>}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div style={{ display: "grid", gap: 4, color: "#334155", fontSize: 13 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Mail size={12} /> {user.email}</span>
                      </div>
                    </Td>
                    <Td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#334155", fontSize: 13 }}>
                        <IdCard size={12} /> {user.cin}
                      </span>
                    </Td>
                    <Td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: role.bgColor, color: role.color, fontSize: 12, fontWeight: 700 }}>
                        <RoleIcon size={12} /> {role.label}
                      </span>
                    </Td>
                    <Td>
                      <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, background: user.is_active ? "#d1fae5" : "#fee2e2", color: user.is_active ? "#065f46" : "#991b1b", fontSize: 12, fontWeight: 700 }}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </Td>
                    <Td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 13 }}>
                        <Calendar size={12} /> {formatDate(user.created_at)}
                      </span>
                    </Td>
                    <Td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 13 }}>
                        <Clock3 size={12} /> {formatDate(user.last_login)}
                      </span>
                    </Td>
                    <Td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 10px", borderRadius: 999, background: "#f1f5f9", color: "#0f172a", fontSize: 12, fontWeight: 700 }}>
                        <Activity size={12} /> {user.login_count || 0} ({activityLabel(user.login_count || 0)})
                      </span>
                    </Td>
                    <Td align="center">
                      {isAdmin ? (
                        <div style={{ display: "inline-flex", gap: 8 }}>
                          <button
                            onClick={() => openEditModal(user)}
                            className="um-action-btn"
                            style={{ background: "#dbeafe", color: "#1d4ed8" }}
                            title="Modifier"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => resetPassword(user)}
                            className="um-action-btn"
                            style={{ background: "#fef3c7", color: "#b45309" }}
                            title="Reset Password"
                          >
                            <KeyRound size={14} />
                          </button>
                          <button onClick={() => deleteUser(user)} className="um-action-btn" style={{ background: "#fee2e2", color: "#dc2626" }} title="Supprimer">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: 13 }}>—</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {paginatedUsers.length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
            <Users size={42} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
            Aucun utilisateur trouvé
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 16, borderTop: "1px solid #e2e8f0", background: "#f8fafc", flexWrap: "wrap" }}>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredUsers.length)} sur {filteredUsers.length}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={pagerButtonStyle(currentPage === 1)}><ChevronsLeft size={14} /></button>
            <button onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} style={pagerButtonStyle(currentPage === 1)}><ChevronLeft size={14} /></button>
            <span style={{ padding: "6px 12px", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", color: "white", borderRadius: 10, fontSize: 13, fontWeight: 700 }}>{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} style={pagerButtonStyle(currentPage === totalPages)}><ChevronRight size={14} /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={pagerButtonStyle(currentPage === totalPages)}><ChevronsRight size={14} /></button>
          </div>
        </div>
      </section>
    </div>
  );
};

const Th = ({ children, align = "left" }) => (
  <th style={{ padding: "14px 16px", textAlign: align, fontSize: 11.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.55 }}>
    {children}
  </th>
);

const Td = ({ children, align = "left" }) => (
  <td style={{ padding: "14px 16px", textAlign: align, verticalAlign: "middle", color: "#0f172a" }}>
    {children}
  </td>
);

const pagerButtonStyle = (disabled) => ({
  width: 36,
  height: 36,
  borderRadius: 10,
  border: "1px solid #d1d9e6",
  background: "white",
  color: "#334155",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
  display: "grid",
  placeItems: "center",
  boxShadow: disabled ? "none" : "0 3px 10px rgba(15, 23, 42, 0.08)",
  transition: "all .16s ease"
});

export default UserManagement;
