// simulationMoteur.js – Moteur de simulation industrielle pour l'atelier cardage
// Séparé du composant UI pour une meilleure maintenabilité

// ═════════════════════════════════════════════════════════════════════════════
//  PARAMÈTRES INDUSTRIELS DES MACHINES
// ═════════════════════════════════════════════════════════════════════════════

export const MACHINE_PARAMS = {
  "CT-ALIM-01": {
    nom          : "Alimentation",
    rendementMin : 0.990,
    rendementMax : 0.998,
    dureeBaseMin : 8,
    dureeBaseMax : 15,
    dureeParKg   : 0.06,
    variabilite  : 0.08,
    pauseApres   : 3,
  },
  "CT-COND-01": {
    nom          : "Condenseur 1",
    rendementMin : 0.994,
    rendementMax : 0.999,
    dureeBaseMin : 4,
    dureeBaseMax : 8,
    dureeParKg   : 0.03,
    variabilite  : 0.05,
    pauseApres   : 2,
  },
  "CT-NET-01": {
    nom          : "Nettoyeuse",
    rendementMin : 0.920,
    rendementMax : 0.950,
    dureeBaseMin : 15,
    dureeBaseMax : 25,
    dureeParKg   : 0.10,
    variabilite  : 0.12,
    pauseApres   : 4,
  },
  "CT-COND-02": {
    nom          : "Condenseur 2",
    rendementMin : 0.995,
    rendementMax : 0.999,
    dureeBaseMin : 4,
    dureeBaseMax : 7,
    dureeParKg   : 0.03,
    variabilite  : 0.04,
    pauseApres   : 2,
  },
  "CT-CARD-01": {
    nom          : "Cardage 1",
    rendementMin : 0.960,
    rendementMax : 0.978,
    dureeBaseMin : 20,
    dureeBaseMax : 35,
    dureeParKg   : 0.12,
    variabilite  : 0.15,
    pauseApres   : 5,
  },
  "CT-CARD-02": {
    nom          : "Cardage 2",
    rendementMin : 0.965,
    rendementMax : 0.982,
    dureeBaseMin : 20,
    dureeBaseMax : 35,
    dureeParKg   : 0.11,
    variabilite  : 0.14,
    pauseApres   : 5,
  },
  "CT-CARD-03": {
    nom          : "Cardage 3",
    rendementMin : 0.968,
    rendementMax : 0.985,
    dureeBaseMin : 18,
    dureeBaseMax : 30,
    dureeParKg   : 0.10,
    variabilite  : 0.13,
    pauseApres   : 5,
  },
  "CT-COND-03": {
    nom          : "Condenseur 3",
    rendementMin : 0.996,
    rendementMax : 0.999,
    dureeBaseMin : 3,
    dureeBaseMax : 6,
    dureeParKg   : 0.025,
    variabilite  : 0.04,
    pauseApres   : 2,
  },
  "CT-INJ-01": {
    nom          : "Injection",
    rendementMin : 0.988,
    rendementMax : 0.996,
    dureeBaseMin : 12,
    dureeBaseMax : 22,
    dureeParKg   : 0.08,
    variabilite  : 0.10,
    pauseApres   : 4,
  },
  "CT-SEC-01": {
    nom          : "Séchage",
    rendementMin : 0.975,
    rendementMax : 0.990,
    dureeBaseMin : 25,
    dureeBaseMax : 45,
    dureeParKg   : 0.15,
    variabilite  : 0.08,
    pauseApres   : 5,
  },
  "CT-BOB-01": {
    nom          : "Bobinage",
    rendementMin : 0.992,
    rendementMax : 0.998,
    dureeBaseMin : 15,
    dureeBaseMax : 28,
    dureeParKg   : 0.09,
    variabilite  : 0.06,
    pauseApres   : 0,
  },
};

// ═════════════════════════════════════════════════════════════════════════════
//  ÉQUIPES 3×8H — Noms arabes écrits en français
// ═════════════════════════════════════════════════════════════════════════════

