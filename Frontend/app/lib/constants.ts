// ─── Michelin Design Tokens ────────────────────────────────────────────────
// Source: Charte Digitale Michelin, Mars 2024

export const COLORS = {
  // ─── Luxury dark palette (Michelin RaceLab — obsidian / midnight blue / satin gold) ───
  // Primary palette
  blue: "#5C8DF6",        // Michelin blue, brightened for legibility on dark surfaces
  blueDark: "#0F1B3D",    // Deep navy — used for backgrounds/gradients, NOT text-on-dark
  blueDark02: "#1B2C5C",
  blueLight: "#8FB0FF",
  yellow: "#FFC800",      // Satin gold-yellow accent (refined Michelin yellow)

  // Neutrals — flipped for dark mode. "white"/"black" keep literal meaning (still
  // used as text-on-color), gray05/10/20 are now subtle light-on-dark fills,
  // gray40/50/grayDark are light/muted text tones for the dark background.
  white: "#FFFFFF",
  black: "#000000",
  gray05: "rgba(255,255,255,0.05)",
  gray10: "rgba(255,255,255,0.09)",
  gray20: "#3C4156",
  gray40: "#8B92AC",
  gray50: "#A6ADC6",
  gray60: "#C2C7DC",
  grayDark: "#E7E9F2",    // now a light/muted body-text tone for dark satin cards

  // New semantic tokens needed for the dark refactor
  heading: "#F4F6FC",        // primary heading/title text on dark cards (replaces blueDark-as-text)
  onGold: "#161B2E",         // dark text used ON TOP of the satin gold accent (chips, CTA)
  surface: "#171A28",        // elevated dark satin surface (replaces white-as-active-bg)
  surfaceStrong: "#1F2333",  // more prominent elevated surface

  // Semantic
  success: "#34D399",
  successLight: "rgba(52,211,153,0.14)",
  successDark: "#1F9C71",
  succesMedim: "#4ADE80",
  warning: "#FFB020",
  warningLight: "rgba(255,176,32,0.14)",
  danger: "#F2655C",
  dangerLight: "rgba(242,101,92,0.14)",
  dangerDark: "#C2453D",

  // "Pas encore roulé" — incite à prendre le vélo (teinte énergique, distincte
  // du vert "bon état" pour ne pas laisser croire que les pneus sont juste neufs)
  start: "#5C8DF6",
  startLight: "rgba(92,141,246,0.14)",

  // Forte usure (>80%) — cadré comme un objectif atteint, pas une alerte.
  achieved: "#34D399",
  achievedLight: "rgba(52,211,153,0.14)",

  // Performance-cockpit background — ultra-premium dark mode: deep obsidian and
  // midnight blue, a muted gold spotlight, and a faint carbon/road-line texture.
  // No neon glow — dark, layered, high-contrast typography on top.
  bgGradient:
    "radial-gradient(ellipse 70% 50% at 15% -10%, rgba(92,141,246,0.20) 0%, rgba(92,141,246,0) 55%), " +
    "radial-gradient(ellipse 60% 45% at 90% 0%, rgba(255,200,0,0.07) 0%, rgba(255,200,0,0) 60%), " +
    "repeating-linear-gradient(125deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 2px, transparent 2px, transparent 46px), " +
    "linear-gradient(180deg, #121420 0%, #0E101B 45%, #0B0D17 100%)",
  glassBorder: "rgba(255,255,255,0.10)",
  glowYellow: "rgba(255,200,0,0.35)",
} as const;

// Typography: condensed/technical titles → Space Grotesk for luxury-watch metrics.
// Body: Noto Sans (Google Fonts). Tabular numerals via JetBrains Mono.
export const FONTS = {
  title: "'Space Grotesk', 'Barlow Condensed', 'Arial Narrow', sans-serif",
  body: "'Noto Sans', 'Barlow', Arial, sans-serif",
  mono: "'JetBrains Mono', 'Courier New', monospace",
} as const;

// Tire data
export const TIRE_LIFESPAN_KM = 3_000;

// Michelin Bicycle Tire Catalog
import type { MichelinTire } from "./types";

