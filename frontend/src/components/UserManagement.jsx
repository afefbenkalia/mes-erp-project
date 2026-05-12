import React, { useEffect, useMemo, useRef, useState } from "react";
import API from "../api/api";
import {
  Search, UserPlus, Pencil, Trash2, KeyRound, X,
  Shield, UserCog, User, Wrench, TrendingUp,
  Clock3, BarChart3, CheckCircle, XCircle, AlertCircle,
  Loader, Mail, Calendar, Users, Activity, IdCard,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Globe
} from "lucide-react";

// ─── constants ─────────────────────────────────────────────
const ROLES = {
  admin:       { label: "Administrateur", icon: Shield,  color: "#7c3aed", bg: "#ede9fe" },
  manager:     { label: "Manager",        icon: UserCog, color: "#2563eb", bg: "#dbeafe" },
  operator:    { label: "Opérateur",      icon: User,    color: "#059669", bg: "#d1fae5" },
  maintenance: { label: "Maintenance",    icon: Wrench,  color: "#d97706", bg: "#fef3c7" },
};

const emptyForm = { cin: "", nom: "", prenom: "", email: "", role: "operator", erp_access: false };

// ─── utilities ─────────────────────────────────────────────
const normalizeCin   = (v) => (v || "").replace(/\D/g, "").slice(0, 8);
const isValidCin     = (v) => /^\d{8}$/.test((v || "").trim());
const normalize      = (v) => v?.toLowerCase().trim();

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const getInitials    = (nom, prenom) => `${prenom?.trim()?.[0] || ""}${nom?.trim()?.[0] || ""}`.toUpperCase() || "U";
const avatarPalette  = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2"];
const getAvatarColor = (id) => avatarPalette[id % avatarPalette.length];

const activityLabel = (n) => {
  if (!n)     return "Nouveau";
  if (n < 5)  return "Faible";
  if (n < 15) return "Moyen";
  return "Élevé";
};

const activityStyle = (n) => {
  if (!n)     return { color: "#64748b", bg: "#f1f5f9" };
  if (n < 5)  return { color: "#d97706", bg: "#fef3c7" };
  if (n < 15) return { color: "#2563eb", bg: "#dbeafe" };
  return          { color: "#059669", bg: "#d1fae5" };
};

// ─── global styles ─────────────────────────────────────────
const CSS = `
.um * { box-sizing: border-box; }
.um {
  min-height: 100vh;
  background: #f8fafc;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
}
.um-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(15,23,42,.04), 0 1px 2px rgba(15,23,42,.02);
}
.um-kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}
.um-role-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
}
.um-kpi {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: 0 1px 3px rgba(15,23,42,.04);
  transition: box-shadow .2s ease, transform .2s ease;
  cursor: default;
  min-height: 96px;
}
.um-kpi:hover {
  box-shadow: 0 8px 24px rgba(15,23,42,.09);
  transform: translateY(-2px);
}
.um-role-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(15,23,42,.04);
}
.um-role-card:hover {
  box-shadow: 0 8px 20px rgba(15,23,42,.08);
  transform: translateY(-1px);
}
.um-tr { border-top: 1px solid #f1f5f9; transition: background .12s; }
.um-tr:hover { background: #f8fafc; }
.um-act {
  width: 32px; height: 32px;
  border-radius: 8px; border: 1px solid transparent;
  cursor: pointer; display: grid; place-items: center;
  transition: all .14s;
}
.um-act:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0,0,0,.1);
}
.um-btn-primary {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 18px;
  background: #0f172a; color: #fff;
  border: none; border-radius: 10px; cursor: pointer;
  font-size: 13px; font-weight: 600;
  transition: all .14s;
  box-shadow: 0 1px 3px rgba(0,0,0,.1);
  white-space: nowrap;
}
.um-btn-primary:hover:not(:disabled) {
  background: #1e293b;
  box-shadow: 0 4px 14px rgba(15,23,42,.22);
  transform: translateY(-1px);
}
.um-btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.um-btn-ghost {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 18px;
  background: #fff; color: #475569;
  border: 1px solid #e2e8f0; border-radius: 10px; cursor: pointer;
  font-size: 13px; font-weight: 600;
  transition: all .14s;
}
.um-btn-ghost:hover { background: #f8fafc; border-color: #cbd5e1; }
.um-input {
  width: 100%;
  padding: 10px 13px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px; color: #0f172a;
  background: #fff; outline: none;
  transition: border-color .15s, box-shadow .15s;
  appearance: none;
}
.um-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37,99,235,.1);
}
.um-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11.5px; font-weight: 700;
  white-space: nowrap;
}
.um-pager {
  width: 34px; height: 34px;
  border: 1px solid #e2e8f0; border-radius: 8px;
  background: #fff; color: #475569;
  cursor: pointer; display: grid; place-items: center;
  transition: all .14s;
}
.um-pager:hover:not(:disabled) { background: #f1f5f9; border-color: #cbd5e1; }
.um-pager:disabled { opacity: .4; cursor: not-allowed; }
.spin { animation: _spin 1s linear infinite; }
@keyframes _spin { to { transform: rotate(360deg); } }
@keyframes um-slide-in {
  from { opacity: 0; transform: translateX(16px) scale(.97); }
  to   { opacity: 1; transform: translateX(0)    scale(1);   }
}
@keyframes um-progress {
  from { width: 100%; }
  to   { width: 0%;   }
}
@media (max-width: 768px) { .um { padding: 14px; } }
`;