export const EQUIPES = [
  {
    nom       : "Équipe Matin",
    debut     : 6,
    fin       : 14,
    operateurs: [
      "Mohamed Ben Salem",
      "Fatima Zahra Mansouri",
      "Youssef El Amine",
    ],
  },
  {
    nom       : "Équipe Après-midi",
    debut     : 14,
    fin       : 22,
    operateurs: [
      "Khadija Brahim",
      "Omar Chaabane",
      "Amina Trabelsi",
    ],
  },
  {
    nom       : "Équipe Nuit",
    debut     : 22,
    fin       : 6,
    operateurs: [
      "Nabil Rezgui",
      "Soumaya Haddad",
      "Khalil Bejaoui",
    ],
  },
];

// ═════════════════════════════════════════════════════════════════════════════
//  UTILITAIRES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Distribution gaussienne tronquée (Box-Muller).
 * Plus réaliste qu'un uniforme pour modéliser les process industriels.
 */
export function gaussianRand(min, max, sigma = 0.3) {
  let u, v, s;
  do {
    u = Math.random() * 2 - 1;
    v = Math.random() * 2 - 1;
    s = u * u + v * v;
  } while (s >= 1 || s === 0);
  const normal  = u * Math.sqrt(-2 * Math.log(s) / s);
  const clamped = Math.max(-2, Math.min(2, normal * sigma));
  const mid     = (min + max) / 2;
  const half    = (max - min) / 2;
  return Math.max(min, Math.min(max, mid + clamped * half));
}

/**
 * Retourne l'équipe active pour une heure H donnée (0–23).
 */
export function getEquipeForHeure(heure) {
  if (heure >= 6  && heure < 14) return EQUIPES[0];
  if (heure >= 14 && heure < 22) return EQUIPES[1];
  return EQUIPES[2];
}

/**
 * Convertit des minutes totales depuis minuit en "HH:MM".
 * Gère le dépassement de minuit (modulo 24h × 60 min).
 */
