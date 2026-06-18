'use client';

import { useState } from 'react';

import { Bike, Disc3, Car, Zap, Quote, ChevronRight, ChevronLeft, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { COLORS, FONTS } from '@/app/lib/constants';

import { AppHeader } from './ui/AppHeader';

// ─── Données ──────────────────────────────────────────────────────────────
// NB: seul Romain Bardet est nommé individuellement (ambassadeur Gravel
// Michelin, fait public). Pour Moto/Auto on s'appuie sur des faits de marque
// vérifiables (fournisseur officiel) plutôt que d'attribuer un partenariat
// nominatif non confirmé — à enrichir avec de vrais pilotes/visuels si besoin.

type DisciplineId = 'velo' | 'moto' | 'auto';

interface Discipline {
	id: DisciplineId;
	label: string;
	icon: typeof Bike;
	color: string;
	headline: {
		name: string;
		role: string;
		quote: string;
		tags: string[];
	};
	facts: { value: string; label: string }[];
	others: { label: string; sub: string }[];
}

const DISCIPLINES: Discipline[] = [
	{
		id: 'velo',
		label: 'Vélo',
		icon: Bike,
		color: COLORS.blue,
		headline: {
			name: 'Romain Bardet',
			role: 'Ambassadeur Gravel MICHELIN',
			quote:
				"Sur le gravier comme sur la route, c'est le pneu qui décide si tu peux pousser la vitesse ou si tu dois la subir.",
			tags: ['Power Gravel', 'Ex-WorldTour', 'Vainqueur d’étapes Grand Tour'],
		},
		facts: [
			{ value: '700x33–47C', label: 'Gamme Power Gravel' },
			{ value: '3–5 bar', label: 'Pression optimale' },
			{ value: 'Tubeless', label: 'Compatible TLR' },
		],
		others: [
			{ label: 'Champions Endurance & Ultra-distance', sub: 'Power Adventure, Power Gravel' },
			{ label: 'Pistards & Triathlètes', sub: 'Lithion 3, Pilot Sport' },
			{ label: 'Riders Enduro/XC', sub: 'Wild Enduro, Wild XC Race' },
		],
	},
	{
		id: 'moto',
		label: 'Moto',
		icon: Disc3,
		color: '#FFC861',
		headline: {
			name: 'Grille MotoGP',
			role: 'Fournisseur officiel exclusif depuis 2016',
			quote: 'Plus de 350 km/h en pointe, sur la même philosophie de gomme que sur un vélo de route.',
			tags: ['Power GP', '20 Grands Prix / saison', 'Mondial MotoGP'],
		},
		facts: [
			{ value: '2016', label: 'Fournisseur exclusif' },
			{ value: '+350 km/h', label: 'Vitesse de pointe' },
			{ value: '20', label: 'Grands Prix / an' },
		],
		others: [
			{ label: 'Pilotes Moto2 & Moto3', sub: 'Catégories support MotoGP' },
			{ label: 'Endurance moto (24h du Mans)', sub: 'Power Endurance' },
		],
	},
	{
		id: 'auto',
		label: 'Auto',
		icon: Car,
		color: '#34D399',
		headline: {
			name: '24 Heures du Mans & WEC',
			role: 'Partenaire historique depuis 1923',
			quote: 'Un siècle de course d’endurance pour transférer la même obsession : tenir la vitesse, jusqu’au bout.',
			tags: ['Pilot Sport', 'Le Mans Hypercar', 'WEC'],
		},
		facts: [
			{ value: '1923', label: 'Premiers 24h du Mans' },
			{ value: '100+', label: 'Ans d’endurance' },
			{ value: 'WEC', label: 'Championnat du monde' },
		],
		others: [
			{ label: 'Équipages Le Mans Hypercar', sub: 'Pilot Sport Endurance' },
			{ label: 'Pilotes Rallye & WRC', sub: 'Pilot Sport rallye' },
		],
	},
];

const TEAM_PHOTOS = [
	{ src: '/TeamPicnicPostNL-bike.jpg', alt: 'Team Picnic PostNL en course' },
	{ src: '/TeamPicnicPostNL-bike-2.jpg', alt: 'Peloton Team Picnic PostNL' },
	{ src: '/TeamPicnicPostNL-bike-3.jpg', alt: 'Team Picnic PostNL sprint' },
	{ src: '/TeamPicnicPostNL-bike-4.jpg', alt: 'Team Picnic PostNL team' },
];

// ─── Sous-composants ─────────────────────────────────────────────────────

// Photo officielle de Romain Bardet (noir/blanc, fond transparent), cantonnée à une
// colonne fixe sur la droite de la carte, sans jamais recouvrir le texte/les tags/les facts.
function RomainBardetPhoto() {
	return (
		<img
			src="/bardet.webp"
			alt="Romain Bardet"
			className="pointer-events-none h-full w-full object-contain object-bottom opacity-95"
			style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.35))' }}
		/>
	);
}

