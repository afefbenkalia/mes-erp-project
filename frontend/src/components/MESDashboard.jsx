import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Cpu,
  ClipboardList,
  Search,
  LogOut
} from "lucide-react";

import Production from "./dashboard/Production";
import OrdresFabrication from "./dashboard/OrdresFabrication";
import Traceability from "./dashboard/Traceabilite";
import UserManagement from "./UserManagement";
import Machine from "./dashboard/Machine";
import ProductionDashboard from "./dashboard/DashboardMes/ProductionDashboard";

const MESDashboard = () => {
  const [user, setUser] = useState(null);
  const [activeModule, setActiveModule] = useState("dashboard");

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user"));

    if (!stored) {
      window.location.href = "/login";
    } else {
      setUser(stored);

      if (stored.role === "admin") {
        setActiveModule("users");
      } else if (stored.role === "manager" || stored.role === "responsable") {
        setActiveModule("dashboard");
      }
    }
  }, []);

  if (!user) return null;

  const role = user.role;

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const isAdmin = role === "admin";
  const isResponsable = role === "responsable" || role === "manager";

  // ✅ MENU MES فقط
  const mesMenu = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard size={16} />
    },
    {
      id: "production",
      label: "Production",
      icon: <Cpu size={16} />
    },
    {
      id: "ordres",
      label: "Ordres Fabrication",
      icon: <ClipboardList size={16} />
    },
    {
      id: "Traceabilite",
      label: "Traceabilite",
      icon: <Search size={16} />
    },
    {
      id: "machine",
      label: "Machine",
      icon: <Cpu size={16} />
    }
  ];

  const renderContent = () => {
    if (activeModule === "machine") {
      return <Machine />;
    }

    switch (activeModule) {
      case "dashboard":
        return <ProductionDashboard />;
      case "production":
        return <Production />;
      case "ordres":
        return <OrdresFabrication />;
      case "Traceabilite":
        return <Traceability />;
      case "users":
        return <UserManagement />;
      default:
        return <h2>Module not found</h2>;
    }
  };

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <h2>🏭 MES</h2>

        {isResponsable && (
          <>
            <p style={styles.sectionTitle}>MES</p>
            {mesMenu.map(item => (
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
          </>
        )}

        {isAdmin && (
          <>
            <p style={styles.sectionTitle}>ADMIN</p>
            <div
              onClick={() => setActiveModule("users")}
              style={{
                ...styles.item,
                background: activeModule === "users" ? "#1e293b" : "transparent"
              }}
            >
              👤 User Management
            </div>
          </>
        )}

        <div
          onClick={handleLogout}
          style={{ ...styles.item, background: "#dc2626", marginTop: "auto" }}
        >
          <LogOut size={16} /> Logout
        </div>
      </aside>

      <div style={styles.main}>
        <header style={styles.header}>
          <div style={styles.searchBox}>
            <Search size={16} />
            <input placeholder="Search..." style={styles.input} />
          </div>
          <div>
            📅 {new Date().toLocaleDateString()} | 👤 {user.username} ({role})
          </div>
        </header>

        <div style={styles.content}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    fontFamily: "sans-serif"
  },
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
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "1px solid #e2e8f0"
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#f1f5f9",
    padding: "5px 10px",
    borderRadius: "6px"
  },
  input: {
    border: "none",
    outline: "none",
    background: "transparent"
  },
  content: {
    padding: "20px",
    overflowY: "auto",
    height: "calc(100vh - 60px)"
  }
};

export default MESDashboard;