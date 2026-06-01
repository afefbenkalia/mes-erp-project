import React, { useCallback, useEffect, useRef, useState } from "react";
import logo from "../assets/logo_sitex.jpg";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Factory,
  FileText,
  GitMerge,
  HardDrive,
  History,
  LayoutDashboard,
  LogOut,
  Search,
  SlidersHorizontal,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";

import Production            from "./dashboard/Production";
import OrdresFabrication     from "./dashboard/OrdresFabrication";
import Traceability           from "./dashboard/Traceability";
import UserManagement         from "./UserManagement";
import Machine                from "./dashboard/Machine";
import ProductionDashboard    from "./dashboard/DashboardMes/ProductionDashboard";
import MaintenanceDashboard   from "./maintenance/MaintenanceDashboard";
import Operateur              from "./operateur/Operateur";
import ReportsDashboard       from "./reports/ReportsDashboard";
import { subscribeMaintenanceEvents } from "../services/maintenanceSocket";
import { authAPI } from "../api/api";

/* ─────────────────────────────────────────
   ROLE / MODULE CONFIGURATION
───────────────────────────────────────── */
const ROLE_CONFIG = {
  admin:       { defaultModule: "users",                 modules: ["users"] },
  manager:     { defaultModule: "dashboard",             modules: ["dashboard","production","ordres","traceability","machine","rapports"] },
  maintenance: { defaultModule: "maintenance-dashboard", modules: ["maintenance-dashboard","maintenance-interventions","maintenance-historique","maintenance-preventive"] },
  operateur:   { defaultModule: "production",            modules: ["production","ordres","operateur"] },
};

const ROLE_TO_CONFIG_KEY = {
  operator:                "operateur",
  operateur:               "operateur",
  responsable_maintenance: "maintenance",
};

const S = 18; // uniform sidebar icon size

const MODULE_CONFIG = {
  dashboard:                   { label: "Dashboard",     icon: <LayoutDashboard size={S} />, component: ProductionDashboard },
  production:                  { label: "Production",    icon: <Factory size={S} />,         component: Production },
  ordres:                      { label: "Ordres Fab.",   icon: <ClipboardList size={S} />,   component: OrdresFabrication },
  traceability:                { label: "Traçabilité",   icon: <GitMerge size={S} />,        component: Traceability },
  machine:                     { label: "Machines",      icon: <HardDrive size={S} />,       component: Machine },
  "maintenance-dashboard":     { label: "Dashboard",     icon: <LayoutDashboard size={S} />, component: MaintenanceDashboard },
  "maintenance-interventions": { label: "Interventions", icon: <Zap size={S} />,             component: MaintenanceDashboard },
  "maintenance-historique":    { label: "Historique",    icon: <History size={S} />,         component: MaintenanceDashboard },
  "maintenance-preventive":    { label: "Préventive",    icon: <CalendarClock size={S} />,   component: MaintenanceDashboard },
  users:                       { label: "Utilisateurs",  icon: <Users size={S} />,           component: UserManagement },
  operateur:                   { label: "Machines",      icon: <SlidersHorizontal size={S} />, component: Operateur },
  rapports:                    { label: "Rapports",      icon: <FileText size={S} />,          component: ReportsDashboard },
};

const ROLE_LABELS = {
  admin:                   "Administrateur",
  manager:                 "Manager",
  maintenance:             "Maintenance",
  operateur:               "Opérateur",
  operator:                "Opérateur",
  responsable_maintenance: "Resp. Maintenance",
};