function SpeedStreaks() {
	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
			{[18, 42, 68].map((top, i) => (
				<div
					key={top}
					className="speed-streak"
					style={{ top: `${top}%`, left: 0, width: '55%', animationDelay: `${i * 0.5}s` }}
				/>
			))}
		</div>
	);
}

function TeamCarousel() {
	const [current, setCurrent] = useState(0);
	const [transitioning, setTransitioning] = useState(false);

	const go = (dir: 1 | -1) => {
		if (transitioning) return;
		setTransitioning(true);
		setTimeout(() => {
			setCurrent((c) => (c + dir + TEAM_PHOTOS.length) % TEAM_PHOTOS.length);
			setTransitioning(false);
		}, 150);
	};

	return (
		<div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: '16/9' }}>
			{/* Photo */}
			<img
				src={TEAM_PHOTOS[current].src}
				alt={TEAM_PHOTOS[current].alt}
				className="h-full w-full object-cover transition-opacity duration-150"
				style={{ opacity: transitioning ? 0 : 1 }}
			/>

			{/* Overlay dégradé bas */}
			<div
				className="absolute inset-x-0 bottom-0 h-24"
				style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}
			/>

			{/* Légende */}
			<div className="absolute right-16 bottom-3 left-4">
				<p
					className="text-[11px] font-semibold text-white"
					style={{ fontFamily: FONTS.body, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
				>
					{TEAM_PHOTOS[current].alt}
				</p>
			</div>

			{/* Contrôles */}
			<button
				onClick={() => go(-1)}
				className="absolute top-1/2 left-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full"
				style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
			>
				<ChevronLeft size={16} color="white" />
			</button>
			<button
				onClick={() => go(1)}
				className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full"
				style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
			>
				<ChevronRight size={16} color="white" />
			</button>

			{/* Dots */}
			<div className="absolute right-4 bottom-3 flex gap-1.5">
				{TEAM_PHOTOS.map((_, i) => (
					<button
						key={i}
						onClick={() => setCurrent(i)}
						className="rounded-full transition-all"
						style={{
							width: i === current ? '16px' : '6px',
							height: '6px',
							background: i === current ? COLORS.yellow : 'rgba(255,255,255,0.5)',
						}}
					/>
				))}
			</div>
		</div>
	);
}

function DisciplineTabs({ active, onChange }: { active: DisciplineId; onChange: (d: DisciplineId) => void }) {
	return (
		<div className="mb-4 flex gap-1.5 px-5">
			{DISCIPLINES.map((d) => {
				const Icon = d.icon;
				const sel = d.id === active;
				return (
					<button
						key={d.id}
						onClick={() => onChange(d.id)}
						className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold tracking-wider uppercase transition-all"
						style={{
							background: sel ? d.color : COLORS.gray05,
							color: sel ? COLORS.onGold : COLORS.gray50,
							border: sel ? 'none' : `1px solid ${COLORS.gray10}`,
							fontFamily: FONTS.title,
						}}
					>
						<Icon size={13} />
						{d.label}
					</button>
				);
			})}
		</div>
	);
}

