import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  AlertCircle, BarChart3, Calendar, CheckCircle2, ChevronDown,
  ChevronRight, Clock, Download, Eye, FileText, Loader2, Package,
  Printer, Save, Search, Trash2, Wrench, X, Activity, Zap,
} from "lucide-react";
import { reportsAPI } from "../../api/api";

/* ─────────────────────────────────────────────────────────────────────────────
   PURE HELPERS  (unchanged logic)
───────────────────────────────────────────────────────────────────────────── */
const STORAGE_KEY = "mes_saved_reports";
const todayISO = () => new Date().toISOString().slice(0, 10);
const getISOWeek = (d = new Date()) => {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const ys = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return { year: dt.getUTCFullYear(), week: Math.ceil(((dt - ys) / 86400000 + 1) / 7) };
};
const fmt = (v, d = 1) => { const n = Number(v); return Number.isFinite(n) ? n.toFixed(d) : "—"; };
const fmtMins = (mins) => {
  const m = Math.round(Number(mins));
  if (!Number.isFinite(m) || m < 0) return "—";
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}min` : `${m} min`;
};
const fmtDateFR = (iso) => iso
  ? new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })
  : "—";
const fmtDatetimeFR = (iso) => iso
  ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  : "—";

const thirtyDaysAgo = () => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); };

const loadSaved = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };
const persistSaved = (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

/* ─────────────────────────────────────────────────────────────────────────────
   EXPORT LOGIC  (unchanged logic)
───────────────────────────────────────────────────────────────────────────── */
const buildCSV = (report, type, label) => {
  const lines = [];
  const push = (...cols) => lines.push(cols.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";"));
  const blank = () => lines.push("");
  push("RAPPORT DE PRODUCTION - MES Platform");
  push("Type", type === "daily" ? "Rapport Journalier" : "Rapport Hebdomadaire");
  push("Période", label);
  push("Généré le", new Date().toLocaleString("fr-FR"));
  blank();
  if (type === "daily") {
    const p = report.production || {}, o = report.oee || {};
    push("=== PRODUCTION ===");
    push("Indicateur", "Valeur");
    push("Production totale", `${fmt(p.total_produced, 0)} unités`);
    push("Matière première", `${fmt(p.total_raw_material, 0)} unités`);
    push("Rejets", `${fmt(p.total_rejects, 0)} unités`);
    push("Rendement", `${fmt(p.rendement_pct)} %`);
    push("OF total / terminés / en cours", `${p.orders_count ?? 0} / ${p.orders_completed ?? 0} / ${p.orders_in_progress ?? 0}`);
    blank();
    push("=== OEE ===");
    push("Disponibilité", `${fmt(o.availability)} %`);
    push("Performance", `${fmt(o.performance)} %`);
    push("Qualité", `${fmt(o.quality)} %`);
    push("OEE global", `${fmt(o.oee)} %`);
    blank();
    if (report.machines?.length) {
      push("=== MACHINES ===");
      push("Machine", "Référence", "Type", "État", "Runtime", "Downtime", "Disponibilité %");
      report.machines.forEach(m => push(m.name, m.reference, m.machine_type, m.current_state, fmtMins(m.runtime_minutes), fmtMins(m.downtime_minutes), `${fmt(m.availability_pct)} %`));
      blank();
    }
    if (report.production_by_machine?.length) {
      push("=== PRODUCTION PAR ÉTAPE ===");
      push("Code machine", "Étape", "Produit (qté)", "Rejets");
      report.production_by_machine.forEach(r => push(r.machine_code, r.machine_name, fmt(r.produced, 0), fmt(r.rejects, 0)));
      blank();
    }
    if (report.reject_breakdown?.length) {
      push("=== DÉTAIL REJETS ===");
      push("Type de défaut", "Quantité");
      report.reject_breakdown.forEach(r => push(r.defaut, fmt(r.quantite, 0)));
    }
  } else if (type === "weekly") {
    const s = report.summary || {};
    push("=== RÉSUMÉ SEMAINE ===");
    push("Production totale", `${fmt(s.total_produced, 0)} unités`);
    push("Rejets totaux", `${fmt(s.total_rejects, 0)} unités`);
    push("OEE moyen", `${fmt(s.avg_oee)} %`);
    push("Disponibilité moyenne", `${fmt(s.avg_availability)} %`);
    push("Heures de marche", `${fmt(s.total_runtime_hours, 1)} h`);
    push("Heures d'arrêt", `${fmt(s.total_downtime_hours, 1)} h`);
    blank();
    if (report.daily_breakdown?.length) {
      push("=== ÉVOLUTION JOURNALIÈRE ===");
      push("Date", "Production", "Rejets", "Disponibilité %", "OEE %");
      report.daily_breakdown.forEach(d => push(fmtDateFR(d.date), fmt(d.produced, 0), fmt(d.rejects, 0), fmt(d.availability), fmt(d.oee)));
      blank();
    }
    if (report.machines_most_down?.length) {
      push("=== TOP ARRÊTS ===");
      push("Machine", "Référence", "Temps arrêt", "% du temps");
      report.machines_most_down.forEach(m => push(m.name, m.reference, fmtMins(m.downtime_minutes), `${fmt(m.downtime_pct)} %`));
      blank();
    }
    if (report.production_by_machine?.length) {
      push("=== PRODUCTION PAR MACHINE ===");
      push("Code", "Étape", "Production", "Rejets");
      report.production_by_machine.forEach(r => push(r.machine_code, r.machine_name, fmt(r.produced, 0), fmt(r.rejects, 0)));
    }
  } else if (type === "production-of") {
    const s = report.summary || {};
    push("=== RÉSUMÉ ===");
    push("Total OF", s.total_of ?? 0); push("Terminés", s.of_termines ?? 0); push("En cours", s.of_en_cours ?? 0);
    push("Production totale", `${fmt(s.total_produit, 0)} unités`); push("Rejets", `${fmt(s.total_rejects, 0)} unités`);
    push("Taux rejet global", `${fmt(s.taux_rejet_global_pct)} %`);
    blank();
    if (report.of_rows?.length) {
      push("=== DÉTAIL PAR OF ===");
      push("OF", "Produit", "Date", "Statut", "Cible", "Produit", "Conforme", "Rejets", "Taux %", "Durée (min)");
      report.of_rows.forEach(r => push(r.of_numero, r.produit, r.date, r.statut, fmt(r.quantite_cible, 0), fmt(r.quantite_produite, 2), fmt(r.quantite_conforme, 2), fmt(r.rejets, 2), fmt(r.taux_rejet_pct), fmt(r.duree_minutes, 1)));
    }
  } else if (type === "maintenance") {
    const s = report.summary || {};
    push("=== RÉSUMÉ ===");
    push("Interventions", s.total_interventions ?? 0); push("Heures totales", `${fmt(s.total_hours, 1)} h`);
    push("Machines affectées", s.machines_affected ?? 0); push("Durée moyenne", `${fmt(s.avg_duration_minutes, 1)} min`);
    blank();
    if (report.machines_most_impacted?.length) {
      push("=== MACHINES LES PLUS IMPACTÉES ===");
      push("Machine", "Référence", "Interventions", "Heures d'arrêt");
      report.machines_most_impacted.forEach(m => push(m.machine_name, m.machine_reference, m.interventions, `${fmt(m.total_hours, 1)} h`));
      blank();
    }
    if (report.history?.length) {
      push("=== HISTORIQUE ===");
      push("Date", "Machine", "Technicien", "Durée (min)", "Action");
      report.history.forEach(h => push(fmtDatetimeFR(h.date), h.machine_name, h.technician, fmt(h.duration_minutes, 1), h.action_effectuee));
    }
  } else if (type === "performance") {
    const s = report.summary || {};
    push("=== OEE GLOBAL ===");
    push("OEE global", `${fmt(s.global_oee)} %`); push("Disponibilité", `${fmt(s.availability)} %`);
    push("Performance", `${fmt(s.performance)} %`); push("Qualité", `${fmt(s.quality)} %`);
    blank();
    if (report.per_machine?.length) {
      push("=== OEE PAR MACHINE ===");
      push("Machine", "Référence", "Type", "État", "Runtime (min)", "Downtime (min)", "Dispo %", "OEE %");
      report.per_machine.forEach(m => push(m.machine_name, m.machine_reference, m.machine_type, m.current_state, fmt(m.runtime_minutes, 1), fmt(m.downtime_minutes, 1), fmt(m.availability_pct), fmt(m.oee)));
      blank();
    }
    if (report.trend?.length) {
      push("=== TENDANCE JOURNALIÈRE ===");
      push("Date", "Disponibilité %", "OEE %", "Production");
      report.trend.forEach(t => push(fmtDateFR(t.date), fmt(t.availability), fmt(t.oee), fmt(t.produced, 0)));
    }
  } else if (type === "traceability") {
    const s = report.summary || {};
    push("=== RÉSUMÉ ===");
    push("Total lots", s.total_lots ?? 0); push("Total étapes", s.total_steps ?? 0); push("Machines utilisées", s.machines_used ?? 0);
    blank();
    if (report.lots?.length) {
      push("=== LOTS ===");
      push("Numéro lot", "Produit", "Ordre", "Date", "Statut", "Qté initiale", "Qté finale", "Rendement %");
      report.lots.forEach(lot => {
        push(lot.numero_lot, lot.produit, lot.ordre_id, lot.date_creation, lot.statut, lot.quantite_initiale, lot.quantite_finale, fmt(lot.rendement_pct));
        (lot.steps || []).forEach(s => push(`  → ${s.operation}`, s.machine, s.operateur, s.statut, `${s.duree_min} min`, `${s.quantite} u.`, "", ""));
      });
    }
  }
  return "﻿" + lines.join("\n");
};
const downloadCSV = (csv, filename) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
};
const buildPrintHTML = (report, type, label) => {
  const isDaily = type === "daily";
  const p = report.production || {}, o = report.oee || {}, s = report.summary || {};
  const th = t => `<th>${t}</th>`;
  const td = (t, r) => `<td${r ? ' class="r"' : ''}>${t ?? "—"}</td>`;
  let body = "";
  if (isDaily) {
    body += `<h2>Production</h2><table><tr>${th("Indicateur")}${th("Valeur")}</tr>
      <tr><td>Production totale</td><td>${fmt(p.total_produced, 0)} unités</td></tr>
      <tr><td>Matière première</td><td>${fmt(p.total_raw_material, 0)} unités</td></tr>
      <tr><td>Rejets</td><td>${fmt(p.total_rejects, 0)} unités</td></tr>
      <tr><td>Rendement</td><td>${fmt(p.rendement_pct)} %</td></tr>
      <tr><td>OF (total / terminés / en cours)</td><td>${p.orders_count ?? 0} / ${p.orders_completed ?? 0} / ${p.orders_in_progress ?? 0}</td></tr></table>
      <h2>OEE</h2><table><tr>${["Disponibilité","Performance","Qualité","OEE Global"].map(th).join("")}</tr>
      <tr>${[o.availability,o.performance,o.quality,o.oee].map(v=>`<td class="r"><strong>${fmt(v)} %</strong></td>`).join("")}</tr></table>`;
    if (report.machines?.length)
      body += `<h2>Disponibilité des machines</h2><table><tr>${["Machine","Référence","Type","État","Runtime","Downtime","Dispo %"].map(th).join("")}</tr>${report.machines.map(m=>`<tr>${td(m.name)}${td(m.reference)}${td(m.machine_type)}${td(m.current_state)}${td(fmtMins(m.runtime_minutes),1)}${td(fmtMins(m.downtime_minutes),1)}${td(fmt(m.availability_pct)+" %",1)}</tr>`).join("")}</table>`;
    if (report.production_by_machine?.length)
      body += `<h2>Production par étape</h2><table><tr>${["Code","Étape","Production","Rejets"].map(th).join("")}</tr>${report.production_by_machine.map(r=>`<tr>${td(r.machine_code)}${td(r.machine_name)}${td(fmt(r.produced,0),1)}${td(fmt(r.rejects,0),1)}</tr>`).join("")}</table>`;
    if (report.reject_breakdown?.length)
      body += `<h2>Détail des rejets</h2><table><tr>${["Type de défaut","Quantité"].map(th).join("")}</tr>${report.reject_breakdown.map(r=>`<tr>${td(r.defaut)}${td(fmt(r.quantite,0),1)}</tr>`).join("")}</table>`;
  } else if (type === "weekly") {
    body += `<h2>Résumé</h2><table><tr>${["Production","Rejets","OEE moyen","Dispo moy.","Runtime","Downtime"].map(th).join("")}</tr>
      <tr>${[fmt(s.total_produced,0)+" u.",fmt(s.total_rejects,0)+" u.",fmt(s.avg_oee)+" %",fmt(s.avg_availability)+" %",fmt(s.total_runtime_hours,1)+" h",fmt(s.total_downtime_hours,1)+" h"].map(v=>`<td class="r">${v}</td>`).join("")}</tr></table>`;
    if (report.daily_breakdown?.length)
      body += `<h2>Évolution journalière</h2><table><tr>${["Jour","Production","Rejets","Disponibilité","OEE"].map(th).join("")}</tr>${report.daily_breakdown.map(d=>`<tr>${td(fmtDateFR(d.date))}${td(fmt(d.produced,0),1)}${td(fmt(d.rejects,0),1)}${td(fmt(d.availability)+" %",1)}${td(fmt(d.oee)+" %",1)}</tr>`).join("")}</table>`;
    if (report.machines_most_down?.length)
      body += `<h2>Machines les plus en arrêt</h2><table><tr>${["Machine","Référence","Temps d'arrêt","% du temps"].map(th).join("")}</tr>${report.machines_most_down.map(m=>`<tr>${td(m.name)}${td(m.reference)}${td(fmtMins(m.downtime_minutes),1)}${td(fmt(m.downtime_pct)+" %",1)}</tr>`).join("")}</table>`;
    if (report.production_by_machine?.length)
      body += `<h2>Production par machine</h2><table><tr>${["Code","Étape","Production","Rejets"].map(th).join("")}</tr>${report.production_by_machine.map(r=>`<tr>${td(r.machine_code)}${td(r.machine_name)}${td(fmt(r.produced,0),1)}${td(fmt(r.rejects,0),1)}</tr>`).join("")}</table>`;
  } else if (type === "production-of") {
    body += `<h2>Résumé</h2><table><tr>${["Total OF","Terminés","En cours","Production","Rejets","Taux rejet"].map(th).join("")}</tr>
      <tr>${[s.total_of??0, s.of_termines??0, s.of_en_cours??0, fmt(s.total_produit,0)+" u.", fmt(s.total_rejects,0)+" u.", fmt(s.taux_rejet_global_pct)+" %"].map(v=>`<td class="r">${v}</td>`).join("")}</tr></table>`;
    if (report.of_rows?.length)
      body += `<h2>Détail par OF</h2><table><tr>${["OF","Produit","Date","Statut","Cible","Produit","Conforme","Rejets","Taux %","Durée (min)"].map(th).join("")}</tr>${report.of_rows.map(r=>`<tr>${td(r.of_numero)}${td(r.produit)}${td(r.date)}${td(r.statut)}${td(fmt(r.quantite_cible,0),1)}${td(fmt(r.quantite_produite,2),1)}${td(fmt(r.quantite_conforme,2),1)}${td(fmt(r.rejets,2),1)}${td(fmt(r.taux_rejet_pct)+" %",1)}${td(fmt(r.duree_minutes,1),1)}</tr>`).join("")}</table>`;
  } else if (type === "maintenance") {
    body += `<h2>Résumé</h2><table><tr>${["Interventions","Heures totales","Machines affectées","Durée moyenne"].map(th).join("")}</tr>
      <tr>${[s.total_interventions??0, fmt(s.total_hours,1)+" h", s.machines_affected??0, fmt(s.avg_duration_minutes,1)+" min"].map(v=>`<td class="r">${v}</td>`).join("")}</tr></table>`;
    if (report.machines_most_impacted?.length)
      body += `<h2>Machines les plus impactées</h2><table><tr>${["Machine","Référence","Interventions","Heures d'arrêt"].map(th).join("")}</tr>${report.machines_most_impacted.map(m=>`<tr>${td(m.machine_name)}${td(m.machine_reference)}${td(m.interventions,1)}${td(fmt(m.total_hours,1)+" h",1)}</tr>`).join("")}</table>`;
    if (report.history?.length)
      body += `<h2>Historique</h2><table><tr>${["Date","Machine","Technicien","Durée (min)","Action"].map(th).join("")}</tr>${report.history.map(h=>`<tr>${td(fmtDatetimeFR(h.date))}${td(h.machine_name)}${td(h.technician)}${td(fmt(h.duration_minutes,1),1)}${td(h.action_effectuee)}</tr>`).join("")}</table>`;
  } else if (type === "performance") {
    body += `<h2>OEE Global</h2><table><tr>${["OEE Global","Disponibilité","Performance","Qualité","Production totale","Rejets"].map(th).join("")}</tr>
      <tr>${[fmt(s.global_oee)+" %",fmt(s.availability)+" %",fmt(s.performance)+" %",fmt(s.quality)+" %",fmt(s.total_produced,0)+" u.",fmt(s.total_rejects,0)+" u."].map(v=>`<td class="r"><strong>${v}</strong></td>`).join("")}</tr></table>`;
    if (report.per_machine?.length)
      body += `<h2>OEE par machine</h2><table><tr>${["Machine","Référence","Type","État","Runtime (min)","Downtime (min)","Dispo %","OEE %"].map(th).join("")}</tr>${report.per_machine.map(m=>`<tr>${td(m.machine_name)}${td(m.machine_reference)}${td(m.machine_type)}${td(m.current_state)}${td(fmt(m.runtime_minutes,1),1)}${td(fmt(m.downtime_minutes,1),1)}${td(fmt(m.availability_pct)+" %",1)}${td(fmt(m.oee)+" %",1)}</tr>`).join("")}</table>`;
    if (report.trend?.length)
      body += `<h2>Tendance journalière</h2><table><tr>${["Date","Disponibilité %","OEE %","Production"].map(th).join("")}</tr>${report.trend.map(t=>`<tr>${td(fmtDateFR(t.date))}${td(fmt(t.availability)+" %",1)}${td(fmt(t.oee)+" %",1)}${td(fmt(t.produced,0),1)}</tr>`).join("")}</table>`;
  } else if (type === "traceability") {
    body += `<h2>Résumé</h2><table><tr>${["Total lots","Total étapes","Machines utilisées","Lots terminés","Lots en cours"].map(th).join("")}</tr>
      <tr>${[s.total_lots??0, s.total_steps??0, s.machines_used??0, s.lots_completed??0, s.lots_in_progress??0].map(v=>`<td class="r">${v}</td>`).join("")}</tr></table>`;
    if (report.lots?.length) {
      body += `<h2>Lots</h2><table><tr>${["Numéro lot","Produit","Ordre","Date","Statut","Qté initiale","Qté finale","Rendement %"].map(th).join("")}</tr>`;
      report.lots.forEach(lot => {
        body += `<tr style="font-weight:600">${td(lot.numero_lot)}${td(lot.produit)}${td(lot.ordre_id)}${td(lot.date_creation)}${td(lot.statut)}${td(lot.quantite_initiale,1)}${td(lot.quantite_finale,1)}${td(fmt(lot.rendement_pct)+" %",1)}</tr>`;
        (lot.steps||[]).forEach(step => {
          body += `<tr style="background:#f8fafc;color:#64748b"><td style="padding-left:24px">↳ ${step.operation??""}</td>${td(step.machine)}${td(step.operateur)}${td(step.statut)}${td(step.duree_min+" min",1)}${td(step.quantite+" u.",1)}<td></td><td></td></tr>`;
        });
      });
      body += `</table>`;
    }
  }
  const typeLabels = {
    "daily": "Rapport Journalier", "weekly": "Rapport Hebdomadaire",
    "production-of": "Rapport Production (OF)", "maintenance": "Rapport Maintenance",
    "performance": "Rapport Performance (OEE)", "traceability": "Rapport Traçabilité",
  };
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Rapport MES</title><style>
    *{box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;margin:0;padding:32px 40px;font-size:12px}
    .hdr{border-bottom:3px solid #1d4ed8;padding-bottom:16px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-start}
    .hdr h1{margin:0;font-size:18px;color:#0f172a}.hdr p{margin:4px 0 0;color:#64748b;font-size:12px}
    .hdr-right{text-align:right;font-size:11px;color:#94a3b8}
    h2{font-size:11px;font-weight:800;color:#1d4ed8;text-transform:uppercase;letter-spacing:.08em;margin:24px 0 8px;padding-bottom:5px;border-bottom:1px solid #e2e8f0}
    table{width:100%;border-collapse:collapse;margin-bottom:4px}
    th{background:#f1f5f9;padding:7px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;text-align:left;border:1px solid #e2e8f0}
    td{padding:7px 10px;border:1px solid #e2e8f0;color:#334155}td.r{text-align:right}
    tr:nth-child(even) td{background:#f8fafc}
    .foot{margin-top:32px;border-top:1px solid #e2e8f0;padding-top:10px;font-size:10px;color:#94a3b8;text-align:center}
    @media print{body{padding:16px 20px}}
  </style></head><body>
  <div class="hdr">
    <div><h1>MES Platform — Rapport de Production</h1><p>${typeLabels[type] ?? type} · ${label}</p></div>
    <div class="hdr-right">Généré le ${new Date().toLocaleString("fr-FR")}<br>MES Platform v2</div>
  </div>${body}
  <div class="foot">MES Platform — Document confidentiel généré automatiquement</div>
  </body></html>`;
};
const openPrintWindow = (report, type, label) => {
  const win = window.open("", "_blank", "width=960,height=720");
  if (!win) { alert("Autorisez les pop-ups pour utiliser l'export."); return; }
  win.document.write(buildPrintHTML(report, type, label));
  win.document.close();
  win.onload = () => win.print();
};

