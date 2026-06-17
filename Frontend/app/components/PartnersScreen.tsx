'use client';

import { useState } from 'react';

import { ChevronLeft, ChevronRight, ExternalLink, Zap, Globe, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { COLORS, FONTS } from '@/app/lib/constants';

import { AppHeader } from './ui/AppHeader';

// ─── Données statiques ────────────────────────────────────────────────────────

const TEAM_PHOTOS = [
	{ src: '/TeamPicnicPostNL-bike.jpg', alt: 'Team Picnic PostNL en course' },
	{ src: '/TeamPicnicPostNL-bike-2.jpg', alt: 'Peloton Team Picnic PostNL' },
	{ src: '/TeamPicnicPostNL-bike-3.jpg', alt: 'Team Picnic PostNL sprint' },
	{ src: '/TeamPicnicPostNL-bike-4.jpg', alt: 'Team Picnic PostNL team' },
];

const MICHELIN_EXPERTISE = [
	{
		emoji: '🛣️',
		title: 'Route',
		subtitle: 'Performance & endurance',
		description:
			'Les pneus MICHELIN Power offrent une adhérence maximale sur bitume sec ou mouillé. Technologie Protek+ pour une résistance aux crevaisons sans compromis sur le roulement.',
		specs: ['700×23C à 32C', '6–8 bar', '175–230 g'],
		color: COLORS.blue,
	},
	{
		emoji: '🌿',
		title: 'Gravel',
		subtitle: 'Polyvalence tout-terrain',
		description:
			'La gamme Power Gravel combine crampons mixtes et carcasse renforcée pour enchainer routes et chemins. Grip exceptionnel sur graviers, terres et rocailles.',
		specs: ['700×35C à 45C', '3–5 bar', '380–460 g'],
		color: '#34D399',
	},
	{
		emoji: '🏆',
		title: 'Piste',
		subtitle: 'Technologie compétition',
		description:
			'Utilisés en compétition UCI, les pneus MICHELIN Lithion offrent le minimum de résistance au roulement et une enveloppe ultrafine pour les pistards et triathlètes.',
		specs: ['700×23C', '10–12 bar', '155–180 g'],
		color: '#C084FC',
	},
	{
		emoji: '⛰️',
		title: 'VTT / MTB',
		subtitle: 'Domination en trail',
		description:
			'La gamme Force XC/AM couvre du cross-country au all-mountain. Compound Dual Compound avec flancs souples et centre durci pour vitesse et grip.',
		specs: ['27.5" / 29"', '1.5–2.5 bar', '650–900 g'],
		color: '#FFC861',
	},
];

// ─── Composants ───────────────────────────────────────────────────────────────

function MichelinLogoMark() {
	return (
		<div
			className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
			style={{ background: COLORS.blue }}
		>
			<svg width="18" height="14" viewBox="0 0 18 14" fill="none">
				<path
					d="M1 13V1L5 9L9 1L13 9L17 1V13"
					stroke="white"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
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

function ExpertiseCard({ item }: { item: (typeof MICHELIN_EXPERTISE)[0] }) {
	const [open, setOpen] = useState(false);

	return (
		<div className="glass-panel overflow-hidden rounded-2xl">
			<button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
				<div
					className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xl"
					style={{ background: `${item.color}15` }}
				>
					{item.emoji}
				</div>
				<div className="flex-1">
					<div
						className="text-[13px] font-black tracking-wide uppercase"
						style={{ color: COLORS.heading, fontFamily: FONTS.title }}
					>
						{item.title}
					</div>
					<div className="text-[10px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
						{item.subtitle}
					</div>
				</div>
				<ChevronRight
					size={14}
					color={COLORS.gray40}
					style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
				/>
			</button>

			{open && (
				<div className="px-4 pb-4" style={{ borderTop: `1px solid ${COLORS.gray05}` }}>
					<p
						className="mt-3 mb-3 text-[12px] leading-relaxed"
						style={{ color: COLORS.grayDark, fontFamily: FONTS.body }}
					>
						{item.description}
					</p>
					<div className="flex flex-wrap gap-2">
						{item.specs.map((s) => (
							<span
								key={s}
								className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
								style={{ background: `${item.color}12`, color: item.color, fontFamily: FONTS.mono }}
							>
								{s}
							</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function PartnersScreen() {
	const router = useRouter();

	return (
		<div className="flex h-full flex-col" style={{ background: COLORS.bgGradient }}>
			<AppHeader onBack={() => router.push('/telemetry')} />

			<div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
				{/* ── Header ── */}
				<div className="px-5 pt-5 pb-4">
					<div className="mb-1 flex items-center gap-2">
						<Globe size={12} color={COLORS.warning} />
						<p
							className="text-[10px] tracking-widest uppercase"
							style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
						>
							Michelin Cycling
						</p>
					</div>
					<h1
						className="leading-none uppercase"
						style={{
							fontFamily: FONTS.title,
							fontSize: '26px',
							fontWeight: 800,
							letterSpacing: '0.04em',
							color: COLORS.blue,
						}}
					>
						Partenaires &amp; Expertise
					</h1>
				</div>

				{/* ── Team Picnic PostNL ── */}
				<div className="glass-panel mx-5 mb-4 overflow-hidden rounded-2xl">
					{/* En-tête team */}
					<div
						className="flex items-center gap-3 px-4 py-3"
						style={{
							background: `linear-gradient(90deg, #E8281E 0%, #F47B20 100%)`,
						}}
					>
						<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-xl">
							🚴
						</div>
						<div>
							<div
								className="text-[14px] font-black tracking-wide text-white uppercase"
								style={{ fontFamily: FONTS.title }}
							>
								Team Picnic PostNL
							</div>
							<div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.75)', fontFamily: FONTS.body }}>
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
							La <strong>Team Picnic PostNL</strong> est une équipe professionnelle masculine de cyclisme sur route
							évoluant au niveau UCI WorldTeam. Basée aux Pays-Bas, elle s’inscrit dans la continuité des formations
							Skil-Shimano, Giant-Alpecin et DSM. L'équipe est reconnue pour son approche scientifique de la performance
							et le développement de jeunes talents, participant aux plus grandes courses du calendrier international
							comme les Grands Tours et les classiques.
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
									className="rounded-xl p-2.5 text-center"
									style={{ background: COLORS.gray05, border: `1px solid ${COLORS.gray10}` }}
								>
									<div className="text-[15px] font-black" style={{ color: COLORS.heading, fontFamily: FONTS.mono }}>
										{s.value}
									</div>
									<div
										className="mt-0.5 text-[9px] tracking-wide uppercase"
										style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
									>
										{s.label}
									</div>
								</div>
							))}
						</div>

						{/* Palmarès */}
						<div
							className="mb-3 rounded-xl p-3"
							style={{ background: `${COLORS.yellow}15`, border: `1px solid ${COLORS.yellow}40` }}
						>
							<div
								className="mb-2 text-[10px] font-black tracking-widest uppercase"
								style={{ color: COLORS.onGold, fontFamily: FONTS.title }}
							>
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
									<span className="text-[11px]" style={{ color: COLORS.grayDark, fontFamily: FONTS.body }}>
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
							style={{
								background: COLORS.gray05,
								color: COLORS.blue,
								fontFamily: FONTS.title,
								border: `1px solid ${COLORS.gray10}`,
							}}
						>
							<ExternalLink size={12} />
							Visiter le site officiel
						</a>
					</div>
				</div>
			</div>
		</div>
	);
}
