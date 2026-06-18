'use client';

import { useState, useEffect } from 'react';

import {
	ChevronRight,
	CheckCircle,
	Filter,
	Wrench,
	RefreshCw,
	RotateCcw,
	PenLine,
	AlertTriangle,
	Gift,
	ArrowLeft,
	ShieldCheck,
	Check,
	CircleDot,
	Zap,
} from 'lucide-react';

import { tiresApi, userApi } from '@/app/lib/api';
import type {
	TireSetOut,
	TireOut,
	TireCatalogOut,
	WheelPosition,
	RecommendationsOut,
	TireRecommendationOut,
} from '@/app/lib/api';
import { COLORS, FONTS } from '@/app/lib/constants';

import { Panel, SectionLabel, Badge } from './ui/RaceKit';

// ─── Recommended Spec panel ──────────────────────────────────────────────────
// Reprend fidèlement le panneau "Recommended Spec" de la maquette de
// référence (tires-screen.tsx) : effet spotlight, badge "Engineered Match",
// grille de deltas et checklist — alimenté par les vraies recommandations API.

function RecommendedSpecPanel({ offer }: { offer: TireRecommendationOut }) {
	const tire = offer.recommended;
	if (!tire) return null;

	// Bénéfices tangibles calculés côté backend à partir du profil de
	// roulage réel (distance/vitesse moyennes) — on vend la performance
	// attendue, pas juste un prix.
	const minutesGained = offer.minutes_gained;
	const resistanceDeltaPct = offer.rolling_resistance_delta_pct;
	const hasDeltas = minutesGained > 0 || resistanceDeltaPct > 0;

	const deltas = [
		{
			label: 'Temps gagné',
			value: minutesGained > 0 ? `+${minutesGained}` : '0',
			unit: 'min',
			sub: `sur ${Math.round(offer.typical_ride_km)} km`,
		},
		{
			label: 'Résistance roulement',
			value: resistanceDeltaPct > 0 ? `-${resistanceDeltaPct}` : '0',
			unit: '%',
			sub: 'estimée',
		},
	];

	const specs = [
		{ label: 'Modèle', value: tire.name },
		{ label: 'Taille', value: tire.sizes[0] ?? '—' },
		{ label: 'Type', value: tire.type },
		{ label: 'Pression max.', value: tire.max_pressure },
		{ label: 'Poids', value: tire.weight },
	];

	return (
		<Panel className="relative mx-5 mb-4 overflow-hidden p-5" borderColor="rgba(255,200,0,0.3)">
			<div
				className="pointer-events-none absolute inset-0"
				style={{
					background: 'radial-gradient(ellipse 70% 50% at 20% 0%, rgba(255,200,0,0.16) 0%, rgba(255,200,0,0) 60%)',
				}}
			/>
			<div className="relative flex items-center justify-between">
				<SectionLabel>Spécification Recommandée</SectionLabel>
				<Badge tone="gold">
					<ShieldCheck size={11} />
					{hasDeltas ? 'Match Idéal' : 'Recommandé'}
				</Badge>
			</div>

			<div className="relative mt-3 flex items-center gap-4">
				<div
					className="flex size-20 shrink-0 items-center justify-center rounded-2xl"
					style={{ background: COLORS.gray05, border: `1px solid ${COLORS.gray10}` }}
				>
					<CircleDot size={32} color={COLORS.yellow} />
				</div>
				<div>
					<h2
						className="text-[18px] leading-tight font-black"
						style={{ color: COLORS.heading, fontFamily: FONTS.title }}
					>
						MICHELIN {tire.name}
					</h2>
					<p className="mt-0.5 text-[11px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
						{offer.wheel === 'front' ? 'Avant' : 'Arrière'} · {tire.sizes[0]} · {tire.type}
					</p>
				</div>
			</div>

			{hasDeltas ? (
				<div className="relative mt-5 grid grid-cols-2 gap-2.5">
					{deltas.map((d) => (
						<div
							key={d.label}
							className="rounded-xl p-3 text-center"
							style={{ background: 'rgba(255,200,0,0.06)', border: '1px solid rgba(255,200,0,0.18)' }}
						>
							<p className="text-[18px] font-black" style={{ color: COLORS.yellow, fontFamily: FONTS.mono }}>
								{d.value}
								<span className="text-[11px]">{d.unit}</span>
							</p>
							<p
								className="mt-0.5 text-[9px] tracking-wider uppercase"
								style={{ color: COLORS.gray50, fontFamily: FONTS.mono }}
							>
								{d.label}
							</p>
							<p className="mt-0.5 text-[9px]" style={{ color: COLORS.gray40, fontFamily: FONTS.body }}>
								{d.sub}
							</p>
						</div>
					))}
				</div>
			) : (
				<p
					className="relative mt-4 text-[11px] leading-relaxed"
					style={{ color: COLORS.gray50, fontFamily: FONTS.body }}
				>
					Pneu le mieux adapté à votre profil de roulage actuel.
				</p>
			)}
			{hasDeltas && (
				<p className="relative mt-2 text-[9px] italic" style={{ color: COLORS.gray40, fontFamily: FONTS.body }}>
					Estimation basée sur votre distance et vitesse moyennes, et les caractéristiques du pneu — pas une
					mesure en conditions réelles.
				</p>
			)}

			<dl className="relative mt-4" style={{ borderTop: `1px solid ${COLORS.gray10}` }}>
				{specs.map((s) => (
					<div
						key={s.label}
						className="flex items-center justify-between py-2.5"
						style={{ borderBottom: `1px solid ${COLORS.gray10}` }}
					>
						<dt className="text-[11px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
							{s.label}
						</dt>
						<dd
							className="flex items-center gap-1.5 text-[12px] font-semibold"
							style={{ color: COLORS.heading, fontFamily: FONTS.mono }}
						>
							<Check size={13} color={COLORS.success} />
							{s.value}
						</dd>
					</div>
				))}
			</dl>

			{offer.discount_pct > 0 && (
				<div
					className="relative mt-4 flex items-center justify-between rounded-xl px-3.5 py-2.5"
					style={{ background: COLORS.yellow }}
				>
					<span className="text-[11px] font-black" style={{ color: COLORS.onGold, fontFamily: FONTS.title }}>
						-{offer.discount_pct}% avec {offer.discount_code}
					</span>
					<ChevronRight size={14} color={COLORS.onGold} />
				</div>
			)}
		</Panel>
	);
}