const ROLE_COLORS = {
  admin:                   { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  manager:                 { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  maintenance:             { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  responsable_maintenance: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  operateur:               { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  operator:                { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
};

/* ── relative time formatter ── */
const formatRelativeTime = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const deltaSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (deltaSec < 10)  return "À l'instant";
  if (deltaSec < 60)  return `Il y a ${deltaSec}s`;
  const min = Math.floor(deltaSec / 60);
  if (min < 60) return `Il y a ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
};

/* dot color by notification event type / state */
const EVENT_DOT_COLORS = {
  ERREUR:      "#ef4444",
  MAINTENANCE: "#f59e0b",
  MARCHE:      "#22c55e",
  PAUSE:       "#94a3b8",
  RESET:       "#8b5cf6",
};
const getNotifDot = (payload) => {
  if (payload?.state) return EVENT_DOT_COLORS[payload.state] || "#3b82f6";
  return "#3b82f6";
};

const MAX_NOTIFS = 30;

const SIDEBAR_W_OPEN  = 244;
const SIDEBAR_W_CLOSE = 62;
const NAVBAR_H        = 62;

/* ─────────────────────────────────────────
   COMPOSANT DE RECHERCHE AMÉLIORÉ
───────────────────────────────────────── */
function SearchOverlay({ isOpen, onClose, searchQuery, setSearchQuery, menu, activeModule, setActiveModule }) {
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = menu.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems([]);
    }
    setSelectedIndex(-1);
  }, [searchQuery, menu]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target)) {
        onClose();
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      handleSelectItem(filteredItems[selectedIndex]);
    }
  };

  const handleSelectItem = (item) => {
    setActiveModule(item.id);
    setSearchQuery("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      zIndex: 1000,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      backdropFilter: "blur(4px)",
    }}>
      <div ref={overlayRef} style={{
        marginTop: "80px",
        width: "500px",
        maxWidth: "90%",
        background: "white",
        borderRadius: "16px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        overflow: "hidden",
      }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Search size={20} color="#94a3b8" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Rechercher un module..."
              style={{
                flex: 1,
                border: "none",
                fontSize: "16px",
                outline: "none",
                padding: "8px 0",
                background: "transparent",
              }}
            />
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "6px",
              }}
            >
              <X size={20} color="#94a3b8" />
            </button>
          </div>
        </div>
        
        <div style={{ maxHeight: "400px", overflowY: "auto" }}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => handleSelectItem(item)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  width: "100%",
                  padding: "12px 16px",
                  border: "none",
                  background: index === selectedIndex ? "#f1f5f9" : "white",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s",
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span style={{ color: "#4a7fc1" }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, color: "#0f172a" }}>{item.label}</div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                    Module {item.id}
                  </div>
                </div>
                {activeModule === item.id && (
                  <span style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#22c55e",
                  }} />
                )}
              </button>
            ))
          ) : searchQuery ? (
            <div style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#94a3b8",
            }}>
              <Search size={40} style={{ marginBottom: "12px", opacity: 0.5 }} />
              <p>Aucun résultat pour "{searchQuery}"</p>
            </div>
          ) : null}
        </div>
        
        {filteredItems.length > 0 && (
          <div style={{
            padding: "12px 16px",
            borderTop: "1px solid #f1f5f9",
            fontSize: "12px",
            color: "#94a3b8",
            background: "#f8fafc",
            display: "flex",
            gap: "16px",
          }}>
            <span>↑↓ Naviguer</span>
            <span>↵ Sélectionner</span>
            <span>⎋ Fermer</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   COMPONENT PRINCIPAL
───────────────────────────────────────── */
export default function MESDashboard() {
  const [user,          setUser]         = useState(null);
  const [activeModule,  setActiveModule] = useState("");
  const [sidebarOpen,   setSidebarOpen]  = useState(true);
  const [currentTime,   setCurrentTime]  = useState(new Date());
  const [searchQuery,   setSearchQuery]  = useState("");
  const [searchOpen,    setSearchOpen]   = useState(false);
  const [notifOpen,     setNotifOpen]    = useState(false);
  const [notifs,        setNotifs]       = useState([]);
  const [notifTick,     setNotifTick]    = useState(0);
  const notifIdRef      = useRef(0);
  const userRoleRef     = useRef(null);
  const seenNotifKeys   = useRef(new Set());
  const searchShortcutRef = useRef(null);

  const notifRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  /* ── refresh relative times every 30s ── */
  useEffect(() => {
    const id = setInterval(() => setNotifTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  /* ── Search shortcut Ctrl/Cmd + K ── */
  useEffect(() => {
    const handleGlobalSearchShortcut = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleGlobalSearchShortcut);
    return () => document.removeEventListener('keydown', handleGlobalSearchShortcut);
  }, []);

  /* ── Notification push helpers ── */
  const pushNotif = useCallback((title, payload) => {
    notifIdRef.current += 1;
    const entry = {
      id: notifIdRef.current,
      title,
      timestamp: payload?.timestamp || new Date().toISOString(),
      dot: getNotifDot(payload),
    };
    setNotifs((prev) => [entry, ...prev].slice(0, MAX_NOTIFS));
  }, []);

  // Déduplication DB + WS : même demande ne s'affiche qu'une fois
  const pushNotifDeduped = useCallback((title, payload) => {
    if (payload?.user_email && payload?.timestamp) {
      const key = `${payload.user_email}-${payload.timestamp}`;
      if (seenNotifKeys.current.has(key)) return;
      seenNotifKeys.current.add(key);
    }
    pushNotif(title, payload);
  }, [pushNotif]);

  // Chargement des notifications non lues depuis la DB (admin uniquement)
  const loadDbNotifications = useCallback(async (role) => {
    if (role !== "admin") return;
    try {
      const res = await authAPI.getNotifications();
      const dbNotifs = res.data || [];
      dbNotifs.forEach((n) => {
        pushNotifDeduped(n.title, { ...(n.payload || {}), state: "RESET" });
      });
    } catch {
      // silencieux — ne bloque pas le dashboard
    }
  }, [pushNotifDeduped]);

  useEffect(() => {
    const unsubscribe = subscribeMaintenanceEvents({
      onStatusChange: () => {},
      onMessage: (message) => {
        if (!message || !message.event) return;
        const p    = message.payload || {};
        const role = userRoleRef.current;

        if (message.event === "forgot_password_request") {
          if (role === "admin") {
            pushNotifDeduped(
              `🔐 ${p.user_prenom} ${p.user_nom} — mot de passe oublié`,
              { ...p, state: "RESET" },
            );
          }
        } else if (role !== "admin") {
          if (message.event === "notification") {
            pushNotif(p.message || "Notification maintenance", p);
          } else if (message.event === "intervention_completed") {
            pushNotif(
              `Intervention clôturée — ${p.machine_reference || "Machine"}`,
              { ...p, state: "MARCHE" },
            );
          } else if (message.event === "machine_repaired") {
            pushNotif(
              p.message || `Machine ${p.machine_reference || ""} réparée`,
              { ...p, state: "PAUSE" },
            );
          }
        }
      },
    });
    return unsubscribe;
  }, [pushNotif]);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user"));
    if (!stored) { window.location.href = "/login"; return; }
    setUser(stored);
    userRoleRef.current = stored.role;
    const key    = ROLE_TO_CONFIG_KEY[stored.role] || stored.role;
    const config = ROLE_CONFIG[key];
    setActiveModule(config?.defaultModule || "dashboard");
    loadDbNotifications(stored.role);
  }, [loadDbNotifications]);

  if (!user) return null;

  const role       = user.role;
  const configKey  = ROLE_TO_CONFIG_KEY[role] || role;
  const roleConfig = ROLE_CONFIG[configKey];
  const roleLabel  = ROLE_LABELS[role]  || role;
  const roleColor  = ROLE_COLORS[role]  || ROLE_COLORS.manager;

  const handleLogout   = () => { localStorage.clear(); window.location.href = "/login"; };
  const clearAllNotifs = () => {
    setNotifs([]);
    setNotifOpen(false);
    seenNotifKeys.current.clear();
    authAPI.markNotificationsRead().catch(() => {});
  };

  const menu = (roleConfig?.modules || []).map((id) => ({
    id,
    label: MODULE_CONFIG[id]?.label || id,
    icon:  MODULE_CONFIG[id]?.icon  || null,
  }));

  const renderContent = () => {
    switch (activeModule) {
      case "maintenance-dashboard":
      case "maintenance-interventions":
      case "maintenance-historique":
      case "maintenance-preventive":
        return <MaintenanceDashboard activeTab={activeModule.replace("maintenance-", "")} />;
      case "dashboard":    return <ProductionDashboard />;
      case "production":   return <Production role={role} />;
      case "ordres":       return <OrdresFabrication />;
      case "traceability": return <Traceability />;
      case "machine":      return <Machine />;
      case "users":        return <UserManagement />;
      case "operateur":    return <Operateur />;
      case "rapports":     return <ReportsDashboard />;
      default:             return <div style={{ padding: 40, color: "#64748b", fontSize: 15 }}>Module introuvable.</div>;
    }
  };

  const W = sidebarOpen ? SIDEBAR_W_OPEN : SIDEBAR_W_CLOSE;

  const VDivider = () => (
    <div style={{ width: 1, height: 24, background: "#e2e8f0", flexShrink: 0 }} />
  );

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      background: "#f1f5f9",
    }}>

      {/* Overlay de recherche */}
      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => {
          setSearchOpen(false);
          setSearchQuery("");
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        menu={menu}
        activeModule={activeModule}
        setActiveModule={setActiveModule}
      />

      {/* ══════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════ */}
      <aside style={{
        width: W, minWidth: W,
        background: "linear-gradient(180deg, #1a2c4e 0%, #243b61 60%, #2e4a78 100%)",
        display: "flex", flexDirection: "column",
        transition: "width 0.28s cubic-bezier(.4,0,.2,1), min-width 0.28s cubic-bezier(.4,0,.2,1)",
        overflow: "hidden",
        boxShadow: "4px 0 24px rgba(0,0,0,0.22)",
        zIndex: 20, flexShrink: 0,
        fontFamily: "'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
      }}>

        {/* ── Brand header ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: sidebarOpen ? "20px 16px 18px" : "20px 0 18px",
          justifyContent: sidebarOpen ? "flex-start" : "center",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 10, flexShrink: 0,
            background: "#ffffff",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          }}>
            <img src={logo} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          {sidebarOpen && (
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.3px", lineHeight: 1.2 }}>SITEX</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: "0.8px", textTransform: "uppercase", marginTop: 2 }}>Sousse · CARDAGE MES</div>
            </div>
          )}
        </div>

        {/* ── Role badge ── */}
        {sidebarOpen && (
          <div style={{
            margin: "12px 14px",
            padding: "8px 14px",
            background: "rgba(74,127,193,0.15)",
            border: "1px solid rgba(74,127,193,0.28)",
            borderRadius: 10,
            fontSize: 11, fontWeight: 600,
            color: "rgba(255,255,255,0.8)",
            letterSpacing: "0.3px",
            display: "flex", alignItems: "center", gap: 8,
            flexShrink: 0,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "#4ade80", flexShrink: 0,
              boxShadow: "0 0 6px #4ade80",
            }} />
            {roleLabel}
          </div>
        )}

        {/* ── Nav items ── */}
        <nav style={{
          flex: 1,
          padding: sidebarOpen ? "8px 10px" : "14px 10px",
          overflowY: "auto", overflowX: "hidden",
          display: "flex", flexDirection: "column", gap: 3,
          scrollbarWidth: "thin", scrollbarColor: "#243b61 transparent",
        }}>
          {menu.map((item) => {
            const active = activeModule === item.id;
            return (
              <button
                key={item.id}
                title={!sidebarOpen ? item.label : undefined}
                onClick={() => setActiveModule(item.id)}
                style={{
                  display: "flex", alignItems: "center",
                  gap: 12,
                  justifyContent: sidebarOpen ? "flex-start" : "center",
                  padding: sidebarOpen ? "10px 12px" : "10px 0",
                  borderRadius: 12,
                  cursor: "pointer", width: "100%", textAlign: "left",
                  background: active ? "rgba(74,127,193,0.18)" : "transparent",
                  border: "none",
                  transition: "background 0.18s",
                  whiteSpace: "nowrap", overflow: "hidden",
                  position: "relative",
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                {/* Icon wrap */}
                <span style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: active ? "#4a7fc1" : "transparent",
                  color: active ? "#ffffff" : "rgba(255,255,255,0.5)",
                  boxShadow: active ? "0 4px 12px rgba(74,127,193,0.4)" : "none",
                  transition: "all 0.18s",
                }}>
                  {item.icon}
                </span>
                {sidebarOpen && (
                  <span style={{
                    fontSize: 13.5, fontWeight: active ? 600 : 500,
                    color: active ? "#ffffff" : "rgba(255,255,255,0.65)",
                    overflow: "hidden", textOverflow: "ellipsis",
                    flex: 1,
                    transition: "color 0.18s",
                  }}>
                    {item.label}
                  </span>
                )}
                {active && sidebarOpen && (
                  <span style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: "#4a7fc1", flexShrink: 0, marginRight: 2,
                  }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Footer / Logout ── */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "10px 10px 14px", flexShrink: 0,
        }}>
          <button
            title={!sidebarOpen ? "Déconnexion" : undefined}
            onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              justifyContent: sidebarOpen ? "flex-start" : "center",
              padding: sidebarOpen ? "10px 12px" : "10px 0",
              borderRadius: 12, border: "none",
              cursor: "pointer", width: "100%",
              background: "transparent",
              color: "#f87171",
              fontSize: 13.5, fontWeight: 500,
              whiteSpace: "nowrap",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.color = "#fca5a5"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent";           e.currentTarget.style.color = "#f87171"; }}
          >
            <span style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "inherit",
            }}>
              <LogOut size={18} />
            </span>
            {sidebarOpen && <span>Déconnexion</span>}
          </button>

          {sidebarOpen && (
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>MES Platform </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", marginTop: 2 }}>© 2026 SITEX Sousse</div>
            </div>
          )}
        </div>

      </aside>

      {/* ── Collapse toggle (outside aside to avoid overflow:hidden clipping) ── */}
      <button
        onClick={() => setSidebarOpen(o => !o)}
        title={sidebarOpen ? "Réduire" : "Développer"}
        style={{
          position: "fixed",
          top: 76,
          left: W - 14,
          width: 28, height: 28, borderRadius: "50%",
          background: "#2e4a78",
          border: "2px solid rgba(255,255,255,0.25)",
          color: "#ffffff",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
          transition: "left 0.28s cubic-bezier(.4,0,.2,1), background 0.2s",
          zIndex: 200,
          padding: 0,
        }}
      >
        {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* ══════════════════════════════════════
          MAIN AREA
      ══════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* TOP NAVBAR AVEC TITRE "Système MES" AVANT LA RECHERCHE */}
        <header style={{
          height: NAVBAR_H, flexShrink: 0,
          background: "white",
          borderBottom: "1px solid #e8edf3",
          display: "flex", alignItems: "center",
          padding: "0 24px",
          gap: 14,
          boxShadow: "0 1px 4px rgba(15,23,42,0.07)",
          zIndex: 10,
          marginBottom: 12,
        }}>

          {/* LEFT — Titre Système MES + recherche */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, minWidth: 0, flex: "0 1 auto" }}>
            {/* Titre Système MES */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#1e293b",
                letterSpacing: "-0.3px",
                background: "linear-gradient(135deg, #1e293b 0%, #2d3a4e 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}>
                Système MES
              </span>
            </div>

            {/* Barre de recherche */}
            <button
              onClick={() => setSearchOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "0 14px",
                height: 38,
                borderRadius: 10,
                background: "#f1f5f9",
                border: "1.5px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s",
                minWidth: 280,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "#f8fafc";
                e.currentTarget.style.borderColor = "#e2e8f0";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "#f1f5f9";
                e.currentTarget.style.borderColor = "transparent";
              }}
            >
              <Search size={15} color="#94a3b8" />
              <span style={{ flex: 1, textAlign: "left", color: "#94a3b8", fontSize: 13.5 }}>
                Rechercher un module...
              </span>
              <kbd style={{
                background: "#e2e8f0",
                padding: "2px 6px",
                borderRadius: 4,
                fontSize: 11,
                color: "#475569",
                fontFamily: "monospace",
              }}>
                ⌘K
              </kbd>
            </button>
          </div>

          {/* SPACER */}
          <div style={{ flex: 1 }} />

          {/* RIGHT - avec affichage Manager + email */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>

            {/* Horloge */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "0 8px" }}>
              <Clock3 size={14} color="#94a3b8" />
              <span style={{
                color: "#475569", fontSize: 12.5, fontWeight: 500,
                fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", letterSpacing: "-0.01em",
              }}>
                {currentTime.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })}
                <span style={{ color: "#cbd5e1", margin: "0 4px" }}>·</span>
                {currentTime.toLocaleTimeString("fr-FR")}
              </span>
            </div>

            {/* Notification bell */}
            <div ref={notifRef} style={{ position: "relative", padding: "0 4px" }}>
              <button
                onClick={() => setNotifOpen(o => !o)}
                title="Notifications"
                style={{
                  position: "relative",
                  width: 36, height: 36, borderRadius: 9,
                  background: notifOpen ? "#f1f5f9" : "transparent",
                  border: notifOpen ? "1.5px solid #e2e8f0" : "1.5px solid transparent",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: notifOpen ? "#3b82f6" : "#64748b",
                  transition: "background 0.15s, color 0.15s, border-color 0.15s",
                }}
                onMouseEnter={e => {
                  if (!notifOpen) {
                    e.currentTarget.style.background = "#f8fafc";
                    e.currentTarget.style.color = "#334155";
                  }
                }}
                onMouseLeave={e => {
                  if (!notifOpen) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#64748b";
                  }
                }}
              >
                <Bell size={17} />
                {notifs.length > 0 && (
                  <span style={{
                    position: "absolute", top: 4, right: 4,
                    width: 16, height: 16, borderRadius: "50%",
                    background: "#ef4444", border: "2px solid white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 800, color: "white", lineHeight: 1,
                  }}>
                    {notifs.length}
                  </span>
                )}
              </button>

              {/* Dropdown notifications */}
              {notifOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 10px)", right: 0,
                  width: 330,
                  background: "white",
                  borderRadius: 14,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 16px 48px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06)",
                  zIndex: 100, overflow: "hidden",
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "15px 18px 13px",
                    borderBottom: "1px solid #f1f5f9",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", letterSpacing: "-0.02em" }}>
                        Notifications
                      </span>
                      {notifs.length > 0 && (
                        <span style={{
                          background: "#ef4444", color: "white",
                          fontSize: 10.5, fontWeight: 700,
                          padding: "1px 7px", borderRadius: 99,
                        }}>
                          {notifs.length}
                        </span>
                      )}
                    </div>
                    {notifs.length > 0 && (
                      <button
                        onClick={clearAllNotifs}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "#3b82f6", fontSize: 12.5, fontWeight: 600,
                          padding: 0, fontFamily: "inherit",
                        }}
                      >
                        Tout effacer
                      </button>
                    )}
                  </div>

                  {notifs.length === 0 ? (
                    <div style={{ padding: "32px 18px", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>
                      <Bell size={30} style={{ display: "block", margin: "0 auto 10px", color: "#e2e8f0" }} />
                      Aucune notification
                    </div>
                  ) : (
                    notifs.map((n, i) => (
                      <div
                        key={n.id}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 12,
                          padding: "13px 18px",
                          borderBottom: i < notifs.length - 1 ? "1px solid #f8fafc" : "none",
                          transition: "background 0.12s", cursor: "default",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <span style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: n.dot, flexShrink: 0, marginTop: 6,
                          boxShadow: `0 0 0 2px ${n.dot}33`,
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "#0f172a", letterSpacing: "-0.01em", lineHeight: 1.35 }}>
                            {n.title}
                          </p>
                          <p style={{ margin: "3px 0 0", fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
                            {formatRelativeTime(n.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}

                  {notifs.length > 0 && (
                    <div style={{ padding: "11px 18px 14px", borderTop: "1px solid #f1f5f9" }}>
                      <button
                        style={{
                          width: "100%", padding: "9px", borderRadius: 8,
                          background: "#f8fafc", border: "1px solid #e2e8f0",
                          cursor: "pointer", fontFamily: "inherit",
                          fontSize: 13, fontWeight: 600, color: "#475569",
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#f8fafc"; }}
                      >
                        Voir toutes les notifications
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <VDivider />

            {/* User - Affichage Manager avec email */}
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "flex-end",
              padding: "0 4px 0 8px"
            }}>
              <p style={{ 
                margin: 0, 
                fontSize: 14, 
                fontWeight: 700, 
                color: "#0f172a", 
                letterSpacing: "-0.02em",
                lineHeight: 1.3
              }}>
                {user.username}
              </p>
              <p style={{ 
                margin: "2px 0 0", 
                fontSize: 11, 
                color: "#94a3b8", 
                fontWeight: 500,
                letterSpacing: "-0.01em"
              }}>
                {user.email || user.username?.toLowerCase().replace(/\s/g, '') + "@sitex.com"}
              </p>
            </div>

            {/* Petit badge Manager */}
            <div style={{
              background: roleColor.bg,
              color: roleColor.text,
              padding: "4px 10px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.2px",
              marginLeft: 4,
              whiteSpace: "nowrap",
              border: `1px solid ${roleColor.border}`,
            }}>
              {roleLabel}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div style={{ flex: 1, overflowY: "auto", background: "#f1f5f9" }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}