/* ─────────────────────────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────────────────────────── */
const C = {
  bg: "#f1f5f9",
  surface: "#ffffff",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  text: "#0f172a",
  textSub: "#475569",
  textMuted: "#94a3b8",
  primary: "#1d4ed8",
  primaryLight: "#eff6ff",
  primaryBorder: "#bfdbfe",
  success: "#16a34a",
  successLight: "#f0fdf4",
  warning: "#d97706",
  warningLight: "#fffbeb",
  danger: "#dc2626",
  dangerLight: "#fff1f2",
};

const scoreColor = (v) => Number(v) >= 80 ? C.success : Number(v) >= 60 ? C.warning : C.danger;
const scoreBg   = (v) => Number(v) >= 80 ? C.successLight : Number(v) >= 60 ? C.warningLight : C.dangerLight;

const STATE_COLORS = {
  MARCHE:      { bg: "#dcfce7", text: "#166534", dot: "#16a34a" },
  PAUSE:       { bg: "#fee2e2", text: "#991b1b", dot: "#dc2626" },
  MAINTENANCE: { bg: "#ffedd5", text: "#9a3412", dot: "#ea580c" },
  ERREUR:      { bg: "#fce7f3", text: "#9d174d", dot: "#db2777" },
};

/* ─────────────────────────────────────────────────────────────────────────────
   PRIMITIVE COMPONENTS
───────────────────────────────────────────────────────────────────────────── */