// ─── Toast ─────────────────────────────────────────────────
const TOAST_DURATION = 4000;

const Toast = ({ message, type = "success", onClose }) => {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });
  useEffect(() => {
    const t = setTimeout(() => onCloseRef.current(), TOAST_DURATION);
    return () => clearTimeout(t);
  }, []);

  const v = ({
    success: { Icon: CheckCircle, ring: "#6ee7b7", bg: "#f0fdf4", text: "#065f46", ic: "#059669" },
    error:   { Icon: XCircle,     ring: "#fca5a5", bg: "#fff1f2", text: "#991b1b", ic: "#dc2626" },
    info:    { Icon: AlertCircle, ring: "#93c5fd", bg: "#eff6ff", text: "#1e40af", ic: "#2563eb" },
  })[type] ?? { Icon: AlertCircle, ring: "#93c5fd", bg: "#eff6ff", text: "#1e40af", ic: "#2563eb" };

  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column",
      background: v.bg, color: v.text,
      borderRadius: 14, overflow: "hidden",
      border: `1px solid ${v.ring}`,
      boxShadow: "0 12px 40px rgba(15,23,42,.15), 0 2px 8px rgba(15,23,42,.08)",
      minWidth: 300, maxWidth: 420,
      animation: "um-slide-in .28s cubic-bezier(.2,.8,.4,1) both",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px" }}>
        <v.Icon size={17} style={{ color: v.ic, flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 13.5, lineHeight: 1.5, flex: 1 }}>{message}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: v.text, cursor: "pointer", opacity: .5, padding: 0, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <X size={15} />
        </button>
      </div>
      <div style={{ height: 3, background: "rgba(0,0,0,.07)" }}>
        <div style={{ height: "100%", background: v.ic, animation: `um-progress ${TOAST_DURATION}ms linear forwards` }} />
      </div>
    </div>
  );
};

// ─── Field ─────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .4 }}>
      {label}
    </span>
    {children}
  </div>
);