function HeadlineCard({ discipline }: { discipline: Discipline }) {
	const { headline, color } = discipline;
	const isBardet = discipline.id === 'velo';
	return (
		<div key={discipline.id} className="relative mx-5 mb-4">
			<div className="speed-pop-in glass-panel-strong relative overflow-hidden rounded-2xl">
				<SpeedStreaks />

				<div
					className="relative flex items-center gap-2 px-4 py-3"
					style={{ background: `linear-gradient(90deg, ${color}30 0%, transparent 100%)` }}
				>
					<div
						className="speed-pulse flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
						style={{ background: color }}
					>
						<Zap size={18} color={COLORS.onGold} />
					</div>
					<div className="min-w-0">
						<div
							className="text-[15px] font-black tracking-wide break-words uppercase"
							style={{ color: COLORS.heading, fontFamily: FONTS.title }}
						>
							{headline.name}
						</div>
						<div className="text-[10px] break-words" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
							{headline.role}
						</div>
					</div>
				</div>

				<div className="relative flex gap-3 px-4 py-4">
					{isBardet && (
						<div className="absolute -right-12 top-1/2 -translate-y-1/2 z-0 w-80 h-80 opacity-75">
							<RomainBardetPhoto />
						</div>
					)}

					<div className="min-w-0 flex-1 relative z-10 pr-35">
						<div className="mb-3 flex items-start gap-2">
							<Quote size={14} color={color} className="mt-0.5 flex-shrink-0" />
							<p className="text-[12px] leading-relaxed italic" style={{ color: COLORS.grayDark, fontFamily: FONTS.body }}>
								{headline.quote}
							</p>
						</div>

						<div className="mb-3 flex flex-wrap gap-1.5">
							{headline.tags.map((t) => (
								<span
									key={t}
									className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-wide uppercase"
									style={{ background: `${color}18`, color, fontFamily: FONTS.title }}
								>
									{t}
								</span>
							))}
						</div>

						<div className="grid grid-cols-3 gap-2">
							{discipline.facts.map((f) => (
								<div
									key={f.label}
									className="min-w-0 rounded-xl p-2.5 text-center"
									style={{ background: COLORS.gray05, border: `1px solid ${COLORS.gray10}` }}
								>
									<div className="text-[14px] font-black break-words" style={{ color: COLORS.heading, fontFamily: FONTS.mono }}>
										{f.value}
									</div>
									<div
										className="mt-0.5 text-[8px] tracking-wide uppercase"
										style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
									>
										{f.label}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function TeamPicnicCard() {
	return (
		<div className="speed-pop-in glass-panel mx-5 mb-4 overflow-hidden rounded-2xl">
			{/* En-tête team */}
			<div
				className="flex items-center gap-3 px-4 py-3"
				style={{ background: `linear-gradient(90deg, #E8281E 0%, #F47B20 100%)` }}
			>
				<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-xl">🚴</div>
				<div className="min-w-0">
					<div className="text-[14px] font-black tracking-wide break-words text-white uppercase" style={{ fontFamily: FONTS.title }}>
						Team Picnic PostNL
					</div>
					<div className="text-[10px] break-words" style={{ color: 'rgba(255,255,255,0.75)', fontFamily: FONTS.body }}>
						Équipe WorldTeam masculine · Pays-Bas
					</div>
				</div>
			</div>

			{/* Galerie photo */}
			<div className="p-3 pb-0">
				<TeamCarousel />
			</div>

			{/* Description */}
			<div className="px-4 py-4">
				<p className="mb-3 text-[12px] leading-relaxed" style={{ color: COLORS.grayDark, fontFamily: FONTS.body }}>
					La <strong>Team Picnic PostNL</strong> est une équipe professionnelle masculine de cyclisme sur route évoluant
					au niveau UCI WorldTeam. Basée aux Pays-Bas, elle s’inscrit dans la continuité des formations Skil-Shimano,
					Giant-Alpecin et DSM. L'équipe est reconnue pour son approche scientifique de la performance et le
					développement de jeunes talents, participant aux plus grandes courses du calendrier international comme les
					Grands Tours et les classiques.
				</p>

				{/* Stats équipe */}
				<div className="mb-3 grid grid-cols-3 gap-2">
					{[
						{ value: '2005', label: 'Fondation' },
						{ value: '≈28', label: 'Coureurs' },
						{ value: '15+', label: 'Nations' },
					].map((s) => (
						<div
							key={s.label}
							className="min-w-0 rounded-xl p-2.5 text-center"
							style={{ background: COLORS.gray05, border: `1px solid ${COLORS.gray10}` }}
						>
							<div className="text-[15px] font-black break-words" style={{ color: COLORS.heading, fontFamily: FONTS.mono }}>
								{s.value}
							</div>
							<div className="mt-0.5 text-[9px] tracking-wide uppercase" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>
								{s.label}
							</div>
						</div>
					))}
				</div>

				{/* Palmarès */}
				<div className="mb-3 rounded-xl p-3" style={{ background: `${COLORS.yellow}15`, border: `1px solid ${COLORS.yellow}40` }}>
					<div className="mb-2 text-[10px] font-black tracking-widest uppercase" style={{ color: COLORS.onGold, fontFamily: FONTS.title }}>
						🏆 Palmarès récent
					</div>
					{[
						'Victoire d’étape sur le Tour de France',
						'Victoire d’étape sur le Giro d’Italia',
						'Victoire d’étape sur la Vuelta a España',
						'Classements généraux sur courses WorldTour',
					].map((item) => (
						<div key={item} className="mb-1 flex items-center gap-2 last:mb-0">
							<div className="h-1 w-1 flex-shrink-0 rounded-full" style={{ background: COLORS.blue }} />
							<span className="text-[11px] break-words" style={{ color: COLORS.grayDark, fontFamily: FONTS.body }}>
								{item}
							</span>
						</div>
					))}
				</div>

				{/* Lien */}
				<a
					href="https://www.teampicnicpostnl.com/"
					target="_blank"
					rel="noopener noreferrer"
					className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[11px] font-bold tracking-wider uppercase transition-all hover:opacity-80"
					style={{ background: COLORS.gray05, color: COLORS.blue, fontFamily: FONTS.title, border: `1px solid ${COLORS.gray10}` }}
				>
					<ExternalLink size={12} />
					Visiter le site officiel
				</a>
			</div>
		</div>
	);
}

// ─── Screen ──────────────────────────────────────────────────────────────

export function LegendsScreen() {
	const router = useRouter();
	const [active, setActive] = useState<DisciplineId>('velo');
	const discipline = DISCIPLINES.find((d) => d.id === active)!;

	return (
		<div className="flex h-full flex-col overflow-hidden" style={{ background: COLORS.bgGradient }}>
			<AppHeader onBack={() => router.push('/telemetry')} />

			<div className="flex-1 overflow-x-hidden overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
				{/* ── Hero ── */}
				<div className="relative mx-5 mt-5 mb-5 overflow-hidden rounded-2xl px-5 py-6" style={{ background: COLORS.surface }}>
					<SpeedStreaks />
					<div className="relative">
						<div className="mb-2 flex items-center gap-1.5">
							<Zap size={12} color={COLORS.yellow} />
							<span
								className="text-[10px] tracking-widest uppercase"
								style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
							>
								Légendes Michelin
							</span>
						</div>
						<h1
							className="leading-none uppercase"
							style={{ fontFamily: FONTS.title, fontSize: '28px', fontWeight: 800, letterSpacing: '0.03em', color: COLORS.blue }}
						>
							Michelin
							<br />
							<span style={{ color: COLORS.yellow }}>= Vitesse</span>
						</h1>
						<p className="mt-2 text-[11px] leading-relaxed" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
							Du gravel à la route, de la moto à l&apos;endurance automobile — une même quête : tenir la vitesse, sur tous
							les terrains.
						</p>
					</div>
				</div>

				<DisciplineTabs active={active} onChange={setActive} />
				<HeadlineCard discipline={discipline} />
				{discipline.id === 'velo' && <TeamPicnicCard />}
			</div>
		</div>
	);
}