const css_spin = `@keyframes _spin{to{transform:rotate(360deg)}}`;

/* Generic white card — overflow defaults to "hidden" to clip inner content to border-radius;
   pass overflow="visible" when the panel hosts a custom dropdown. */
const Panel = ({ children, style, overflow = "hidden" }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow, boxShadow: "0 1px 4px rgba(15,23,42,0.06)", ...style }}>
    {children}
  </div>
);

/* Section divider heading */
const SectionTitle = ({ children, icon: Icon, aside }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
    {Icon && <Icon size={15} color={C.primary} />}
    <span style={{ fontSize: 11, fontWeight: 800, color: C.primary, textTransform: "uppercase", letterSpacing: "0.08em" }}>{children}</span>
    <div style={{ flex: 1, height: 1, background: C.border, marginLeft: 4 }} />
    {aside && <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0 }}>{aside}</span>}
  </div>
);

/* Horizontal page divider */
const PageDivider = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "32px 0 24px" }}>
    <div style={{ flex: 1, height: 1, background: C.border }} />
    <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>{label}</span>
    <div style={{ flex: 1, height: 1, background: C.border }} />
  </div>
);

/* KPI metric card with left accent bar */
const MetricCard = ({ label, value, unit, sub, accent = C.primary }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", display: "flex", boxShadow: "0 1px 3px rgba(15,23,42,0.05)" }}>
    <div style={{ width: 4, background: accent, flexShrink: 0 }} />
    <div style={{ padding: "14px 16px", flex: 1, minWidth: 0 }}>
      <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.text, lineHeight: 1, letterSpacing: "-0.02em" }}>
        {value}<span style={{ fontSize: 13, fontWeight: 500, color: C.textSub, marginLeft: 4 }}>{unit}</span>
      </p>
      {sub && <p style={{ margin: "5px 0 0", fontSize: 11, color: C.textMuted }}>{sub}</p>}
    </div>
  </div>
);

