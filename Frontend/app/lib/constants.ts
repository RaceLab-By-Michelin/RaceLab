// ─── Michelin Design Tokens ────────────────────────────────────────────────
// Source: Charte Digitale Michelin, Mars 2024

export const COLORS = {
  // Primary palette
  blue: "#27509B",        // Bleu Michelin officiel
  blueDark: "#00205B",    // Bleu Foncé Michelin (fonds immersifs)
  blueDark02: "#3A61A6",
  blueLight: "#6182BB",
  yellow: "#FCE500",      // Jaune Michelin officiel

  // Neutrals
  white: "#FFFFFF",
  black: "#000000",
  gray05: "#F2F2F2",
  gray10: "#E5E5E5",
  gray20: "#CCCCCC",
  gray40: "#999999",
  gray50: "#7F7F7F",
  gray60: "#666666",
  grayDark: "#53565A",    // Gris Responsable

  // Semantic
  success: "#469f4a",
  successLight: "#E8F5E5",
  successDark: "#92C18F",
  succesMedim: "#4CAF50",
  warning: "#F9A825",
  warningLight: "#FDECC0",
  danger: "#B71C1C",
  dangerLight: "#F4CEC2",
  dangerDark: "#DD8880",

  // "Pas encore roulé" — incite à prendre le vélo (teinte énergique, distincte
  // du vert "bon état" pour ne pas laisser croire que les pneus sont juste neufs)
  start: "#27509B",
  startLight: "#E0F7FA",

  // Forte usure (>80%) — cadré comme un objectif atteint, pas une alerte.
  // Vert plus foncé/profond que "success" pour marquer l'accomplissement.
  achieved: "#15803D",
  achievedLight: "#DCFCE7",

  // Glass / performance-cockpit background (early-morning ride: asphalt + sky).
  // Layered: soft yellow "leader jersey" glow (top-left) + blue brand glow
  // (bottom-right) + a faint diagonal road-line texture, over a cool
  // white→blue-grey base. Kept light and crisp — no haze, no dark tones.
  bgGradient:
    "radial-gradient(circle at 12% 0%, rgba(252,229,0,0.16) 0%, rgba(252,229,0,0) 38%), " +
    "radial-gradient(circle at 100% 18%, rgba(39,80,155,0.14) 0%, rgba(39,80,155,0) 42%), " +
    "radial-gradient(circle at 100% 100%, rgba(0,32,91,0.10) 0%, rgba(0,32,91,0) 48%), " +
    "repeating-linear-gradient(125deg, rgba(0,32,91,0.035) 0px, rgba(0,32,91,0.035) 2px, transparent 2px, transparent 46px), " +
    "linear-gradient(165deg, #FFFFFF 0%, #F3F7FC 32%, #E9EFF7 62%, #EEF1F5 100%)",
  glassBorder: "rgba(0,32,91,0.08)",
  glowYellow: "rgba(252,229,0,0.45)",
} as const;

// Typography: Michelin Unit Titling (proprietary) → fallback to Barlow Condensed
// Body: Noto Sans (Google Fonts)
export const FONTS = {
  title: "'Michelin', 'Barlow Condensed', 'Arial Narrow', sans-serif",
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
