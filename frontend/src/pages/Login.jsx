import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { authAPI } from "../api/api";
import { AlertCircle, CheckCircle, X } from "lucide-react";
import logo from "../assets/logo_sitex.jpg";

const NAVY      = "#1a2c4e";
const NAVY_MID  = "#243b61";
const NAVY_LIGHT= "#2e4a78";
const ACCENT    = "#4a7fc1";
const WHITE     = "#ffffff";
const OFFWHITE  = "#f5f7fb";
const MUTED     = "#7a8ea8";
const BORDER    = "#d5dde8";
const ERROR_CLR = "#e74c3c";

const styles = {
  root: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  },
  leftPanel: {
    flex: "0 0 42%",
    background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_MID} 45%, ${NAVY_LIGHT} 100%)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 48px",
    position: "relative",
    overflow: "hidden",
  },
  leftContent: {
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "48px",
    animation: "fadeSlideIn 0.7s ease-out",
  },
  brandArea: { textAlign: "center" },
  bigLogo: {
    width: "140px",
    height: "140px",
    objectFit: "contain",
    borderRadius: "20px",
    background: WHITE,
    padding: "12px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
    display: "block",
    margin: "0 auto 24px",
  },
  brandTitle: {
    fontSize: "32px",
    fontWeight: "700",
    color: WHITE,
    margin: "0 0 8px",
    letterSpacing: "-0.5px",
  },
  brandTagline: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.55)",
    margin: 0,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
  },
  statsRow: {
    display: "flex",
    alignItems: "center",
    background: "rgba(255,255,255,0.07)",
    borderRadius: "16px",
    padding: "20px 32px",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  statBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 24px",
  },
  statNum: {
    fontSize: "22px",
    fontWeight: "700",
    color: WHITE,
    letterSpacing: "-0.5px",
  },
  statLabel: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.5)",
    marginTop: "4px",
    letterSpacing: "0.5px",
  },
  statDivider: {
    width: "1px",
    height: "40px",
    background: "rgba(255,255,255,0.15)",
  },
  decorativeDots: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    justifyContent: "center",
    maxWidth: "200px",
  },
  dot: {
    borderRadius: "50%",
    background: WHITE,
  },
  rightPanel: {
    flex: 1,
    background: OFFWHITE,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 32px",
  },
  card: {
    background: WHITE,
    borderRadius: "28px",
    padding: "48px 44px",
    width: "100%",
    maxWidth: "460px",
    boxShadow: "0 20px 40px rgba(26,44,78,0.12), 0 4px 12px rgba(0,0,0,0.05)",
    border: `1px solid ${BORDER}`,
    animation: "fadeSlideIn 0.6s ease-out",
  },
  cardHeader: { textAlign: "center", marginBottom: "40px" },
  logoWrapper: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "88px",
    height: "88px",
    borderRadius: "24px",
    background: OFFWHITE,
    border: `2px solid ${BORDER}`,
    marginBottom: "24px",
    overflow: "hidden",
  },
  cardLogo: { width: "72px", height: "72px", objectFit: "contain" },
  cardTitle: {
    fontSize: "28px",
    fontWeight: "700",
    color: NAVY,
    margin: "0 0 8px",
    letterSpacing: "-0.4px",
  },
  cardSubtitle: { fontSize: "13px", color: MUTED, margin: 0, letterSpacing: "0.3px" },
  inputGroup: { marginBottom: "24px" },
  label: {
    display: "block",
    marginBottom: "10px",
    fontSize: "14px",
    fontWeight: "600",
    color: NAVY,
    letterSpacing: "0.2px",
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    fontSize: "15px",
    border: `2px solid ${BORDER}`,
    borderRadius: "14px",
    outline: "none",
    transition: "all 0.2s ease",
    boxSizing: "border-box",
    color: NAVY,
    background: WHITE,
    fontFamily: "inherit",
  },
  inputFocused: {
    border: `2px solid ${ACCENT}`,
    boxShadow: `0 0 0 4px rgba(74,127,193,0.15)`,
  },
  passwordWrapper: { position: "relative" },
  passwordInput: { paddingRight: "48px" },
  eyeButton: {
    position: "absolute",
    right: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "20px",
    padding: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.6,
    transition: "opacity 0.2s",
  },
  errorBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "12px 16px",
    marginBottom: "20px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "12px",
    color: ERROR_CLR,
    fontSize: "13px",
    fontWeight: "500",
  },
  button: {
    width: "100%",
    padding: "16px",
    background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_LIGHT} 100%)`,
    color: WHITE,
    border: "none",
    borderRadius: "14px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "8px",
    transition: "all 0.2s ease",
    letterSpacing: "0.3px",
  },
  buttonLoading: { opacity: 0.75, cursor: "not-allowed" },
  btnContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
  btnArrow: { fontSize: "18px", fontWeight: "400" },
  loaderWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
  spinner: {
    display: "inline-block",
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: WHITE,
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
  infoBox: {
    marginTop: "28px",
    padding: "16px",
    background: OFFWHITE,
    border: `1px solid ${BORDER}`,
    borderRadius: "14px",
    fontSize: "13px",
    color: MUTED,
  },
  infoTitle: { fontWeight: "600", color: NAVY, marginBottom: "6px", fontSize: "13px" },
  footer: {
    marginTop: "20px",
    textAlign: "center",
    fontSize: "12px",
    color: MUTED,
  },
};

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const [forgotOpen,        setForgotOpen]        = useState(false);
  const [forgotEmail,       setForgotEmail]        = useState("");
  const [forgotLoading,     setForgotLoading]      = useState(false);
  const [forgotError,       setForgotError]        = useState("");
  const [forgotSuccess,     setForgotSuccess]      = useState(false);
  const [forgotEmailFocused, setForgotEmailFocused] = useState(false);

  const openForgot = () => {
    setForgotOpen(true);
    setForgotEmail("");
    setForgotError("");
    setForgotSuccess(false);
  };

  const closeForgot = () => {
    setForgotOpen(false);
    setForgotEmail("");
    setForgotError("");
    setForgotSuccess(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError("");
    const trimmed = forgotEmail.trim();
    if (!trimmed) {
      setForgotError("Veuillez saisir votre adresse e-mail.");
      return;
    }
    setForgotLoading(true);
    try {
      await authAPI.forgotPassword(trimmed);
      setForgotSuccess(true);
    } catch {
      setForgotError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedEmail    = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Veuillez saisir l'email et le mot de passe");
      return;
    }

    setLoading(true);

    try {
      const res = await API.post("/auth/login", {
        email: trimmedEmail,
        password: trimmedPassword,
      });

      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      if (res.data.force_change_password) {
        navigate("/change-password");
      } else {
        const params       = new URLSearchParams(window.location.search);
        const redirectPath = params.get("redirect") || "";
        const safeRedirect = redirectPath.startsWith("/") && !redirectPath.startsWith("//")
          ? redirectPath
          : "/dashboard";
        navigate(safeRedirect);
      }
    } catch (err) {
      const status   = err.response?.status;
      const detail   = err.response?.data?.detail || "";

      if (status === 403 && detail === "compte_inactif") {
        setError("Votre compte est inactif. Veuillez contacter l'administrateur.");
      } else if (status === 401) {
        setError("Email ou mot de passe invalide");
      } else {
        setError(detail || "Échec de la connexion");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      {/* ── Left panel ── */}
      <div style={styles.leftPanel}>
        <div style={styles.leftContent}>
          <div style={styles.brandArea}>
            <img src={logo} alt="SITEX Logo" style={styles.bigLogo} />
            <h1 style={styles.brandTitle}>SITEX Sousse</h1>
            <p style={styles.brandTagline}>Excellence du Cardage Textile</p>
          </div>

          <div style={styles.statsRow}>
            <div style={styles.statBox}>
              <span style={styles.statNum}>24/7</span>
              <span style={styles.statLabel}>Surveillance</span>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statBox}>
              <span style={styles.statNum}>MES</span>
              <span style={styles.statLabel}>Intégré</span>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statBox}>
              <span style={styles.statNum}>v1.1</span>
              <span style={styles.statLabel}>Version</span>
            </div>
          </div>

          <div style={styles.decorativeDots}>
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                style={{
                  ...styles.dot,
                  opacity: 0.15 + (i % 4) * 0.15,
                  width:  6 + (i % 3) * 4,
                  height: 6 + (i % 3) * 4,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={styles.rightPanel}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.logoWrapper}>
              <img src={logo} alt="SITEX" style={styles.cardLogo} />
            </div>
            <h2 style={styles.cardTitle}>Connexion</h2>
            <p style={styles.cardSubtitle}>Système de Gestion MES • Cardage</p>
          </div>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>E-mail</label>
              <input
                style={{
                  ...styles.input,
                  ...(focusedField === "email" ? styles.inputFocused : {}),
                }}
                type="email"
                placeholder="user@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Mot de passe</label>
              <div style={styles.passwordWrapper}>
                <input
                  style={{
                    ...styles.input,
                    ...styles.passwordInput,
                    ...(focusedField === "password" ? styles.inputFocused : {}),
                  }}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                />
                <button
                  type="button"
                  style={styles.eyeButton}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                  disabled={loading}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            {/* Mot de passe oublié */}
            <div style={{ textAlign: "right", marginTop: "-12px", marginBottom: "8px" }}>
              <button
                type="button"
                onClick={openForgot}
                style={{
                  background: "none",
                  border: "none",
                  color: ACCENT,
                  fontSize: "13px",
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                Mot de passe oublié ?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{ ...styles.button, ...(loading ? styles.buttonLoading : {}) }}
            >
              {loading ? (
                <span style={styles.loaderWrap}>
                  <span style={styles.spinner} />
                  Connexion en cours...
                </span>
              ) : (
                <span style={styles.btnContent}>
                  Se connecter
                  <span style={styles.btnArrow}>→</span>
                </span>
              )}
            </button>
          </form>

          <div style={styles.footer}>© 2026 MES System. Tous droits réservés.</div>
        </div>
      </div>

      {/* ── Modal mot de passe oublié ── */}
      {forgotOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(15,23,42,0.55)", padding: "16px",
        }}>
          <div style={{
            background: WHITE, borderRadius: "20px", padding: "36px 32px",
            width: "100%", maxWidth: "420px",
            boxShadow: "0 24px 48px rgba(26,44,78,0.18)",
            border: `1px solid ${BORDER}`, animation: "fadeSlideIn 0.25s ease-out",
            position: "relative",
          }}>
            {/* Fermer */}
            <button
              type="button"
              onClick={closeForgot}
              style={{
                position: "absolute", top: "14px", right: "14px",
                background: "none", border: "none", cursor: "pointer",
                color: MUTED, padding: "4px", borderRadius: "6px",
                display: "flex", alignItems: "center",
              }}
              aria-label="Fermer"
            >
              <X size={18} />
            </button>

            <h3 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: 700, color: NAVY }}>
              Mot de passe oublié ?
            </h3>
            <p style={{ margin: "0 0 24px", fontSize: "13px", color: MUTED, lineHeight: 1.5 }}>
              Saisissez votre adresse e-mail. Un administrateur sera notifié et réinitialisera votre mot de passe.
            </p>

            {forgotSuccess ? (
              <div style={{
                display: "flex", alignItems: "flex-start", gap: "10px",
                padding: "14px 16px", borderRadius: "12px",
                background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d",
                fontSize: "14px", fontWeight: 500,
              }}>
                <CheckCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  Votre demande a été transmise. L'administrateur vous contactera pour réinitialiser votre mot de passe.
                </span>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword}>
                {forgotError && (
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: "10px",
                    padding: "12px 14px", marginBottom: "16px", borderRadius: "10px",
                    background: "#fef2f2", border: "1px solid #fecaca",
                    color: ERROR_CLR, fontSize: "13px", fontWeight: 500,
                  }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{forgotError}</span>
                  </div>
                )}

                <label style={{ ...styles.label, fontSize: "13px" }}>Adresse e-mail</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  onFocus={() => setForgotEmailFocused(true)}
                  onBlur={() => setForgotEmailFocused(false)}
                  placeholder="votre@email.com"
                  disabled={forgotLoading}
                  style={{
                    ...styles.input,
                    marginBottom: "20px",
                    ...(forgotEmailFocused ? styles.inputFocused : {}),
                  }}
                />

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={{
                      flex: 1, padding: "13px",
                      background: forgotLoading
                        ? "#94a3b8"
                        : `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_LIGHT} 100%)`,
                      color: WHITE, border: "none", borderRadius: "12px",
                      fontSize: "14px", fontWeight: 600, cursor: forgotLoading ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {forgotLoading ? "Envoi en cours..." : "Envoyer la demande"}
                  </button>
                  <button
                    type="button"
                    onClick={closeForgot}
                    style={{
                      flex: 1, padding: "13px",
                      background: OFFWHITE, color: NAVY,
                      border: `1px solid ${BORDER}`, borderRadius: "12px",
                      fontSize: "14px", fontWeight: 600, cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}

            {forgotSuccess && (
              <button
                type="button"
                onClick={closeForgot}
                style={{
                  marginTop: "20px", width: "100%", padding: "13px",
                  background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_LIGHT} 100%)`,
                  color: WHITE, border: "none", borderRadius: "12px",
                  fontSize: "14px", fontWeight: 600, cursor: "pointer",
                }}
              >
                Fermer
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px #e6f2ff inset !important;
          -webkit-text-fill-color: #1a2c4e !important;
          border-radius: 14px;
        }
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #dcecff inset !important;
        }
      `}</style>
    </div>
  );
};

export default Login;
