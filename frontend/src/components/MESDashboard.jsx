import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Cpu,
  ClipboardList,
  Search,
  LogOut,
  Wrench
} from "lucide-react";

import Production from "./dashboard/Production";
import OrdresFabrication from "./dashboard/OrdresFabrication";
import Traceability from "./dashboard/Traceability";
import UserManagement from "./UserManagement";
import Machine from "./dashboard/Machine";
import ProductionDashboard from "./dashboard/DashboardMes/ProductionDashboard";
import MaintenanceDashboard from "./maintenance/MaintenanceDashboard";
import Operateur from "./operateur/Operateur";

const ROLE_CONFIG = {
  admin: {
    defaultModule: "users",
    modules: ["users"],
  },
  manager: {
    defaultModule: "dashboard",
    modules: ["dashboard", "production", "ordres", "traceability", "machine"],
  },
  maintenance: {
    defaultModule: "maintenance",
    modules: ["maintenance"],
  },
  operateur: {
    defaultModule: "operateur",
    modules: ["operateur"],
  },
};

const ROLE_TO_CONFIG_KEY = {
  operator: "operateur",
  operateur: "operateur",
  responsable_maintenance: "maintenance",
};

const MODULE_CONFIG = {
  dashboard: { label: "Dashboard", icon: <LayoutDashboard size={16} />, component: ProductionDashboard },
  production: { label: "Production", icon: <Cpu size={16} />, component: Production },
  ordres: { label: "Ordres Fabrication", icon: <ClipboardList size={16} />, component: OrdresFabrication },
  traceability: { label: "Traceability", icon: <Search size={16} />, component: Traceability },
  machine: { label: "Machine", icon: <Cpu size={16} />, component: Machine },
  maintenance: { label: "Maintenance", icon: <Wrench size={16} />, component: MaintenanceDashboard },
  users: { label: "User Management", icon: "👤", component: UserManagement },
  operateur: { label: "Operateur", icon: "👷", component: Operateur },
};

const MESDashboard = () => {
  const [user, setUser] = useState(null);
  const [activeModule, setActiveModule] = useState("");

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user"));

    if (!stored) {
      window.location.href = "/login";
      return;
    }

    setUser(stored);
    console.log("ROLE:", stored.role);

    const configKey = ROLE_TO_CONFIG_KEY[stored.role] || stored.role;
    const roleConfig = ROLE_CONFIG[configKey];
    setActiveModule(roleConfig?.defaultModule || "dashboard");
  }, []);

  if (!user) return null;

  const role = user.role;
  const configKey = ROLE_TO_CONFIG_KEY[role] || role;
  const roleConfig = ROLE_CONFIG[configKey];

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const menu = (roleConfig?.modules || []).map((moduleId) => ({
    id: moduleId,
    label: MODULE_CONFIG[moduleId]?.label || moduleId,
    icon: MODULE_CONFIG[moduleId]?.icon || null,
  }));

  const renderContent = () => {
    switch (activeModule) {
      case "maintenance":
        return <MaintenanceDashboard />;
      case "dashboard":
        return <ProductionDashboard />;
      case "production":
        return <Production />;
      case "ordres":
        return <OrdresFabrication />;
      case "traceability":
        return <Traceability />;
      case "machine":
        return <Machine />;
      case "users":
        return <UserManagement />;
      case "operateur":
        return <Operateur />;
      default:
        return <h2>Module not found</h2>;
    }
  };

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <h2>🏭 MES</h2>

        <p style={styles.sectionTitle}>MENU</p>

        {menu.map((item) => (
          <div
            key={item.id}
            onClick={() => setActiveModule(item.id)}
            style={{
              ...styles.item,
              background: activeModule === item.id ? "#1e293b" : "transparent"
            }}
          >
            {item.icon} {item.label}
          </div>
        ))}

        <div
          onClick={handleLogout}
          style={{
            ...styles.item,
            background: "#dc2626",
            marginTop: "auto"
          }}
        >
          <LogOut size={16} /> Logout
        </div>
      </aside>

      <div style={styles.main}>
        <header style={styles.header}>
          📅 {new Date().toLocaleDateString()} | 👤 {user.username} ({role})
        </header>

        <div style={styles.content}>{renderContent()}</div>
      </div>
    </div>
  );
};

const styles = {
  container: { display: "flex", height: "100vh", fontFamily: "sans-serif" },
  sidebar: {
    width: "260px",
    background: "#0f172a",
    color: "white",
    padding: "15px",
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  sectionTitle: {
    marginTop: 15,
    marginBottom: 5,
    fontSize: "12px",
    color: "#94a3b8"
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    borderRadius: "6px",
    cursor: "pointer"
  },
  main: {
    flex: 1,
    background: "#f8fafc",
    display: "flex",
    flexDirection: "column"
  },
  header: {
    background: "white",
    padding: "10px 20px",
    borderBottom: "1px solid #e2e8f0"
  },
  content: {
    padding: "20px",
    overflowY: "auto",
    height: "calc(100vh - 60px)"
  }
};

export default MESDashboard;