export function minutesToHHMM(totalMinutes) {
  const m   = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h   = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

// ═════════════════════════════════════════════════════════════════════════════
//  CŒUR DU MOTEUR : simulation d'une étape
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Génère les données réalistes d'une étape du pipeline.
 *
 * @param {string}  machineCode   Code machine (ex: "CT-CARD-01")
 * @param {number}  qteEntree     Quantité entrante en kg
 * @param {number}  startMinutes  Heure de début en minutes depuis minuit
 * @param {boolean} isLast        Vrai si c'est la dernière étape (bobinage)
 * @param {number}  targetPF      Quantité PF cible en kg
 * @param {number}  stepIndex     Index 0-based de l'étape
 *
 * @returns {{ qte_entree, qte_sortie, operateur, debut, fin, _endMinutes, _rendement }}
 */
export function simulateStep(machineCode, qteEntree, startMinutes, isLast, targetPF, stepIndex = 0) {
  const params = MACHINE_PARAMS[machineCode];

  if (!params) {
    // Fallback générique
    const fallbackRendement = gaussianRand(0.970, 0.990);
    const qteSortie = isLast ? targetPF : Math.round(qteEntree * fallbackRendement * 100) / 100;
    const duree     = Math.round(10 + qteEntree * 0.08);
    return {
      qte_entree  : Math.round(qteEntree * 100) / 100,
      qte_sortie  : Math.round(qteSortie * 100) / 100,
      operateur   : EQUIPES[0].operateurs[0],
      debut       : minutesToHHMM(startMinutes),
      fin         : minutesToHHMM(startMinutes + duree),
      _endMinutes : startMinutes + duree + 3,
      _rendement  : Math.round(fallbackRendement * 10000) / 100,
    };
  }

  // ── 1. Rendement matière (dérive légère selon l'avancement) ───────────────
  const driftFactor = 1 + stepIndex * 0.005;
  const rendement   = gaussianRand(
    params.rendementMin,
    Math.min(params.rendementMax * driftFactor, 1.0),
  );

  // ── 2. Quantité sortante ──────────────────────────────────────────────────
  let qteSortie;
  if (isLast) {
    // Dernière étape : on force la sortie au PF cible (± 0.5 % de tolérance)
    const tolerance = targetPF * 0.005;
    qteSortie = targetPF + gaussianRand(-tolerance, tolerance);
  } else {
    qteSortie = qteEntree * rendement;
    qteSortie = Math.max(targetPF * 0.999, qteSortie);
  }
  qteSortie = Math.round(qteSortie * 100) / 100;

  // ── 3. Durée réelle (base + composante proportionnelle + bruit) ───────────
  const dureeDeterministe = params.dureeBaseMin + qteEntree * params.dureeParKg;
  const dureeMax          = params.dureeBaseMax + qteEntree * params.dureeParKg * 1.3;
  const bruit             = gaussianRand(-params.variabilite, params.variabilite);
  const dureeMinutes      = Math.max(
    params.dureeBaseMin,
    Math.round(dureeDeterministe * (1 + bruit)),
  );
  const dureeFinal = Math.min(dureeMinutes, Math.round(dureeMax));

  // ── 4. Horodatage ─────────────────────────────────────────────────────────
  const debutMinutes = startMinutes;
  const finMinutes   = startMinutes + dureeFinal;

  // ── 5. Opérateur selon l'équipe active ────────────────────────────────────
  const heureDebut   = Math.floor((debutMinutes % 1440) / 60);
  const equipe       = getEquipeForHeure(heureDebut);
  const operateurIdx = stepIndex % equipe.operateurs.length;
  const operateur    = equipe.operateurs[operateurIdx];

  return {
    qte_entree  : Math.round(qteEntree * 100) / 100,
    qte_sortie  : qteSortie,
    operateur,
    debut       : minutesToHHMM(debutMinutes),
    fin         : minutesToHHMM(finMinutes),
    _endMinutes : finMinutes + (params.pauseApres || 2),
    _rendement  : Math.round(rendement * 10000) / 100,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//  PLAN COMPLET : pré-calcul de toutes les étapes en cascade
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Calcule d'un coup les 11 étapes du pipeline pour garantir la cohérence
 * globale (cascade quantités + horodatage enchaîné).
 *
 * @param {number} targetPF      Quantité PF objectif en kg
 * @param {number} startHour     Heure de démarrage (0–23)
 * @param {number} startMinute   Minute de démarrage (0–59)
 *
 * @returns {{ plan: Array, qteMP: number, rendementGlobal: number }}
 */
export function precomputeProductionPlan(targetPF, startHour = 6, startMinute = 0) {
  const sequence = Object.keys(MACHINE_PARAMS);

  // Rendement global théorique = produit de tous les rendements moyens
  const rendementGlobalTheorique = sequence.reduce(
    (acc, code) =>
      acc * ((MACHINE_PARAMS[code].rendementMin + MACHINE_PARAMS[code].rendementMax) / 2),
    1.0,
  );

  // MP nécessaire en entrée = PF / rendement_global + marge 2 %
  const qteMP = Math.round((targetPF / rendementGlobalTheorique) * 1.02 * 100) / 100;

  let currentQte    = qteMP;
  let currentMinute = startHour * 60 + startMinute;
  const plan        = [];

  sequence.forEach((machineCode, index) => {
    const isLast = index === sequence.length - 1;
    const step   = simulateStep(machineCode, currentQte, currentMinute, isLast, targetPF, index);
    plan.push({ machineCode, ...step });
    currentQte    = step.qte_sortie;
    currentMinute = step._endMinutes;
  });

  return {
    plan,
    qteMP,
    rendementGlobal: Math.round((targetPF / qteMP) * 10000) / 100,
  };
}