// ─── Types ───────────────────────────────────────────────────────────────────

type TireType = 'Tous' | 'Route' | 'Gravel' | 'VTT' | 'Piste';
type Mode = 'idle' | 'replace-same' | 'replace-new' | 'other';
type WheelTarget = 'rear' | 'front' | 'both';

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_FILTERS: TireType[] = ['Tous', 'Route', 'Gravel', 'VTT', 'Piste'];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
	Route: { bg: 'rgba(92,141,246,0.12)', text: COLORS.blue },
	Gravel: { bg: 'rgba(255,184,0,0.12)', text: '#FFC861' },
	VTT: { bg: 'rgba(52,211,153,0.12)', text: '#34D399' },
	Piste: { bg: 'rgba(192,132,252,0.12)', text: '#C084FC' },
};

const WHEEL_LABELS: Record<WheelTarget, string> = {
	rear: 'Roue arrière',
	front: 'Roue avant',
	both: 'Les deux roues',
};

function fmtDate(iso: string): string {
	return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function TireTypeTag({ type }: { type: string }) {
	const colors = TYPE_COLORS[type] ?? { bg: COLORS.gray05, text: COLORS.grayDark };
	return (
		<span
			className="rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase"
			style={{ background: colors.bg, color: colors.text, fontFamily: FONTS.title }}
		>
			{type}
		</span>
	);
}

function WearBar({ pct, label }: { pct: number; label: string }) {
	const color = pct >= 80 ? COLORS.achieved : pct >= 60 ? COLORS.warning : COLORS.success;
	return (
		<div className="flex-1">
			<div className="mb-1 flex justify-between">
				<span className="text-[9px] tracking-wider uppercase" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>
					{label}
				</span>
				<span className="text-[9px] font-bold" style={{ color, fontFamily: FONTS.mono }}>
					{pct}%
				</span>
			</div>
			<div className="h-1.5 overflow-hidden rounded-full" style={{ background: COLORS.gray10 }}>
				<div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
			</div>
		</div>
	);
}

// ─── Wheel selector ──────────────────────────────────────────────────────────

function WheelSelector({
	value,
	onChange,
	rearWear,
	frontWear,
}: {
	value: WheelTarget;
	onChange: (v: WheelTarget) => void;
	rearWear: number;
	frontWear: number;
}) {
	const options: { key: WheelTarget; desc: string; wear?: string }[] = [
		{ key: 'rear', desc: 'Roue arrière', wear: `${rearWear}% d'usure` },
		{ key: 'front', desc: 'Roue avant', wear: `${frontWear}% d'usure` },
		{ key: 'both', desc: 'Les deux roues', wear: 'arrière + avant' },
	];

	return (
		<div className="mb-4">
			<div
				className="mb-2 text-[9px] font-bold tracking-widest uppercase"
				style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
			>
				Quelle roue remplacer ?
			</div>
			<div className="flex flex-col gap-1.5">
				{options.map(({ key, desc, wear }) => {
					const active = value === key;
					return (
						<button
							key={key}
							onClick={() => onChange(key)}
							className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all"
							style={{
								background: active ? COLORS.blue : COLORS.gray05,
								border: `1.5px solid ${active ? COLORS.blue : COLORS.gray10}`,
							}}
						>
							<svg viewBox="0 0 20 20" width="20" height="20" fill="none">
								<circle cx="10" cy="10" r="8" stroke={active ? COLORS.yellow : COLORS.gray40} strokeWidth="1.5" />
								<circle cx="10" cy="10" r="4" stroke={active ? COLORS.yellow : COLORS.gray40} strokeWidth="1.5" />
								<circle cx="10" cy="10" r="1.5" fill={active ? COLORS.yellow : COLORS.gray40} />
								{key === 'both' && (
									<>
										<line
											x1="2"
											y1="10"
											x2="6"
											y2="10"
											stroke={active ? COLORS.yellow : COLORS.gray40}
											strokeWidth="1.5"
										/>
										<line
											x1="14"
											y1="10"
											x2="18"
											y2="10"
											stroke={active ? COLORS.yellow : COLORS.gray40}
											strokeWidth="1.5"
										/>
									</>
								)}
							</svg>
							<div className="flex-1">
								<div
									className="text-[12px] font-bold"
									style={{ color: active ? COLORS.white : COLORS.heading, fontFamily: FONTS.title }}
								>
									{desc}
								</div>
								{wear && (
									<div
										className="mt-0.5 text-[9px]"
										style={{ color: active ? 'rgba(255,255,255,0.65)' : COLORS.gray50, fontFamily: FONTS.mono }}
									>
										{wear}
									</div>
								)}
							</div>
							<div
								className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full"
								style={{ background: active ? COLORS.yellow : COLORS.gray10 }}
							>
								{active && <CheckCircle size={11} color={COLORS.blueDark} />}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}

// ─── Current state card ───────────────────────────────────────────────────────

function CurrentTireCard({
	tires,
	recommendations,
	onAction,
}: {
	tires: TireSetOut;
	recommendations: RecommendationsOut | null;
	onAction: (mode: Mode) => void;
}) {
	const { front, rear } = tires;
	const sameTire = rear.name === front.name && rear.size === front.size;
	const worstWheel: WheelPosition = front.wear_pct >= rear.wear_pct ? 'front' : 'rear';
	const offer = recommendations ? recommendations[worstWheel] : null;
	const hasOffer = !!offer && offer.discount_pct > 0;

	return (
		<div
			className="mx-5 mb-4 overflow-hidden rounded-2xl"
			style={{
				background: COLORS.surface,
				backdropFilter: 'blur(14px) saturate(140%)',
				WebkitBackdropFilter: 'blur(14px) saturate(140%)',
				border: `2px solid ${COLORS.blue}`,
				boxShadow: `0 8px 24px rgba(0,0,0,0.2)`,
			}}
		>
			{/* Header */}
			<div
				className="flex items-center gap-2 px-4 py-3"
				style={{ background: `linear-gradient(90deg, ${COLORS.blueDark} 0%, ${COLORS.blue} 100%)` }}
			>
				<div className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: COLORS.success }} />
				<span
					className="text-[10px] font-black tracking-widest text-white uppercase"
					style={{ fontFamily: FONTS.title }}
				>
					Pneus actuellement montés
				</span>
			</div>

			<div className="p-4">
				{sameTire ? (
					<div className="mb-3">
						{rear.brand === 'michelin' && (
							<div
								className="mb-0.5 text-[9px] font-bold tracking-widest uppercase"
								style={{ color: COLORS.blue, fontFamily: FONTS.title }}
							>
								MICHELIN
							</div>
						)}
						<div className="mb-1 text-[16px] font-black" style={{ color: COLORS.heading, fontFamily: FONTS.title }}>
							{rear.name}
						</div>
						<div className="flex items-center gap-2">
							<span
								className="rounded-full px-2 py-0.5 text-[9px] font-bold"
								style={{ background: COLORS.gray05, color: COLORS.grayDark, fontFamily: FONTS.mono }}
							>
								{rear.size}
							</span>
							<span className="text-[10px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
								Montés le {fmtDate(rear.installed_date)}
							</span>
						</div>
					</div>
				) : (
					<div className="mb-3 flex flex-col gap-2">
						{([rear, front] as const).map((t, i) => (
							<div
								key={i}
								className="flex items-center gap-2 rounded-xl px-2 py-1.5"
								style={{ background: COLORS.gray05 }}
							>
								<span
									className="w-12 flex-shrink-0 text-[9px] font-black tracking-wider uppercase"
									style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
								>
									{i === 0 ? 'Arrière' : 'Avant'}
								</span>
								<div className="min-w-0 flex-1">
									<span
										className="block truncate text-[12px] font-bold"
										style={{ color: COLORS.heading, fontFamily: FONTS.title }}
									>
										{t.brand === 'michelin' ? `MICHELIN ${t.name}` : t.name}
									</span>
								</div>
								<span className="flex-shrink-0 text-[9px]" style={{ color: COLORS.gray50, fontFamily: FONTS.mono }}>
									{t.size}
								</span>
							</div>
						))}
					</div>
				)}

				{/* Wear bars */}
				<div className="mb-4 flex gap-4">
					<WearBar pct={rear.wear_pct} label="Arrière" />
					<WearBar pct={front.wear_pct} label="Avant" />
				</div>

				{/* Offre personnalisée */}
				{hasOffer && (
					<div
						className="mb-4 flex items-center gap-2.5 rounded-xl px-3 py-2.5"
						style={{ background: 'rgba(255,184,0,0.12)', border: `1px solid ${COLORS.yellow}` }}
					>
						<Gift size={14} color={COLORS.blueDark} className="flex-shrink-0" />
						<div className="flex-1">
							<span className="text-[10px] font-bold" style={{ color: COLORS.heading, fontFamily: FONTS.body }}>
								<span className="font-black">-{offer!.discount_pct}%</span>
								{offer!.recommended ? ` sur le ${offer!.recommended.name} — ` : ' — '}
								{offer!.match_reason}
							</span>
						</div>
					</div>
				)}

				{/* Actions */}
				<div className="flex flex-col gap-2">
					<button
						onClick={() => onAction('replace-same')}
						className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all hover:opacity-90 active:scale-[0.98]"
						style={{ background: COLORS.yellow }}
					>
						<RefreshCw size={15} color={COLORS.blueDark} />
						<div className="flex-1 text-left">
							<div
								className="text-[12px] font-black tracking-wider uppercase"
								style={{ fontFamily: FONTS.title, color: COLORS.heading }}
							>
								Remplacer par des neufs
							</div>
							<div className="text-[9px] opacity-70" style={{ fontFamily: FONTS.body, color: COLORS.heading }}>
								Même référence — remet le compteur à zéro
							</div>
						</div>
						<ChevronRight size={14} color={COLORS.blueDark} />
					</button>

					<button
						onClick={() => onAction('replace-new')}
						className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
						style={{ background: COLORS.gray05, border: `1px solid ${COLORS.gray10}` }}
					>
						<Wrench size={15} color={COLORS.blue} />
						<div className="flex-1 text-left">
							<div
								className="text-[12px] font-bold tracking-wider uppercase"
								style={{ fontFamily: FONTS.title, color: COLORS.blue }}
							>
								Changer de modèle Michelin
							</div>
							<div className="text-[9px]" style={{ fontFamily: FONTS.body, color: COLORS.gray50 }}>
								Choisir dans le catalogue
							</div>
						</div>
						<ChevronRight size={14} color={COLORS.gray40} />
					</button>

					<button
						onClick={() => onAction('other')}
						className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
						style={{ background: COLORS.gray05, border: `1px solid ${COLORS.gray10}` }}
					>
						<PenLine size={15} color={COLORS.gray50} />
						<div className="flex-1 text-left">
							<div
								className="text-[12px] font-bold tracking-wider uppercase"
								style={{ fontFamily: FONTS.title, color: COLORS.grayDark }}
							>
								Autre marque
							</div>
							<div className="text-[9px]" style={{ fontFamily: FONTS.body, color: COLORS.gray50 }}>
								Saisir manuellement (hors catalogue)
							</div>
						</div>
						<ChevronRight size={14} color={COLORS.gray40} />
					</button>
				</div>
			</div>
		</div>
	);
}

// ─── Replace same panel ──────────────────────────────────────────────────────

function ReplaceSamePanel({
	tires,
	onConfirm,
	onCancel,
	saving,
}: {
	tires: TireSetOut;
	onConfirm: (wheel: WheelTarget) => void;
	onCancel: () => void;
	saving: boolean;
}) {
	const [wheel, setWheel] = useState<WheelTarget>('both');
	const { front, rear } = tires;

	const wearBefore =
		wheel === 'rear'
			? `${rear.wear_pct}%`
			: wheel === 'front'
				? `${front.wear_pct}%`
				: `${rear.wear_pct}% / ${front.wear_pct}%`;

	const tireName = wheel === 'front' ? front.name : rear.name;
	const tireSize = wheel === 'front' ? front.size : rear.size;

	return (
		<div
			className="mx-5 mb-4 overflow-hidden rounded-2xl"
			style={{
				background: 'rgba(23,26,40,0.92)',
				backdropFilter: 'blur(14px) saturate(140%)',
				WebkitBackdropFilter: 'blur(14px) saturate(140%)',
				border: `2px solid ${COLORS.yellow}`,
				boxShadow: `0 8px 24px rgba(255,200,0,0.12)`,
			}}
		>
			<div className="p-4">
				<div className="mb-4 flex items-center gap-3">
					<div
						className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
						style={{ background: COLORS.yellow }}
					>
						<RefreshCw size={18} color={COLORS.blueDark} />
					</div>
					<div>
						<div className="text-[14px] font-black" style={{ color: COLORS.heading, fontFamily: FONTS.title }}>
							Remplacer par des neufs
						</div>
						<div className="text-[10px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
							Même référence — sélectionnez quelle roue
						</div>
					</div>
				</div>

				<WheelSelector value={wheel} onChange={setWheel} rearWear={rear.wear_pct} frontWear={front.wear_pct} />

				{/* Summary */}
				<div
					className="mb-4 rounded-xl p-3"
					style={{ background: COLORS.gray05, border: `1px solid ${COLORS.gray10}` }}
				>
					<div className="mb-2 text-[10px] font-bold" style={{ color: COLORS.blue, fontFamily: FONTS.title }}>
						{tireName} · {tireSize}
					</div>
					<div className="flex gap-6">
						<div>
							<div
								className="mb-0.5 text-[9px] tracking-wider uppercase"
								style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
							>
								Usure actuelle
							</div>
							<div className="text-[13px] font-bold" style={{ color: COLORS.heading, fontFamily: FONTS.mono }}>
								{wearBefore}
							</div>
						</div>
						<div>
							<div
								className="mb-0.5 text-[9px] tracking-wider uppercase"
								style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
							>
								Après remplacement
							</div>
							<div className="text-[13px] font-bold" style={{ color: COLORS.success, fontFamily: FONTS.mono }}>
								{wheel === 'both' ? '0% / 0%' : '0%'}
							</div>
						</div>
					</div>
				</div>

				<div className="flex gap-2">
					<button
						onClick={onCancel}
						disabled={saving}
						className="flex-1 rounded-xl py-2.5 text-[12px] font-bold tracking-wider uppercase"
						style={{
							background: COLORS.gray05,
							color: COLORS.grayDark,
							fontFamily: FONTS.title,
							border: `1px solid ${COLORS.gray10}`,
						}}
					>
						Annuler
					</button>
					<button
						onClick={() => onConfirm(wheel)}
						disabled={saving}
						className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12px] font-bold tracking-wider uppercase hover:opacity-90"
						style={{
							background: saving ? COLORS.gray10 : COLORS.yellow,
							color: saving ? COLORS.gray40 : COLORS.onGold,
							fontFamily: FONTS.title,
						}}
					>
						{saving ? (
							<div
								className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
								style={{ borderColor: COLORS.gray40, borderTopColor: 'transparent' }}
							/>
						) : (
							<CheckCircle size={13} />
						)}
						Confirmer
					</button>
				</div>
			</div>
		</div>
	);
}

// ─── Michelin catalog picker ─────────────────────────────────────────────────

function MichelinPicker({
	tires,
	catalog,
	recommendations,
	onConfirm,
	onCancel,
	saving,
}: {
	tires: TireSetOut;
	catalog: TireCatalogOut[];
	recommendations: RecommendationsOut | null;
	onConfirm: (tire: TireCatalogOut, size: string, wheel: WheelTarget) => void;
	onCancel: () => void;
	saving: boolean;
}) {
	const [wheel, setWheel] = useState<WheelTarget>('both');
	const [filter, setFilter] = useState<TireType>('Tous');
	const [selectedId, setSelectedId] = useState<string>('');
	const [selectedSize, setSelectedSize] = useState<Record<string, string>>({});

	const filtered = catalog.filter((t) => filter === 'Tous' || t.type === filter);
	const picked = catalog.find((t) => t.id === selectedId);
	const pickedSize = selectedId
		? (selectedSize[selectedId] ?? catalog.find((t) => t.id === selectedId)?.sizes[0] ?? '')
		: '';
	const currentId = wheel === 'front' ? tires.front.catalog_id : tires.rear.catalog_id;
	const canInstall = !!picked && picked.id !== currentId && !saving;

	// Offre applicable à la roue sélectionnée (both → on prend la plus avantageuse)
	const offer =
		wheel === 'both'
			? [recommendations?.front, recommendations?.rear]
					.filter((o) => o && o.discount_pct > 0)
					.sort((a, b) => (b!.discount_pct ?? 0) - (a!.discount_pct ?? 0))[0]
			: recommendations?.[wheel];
	const discountByTireId: Record<string, number> =
		offer && offer.recommended ? { [offer.recommended.id]: offer.discount_pct } : {};

	return (
		<div className="mx-5 mb-4">
			{/* Wheel selector */}
			<div className="glass-panel mb-3 rounded-2xl p-4">
				<WheelSelector
					value={wheel}
					onChange={setWheel}
					rearWear={tires.rear.wear_pct}
					frontWear={tires.front.wear_pct}
				/>
				<div className="text-[10px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
					{wheel === 'both'
						? 'Le même pneu sera installé sur les deux roues.'
						: `Seule la ${wheel === 'rear' ? 'roue arrière' : 'roue avant'} sera remplacée.`}
				</div>
			</div>

			{/* Filter tabs */}
			<div className="mb-3 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
				{TYPE_FILTERS.map((f) => (
					<button
						key={f}
						onClick={() => setFilter(f)}
						className="flex-shrink-0 rounded-xl px-3 py-1.5 text-[10px] font-bold whitespace-nowrap uppercase transition-all"
						style={{
							background: filter === f ? COLORS.blue : COLORS.surface,
							color: filter === f ? COLORS.white : COLORS.gray50,
							border: filter === f ? 'none' : `1px solid ${COLORS.gray10}`,
							fontFamily: FONTS.title,
						}}
					>
						{f}
					</button>
				))}
			</div>

			{/* Tire list */}
			<div className="mb-3 flex flex-col gap-2">
				{filtered.length === 0 ? (
					<div className="py-8 text-center text-[12px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
						Aucun pneu dans cette catégorie
					</div>
				) : (
					filtered.map((tire) => {
						const sel = selectedId === tire.id;
						const size = selectedSize[tire.id] ?? tire.sizes[0];
						const isInstalled = tire.id === currentId;
						const discount = discountByTireId[tire.id];
						return (
							<div
								key={tire.id}
								className="overflow-hidden rounded-2xl transition-all"
								style={{
									background: 'rgba(23,26,40,0.85)',
									backdropFilter: 'blur(10px) saturate(140%)',
									WebkitBackdropFilter: 'blur(10px) saturate(140%)',
									border: sel ? `2px solid ${COLORS.blue}` : `1px solid ${COLORS.glassBorder}`,
									boxShadow: sel ? `0 6px 18px rgba(92,141,246,0.2)` : `0 2px 8px rgba(0,0,0,0.3)`,
								}}
							>
								<button
									onClick={() => setSelectedId(tire.id)}
									className="flex w-full items-center gap-3 px-4 py-3 text-left"
								>
									<div
										className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
										style={{ background: sel ? COLORS.blue : COLORS.gray05 }}
									>
										<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
											<circle cx="12" cy="12" r="9" stroke={sel ? COLORS.yellow : COLORS.gray40} strokeWidth="2" />
											<circle cx="12" cy="12" r="5" stroke={sel ? COLORS.yellow : COLORS.gray40} strokeWidth="1.5" />
											<circle cx="12" cy="12" r="1.5" fill={sel ? COLORS.yellow : COLORS.gray40} />
										</svg>
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<span
												className="text-[13px] font-black"
												style={{ color: COLORS.heading, fontFamily: FONTS.title }}
											>
												{tire.name}
											</span>
											{discount > 0 && (
												<span
													className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase"
													style={{ background: COLORS.yellow, color: COLORS.onGold, fontFamily: FONTS.title }}
												>
													<Gift size={9} /> -{discount}%
												</span>
											)}
											{tire.tag && (
												<span
													className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase"
													style={{
														background: isInstalled
															? 'rgba(52,211,153,0.14)'
															: tire.tag === 'Nouveau'
																? COLORS.yellow
																: COLORS.gray05,
														color: isInstalled ? '#34D399' : tire.tag === 'Nouveau' ? COLORS.onGold : COLORS.grayDark,
														fontFamily: FONTS.title,
													}}
												>
													{isInstalled ? 'Installé' : tire.tag}
												</span>
											)}
										</div>
										<div className="mt-0.5 flex items-center gap-1.5">
											<TireTypeTag type={tire.type} />
											<span className="text-[9px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
												{tire.weight}
											</span>
											{discount > 0 && (
												<span
													className="text-[9px] font-semibold"
													style={{ color: COLORS.blue, fontFamily: FONTS.body }}
												>
													Recommandé pour vous
												</span>
											)}
										</div>
									</div>
									<div
										className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
										style={{ background: sel ? COLORS.blue : COLORS.gray10 }}
									>
										{sel && <CheckCircle size={12} color={COLORS.white} />}
									</div>
								</button>

								{sel && (
									<div className="flex flex-wrap gap-1.5 px-4 pb-3" style={{ borderTop: `1px solid ${COLORS.gray10}` }}>
										<span
											className="mb-0.5 w-full pt-2 text-[9px] tracking-widest uppercase"
											style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
										>
											Taille
										</span>
										{tire.sizes.map((s) => (
											<button
												key={s}
												onClick={() => setSelectedSize((prev) => ({ ...prev, [tire.id]: s }))}
												className="rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all"
												style={{
													background: size === s ? COLORS.blue : COLORS.gray05,
													color: size === s ? COLORS.white : COLORS.grayDark,
													fontFamily: FONTS.mono,
													border: `1px solid ${size === s ? COLORS.blue : COLORS.gray10}`,
												}}
											>
												{s}
											</button>
										))}
									</div>
								)}
							</div>
						);
					})
				)}
			</div>

			<div className="flex gap-2">
				<button
					onClick={onCancel}
					disabled={saving}
					className="flex-1 rounded-xl py-2.5 text-[12px] font-bold tracking-wider uppercase"
					style={{
						background: COLORS.surface,
						color: COLORS.grayDark,
						fontFamily: FONTS.title,
						border: `1px solid ${COLORS.gray10}`,
					}}
				>
					Annuler
				</button>
				<button
					onClick={() => picked && onConfirm(picked, pickedSize, wheel)}
					disabled={!canInstall}
					className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12px] font-bold tracking-wider uppercase transition-all"
					style={{
						background: canInstall ? COLORS.yellow : COLORS.gray10,
						color: canInstall ? COLORS.onGold : COLORS.gray40,
						fontFamily: FONTS.title,
						cursor: canInstall ? 'pointer' : 'not-allowed',
					}}
				>
					{saving ? (
						<div
							className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
							style={{ borderColor: COLORS.gray40, borderTopColor: 'transparent' }}
						/>
					) : (
						<CheckCircle size={13} />
					)}
					Installer — {WHEEL_LABELS[wheel]}
				</button>
			</div>
		</div>
	);
}

// ─── Other brand panel ───────────────────────────────────────────────────────

const OTHER_TYPES = ['Route', 'Gravel', 'VTT', 'Piste', 'Cyclocross'] as const;
type OtherType = (typeof OTHER_TYPES)[number];

function OtherBrandPanel({
	tires,
	onConfirm,
	onCancel,
	saving,
}: {
	tires: TireSetOut;
	onConfirm: (name: string, size: string, type: OtherType, wheel: WheelTarget) => void;
	onCancel: () => void;
	saving: boolean;
}) {
	const [wheel, setWheel] = useState<WheelTarget>('both');
	const [brand, setBrand] = useState('');
	const [model, setModel] = useState('');
	const [size, setSize] = useState('');
	const [type, setType] = useState<OtherType>('Route');

	const fullName = [brand.trim(), model.trim()].filter(Boolean).join(' ');
	const canSubmit = fullName.length > 0 && size.trim().length > 0 && !saving;

	return (
		<div className="glass-panel mx-5 mb-4 overflow-hidden rounded-2xl">
			<div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.gray10}` }}>
				<PenLine size={13} color={COLORS.grayDark} />
				<span
					className="text-[12px] font-bold tracking-widest uppercase"
					style={{ color: COLORS.grayDark, fontFamily: FONTS.title }}
				>
					Autre marque
				</span>
				<span
					className="ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
					style={{ background: COLORS.gray05, color: COLORS.gray50, fontFamily: FONTS.title }}
				>
					Hors catalogue
				</span>
			</div>

			<div className="flex flex-col gap-3 p-4">
				<WheelSelector
					value={wheel}
					onChange={setWheel}
					rearWear={tires.rear.wear_pct}
					frontWear={tires.front.wear_pct}
				/>

				<div>
					<label
						htmlFor="other-tire-brand"
						className="mb-1.5 block text-[9px] font-bold tracking-widest uppercase"
						style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
					>
						Marque *
					</label>
					<input
						id="other-tire-brand"
						type="text"
						value={brand}
						onChange={(e) => setBrand(e.target.value)}
						placeholder="ex : Continental, Schwalbe, Pirelli…"
						className="w-full rounded-xl px-3 py-2.5 text-[12px] transition-all outline-none"
						style={{
							border: `1px solid ${brand ? COLORS.blue : COLORS.gray10}`,
							fontFamily: FONTS.body,
							color: COLORS.heading,
						}}
					/>
				</div>

				<div>
					<label
						htmlFor="other-tire-model"
						className="mb-1.5 block text-[9px] font-bold tracking-widest uppercase"
						style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
					>
						Modèle
					</label>
					<input
						id="other-tire-model"
						type="text"
						value={model}
						onChange={(e) => setModel(e.target.value)}
						placeholder="ex : Grand Prix 5000, Marathon Plus…"
						className="w-full rounded-xl px-3 py-2.5 text-[12px] transition-all outline-none"
						style={{
							border: `1px solid ${model ? COLORS.blue : COLORS.gray10}`,
							fontFamily: FONTS.body,
							color: COLORS.heading,
						}}
					/>
				</div>

				<div>
					<label
						htmlFor="other-tire-size"
						className="mb-1.5 block text-[9px] font-bold tracking-widest uppercase"
						style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
					>
						Taille *
					</label>
					<input
						id="other-tire-size"
						type="text"
						value={size}
						onChange={(e) => setSize(e.target.value)}
						placeholder="ex : 700x28C, 29x2.2…"
						className="w-full rounded-xl px-3 py-2.5 text-[12px] transition-all outline-none"
						style={{
							border: `1px solid ${size ? COLORS.blue : COLORS.gray10}`,
							fontFamily: FONTS.mono,
							color: COLORS.heading,
						}}
					/>
				</div>

				<div>
					<span
						className="mb-1.5 block text-[9px] font-bold tracking-widest uppercase"
						style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
					>
						Catégorie
					</span>
					<div className="flex flex-wrap gap-1.5">
						{OTHER_TYPES.map((t) => (
							<button
								key={t}
								onClick={() => setType(t)}
								className="rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase transition-all"
								style={{
									background: type === t ? COLORS.grayDark : COLORS.gray05,
									color: type === t ? COLORS.white : COLORS.gray50,
									fontFamily: FONTS.title,
									border: `1px solid ${type === t ? COLORS.grayDark : COLORS.gray10}`,
								}}
							>
								{t}
							</button>
						))}
					</div>
				</div>

				<div
					className="flex items-start gap-2 rounded-xl px-3 py-2.5"
					style={{ background: 'rgba(255,184,0,0.12)', border: '1px solid #FDE68A' }}
				>
					<AlertTriangle size={11} color="#FFC861" className="mt-0.5 flex-shrink-0" />
					<p className="text-[10px] leading-relaxed" style={{ color: '#FFD79A', fontFamily: FONTS.body }}>
						Les pneus hors MICHELIN sont suivis dans la catégorie <strong>Autre</strong>. Le suivi d&apos;usure est basé
						sur des estimations génériques.
					</p>
				</div>

				<div className="flex gap-2">
					<button
						onClick={onCancel}
						disabled={saving}
						className="flex-1 rounded-xl py-2.5 text-[12px] font-bold tracking-wider uppercase"
						style={{
							background: COLORS.gray05,
							color: COLORS.grayDark,
							fontFamily: FONTS.title,
							border: `1px solid ${COLORS.gray10}`,
						}}
					>
						Annuler
					</button>
					<button
						onClick={() => canSubmit && onConfirm(fullName, size.trim(), type, wheel)}
						disabled={!canSubmit}
						className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12px] font-bold tracking-wider uppercase transition-all"
						style={{
							background: canSubmit ? COLORS.blue : COLORS.gray10,
							color: canSubmit ? COLORS.white : COLORS.gray40,
							fontFamily: FONTS.title,
							cursor: canSubmit ? 'pointer' : 'not-allowed',
						}}
					>
						{saving ? (
							<div
								className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
								style={{ borderColor: COLORS.gray40, borderTopColor: 'transparent' }}
							/>
						) : (
							<CheckCircle size={13} />
						)}
						Valider
					</button>
				</div>
			</div>
		</div>
	);
}

// ─── Speed boost banner ("Michelin = Vitesse") ──────────────────────────────
// Affiché spécifiquement à l'installation d'un pneu MICHELIN — renforce
// l'association Michelin = Vitesse au moment précis où elle a le plus de sens.

function SpeedBoostBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
	return (
		<div
			className="speed-pop-in relative mx-5 mb-4 overflow-hidden rounded-2xl p-4"
			style={{ background: `linear-gradient(120deg, ${COLORS.blueDark} 0%, ${COLORS.blueDark02} 100%)` }}
		>
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				{[20, 55].map((top, i) => (
					<div
						key={top}
						className="speed-streak"
						style={{ top: `${top}%`, left: 0, width: '60%', animationDelay: `${i * 0.4}s` }}
					/>
				))}
			</div>
			<div className="relative flex items-center gap-3">
				<div
					className="speed-pulse flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
					style={{ background: COLORS.yellow }}
				>
					<Zap size={18} color={COLORS.onGold} />
				</div>
				<div className="flex-1">
					<div
						className="text-[11px] font-black tracking-widest uppercase"
						style={{ color: COLORS.yellow, fontFamily: FONTS.title }}
					>
						Michelin = Vitesse
					</div>
					<div className="mt-0.5 text-[11px]" style={{ color: COLORS.heading, fontFamily: FONTS.body }}>
						{message}
					</div>
				</div>
				<button onClick={onDismiss} style={{ color: COLORS.gray40 }}>
					<RotateCcw size={13} />
				</button>
			</div>
		</div>
	);
}

// ─── Success banner ──────────────────────────────────────────────────────────

function SuccessBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
	return (
		<div
			className="mx-5 mb-4 flex items-center gap-3 rounded-2xl p-4"
			style={{ background: COLORS.successLight, border: `1px solid ${COLORS.successDark}` }}
		>
			<CheckCircle size={20} color={COLORS.success} className="flex-shrink-0" />
			<div className="flex-1">
				<div className="text-[12px] font-bold" style={{ color: COLORS.success, fontFamily: FONTS.body }}>
					Mise à jour enregistrée
				</div>
				<div className="mt-0.5 text-[11px]" style={{ color: '#34D399', fontFamily: FONTS.body }}>
					{message}
				</div>
			</div>
			<button onClick={onDismiss} style={{ color: COLORS.gray40 }}>
				<RotateCcw size={13} />
			</button>
		</div>
	);
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export function TireUpdateScreen() {
	const [mode, setMode] = useState<Mode>('idle');
	const [tires, setTires] = useState<TireSetOut | null>(null);
	const [catalog, setCatalog] = useState<TireCatalogOut[]>([]);
	const [recommendations, setRecommendations] = useState<RecommendationsOut | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);
	const [speedBoost, setSpeedBoost] = useState(false);

	useEffect(() => {
		Promise.all([tiresApi.getTires(), tiresApi.getCatalog(), tiresApi.getRecommendations(), userApi.getStats()])
			.then(([t, c, r, stats]) => {
				setTires(t);
				setCatalog(c);
				// Sans aucune sortie enregistrée, on n'a pas de profil de pratique
				// fiable : on évite de proposer un pneu "recommandé" qui ne
				// reposerait sur rien de réel.
				setRecommendations(stats.total_rides > 0 ? r : null);
			})
			.catch(console.error)
			.finally(() => setLoading(false));
	}, []);

	// ── Mutations ──────────────────────────────────────────────────────────────

	async function patchWheel(wheel: WheelPosition, src: TireOut): Promise<TireOut> {
		return tiresApi.updateTire(wheel, {
			brand: src.brand,
			catalog_id: src.catalog_id ?? undefined,
			name: src.brand === 'other' ? src.name : undefined,
			size: src.size,
			category: src.category ?? undefined,
			reset_wear: true,
		});
	}

	const handleReplaceSame = async (wheel: WheelTarget) => {
		if (!tires) return;
		setSaving(true);
		try {
			const [newRear, newFront] = await Promise.all([
				wheel !== 'front' ? patchWheel('rear', tires.rear) : Promise.resolve(tires.rear),
				wheel !== 'rear' ? patchWheel('front', tires.front) : Promise.resolve(tires.front),
			]);
			setTires({ rear: newRear, front: newFront });
			const label = WHEEL_LABELS[wheel];
			setSpeedBoost(false);
			setSuccessMsg(`${label} remplacée${wheel === 'both' ? 's' : ''} par des neufs — compteur remis à zéro.`);
			setMode('idle');
		} catch {
			// silently — user sees no change, can retry
		} finally {
			setSaving(false);
		}
	};

	const handleNewMichelin = async (tire: TireCatalogOut, size: string, wheel: WheelTarget) => {
		setSaving(true);
		try {
			const patch = { brand: 'michelin' as const, catalog_id: tire.id, size, reset_wear: true };
			const [newRear, newFront] = await Promise.all([
				wheel !== 'front' ? tiresApi.updateTire('rear', patch) : Promise.resolve(tires!.rear),
				wheel !== 'rear' ? tiresApi.updateTire('front', patch) : Promise.resolve(tires!.front),
			]);
			setTires({ rear: newRear, front: newFront });
			setSpeedBoost(true);
			setSuccessMsg(
				`MICHELIN ${tire.name} ${size} installé${wheel === 'both' ? 's sur les deux roues' : ` sur la ${WHEEL_LABELS[wheel].toLowerCase()}`}.`,
			);
			setMode('idle');
		} catch {
			// silently
		} finally {
			setSaving(false);
		}
	};

	const handleOther = async (name: string, size: string, type: string, wheel: WheelTarget) => {
		setSaving(true);
		try {
			const patch = { brand: 'other' as const, name, size, category: type, reset_wear: true };
			const [newRear, newFront] = await Promise.all([
				wheel !== 'front' ? tiresApi.updateTire('rear', patch) : Promise.resolve(tires!.rear),
				wheel !== 'rear' ? tiresApi.updateTire('front', patch) : Promise.resolve(tires!.front),
			]);
			setTires({ rear: newRear, front: newFront });
			setSpeedBoost(false);
			setSuccessMsg(
				`${name} ${size} enregistré${wheel === 'both' ? 's sur les deux roues' : ` sur la ${WHEEL_LABELS[wheel].toLowerCase()}`} (Autre).`,
			);
			setMode('idle');
		} catch {
			// silently
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="flex h-full flex-col" style={{ background: COLORS.bgGradient }}>
			<div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
				{/* Header */}
				<div className="px-5 pt-5 pb-4">
					{mode !== 'idle' ? (
						<button
							onClick={() => setMode('idle')}
							className="mb-3 flex items-center gap-1.5 transition-opacity hover:opacity-70"
						>
							<ArrowLeft size={15} color={COLORS.blue} />
							<span
								className="text-[11px] font-bold tracking-wider uppercase"
								style={{ fontFamily: FONTS.title, color: COLORS.blue }}
							>
								Retour
							</span>
						</button>
					) : (
						<div className="mb-1 flex items-center gap-2">
							<Wrench size={12} color={COLORS.warning} />
							<p
								className="text-[10px] tracking-widest uppercase"
								style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
							>
								Gestion
							</p>
						</div>
					)}
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
						{mode === 'replace-new'
							? 'Choisir un modèle'
							: mode === 'other'
								? 'Autre marque'
								: mode === 'replace-same'
									? 'Remplacer'
									: 'Mes Pneus'}
					</h1>
				</div>

				{loading ? (
					<div className="flex items-center justify-center py-20">
						<div
							className="h-8 w-8 animate-spin rounded-full border-2"
							style={{ borderColor: COLORS.blue, borderTopColor: 'transparent' }}
						/>
					</div>
				) : !tires ? (
					<div className="mx-5 py-8 text-center text-[12px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
						Impossible de charger les données pneus.
					</div>
				) : (
					<>
						{successMsg && mode === 'idle' && speedBoost && (
							<SpeedBoostBanner message={successMsg} onDismiss={() => setSuccessMsg(null)} />
						)}
						{successMsg && mode === 'idle' && !speedBoost && (
							<SuccessBanner message={successMsg} onDismiss={() => setSuccessMsg(null)} />
						)}

						{mode === 'idle' && (
							<>
								<CurrentTireCard tires={tires} recommendations={recommendations} onAction={setMode} />
								{recommendations &&
									(() => {
										const worstWheel: WheelPosition = tires.front.wear_pct >= tires.rear.wear_pct ? 'front' : 'rear';
										const offer = recommendations[worstWheel];
										return offer.recommended ? <RecommendedSpecPanel offer={offer} /> : null;
									})()}
							</>
						)}

						{mode === 'replace-same' && (
							<ReplaceSamePanel
								tires={tires}
								onConfirm={handleReplaceSame}
								onCancel={() => setMode('idle')}
								saving={saving}
							/>
						)}

						{mode === 'replace-new' && (
							<MichelinPicker
								tires={tires}
								catalog={catalog}
								recommendations={recommendations}
								onConfirm={handleNewMichelin}
								onCancel={() => setMode('idle')}
								saving={saving}
							/>
						)}

						{mode === 'other' && (
							<OtherBrandPanel tires={tires} onConfirm={handleOther} onCancel={() => setMode('idle')} saving={saving} />
						)}
					</>
				)}
			</div>
		</div>
	);
}