/* OEE indicator card */
const OeeCard = ({ label, value }) => {
  const c = scoreColor(value);
  const bg = scoreBg(value);
  const pct = Math.min(100, Math.max(0, Number(value)));
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px", boxShadow: "0 1px 3px rgba(15,23,42,0.05)" }}>
      <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
      <p style={{ margin: "0 0 10px", fontSize: 28, fontWeight: 900, color: c, letterSpacing: "-0.03em", lineHeight: 1 }}>{fmt(value)} %</p>
      <div style={{ height: 5, background: C.borderLight, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: c, borderRadius: 3, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
};

/* Table primitives */
const THead = ({ children }) => (
  <thead><tr style={{ background: "#f8fafc", borderBottom: `1px solid ${C.border}` }}>{children}</tr></thead>
);
const Th = ({ children, right, center }) => (
  <th style={{ padding: "9px 14px", fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", textAlign: right ? "right" : center ? "center" : "left", whiteSpace: "nowrap" }}>
    {children}
  </th>
);
const TRow = ({ children, highlight }) => (
  <tr style={{ borderBottom: `1px solid ${C.borderLight}`, background: highlight ? C.primaryLight : "transparent", transition: "background 0.1s" }}
    onMouseEnter={e => { if (!highlight) e.currentTarget.style.background = "#f8fafc"; }}
    onMouseLeave={e => { if (!highlight) e.currentTarget.style.background = "transparent"; }}>
    {children}
  </tr>
);
const Td = ({ children, right, center, mono, muted, bold, danger }) => (
  <td style={{ padding: "10px 14px", fontSize: 13, color: danger ? C.danger : muted ? C.textMuted : bold ? C.text : C.textSub, textAlign: right ? "right" : center ? "center" : "left", fontVariantNumeric: mono ? "tabular-nums" : undefined, fontWeight: bold || danger ? 700 : undefined, whiteSpace: "nowrap" }}>
    {children}
  </td>
);

/* State badge */
const StateBadge = ({ state }) => {
  const s = String(state || "").toUpperCase();
  const c = STATE_COLORS[s] || { bg: "#f1f5f9", text: "#64748b", dot: "#94a3b8" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: c.bg, color: c.text, borderRadius: 20, padding: "3px 10px 3px 8px", fontSize: 11, fontWeight: 700 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {s || "—"}
    </span>
  );
};

/* Mini availability bar */
const AvailBar = ({ pct }) => {
  const p = Math.min(100, Math.max(0, Number(pct)));
  const c = scoreColor(pct);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: c, width: 44, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(pct)} %</span>
      <div style={{ width: 56, height: 5, background: C.borderLight, borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
        <div style={{ height: "100%", width: `${p}%`, background: c, borderRadius: 3 }} />
      </div>
    </div>
  );
};

/* Trend arrow */
const Trend = ({ curr, prev }) => {
  if (prev == null || curr === prev) return <span style={{ color: C.textMuted, fontSize: 11, marginLeft: 3 }}>—</span>;
  return curr > prev
    ? <span style={{ color: C.success, fontSize: 11, marginLeft: 3, fontWeight: 700 }}>↑</span>
    : <span style={{ color: C.danger, fontSize: 11, marginLeft: 3, fontWeight: 700 }}>↓</span>;
};

/* Code chip */
const CodeChip = ({ children }) => (
  <code style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", background: "#f1f5f9", color: "#475569", padding: "2px 7px", borderRadius: 5, border: `1px solid ${C.border}` }}>
    {children}
  </code>
);

/* Empty state */
const Empty = ({ icon: Icon, title, subtitle }) => (
  <div style={{ textAlign: "center", padding: "40px 20px", color: C.textMuted }}>
    {Icon && <Icon size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />}
    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.textSub }}>{title}</p>
    {subtitle && <p style={{ margin: "5px 0 0", fontSize: 13 }}>{subtitle}</p>}
  </div>
);

/* Loading spinner */
const Spinner = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "56px 0" }}>
    <style>{css_spin}</style>
    <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${C.border}`, borderTopColor: C.primary, animation: "_spin 0.75s linear infinite" }} />
    <p style={{ margin: 0, fontSize: 13, color: C.textMuted, fontWeight: 500 }}>Génération du rapport en cours…</p>
  </div>
);

/* Ghost button */
const GhostBtn = ({ onClick, children, active, danger, title }) => (
  <button onClick={onClick} title={title} style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "7px 13px", borderRadius: 8,
    border: `1px solid ${danger ? "#fca5a5" : active ? C.primaryBorder : C.border}`,
    background: danger ? "#fff1f2" : active ? C.primaryLight : C.surface,
    color: danger ? C.danger : active ? C.primary : C.textSub,
    fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
    transition: "all 0.12s",
  }}>
    {children}
  </button>
);

/* Primary button */
const PrimaryBtn = ({ onClick, disabled, children }) => (
  <button onClick={onClick} disabled={disabled} style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 20px", borderRadius: 8, border: "none",
    background: disabled ? "#94a3b8" : C.primary, color: "#fff",
    fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: disabled ? "none" : "0 1px 3px rgba(29,78,216,0.25)",
    transition: "all 0.12s",
  }}>
    {children}
  </button>
);

/* ─────────────────────────────────────────────────────────────────────────────
   SHARED SMALL COMPONENTS FOR NEW REPORTS
───────────────────────────────────────────────────────────────────────────── */

const StatutOFBadge = ({ statut }) => {
  const MAP = {
    TERMINE:    { bg: "#dcfce7", text: "#166534", label: "Terminé" },
    EN_COURS:   { bg: "#dbeafe", text: "#1e40af", label: "En cours" },
    EN_ATTENTE: { bg: "#f1f5f9", text: "#64748b", label: "En attente" },
  };
  const c = MAP[statut] || MAP.EN_ATTENTE;
  return (
    <span style={{ background: c.bg, color: c.text, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
      {c.label}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   REPORT CONTENT — PRODUCTION (par OF)
───────────────────────────────────────────────────────────────────────────── */
const ProductionOFContent = ({ report }) => {
  const s = report.summary || {};
  const ACCENT = "#ea580c";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Panel>
        <div style={{ padding: "16px 20px 12px" }}>
          <SectionTitle icon={Package}>Résumé de la période</SectionTitle>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))", gap: 12, padding: "0 20px 20px" }}>
          <MetricCard label="Ordres de fabrication" value={s.total_of ?? 0} unit="OF" sub={`Terminés : ${s.of_termines ?? 0} · En cours : ${s.of_en_cours ?? 0}`} accent={ACCENT} />
          <MetricCard label="Production totale" value={fmt(s.total_produit, 0)} unit="unités" accent="#3b82f6" />
          <MetricCard label="Rejets totaux" value={fmt(s.total_rejects, 0)} unit="unités" sub={`Taux : ${fmt(s.taux_rejet_global_pct)} %`} accent={C.danger} />
          <MetricCard label="Quantité cible" value={fmt(s.total_cible, 0)} unit="unités" accent={C.success} />
        </div>
      </Panel>

      <Panel>
        <div style={{ padding: "16px 20px 12px" }}>
          <SectionTitle icon={FileText} aside={`${report.of_rows?.length ?? 0} OF`}>Détail par Ordre de Fabrication</SectionTitle>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <THead>
              <Th>OF</Th><Th>Produit</Th><Th center>Date</Th><Th center>Statut</Th>
              <Th right>Cible</Th><Th right>Produit</Th><Th right>Conforme</Th>
              <Th right>Rejets</Th><Th right>Taux %</Th><Th right>Durée</Th>
            </THead>
            <tbody>
              {!report.of_rows?.length
                ? <tr><td colSpan={10}><Empty icon={Package} title="Aucun ordre de fabrication dans cette période" /></td></tr>
                : report.of_rows.map((r, i) => (
                  <TRow key={i}>
                    <Td bold><CodeChip>{r.of_numero}</CodeChip></Td>
                    <Td>{r.produit}</Td>
                    <Td center muted>{fmtDateFR(r.date)}</Td>
                    <td style={{ padding: "10px 14px", textAlign: "center" }}><StatutOFBadge statut={r.statut} /></td>
                    <Td right mono>{fmt(r.quantite_cible, 0)}</Td>
                    <Td right mono bold>{fmt(r.quantite_produite, 0)}</Td>
                    <Td right mono>{fmt(r.quantite_conforme, 0)}</Td>
                    <Td right mono danger={r.rejets > 0}>{fmt(r.rejets, 0)}</Td>
                    <Td right mono danger={r.taux_rejet_pct > 5}>{fmt(r.taux_rejet_pct)} %</Td>
                    <Td right mono muted>{fmtMins(r.duree_minutes)}</Td>
                  </TRow>
                ))
              }
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   REPORT CONTENT — MAINTENANCE
───────────────────────────────────────────────────────────────────────────── */
const MaintenanceContent = ({ report }) => {
  const s = report.summary || {};
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Panel>
        <div style={{ padding: "16px 20px 12px" }}>
          <SectionTitle icon={Wrench}>Résumé de la période</SectionTitle>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))", gap: 12, padding: "0 20px 20px" }}>
          <MetricCard label="Interventions" value={s.total_interventions ?? 0} unit="" sub={`${s.open_interventions ?? 0} en cours`} accent="#f59e0b" />
          <MetricCard label="Heures d'arrêt" value={fmt(s.total_hours, 1)} unit="h" accent={C.danger} />
          <MetricCard label="Machines affectées" value={s.machines_affected ?? 0} unit="" accent="#8b5cf6" />
          <MetricCard label="Durée moyenne" value={fmt(s.avg_duration_minutes, 1)} unit="min" accent="#3b82f6" />
        </div>
      </Panel>

      {report.machines_most_impacted?.length > 0 && (
        <Panel>
          <div style={{ padding: "16px 20px 12px" }}>
            <SectionTitle icon={AlertCircle}>Machines les plus impactées</SectionTitle>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <THead><Th>Machine</Th><Th>Référence</Th><Th right>Interventions</Th><Th right>Heures d'arrêt</Th></THead>
              <tbody>
                {report.machines_most_impacted.map((m, i) => (
                  <TRow key={i}>
                    <Td bold>{m.machine_name}</Td>
                    <Td muted>{m.machine_reference}</Td>
                    <Td right mono>{m.interventions}</Td>
                    <Td right mono danger={m.total_hours > 1}>{fmt(m.total_hours, 1)} h</Td>
                  </TRow>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <Panel>
        <div style={{ padding: "16px 20px 12px" }}>
          <SectionTitle icon={Clock} aside={`${report.history?.length ?? 0} entrée(s)`}>Historique des interventions</SectionTitle>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <THead><Th>Date</Th><Th>Machine</Th><Th>Technicien</Th><Th right>Durée</Th><Th>Action effectuée</Th></THead>
            <tbody>
              {!report.history?.length
                ? <tr><td colSpan={5}><Empty icon={Wrench} title="Aucune intervention dans cette période" /></td></tr>
                : report.history.map((h, i) => (
                  <TRow key={i}>
                    <Td muted mono>{fmtDatetimeFR(h.date)}</Td>
                    <Td bold>
                      {h.machine_name}
                      <span style={{ display: "block", fontSize: 11, color: C.textMuted, fontWeight: 400 }}>{h.machine_reference}</span>
                    </Td>
                    <Td>{h.technician}</Td>
                    <Td right mono>{fmtMins(h.duration_minutes)}</Td>
                    <Td muted>{h.action_effectuee || "—"}</Td>
                  </TRow>
                ))
              }
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   REPORT CONTENT — PERFORMANCE (OEE)
───────────────────────────────────────────────────────────────────────────── */
const PerformanceContent = ({ report }) => {
  const s = report.summary || {};
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Panel>
        <div style={{ padding: "16px 20px 12px" }}>
          <SectionTitle icon={Zap}>OEE Global</SectionTitle>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, padding: "0 20px 20px" }}>
          <OeeCard label="OEE Global"    value={s.global_oee} />
          <OeeCard label="Disponibilité" value={s.availability} />
          <OeeCard label="Performance"   value={s.performance} />
          <OeeCard label="Qualité"       value={s.quality} />
        </div>
      </Panel>

      <Panel>
        <div style={{ padding: "16px 20px 12px" }}>
          <SectionTitle icon={BarChart3} aside={`${report.per_machine?.length ?? 0} machine(s)`}>OEE par machine</SectionTitle>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <THead>
              <Th>Machine</Th><Th>Type</Th><Th center>État</Th>
              <Th right>Runtime</Th><Th right>Downtime</Th><Th right>Disponibilité</Th><Th right>OEE</Th>
            </THead>
            <tbody>
              {!report.per_machine?.length
                ? <tr><td colSpan={7}><Empty icon={Zap} title="Aucune machine" /></td></tr>
                : report.per_machine.map((m, i) => (
                  <TRow key={i}>
                    <Td bold>
                      {m.machine_name}
                      <span style={{ display: "block", fontSize: 11, color: C.textMuted, fontWeight: 400 }}>{m.machine_reference}</span>
                    </Td>
                    <Td muted>{m.machine_type || "—"}</Td>
                    <td style={{ padding: "10px 14px", textAlign: "center" }}><StateBadge state={m.current_state} /></td>
                    <Td right mono>{fmtMins(m.runtime_minutes)}</Td>
                    <Td right mono>{fmtMins(m.downtime_minutes)}</Td>
                    <td style={{ padding: "10px 14px" }}><AvailBar pct={m.availability_pct} /></td>
                    <Td right>
                      <span style={{ fontWeight: 700, color: scoreColor(m.oee), fontVariantNumeric: "tabular-nums" }}>{fmt(m.oee)} %</span>
                    </Td>
                  </TRow>
                ))
              }
            </tbody>
          </table>
        </div>
      </Panel>

      {report.trend?.length > 0 && (
        <Panel>
          <div style={{ padding: "16px 20px 12px" }}>
            <SectionTitle icon={Activity}>Tendance journalière</SectionTitle>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <THead><Th>Jour</Th><Th right>Disponibilité</Th><Th right>OEE</Th><Th right>Production</Th></THead>
              <tbody>
                {report.trend.map((t, i) => {
                  const prev = i > 0 ? report.trend[i - 1] : null;
                  return (
                    <TRow key={t.date}>
                      <Td>{fmtDateFR(t.date)}</Td>
                      <Td right>
                        <span style={{ fontWeight: 700, color: scoreColor(t.availability), fontVariantNumeric: "tabular-nums" }}>{fmt(t.availability)} %</span>
                        <Trend curr={t.availability} prev={prev?.availability} />
                      </Td>
                      <Td right>
                        <span style={{ fontWeight: 700, color: scoreColor(t.oee), fontVariantNumeric: "tabular-nums" }}>{fmt(t.oee)} %</span>
                        <Trend curr={t.oee} prev={prev?.oee} />
                      </Td>
                      <Td right mono>{fmt(t.produced, 0)}</Td>
                    </TRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   REPORT CONTENT — TRAÇABILITÉ
───────────────────────────────────────────────────────────────────────────── */
const TRACE_STATUT_FR = {
  completed: { label: "Terminé",   bg: "#dcfce7", text: "#166534" },
  running:   { label: "En cours",  bg: "#dbeafe", text: "#1e40af" },
};
const traceStatutFR  = (s) => TRACE_STATUT_FR[s] || { label: s || "—", bg: "#f1f5f9", text: "#64748b" };
const traceStepColor = (s) => s === "completed" ? C.success : s === "running" ? "#1d4ed8" : C.textMuted;

const TraceabilityContent = ({ report }) => {
  const s = report.summary || {};
  const [expanded, setExpanded] = useState({});
  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── KPIs ── */}
      <Panel>
        <div style={{ padding: "16px 20px 12px" }}>
          <SectionTitle icon={Eye}>Résumé de la période</SectionTitle>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 12, padding: "0 20px 20px" }}>
          <MetricCard label="Total lots"         value={s.total_lots      ?? 0} unit="" accent="#0ea5e9" />
          <MetricCard label="Lots terminés"      value={s.lots_completed  ?? 0} unit="" accent={C.success} />
          <MetricCard label="Lots en cours"      value={s.lots_in_progress ?? 0} unit="" accent="#f59e0b" />
          <MetricCard label="Étapes totales"     value={s.total_steps     ?? 0} unit="" accent="#8b5cf6" />
          <MetricCard label="Machines utilisées" value={s.machines_used   ?? 0} unit="" accent="#64748b" />
        </div>
      </Panel>

      {/* ── Lots table ── */}
      <Panel>
        <div style={{ padding: "16px 20px 12px" }}>
          <SectionTitle icon={FileText} aside={`${report.lots?.length ?? 0} lot(s)`}>
            Lots de traçabilité
          </SectionTitle>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <THead>
              <Th></Th>
              <Th>Numéro de lot</Th>
              <Th>Produit</Th>
              <Th>Ordre</Th>
              <Th center>Date de création</Th>
              <Th center>Statut</Th>
              <Th right>Qté initiale</Th>
              <Th right>Qté finale</Th>
              <Th right>Rendement</Th>
            </THead>
            <tbody>
              {!report.lots?.length ? (
                <tr><td colSpan={9}><Empty icon={Eye} title="Aucun lot dans cette période" subtitle="Élargissez la plage de dates pour obtenir des résultats." /></td></tr>
              ) : report.lots.map((lot) => {
                const isExp  = expanded[lot.numero_lot];
                const stat   = traceStatutFR(lot.statut);
                const hasSteps = (lot.steps || []).length > 0;
                return (
                  <React.Fragment key={lot.numero_lot}>

                    {/* ── lot row ── */}
                    <TRow>
                      <td style={{ padding: "10px 8px 10px 14px", width: 32 }}>
                        {hasSteps && (
                          <button
                            onClick={() => toggle(lot.numero_lot)}
                            title={isExp ? "Masquer les étapes" : "Voir les étapes"}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 5, background: isExp ? C.primaryLight : "#f1f5f9", border: `1px solid ${isExp ? C.primaryBorder : C.border}`, cursor: "pointer" }}
                          >
                            <ChevronRight size={12} color={isExp ? C.primary : C.textMuted} style={{ transform: isExp ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                          </button>
                        )}
                      </td>
                      <Td bold><CodeChip>{lot.numero_lot}</CodeChip></Td>
                      <Td>{lot.produit || "—"}</Td>
                      <Td muted>{lot.ordre_id || "—"}</Td>
                      <Td center muted>{fmtDatetimeFR(lot.date_creation) || "—"}</Td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <span style={{ display: "inline-block", background: stat.bg, color: stat.text, borderRadius: 20, padding: "3px 11px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                          {stat.label}
                        </span>
                      </td>
                      <Td right mono>{lot.quantite_initiale ?? "—"}</Td>
                      <Td right mono>{lot.quantite_finale ?? "—"}</Td>
                      <Td right>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, color: scoreColor(lot.rendement_pct) }}>
                          {fmt(lot.rendement_pct)} %
                          <span style={{ width: 32, height: 4, borderRadius: 2, background: "#e2e8f0", overflow: "hidden", display: "inline-block" }}>
                            <span style={{ display: "block", height: "100%", width: `${Math.min(100, lot.rendement_pct || 0)}%`, background: scoreColor(lot.rendement_pct), borderRadius: 2 }} />
                          </span>
                        </span>
                      </Td>
                    </TRow>

                    {/* ── steps rows ── */}
                    {isExp && (lot.steps || []).map((step, si) => {
                      const stepStat = traceStatutFR(step.statut);
                      return (
                        <tr key={si} style={{ background: "#f8fafc", borderBottom: `1px solid ${C.borderLight}` }}>
                          {/* indent + connector */}
                          <td style={{ padding: "0 0 0 22px", width: 32 }}>
                            <div style={{ width: 12, height: "100%", borderLeft: `2px solid ${C.border}`, borderBottom: `2px solid ${C.border}`, borderBottomLeftRadius: 4, minHeight: 36 }} />
                          </td>
                          {/* step number badge */}
                          <td style={{ padding: "8px 8px 8px 6px", whiteSpace: "nowrap" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, background: "#e2e8f0", borderRadius: 4, padding: "2px 6px" }}>
                              #{si + 1}
                            </span>
                          </td>
                          <Td>{step.operation || "—"}</Td>
                          <td style={{ padding: "8px 14px" }}><CodeChip>{step.machine || "—"}</CodeChip></td>
                          <Td center muted>{step.operateur || "—"}</Td>
                          <td style={{ padding: "8px 14px", textAlign: "center" }}>
                            <span style={{ display: "inline-block", background: stepStat.bg, color: stepStat.text, borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 700 }}>
                              {stepStat.label}
                            </span>
                          </td>
                          <Td right mono muted>{step.duree_min != null ? `${step.duree_min} min` : "—"}</Td>
                          <Td right mono muted>{step.quantite ?? "—"}</Td>
                          <td />
                        </tr>
                      );
                    })}

                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   REPORT CONTENT — DAILY
───────────────────────────────────────────────────────────────────────────── */
const DailyContent = ({ report }) => {
  const p = report.production || {};
  const o = report.oee || {};
  const hasProduction = Number(p.total_produced) > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Production KPI grid */}
      <Panel>
        <div style={{ padding: "16px 20px 12px" }}>
          <SectionTitle icon={Activity}>Résumé de la journée</SectionTitle>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 12, padding: "0 20px 20px" }}>
          <MetricCard label="Production" value={fmt(p.total_produced, 0)} unit="unités" sub={`Matière 1ère : ${fmt(p.total_raw_material, 0)} u.`} accent="#3b82f6" />
          <MetricCard label="Rejets" value={fmt(p.total_rejects, 0)} unit="unités" sub={`Rendement : ${fmt(p.rendement_pct)} %`} accent={C.danger} />
          <MetricCard label="OEE global" value={fmt(o.oee)} unit="%" sub={`Qualité : ${fmt(o.quality)} %`} accent={scoreColor(o.oee)} />
          <MetricCard label="Ordres de fabrication" value={p.orders_completed ?? 0} unit={`/ ${p.orders_count ?? 0}`} sub={`${p.orders_in_progress ?? 0} en cours`} accent="#f59e0b" />
        </div>
      </Panel>

      {/* OEE breakdown */}
      <Panel>
        <div style={{ padding: "16px 20px 12px" }}>
          <SectionTitle icon={BarChart3}>Indicateurs OEE</SectionTitle>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, padding: "0 20px 20px" }}>
          <OeeCard label="Disponibilité" value={o.availability} />
          <OeeCard label="Performance" value={o.performance} />
          <OeeCard label="Qualité" value={o.quality} />
          <OeeCard label="OEE Global" value={o.oee} />
        </div>
      </Panel>

      {/* Machine table */}
      <Panel>
        <div style={{ padding: "16px 20px 12px" }}>
          <SectionTitle icon={Clock} aside={`${report.machines?.length ?? 0} machine(s)`}>Disponibilité des machines</SectionTitle>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <THead>
              <Th>Machine</Th>
              <Th>Type</Th>
              <Th center>État</Th>
              <Th right>Runtime</Th>
              <Th right>Downtime</Th>
              <Th right>Disponibilité</Th>
            </THead>
            <tbody>
              {!report.machines?.length
                ? <tr><td colSpan={6}><Empty icon={FileText} title="Aucune machine enregistrée" /></td></tr>
                : report.machines.map(m => (
                  <TRow key={m.reference}>
                    <Td bold>
                      {m.name}
                      <span style={{ display: "block", fontSize: 11, color: C.textMuted, fontWeight: 400 }}>{m.reference}</span>
                    </Td>
                    <Td muted>{m.machine_type || "—"}</Td>
                    <td style={{ padding: "10px 14px", textAlign: "center" }}>
                      <StateBadge state={m.current_state} />
                    </td>
                    <Td right mono>{fmtMins(m.runtime_minutes)}</Td>
                    <Td right mono>{fmtMins(m.downtime_minutes)}</Td>
                    <td style={{ padding: "10px 14px" }}>
                      <AvailBar pct={m.availability_pct} />
                    </td>
                  </TRow>
                ))
              }
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Production by step */}
      {report.production_by_machine?.length > 0 && (
        <Panel>
          <div style={{ padding: "16px 20px 12px" }}>
            <SectionTitle icon={FileText}>Production par étape machine</SectionTitle>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <THead><Th>Code</Th><Th>Étape</Th><Th right>Produit (qté)</Th><Th right>Rejets</Th></THead>
              <tbody>
                {report.production_by_machine.map((r, i) => (
                  <TRow key={i}>
                    <Td><CodeChip>{r.machine_code || "—"}</CodeChip></Td>
                    <Td>{r.machine_name || "—"}</Td>
                    <Td right mono bold>{fmt(r.produced, 0)}</Td>
                    <Td right mono danger={r.rejects > 0}>{fmt(r.rejects, 0)}</Td>
                  </TRow>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Reject detail */}
      {report.reject_breakdown?.length > 0 && (
        <Panel>
          <div style={{ padding: "16px 20px 12px" }}>
            <SectionTitle icon={AlertCircle} aside={`${report.reject_breakdown.length} type(s)`}>Détail des rejets</SectionTitle>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <THead><Th>Type de défaut</Th><Th right>Quantité</Th></THead>
              <tbody>
                {report.reject_breakdown.map((r, i) => (
                  <TRow key={i}>
                    <Td>{r.defaut}</Td>
                    <Td right mono danger>{fmt(r.quantite, 0)}</Td>
                  </TRow>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {!hasProduction && (
        <Panel>
          <Empty icon={FileText} title="Aucune donnée de production pour cette date" subtitle="Les machines sont enregistrées mais aucun ordre de fabrication n'a été traité ce jour." />
        </Panel>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   REPORT CONTENT — WEEKLY
───────────────────────────────────────────────────────────────────────────── */
const WeeklyContent = ({ report }) => {
  const s = report.summary || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Weekly KPI grid */}
      <Panel>
        <div style={{ padding: "16px 20px 12px" }}>
          <SectionTitle icon={Activity}>Résumé de la semaine</SectionTitle>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, padding: "0 20px 20px" }}>
          <MetricCard label="Production" value={fmt(s.total_produced, 0)} unit="unités" accent="#3b82f6" />
          <MetricCard label="Rejets" value={fmt(s.total_rejects, 0)} unit="unités" accent={C.danger} />
          <MetricCard label="OEE moyen" value={fmt(s.avg_oee)} unit="%" sub={`Dispo. moy. ${fmt(s.avg_availability)} %`} accent={scoreColor(s.avg_oee)} />
          <MetricCard label="Runtime total" value={fmt(s.total_runtime_hours, 1)} unit="h" sub={`Arrêts : ${fmt(s.total_downtime_hours, 1)} h`} accent="#8b5cf6" />
        </div>
      </Panel>

      {/* Daily breakdown */}
      <Panel>
        <div style={{ padding: "16px 20px 12px" }}>
          <SectionTitle icon={Calendar}>Évolution journalière</SectionTitle>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <THead>
              <Th>Jour</Th>
              <Th right>Production</Th>
              <Th right>Rejets</Th>
              <Th right>Disponibilité</Th>
              <Th right>OEE</Th>
            </THead>
            <tbody>
              {!report.daily_breakdown?.length
                ? <tr><td colSpan={5}><Empty title="Aucune donnée" /></td></tr>
                : report.daily_breakdown.map((d, i) => {
                  const prev = i > 0 ? report.daily_breakdown[i - 1] : null;
                  const isToday = d.date === todayISO();
                  return (
                    <TRow key={d.date} highlight={isToday}>
                      <Td bold={isToday}>
                        {fmtDateFR(d.date)}
                        {isToday && (
                          <span style={{ marginLeft: 7, background: C.primary, color: "#fff", borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>
                            Auj.
                          </span>
                        )}
                      </Td>
                      <Td right mono>
                        {fmt(d.produced, 0)}
                        <Trend curr={d.produced} prev={prev?.produced} />
                      </Td>
                      <Td right mono danger={d.rejects > 0}>{fmt(d.rejects, 0)}</Td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(d.availability), fontVariantNumeric: "tabular-nums" }}>
                            {fmt(d.availability)} %
                          </span>
                          <Trend curr={d.availability} prev={prev?.availability} />
                        </div>
                      </td>
                      <Td right mono>
                        <span style={{ fontWeight: 700, color: scoreColor(d.oee) }}>{fmt(d.oee)} %</span>
                        <Trend curr={d.oee} prev={prev?.oee} />
                      </Td>
                    </TRow>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Bottom 2-col grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Top machines down */}
        {report.machines_most_down?.length > 0 && (
          <Panel style={{ overflow: "visible" }}>
            <div style={{ padding: "16px 20px 12px" }}>
              <SectionTitle icon={AlertCircle}>Machines les plus en arrêt</SectionTitle>
            </div>
            <div style={{ padding: "0 20px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
              {report.machines_most_down.map((m, i) => (
                <div key={m.reference} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, background: i === 0 ? "#fee2e2" : i === 1 ? "#ffedd5" : "#f1f5f9", color: i === 0 ? C.danger : i === 1 ? C.warning : C.textMuted }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>{m.name}</span>
                      <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0, marginLeft: 6 }}>
                        {fmtMins(m.downtime_minutes)} · {fmt(m.downtime_pct)} %
                      </span>
                    </div>
                    <div style={{ height: 5, background: C.borderLight, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, m.downtime_pct)}%`, background: i === 0 ? C.danger : i === 1 ? C.warning : "#94a3b8", borderRadius: 3, transition: "width 0.5s" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Production by machine */}
        {report.production_by_machine?.length > 0 && (
          <Panel>
            <div style={{ padding: "16px 20px 12px" }}>
              <SectionTitle icon={FileText}>Production par machine</SectionTitle>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <THead><Th>Étape</Th><Th right>Production</Th><Th right>Rejets</Th></THead>
                <tbody>
                  {report.production_by_machine.map((r, i) => (
                    <TRow key={i}>
                      <Td>
                        <CodeChip>{r.machine_code}</CodeChip>
                        <span style={{ display: "block", fontSize: 11, color: C.textMuted, marginTop: 2 }}>{r.machine_name}</span>
                      </Td>
                      <Td right mono bold>{fmt(r.produced, 0)}</Td>
                      <Td right mono danger={r.rejects > 0}>{fmt(r.rejects, 0)}</Td>
                    </TRow>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   SAVED REPORTS PANEL
───────────────────────────────────────────────────────────────────────────── */
const SavedReportsPanel = ({ onOpen, refreshKey }) => {
  const [list, setList]           = useState(loadSaved);
  const [filterType, setFilter]   = useState("all");
  const [search, setSearch]       = useState("");
  const [pendingDelete, setPending] = useState(null);

  // Sync when parent triggers a new save
  React.useEffect(() => { setList(loadSaved()); }, [refreshKey]);

  const filtered = list.filter(r => {
    if (filterType !== "all" && r.type !== filterType) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.period.includes(q);
  });

  const doDelete = (id) => {
    const next = list.filter(r => r.id !== id);
    persistSaved(next);
    setList(next);
    setPending(null);
  };

  const FILTERS = [
    ["all", "Tous"], ["daily", "Journaliers"], ["weekly", "Hebdomadaires"],
    ["production-of", "Production OF"], ["maintenance", "Maintenance"],
    ["performance", "Performance"], ["traceability", "Traçabilité"],
  ];
  const TYPE_BADGE_COLORS = {
    "daily":         { bg: C.primaryLight, text: C.primary,  border: C.primaryBorder },
    "weekly":        { bg: "#f0fdf4",      text: C.success,  border: "#bbf7d0" },
    "production-of": { bg: "#fff7ed",      text: "#ea580c",  border: "#fed7aa" },
    "maintenance":   { bg: "#fffbeb",      text: "#d97706",  border: "#fde68a" },
    "performance":   { bg: "#f5f3ff",      text: "#7c3aed",  border: "#ddd6fe" },
    "traceability":  { bg: "#f0f9ff",      text: "#0284c7",  border: "#bae6fd" },
  };
  const TYPE_LABELS = {
    "daily": "Journalier", "weekly": "Hebdomadaire",
    "production-of": "Production OF", "maintenance": "Maintenance",
    "performance": "Performance OEE", "traceability": "Traçabilité",
  };

  return (
    <Panel>
      {/* Panel header */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.borderLight}`, background: "#fafafa", display: "flex", alignItems: "center", gap: 10 }}>
        <Save size={15} color={C.primary} />
        <span style={{ fontSize: 12, fontWeight: 800, color: C.text, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Rapports sauvegardés
        </span>
        {list.length > 0 && (
          <span style={{ background: C.primary, color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700, marginLeft: 2 }}>
            {list.length}
          </span>
        )}
        {/* Filters + search — right-aligned */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          {FILTERS.map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${filterType === v ? C.primary : C.border}`, background: filterType === v ? C.primaryLight : C.surface, color: filterType === v ? C.primary : C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {l}
            </button>
          ))}
          <div style={{ position: "relative", marginLeft: 4 }}>
            <Search size={12} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
              style={{ paddingLeft: 26, paddingRight: search ? 24 : 8, paddingTop: 5, paddingBottom: 5, borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, color: C.text, width: 180, outline: "none", background: C.surface }} />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textMuted, padding: 0, display: "flex" }}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      {!filtered.length
        ? <Empty icon={Save} title={list.length === 0 ? "Aucun rapport sauvegardé" : "Aucun résultat"} subtitle={list.length === 0 ? "Générez un rapport puis cliquez sur « Sauvegarder »" : "Modifiez vos filtres"} />
        : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <THead>
                <Th>Nom du rapport</Th>
                <Th center>Type</Th>
                <Th>Période</Th>
                <Th>Créé le</Th>
                <Th right>Actions</Th>
              </THead>
              <tbody>
                {filtered.map(r => (
                  <TRow key={r.id}>
                    <Td bold>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <FileText size={13} color={C.textMuted} style={{ flexShrink: 0 }} />
                        {r.name}
                      </div>
                    </Td>
                    <td style={{ padding: "10px 14px", textAlign: "center" }}>
                      {(() => { const bc = TYPE_BADGE_COLORS[r.type] || TYPE_BADGE_COLORS["daily"]; return (
                        <span style={{ background: bc.bg, color: bc.text, border: `1px solid ${bc.border}`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                          {TYPE_LABELS[r.type] ?? r.type}
                        </span>
                      ); })()}
                    </td>
                    <Td muted>{r.period}</Td>
                    <Td muted>{fmtDatetimeFR(r.created_at)}</Td>
                    <Td right>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <GhostBtn onClick={() => onOpen(r)} active title="Ouvrir ce rapport">
                          <Eye size={12} /> Ouvrir
                        </GhostBtn>
                        {pendingDelete === r.id ? (
                          <>
                            <GhostBtn onClick={() => doDelete(r.id)} danger>Confirmer</GhostBtn>
                            <GhostBtn onClick={() => setPending(null)}>Annuler</GhostBtn>
                          </>
                        ) : (
                          <GhostBtn onClick={() => setPending(r.id)} title="Supprimer">
                            <Trash2 size={12} />
                          </GhostBtn>
                        )}
                      </div>
                    </Td>
                  </TRow>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </Panel>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function ReportsDashboard() {
  const cw = getISOWeek();

  const [reportType,    setReportType]   = useState("daily");
  const [typeOpen,      setTypeOpen]     = useState(false);
  const [selDate,       setSelDate]      = useState(todayISO());
  const [selYear,       setSelYear]      = useState(cw.year);
  const [selWeek,       setSelWeek]      = useState(cw.week);
  const [selDateFrom,   setSelDateFrom]  = useState(thirtyDaysAgo);
  const [selDateTo,     setSelDateTo]    = useState(todayISO);
  const [report,        setReport]       = useState(null);
  const [loading,       setLoading]      = useState(false);
  const [error,         setError]        = useState(null);
  const [savedFlash,    setSavedFlash]   = useState(false);
  const [savedKey,      setSavedKey]     = useState(0);
  const [genTime,       setGenTime]      = useState(null);

  const reportRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!typeOpen) return;
    const handle = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [typeOpen]);

  const TYPES = [
    { value: "daily",         label: "Rapport Journalier",        icon: Calendar,  isRange: false },
    { value: "weekly",        label: "Rapport Hebdomadaire",      icon: BarChart3, isRange: false },
    { value: "production-of", label: "Rapport Production (OF)",   icon: Package,   isRange: true, accent: "#ea580c" },
    { value: "maintenance",   label: "Rapport Maintenance",       icon: Wrench,    isRange: true, accent: "#f59e0b" },
    { value: "performance",   label: "Rapport Performance (OEE)", icon: Zap,       isRange: true, accent: "#8b5cf6" },
    { value: "traceability",  label: "Rapport Traçabilité",       icon: Eye,       isRange: true, accent: "#0ea5e9" },
  ];
  const selectedType     = TYPES.find(t => t.value === reportType);
  const SelectedTypeIcon = selectedType.icon;
  const selectedAccent   = selectedType?.accent ?? C.primary;

  const label = reportType === "daily"
    ? new Date(selDate + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : reportType === "weekly"
    ? `Semaine ${selWeek} · ${selYear}`
    : `${selDateFrom} → ${selDateTo}`;

  const generate = useCallback(async () => {
    setLoading(true); setError(null); setReport(null); setSavedFlash(false); setGenTime(null);
    try {
      let res;
      if      (reportType === "daily")         res = await reportsAPI.getDaily(selDate);
      else if (reportType === "weekly")        res = await reportsAPI.getWeekly(`${selYear}-${selWeek}`);
      else if (reportType === "production-of") res = await reportsAPI.getProductionOf(selDateFrom, selDateTo);
      else if (reportType === "maintenance")   res = await reportsAPI.getMaintenance(selDateFrom, selDateTo);
      else if (reportType === "performance")   res = await reportsAPI.getPerformance(selDateFrom, selDateTo);
      else if (reportType === "traceability")  res = await reportsAPI.getTraceability(selDateFrom, selDateTo);
      setReport(res.data);
      setGenTime(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (e) {
      setError(e.response?.data?.detail || "Impossible de charger le rapport. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  }, [reportType, selDate, selYear, selWeek, selDateFrom, selDateTo]);

  const saveReport = () => {
    if (!report) return;
    let name, period;
    if (reportType === "daily") {
      name   = `Rapport Journalier — ${new Date(selDate + "T00:00:00").toLocaleDateString("fr-FR")}`;
      period = selDate;
    } else if (reportType === "weekly") {
      name   = `Rapport Hebdomadaire — Sem. ${selWeek} / ${selYear}`;
      period = `${selYear}-W${String(selWeek).padStart(2, "0")}`;
    } else {
      const typeLabel = TYPES.find(t => t.value === reportType)?.label ?? reportType;
      name   = `${typeLabel} — ${selDateFrom} → ${selDateTo}`;
      period = `${selDateFrom}/${selDateTo}`;
    }
    persistSaved([{ id: Date.now().toString(), name, type: reportType, period, created_at: new Date().toISOString(), data: report }, ...loadSaved()].slice(0, 50));
    setSavedFlash(true);
    setSavedKey(k => k + 1);
    setTimeout(() => setSavedFlash(false), 2800);
  };

  const openSaved = (saved) => {
    setReportType(saved.type);
    if (saved.type === "daily") {
      setSelDate(saved.period);
    } else if (saved.type === "weekly") {
      const [y, w] = saved.period.replace("W", "").split("-");
      setSelYear(Number(y)); setSelWeek(Number(w));
    } else {
      const [from, to] = saved.period.split("/");
      if (from) setSelDateFrom(from);
      if (to)   setSelDateTo(to);
    }
    setReport(saved.data);
    setGenTime(null);
    setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  return (
    <div style={{ padding: "28px 32px 40px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", width: "100%", boxSizing: "border-box", color: C.text }}>
      <style>{css_spin}</style>

      {/* ── PAGE HEADER ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: "-0.025em", color: C.text }}>
            Rapports de production
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textMuted }}>
            Génération, export et historique des rapports journaliers et hebdomadaires
          </p>
        </div>
      </div>

      {/* ── CONTROL PANEL ────────────────────────────────────────────────── */}
      <Panel overflow="visible" style={{ marginBottom: 20 }}>
        {/* Top bar — border-radius clips its own corners since Panel no longer clips children */}
        <div style={{ padding: "11px 18px", borderBottom: `1px solid ${C.borderLight}`, background: "#fafafa", borderRadius: "13px 13px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 3, height: 14, background: C.primary, borderRadius: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Paramètres
          </span>
        </div>

        <div style={{ padding: "16px 18px" }}>
          {/* Row 1: selectors + generate */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>

            {/* Type dropdown */}
            <div>
              <p style={{ margin: "0 0 5px", fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Type</p>
              <div ref={dropdownRef} style={{ position: "relative" }}>
                <button onClick={() => setTypeOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 11px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.text, minWidth: 210 }}>
                  <SelectedTypeIcon size={14} color={C.primary} />
                  {selectedType.label}
                  <ChevronDown size={13} style={{ marginLeft: "auto", color: C.textMuted, transform: typeOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                </button>
                {typeOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 8px 28px rgba(15,23,42,0.13)", zIndex: 60, minWidth: 210, overflow: "hidden" }}>
                    {TYPES.map(t => {
                      const TIcon = t.icon;
                      return (
                      <button key={t.value}
                        onClick={() => { setReportType(t.value); setTypeOpen(false); setReport(null); setError(null); }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "11px 14px", background: reportType === t.value ? C.primaryLight : "transparent", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: reportType === t.value ? C.primary : C.textSub, textAlign: "left" }}>
                        <TIcon size={14} color={reportType === t.value ? C.primary : C.textMuted} />
                        {t.label}
                        {reportType === t.value && <CheckCircle2 size={13} style={{ marginLeft: "auto", color: C.primary }} />}
                      </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Date / week / range pickers */}
            {reportType === "daily" ? (
              <div>
                <p style={{ margin: "0 0 5px", fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Date</p>
                <input type="date" value={selDate} max={todayISO()} onChange={e => setSelDate(e.target.value)}
                  style={{ padding: "8px 11px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.text, background: C.surface, cursor: "pointer", outline: "none" }} />
              </div>
            ) : reportType === "weekly" ? (
              <div style={{ display: "flex", gap: 8 }}>
                <div>
                  <p style={{ margin: "0 0 5px", fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Année</p>
                  <input type="number" value={selYear} min={2020} max={2099} onChange={e => setSelYear(Number(e.target.value))}
                    style={{ width: 86, padding: "8px 11px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.text, outline: "none" }} />
                </div>
                <div>
                  <p style={{ margin: "0 0 5px", fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Semaine</p>
                  <input type="number" value={selWeek} min={1} max={53} onChange={e => setSelWeek(Number(e.target.value))}
                    style={{ width: 74, padding: "8px 11px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.text, outline: "none" }} />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <div>
                  <p style={{ margin: "0 0 5px", fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Du</p>
                  <input type="date" value={selDateFrom} max={selDateTo} onChange={e => setSelDateFrom(e.target.value)}
                    style={{ padding: "8px 11px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.text, background: C.surface, cursor: "pointer", outline: "none" }} />
                </div>
                <div>
                  <p style={{ margin: "0 0 5px", fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Au</p>
                  <input type="date" value={selDateTo} min={selDateFrom} max={todayISO()} onChange={e => setSelDateTo(e.target.value)}
                    style={{ padding: "8px 11px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.text, background: C.surface, cursor: "pointer", outline: "none" }} />
                </div>
              </div>
            )}

            {/* Vertical separator */}
            <div style={{ width: 1, height: 36, background: C.border, alignSelf: "flex-end", margin: "0 2px" }} />

            {/* Generate + Save buttons */}
            <div style={{ alignSelf: "flex-end", display: "flex", gap: 8 }}>
              <PrimaryBtn onClick={generate} disabled={loading}>
                {loading
                  ? <><div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "_spin 0.75s linear infinite" }} />Génération…</>
                  : "Générer le rapport"}
              </PrimaryBtn>
              {report && !loading && (
                <GhostBtn onClick={saveReport} active={savedFlash}>
                  {savedFlash ? <><CheckCircle2 size={13} /> Sauvegardé</> : <><Save size={13} /> Sauvegarder</>}
                </GhostBtn>
              )}
            </div>
          </div>
        </div>
      </Panel>

      {/* ── ERROR ─────────────────────────────────────────────────────────── */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, background: C.dangerLight, border: `1px solid #fca5a5`, color: C.danger, fontSize: 13, marginBottom: 18, fontWeight: 500 }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}

      {/* ── LOADING ───────────────────────────────────────────────────────── */}
      {loading && <Panel><Spinner /></Panel>}

      {/* ── EMPTY STATE ───────────────────────────────────────────────────── */}
      {!loading && !report && !error && (
        <Panel style={{ marginBottom: 20 }}>
          <Empty icon={BarChart3} title="Prêt à générer un rapport" subtitle="Choisissez un type et une période, puis cliquez sur « Générer le rapport »" />
        </Panel>
      )}

      {/* ── REPORT CONTENT ────────────────────────────────────────────────── */}
      {!loading && report && (
        <div ref={reportRef}>
          {/* Report identity banner */}
          <div style={{ background: `linear-gradient(135deg, ${selectedAccent}cc, ${selectedAccent})`, borderRadius: 12, padding: "16px 22px", marginBottom: 18, display: "flex", alignItems: "center", gap: 14, boxShadow: `0 2px 8px ${selectedAccent}44` }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <SelectedTypeIcon size={20} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>
                {selectedType.label}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                {label}{genTime ? ` · Généré à ${genTime}` : ""}
              </p>
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, flexShrink: 0 }}>
              MES Platform v2
            </span>
          </div>

          {reportType === "daily"         ? <DailyContent        report={report} /> :
           reportType === "weekly"        ? <WeeklyContent       report={report} /> :
           reportType === "production-of" ? <ProductionOFContent report={report} /> :
           reportType === "maintenance"   ? <MaintenanceContent  report={report} /> :
           reportType === "performance"   ? <PerformanceContent  report={report} /> :
           reportType === "traceability"  ? <TraceabilityContent report={report} /> :
           null}
        </div>
      )}

      {/* ── SAVED REPORTS ─────────────────────────────────────────────────── */}
      <PageDivider label="Rapports sauvegardés" />
      <SavedReportsPanel onOpen={openSaved} refreshKey={savedKey} />
    </div>
  );
}