// ─── UserModal ─────────────────────────────────────────────
const UserModal = ({ isOpen, onClose, onSave, form, setForm, loading, mode = "create" }) => {
  if (!isOpen) return null;
  const isEdit = mode === "edit";
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,.65)", backdropFilter: "blur(8px)" }} onClick={onClose} />
      <div style={{ position: "relative", width: "100%", maxWidth: 540, background: "#fff", borderRadius: 20, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 32px 80px rgba(15,23,42,.28)" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", opacity: .5, marginBottom: 3 }}>
              {isEdit ? "Modification" : "Nouveau compte"}
            </div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
              {isEdit ? "Modifier l'utilisateur" : "Créer un utilisateur"}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.18)", width: 32, height: 32, borderRadius: 8, color: "#fff", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => { e.preventDefault(); onSave(); }} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="CIN">
            <input
              value={form.cin}
              onChange={(e) => setForm({ ...form, cin: normalizeCin(e.target.value) })}
              required placeholder="12345678"
              inputMode="numeric" pattern="[0-9]{8}"
              title="Le CIN doit contenir exactement 8 chiffres"
              maxLength={8} className="um-input"
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Nom">
              <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required placeholder="Ben Ali" className="um-input" />
            </Field>
            <Field label="Prénom">
              <input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required placeholder="Amine" className="um-input" />
            </Field>
          </div>

          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="amine@company.com" className="um-input" />
          </Field>

          <Field label="Rôle">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value, erp_access: e.target.value !== "manager" ? false : form.erp_access })}
              className="um-input"
            >
              <option value="admin">Administrateur</option>
              <option value="manager">Manager</option>
              <option value="operator">Opérateur</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </Field>

          {form.role === "manager" && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              padding: "14px 16px", borderRadius: 12,
              background: form.erp_access ? "#f0fdf4" : "#f8fafc",
              border: `1.5px solid ${form.erp_access ? "#86efac" : "#e2e8f0"}`,
              transition: "all .2s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: form.erp_access ? "#dcfce7" : "#f1f5f9", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <Globe size={15} style={{ color: form.erp_access ? "#16a34a" : "#94a3b8" }} />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>Accès ERP</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>
                    {form.erp_access ? "Module ERP accessible" : "MES uniquement"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, erp_access: !form.erp_access })}
                style={{ width: 44, height: 24, borderRadius: 999, border: "none", cursor: "pointer", background: form.erp_access ? "#16a34a" : "#cbd5e1", position: "relative", transition: "background .2s", flexShrink: 0 }}
              >
                <div style={{ position: "absolute", top: 3, left: form.erp_access ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
              </button>
            </div>
          )}

          {isEdit && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>Statut du compte</div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={Boolean(form.is_active)} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} style={{ width: 16, height: 16, accentColor: "#2563eb" }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: form.is_active ? "#16a34a" : "#94a3b8" }}>
                  {form.is_active ? "Actif" : "Inactif"}
                </span>
              </label>
            </div>
          )}

          {!isEdit && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 14px", borderRadius: 10, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
              <AlertCircle size={14} style={{ color: "#2563eb", flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 12.5, color: "#1e40af", lineHeight: 1.55 }}>
                Un mot de passe temporaire sécurisé sera généré et envoyé par email. L'utilisateur devra le modifier à sa première connexion.
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4, borderTop: "1px solid #f1f5f9", marginTop: 2 }}>
            <button type="button" onClick={onClose} className="um-btn-ghost">Annuler</button>
            <button type="submit" disabled={loading} className="um-btn-primary">
              {loading ? <Loader size={14} className="spin" /> : (isEdit ? "Enregistrer" : "Créer")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main ──────────────────────────────────────────────────
const defaultStats = { total: 0, active: 0, inactive: 0, created_this_month: 0, growth_percentage: 0, per_role: [] };

const UserManagement = () => {
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [search, setSearch]             = useState("");
  const [roleFilter, setRoleFilter]     = useState("all");
  const [showModal, setShowModal]       = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm]                 = useState(emptyForm);
  const [editForm, setEditForm]         = useState({ ...emptyForm, is_active: true });
  const [editingUserId, setEditingUserId] = useState(null);
  const [toast, setToast]               = useState(null);
  const [stats, setStats]               = useState(defaultStats);
  const [currentPage, setCurrentPage]   = useState(1);
  const [itemsPerPage]                  = useState(10);

  const token       = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin     = normalize(currentUser.role) === "admin";

  const showToast = (message, type = "success") => setToast({ message, type });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const r = await API.get("/auth/users", { headers: { Authorization: `Bearer ${token}` } });
      setUsers(r.data);
    } catch (e) {
      showToast(e.response?.data?.detail || "Erreur lors du chargement des utilisateurs", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersStats = async () => {
    try {
      const r = await API.get("/auth/users/stats", { headers: { Authorization: `Bearer ${token}` } });
      setStats(r.data || defaultStats);
    } catch {
      setStats(defaultStats);
    }
  };

  useEffect(() => { Promise.all([fetchUsers(), fetchUsersStats()]); }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch = !term || [u.cin, u.nom, u.prenom, u.email].filter(Boolean).some((v) => v.toLowerCase().includes(term));
      const matchesRole   = roleFilter === "all" || normalize(u.role) === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const totalPages     = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [search, roleFilter]);

  const roleStats = (stats.per_role || [])
    .map((e) => ({ role: normalize(e.role) || "operator", count: e.count || 0 }))
    .filter((e) => ROLES[e.role]);

  const createUser = async () => {
    if (!form.cin || !form.nom || !form.prenom || !form.email) { showToast("Veuillez remplir tous les champs obligatoires.", "error"); return; }
    if (!isValidCin(form.cin)) { showToast("Le CIN doit contenir exactement 8 chiffres.", "error"); return; }
    try {
      setSaving(true);
      await API.post("/auth/create-user", {
        cin: normalizeCin(form.cin), nom: form.nom.trim(), prenom: form.prenom.trim(),
        email: form.email.trim(), role: form.role,
        erp_access: form.role === "manager" ? form.erp_access : false,
      }, { headers: { Authorization: `Bearer ${token}` } });
      showToast("Utilisateur créé. Le mot de passe temporaire a été envoyé par email.");
      setForm(emptyForm); setShowModal(false);
      await Promise.all([fetchUsers(), fetchUsersStats()]);
    } catch (e) { showToast(e.response?.data?.detail || "Erreur lors de la création.", "error"); }
    finally { setSaving(false); }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Supprimer ${user.prenom} ${user.nom} ?`)) return;
    try {
      await API.delete(`/auth/users/${user.id}`, { headers: { Authorization: `Bearer ${token}` } });
      showToast("Utilisateur supprimé.");
      await Promise.all([fetchUsers(), fetchUsersStats()]);
    } catch (e) { showToast(e.response?.data?.detail || "Erreur lors de la suppression.", "error"); }
  };

  const resetPassword = async (user) => {
    if (!window.confirm(`Réinitialiser le mot de passe de ${user.prenom} ${user.nom} ?`)) return;
    try {
      setSaving(true);
      await API.post(`/auth/users/${user.id}/reset-password`, {}, { headers: { Authorization: `Bearer ${token}` } });
      showToast("Mot de passe temporaire régénéré et envoyé par email.");
      await Promise.all([fetchUsers(), fetchUsersStats()]);
    } catch (e) { showToast(e.response?.data?.detail || "Erreur lors de la réinitialisation.", "error"); }
    finally { setSaving(false); }
  };

  const openEditModal = (user) => {
    setEditingUserId(user.id);
    setEditForm({
      cin: user.cin || "", nom: user.nom || "", prenom: user.prenom || "",
      email: user.email || "", role: normalize(user.role) || "operator",
      is_active: Boolean(user.is_active), erp_access: Boolean(user.erp_access),
    });
    setShowEditModal(true);
  };

  const updateUser = async () => {
    if (!editingUserId) { showToast("Utilisateur invalide.", "error"); return; }
    if (!editForm.cin || !editForm.nom || !editForm.prenom || !editForm.email) { showToast("Veuillez remplir tous les champs obligatoires.", "error"); return; }
    if (!isValidCin(editForm.cin)) { showToast("Le CIN doit contenir exactement 8 chiffres.", "error"); return; }
    try {
      setSaving(true);
      await API.put(`/auth/users/${editingUserId}`, {
        cin: normalizeCin(editForm.cin), nom: editForm.nom.trim(), prenom: editForm.prenom.trim(),
        email: editForm.email.trim(), role: editForm.role, is_active: Boolean(editForm.is_active),
        erp_access: editForm.role === "manager" ? editForm.erp_access : false,
      }, { headers: { Authorization: `Bearer ${token}` } });
      showToast("Utilisateur mis à jour.");
      setShowEditModal(false); setEditingUserId(null);
      await Promise.all([fetchUsers(), fetchUsersStats()]);
    } catch (e) { showToast(e.response?.data?.detail || "Erreur lors de la mise à jour.", "error"); }
    finally { setSaving(false); }
  };

  // ── loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, color: "#64748b" }}>
          <Loader size={36} className="spin" style={{ color: "#2563eb" }} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>Chargement des utilisateurs…</span>
        </div>
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────
  return (
    <div className="um">
      <style>{CSS}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <UserModal isOpen={showModal}     onClose={() => setShowModal(false)}                                                         onSave={createUser} form={form}     setForm={setForm}     loading={saving} />
      <UserModal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setEditingUserId(null); }} onSave={updateUser} form={editForm} setForm={setEditForm} loading={saving} mode="edit" />

      {/* ── Page header ──────────────────────────────────── */}
      <header className="um-card" style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Users size={20} style={{ color: "#fff" }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a", letterSpacing: -.3 }}>
              Gestion des utilisateurs
            </h1>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "#64748b" }}>
              Création, onboarding email, rôles et contrôle des accès
            </p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => setShowModal(true)} className="um-btn-primary">
            <UserPlus size={15} /> Nouvel utilisateur
          </button>
        )}
      </header>

      {/* ── KPI cards ────────────────────────────────────── */}
      <div className="um-kpi-grid">
        {[
          { label: "Total",      value: stats.total,              icon: Users,       color: "#2563eb", bg: "#eff6ff" },
          { label: "Actifs",     value: stats.active,             icon: CheckCircle, color: "#059669", bg: "#f0fdf4" },
          { label: "Inactifs",   value: stats.inactive,           icon: XCircle,     color: "#dc2626", bg: "#fff1f2" },
          { label: "Ce mois",    value: stats.created_this_month, icon: Calendar,    color: "#7c3aed", bg: "#faf5ff" },
          {
            label: "Croissance",
            value: `${stats.growth_percentage > 0 ? "+" : ""}${stats.growth_percentage}%`,
            icon: TrendingUp,
            color: stats.growth_percentage >= 0 ? "#059669" : "#dc2626",
            bg:    stats.growth_percentage >= 0 ? "#f0fdf4" : "#fff1f2",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <article key={label} className="um-kpi">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "grid", placeItems: "center" }}>
                <Icon size={17} style={{ color }} />
              </div>
              <span style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{value}</span>
            </div>
            <div style={{ marginTop: 14, fontSize: 12.5, fontWeight: 600, color: "#64748b" }}>{label}</div>
          </article>
        ))}
      </div>

      {/* ── Role distribution ────────────────────────────── */}
      {roleStats.length > 0 && (
        <section className="um-card" style={{ padding: 18, display: "grid", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: .9, textTransform: "uppercase", color: "#64748b", marginBottom: 4 }}>Répartition des rôles</div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>Lecture rapide des volumes par profil utilisateur.</div>
          </div>
          <div className="um-role-grid">
          {roleStats.map(({ role, count }) => {
            const r = ROLES[role];
            const Icon = r.icon;
            return (
              <div key={role} className="um-role-card">
                <div style={{ width: 36, height: 36, borderRadius: 10, background: r.bg, display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <Icon size={15} style={{ color: r.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .35 }}>{r.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", lineHeight: 1.05 }}>{count}</div>
                </div>
              </div>
            );
          })}
          </div>
        </section>
      )}

      {/* ── Toolbar ──────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div
          style={{ flex: "1 1 280px", display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "0 14px", boxShadow: "0 1px 3px rgba(15,23,42,.04)", transition: "border-color .15s" }}
          onFocusCapture={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
          onBlurCapture={(e)  => (e.currentTarget.style.borderColor = "#e2e8f0")}
        >
          <Search size={15} style={{ color: "#94a3b8", flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par CIN, nom, prénom ou email…"
            style={{ border: "none", outline: "none", padding: "11px 0", flex: 1, fontSize: 13.5, background: "transparent", color: "#0f172a" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "grid", placeItems: "center", padding: 0 }}>
              <X size={14} />
            </button>
          )}
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="um-input" style={{ maxWidth: 200, flex: "0 1 200px" }}>
          <option value="all">Tous les rôles</option>
          <option value="admin">Administrateur</option>
          <option value="manager">Manager</option>
          <option value="operator">Opérateur</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div className="um-card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                {["Utilisateur", "CIN", "Rôle", "Statut", "Créé le", "Dernière connexion", "Activité", ""].map((h, i) => (
                  <th key={i} style={{ padding: "12px 16px", textAlign: i === 7 ? "center" : "left", fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .7, whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user) => {
                const role     = ROLES[normalize(user.role)] || ROLES.operator;
                const RoleIcon = role.icon;
                const act      = activityStyle(user.login_count || 0);
                return (
                  <tr key={user.id} className="um-tr">

                    {/* User + email */}
                    <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: getAvatarColor(user.id), color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                          {getInitials(user.nom, user.prenom)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 13.5, whiteSpace: "nowrap" }}>
                            {user.prenom} {user.nom}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4, marginTop: 2, whiteSpace: "nowrap" }}>
                            <Mail size={11} /> {user.email}
                          </div>
                          {user.is_first_login && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, color: "#d97706", fontWeight: 600, marginTop: 2 }}>
                              <AlertCircle size={10} /> 1ère connexion en attente
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* CIN */}
                    <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#475569", fontFamily: "monospace", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "4px 8px", borderRadius: 7 }}>
                        <IdCard size={11} /> {user.cin}
                      </span>
                    </td>

                    {/* Role + ERP */}
                    <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <span className="um-badge" style={{ background: role.bg, color: role.color }}>
                          <RoleIcon size={11} /> {role.label}
                        </span>
                        {normalize(user.role) === "manager" && user.erp_access && (
                          <span className="um-badge" style={{ background: "#dcfce7", color: "#15803d", fontSize: 10.5 }}>
                            <Globe size={9} /> ERP
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                      <span className="um-badge" style={{ background: user.is_active ? "#f0fdf4" : "#fff1f2", color: user.is_active ? "#15803d" : "#b91c1c" }}>
                        {user.is_active ? <><CheckCircle size={11} /> Actif</> : <><XCircle size={11} /> Inactif</>}
                      </span>
                    </td>

                    {/* Created */}
                    <td style={{ padding: "14px 16px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#64748b" }}>
                        <Calendar size={11} /> {formatDate(user.created_at)}
                      </span>
                    </td>

                    {/* Last login */}
                    <td style={{ padding: "14px 16px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#64748b" }}>
                        <Clock3 size={11} /> {formatDate(user.last_login)}
                      </span>
                    </td>

                    {/* Activity */}
                    <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                      <span className="um-badge" style={{ background: act.bg, color: act.color }}>
                        <Activity size={11} /> {user.login_count || 0} · {activityLabel(user.login_count || 0)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "14px 16px", verticalAlign: "middle", textAlign: "center" }}>
                      {isAdmin ? (
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button onClick={() => openEditModal(user)} className="um-act" style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }} title="Modifier">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => resetPassword(user)} className="um-act" style={{ background: "#fefce8", color: "#ca8a04", border: "1px solid #fde68a" }} title="Réinitialiser mot de passe">
                            <KeyRound size={13} />
                          </button>
                          <button onClick={() => deleteUser(user)} className="um-act" style={{ background: "#fff1f2", color: "#dc2626", border: "1px solid #fecaca" }} title="Supprimer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#cbd5e1", fontSize: 13 }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {paginatedUsers.length === 0 && (
          <div style={{ padding: "56px 24px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "#f1f5f9", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
              <Users size={24} style={{ color: "#94a3b8" }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Aucun utilisateur trouvé</div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>Modifiez votre recherche ou créez un nouvel utilisateur.</div>
          </div>
        )}

        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: "1px solid #f1f5f9", background: "#fafbfc", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: "#64748b" }}>
            {filteredUsers.length === 0
              ? "Aucun résultat"
              : `${(currentPage - 1) * itemsPerPage + 1} – ${Math.min(currentPage * itemsPerPage, filteredUsers.length)} sur ${filteredUsers.length}`}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="um-pager"><ChevronsLeft size={13} /></button>
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="um-pager"><ChevronLeft size={13} /></button>
            <span style={{ padding: "6px 14px", background: "#0f172a", color: "#fff", borderRadius: 8, fontSize: 12.5, fontWeight: 700 }}>
              {currentPage} / {totalPages}
            </span>
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="um-pager"><ChevronRight size={13} /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="um-pager"><ChevronsRight size={13} /></button>
          </div>
        </div>
      </div>
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