export const MICHELIN_TIRES: MichelinTire[] = [
  {
    id: "power-all-season",
    name: "Power All Season",
    type: "Route",
    sizes: ["700x25C", "700x28C", "700x32C"],
    description: "Pneu 4 saisons haute performance. Adhérence optimale par temps sec et humide.",
    maxPressure: "8.5 bar",
    weight: "265 g",
    tag: "Installé",
  },
  {
    id: "power-cup2",
    name: "Power Cup 2",
    type: "Route",
    sizes: ["700x23C", "700x25C", "700x28C"],
    description: "Pneu de compétition ultra-léger. Compound Racing+ pour grip maximal en course.",
    maxPressure: "9 bar",
    weight: "185 g",
    tag: "Compétition",
  },
  {
    id: "power-adventure",
    name: "Power Adventure",
    type: "Gravel",
    sizes: ["700x35C", "700x40C", "700x47C"],
    description: "Conçu pour les aventures longue distance. Résistant aux crevaisons et polyvalent.",
    maxPressure: "5.5 bar",
    weight: "420 g",
  },
  {
    id: "power-gravel",
    name: "Power Gravel",
    type: "Gravel",
    sizes: ["700x33C", "700x38C", "650Bx47C"],
    description: "Crampons centraux pour la vitesse, latéraux pour l'adhérence en virage.",
    maxPressure: "4.5 bar",
    weight: "390 g",
    tag: "Nouveau",
  },
  {
    id: "wild-xc-race",
    name: "Wild XC Race",
    type: "VTT",
    sizes: ["29x2.25", "29x2.35", "27.5x2.25"],
    description: "Pneu XC racing ultra-léger. Roulement rapide et contrôle en conditions variées.",
    maxPressure: "3.5 bar",
    weight: "580 g",
  },
  {
    id: "wild-enduro",
    name: "Wild Enduro",
    type: "VTT",
    sizes: ["29x2.4", "29x2.6", "27.5x2.4", "27.5x2.6"],
    description: "Pneu enduro haute résistance. Grip exceptionnel en descente et en montée.",
    maxPressure: "2.8 bar",
    weight: "1050 g",
    tag: "Enduro",
  },
  {
    id: "lithion3",
    name: "Lithion 3",
    type: "Route",
    sizes: ["700x23C", "700x25C", "700x28C", "700x32C"],
    description: "Pneu route entraînement. Excellent rapport durabilité/performance pour l'usage quotidien.",
    maxPressure: "8 bar",
    weight: "230 g",
  },
  {
    id: "pilot-sport",
    name: "Pilot Sport",
    type: "Piste",
    sizes: ["700x21C", "700x23C"],
    description: "Pneu de piste sans crampons. Compound spécial vélodrome pour traction maximale.",
    maxPressure: "11 bar",
    weight: "160 g",
    tag: "Piste",
  },
];

// Dynamic alert generator based on tire wear.
// Plutôt qu'une alerte sécurité anxiogène, on incite à l'achat de pneus
// adaptés à la pratique du cycliste — avec une réduction personnalisée
// (cf. getTireAlert côté TelemetryScreen / tiresApi.getRecommendations).
//
// Comportement aux extrêmes (inversé) :
//   - usure ~0%  → le cycliste n'a pas encore roulé → message d'incitation à
//     prendre le vélo (severity "start"), pas d'offre pneus (hors sujet).
//   - usure > 80% → ton positif/félicitations ("tu as bien roulé") tout en
//     suggérant de vérifier/changer les pneus, avec l'offre associée.
export interface TireAlertConfig {
  severity: "start" | "critical" | "warning" | "ok";
  title: string;
  message: string;
  adherenceLoss?: number;
}

export function getTireAlert(
  frontWear: number,
  rearWear: number,
  adherencePct: number
): TireAlertConfig {
  const maxWear = Math.max(frontWear, rearWear);
  const adherenceLoss = Math.round(100 - adherencePct);

  if (maxWear < 5) {
    return {
      severity: "start",
      title: "🚴 Prêt pour la première sortie ?",
      message: "Vos pneus sont neufs et n'attendent que vous. Direction les Défis et enfourchez votre vélo !",
    };
  }
  if (maxWear >= 80 || adherencePct < 65) {
    return {
      severity: "critical",
      title: "🏆 Objectif atteint !",
      message: `Vous avez fait carburer ces pneus à fond ! C'est aussi le bon moment pour vérifier leur état pour continuer sur votre lancée. Profitez d'une réduction sur un modèle adapté à vos sorties.`,
      adherenceLoss,
    };
  }
  if (maxWear >= 60 || adherencePct < 80) {
    return {
      severity: "warning",
      title: "🔧 Anticipez votre prochain pneu",
      message: `Roue arrière à ${rearWear}% d'usure. Découvrez le pneu qui correspond le mieux à votre pratique, avec une réduction exclusive.`,
      adherenceLoss,
    };
  }
  return {
    severity: "ok",
    title: "✓ Gommes en Bon État",
    message: `Adhérence nominale à ${adherencePct}%. Prochaine vérification recommandée dans ${Math.round(TIRE_LIFESPAN_KM * (1 - maxWear / 100))} km.`,
  };
}
