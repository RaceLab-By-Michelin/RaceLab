// ─── Michelin Design Tokens ────────────────────────────────────────────────
// Source: Charte Digitale Michelin, Mars 2024

// Toutes les valeurs sont des variables CSS définies dans globals.css :
// thème "dark" (look RaceLab satin/obsidian) et thème "light" (Charte
// Digitale Michelin, Mars 2024 — Bleu Michelin #27509B, Jaune Michelin
// #FCE500, gris fonctionnels, couleurs d'alerte officielles). Le composant
// reste inchangé, seule la valeur résolue par le navigateur change selon
// l'attribut data-theme posé sur <html>.
export const COLORS = {
	// Primary palette
	blue: 'var(--color-blue)',
	blueDark: 'var(--color-blue-dark)',
	blueDark02: 'var(--color-blue-dark-02)',
	blueLight: 'var(--color-blue-light)',
	yellow: 'var(--color-yellow)', // Jaune Michelin — usage commercial uniquement

	// Neutrals
	white: 'var(--color-white)',
	black: 'var(--color-black)',
	gray05: 'var(--color-gray-05)',
	gray10: 'var(--color-gray-10)',
	gray20: 'var(--color-gray-20)',
	gray40: 'var(--color-gray-40)',
	gray50: 'var(--color-gray-50)',
	gray60: 'var(--color-gray-60)',
	grayDark: 'var(--color-gray-dark)',

	// Semantic surface/text tokens
	heading: 'var(--color-heading)',
	onGold: 'var(--color-on-gold)',
	surface: 'var(--color-surface)',
	surfaceStrong: 'var(--color-surface-strong)',

	// Couleurs fonctionnelles d'alerte (Valide / Avertissement / Danger)
	success: 'var(--color-success)',
	successLight: 'var(--color-success-light)',
	successDark: 'var(--color-success-dark)',
	succesMedim: 'var(--color-success-medium)',
	warning: 'var(--color-warning)',
	warningLight: 'var(--color-warning-light)',
	danger: 'var(--color-danger)',
	dangerLight: 'var(--color-danger-light)',
	dangerDark: 'var(--color-danger-dark)',

	// "Pas encore roulé" — incite à prendre le vélo (teinte énergique, distincte
	// du vert "bon état" pour ne pas laisser croire que les pneus sont juste neufs)
	start: 'var(--color-start)',
	startLight: 'var(--color-start-light)',

	// Forte usure (>80%) — cadré comme un objectif atteint, pas une alerte.
	achieved: 'var(--color-achieved)',
	achievedLight: 'var(--color-achieved-light)',

	// Performance-cockpit background — adapté par thème dans globals.css.
	bgGradient: 'var(--bg-gradient)',
	glassBorder: 'var(--glass-border)',
	glowYellow: 'var(--glow-yellow)',
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
import type { MichelinTire } from './types';

export const MICHELIN_TIRES: MichelinTire[] = [
	{
		id: 'power-all-season',
		name: 'Power All Season',
		type: 'Route',
		sizes: ['700x25C', '700x28C', '700x32C'],
		description: 'Pneu 4 saisons haute performance. Adhérence optimale par temps sec et humide.',
		maxPressure: '8.5 bar',
		weight: '265 g',
		tag: 'Installé',
	},
	{
		id: 'power-cup2',
		name: 'Power Cup 2',
		type: 'Route',
		sizes: ['700x23C', '700x25C', '700x28C'],
		description: 'Pneu de compétition ultra-léger. Compound Racing+ pour grip maximal en course.',
		maxPressure: '9 bar',
		weight: '185 g',
		tag: 'Compétition',
	},
	{
		id: 'power-adventure',
		name: 'Power Adventure',
		type: 'Gravel',
		sizes: ['700x35C', '700x40C', '700x47C'],
		description: 'Conçu pour les aventures longue distance. Résistant aux crevaisons et polyvalent.',
		maxPressure: '5.5 bar',
		weight: '420 g',
	},
	{
		id: 'power-gravel',
		name: 'Power Gravel',
		type: 'Gravel',
		sizes: ['700x33C', '700x38C', '650Bx47C'],
		description: "Crampons centraux pour la vitesse, latéraux pour l'adhérence en virage.",
		maxPressure: '4.5 bar',
		weight: '390 g',
		tag: 'Nouveau',
	},
	{
		id: 'wild-xc-race',
		name: 'Wild XC Race',
		type: 'VTT',
		sizes: ['29x2.25', '29x2.35', '27.5x2.25'],
		description: 'Pneu XC racing ultra-léger. Roulement rapide et contrôle en conditions variées.',
		maxPressure: '3.5 bar',
		weight: '580 g',
	},
	{
		id: 'wild-enduro',
		name: 'Wild Enduro',
		type: 'VTT',
		sizes: ['29x2.4', '29x2.6', '27.5x2.4', '27.5x2.6'],
		description: 'Pneu enduro haute résistance. Grip exceptionnel en descente et en montée.',
		maxPressure: '2.8 bar',
		weight: '1050 g',
		tag: 'Enduro',
	},
	{
		id: 'lithion3',
		name: 'Lithion 3',
		type: 'Route',
		sizes: ['700x23C', '700x25C', '700x28C', '700x32C'],
		description: "Pneu route entraînement. Excellent rapport durabilité/performance pour l'usage quotidien.",
		maxPressure: '8 bar',
		weight: '230 g',
	},
	{
		id: 'pilot-sport',
		name: 'Pilot Sport',
		type: 'Piste',
		sizes: ['700x21C', '700x23C'],
		description: 'Pneu de piste sans crampons. Compound spécial vélodrome pour traction maximale.',
		maxPressure: '11 bar',
		weight: '160 g',
		tag: 'Piste',
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
	severity: 'start' | 'critical' | 'warning' | 'ok';
	title: string;
	message: string;
	adherenceLoss?: number;
}

export function getTireAlert(frontWear: number, rearWear: number, adherencePct: number): TireAlertConfig {
	const maxWear = Math.max(frontWear, rearWear);
	const adherenceLoss = Math.round(100 - adherencePct);

	if (maxWear < 5) {
		return {
			severity: 'start',
			title: '🚴 Prêt pour la première sortie ?',
			message: "Vos pneus sont neufs et n'attendent que vous. Direction les Défis et enfourchez votre vélo !",
		};
	}
	if (maxWear >= 80 || adherencePct < 65) {
		return {
			severity: 'critical',
			title: '🏆 Objectif atteint !',
			message: `Vous avez fait carburer ces pneus à fond ! C'est aussi le bon moment pour vérifier leur état pour continuer sur votre lancée. Profitez d'une réduction sur un modèle adapté à vos sorties.`,
			adherenceLoss,
		};
	}
	if (maxWear >= 60 || adherencePct < 80) {
		return {
			severity: 'warning',
			title: '🔧 Anticipez votre prochain pneu',
			message: `Roue arrière à ${rearWear}% d'usure. Découvrez le pneu qui correspond le mieux à votre pratique, avec une réduction exclusive.`,
			adherenceLoss,
		};
	}
	return {
		severity: 'ok',
		title: '✓ Gommes en Bon État',
		message: `Adhérence nominale à ${adherencePct}%. Prochaine vérification recommandée dans ${Math.round(TIRE_LIFESPAN_KM * (1 - maxWear / 100))} km.`,
	};
}
