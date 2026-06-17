'use client';

import { useState, useEffect } from 'react';

import { ChevronRight, Bike, Trophy, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { userApi, tiresApi } from '@/app/lib/api';
import type { StatsOut, TireSetOut, RecommendationsOut } from '@/app/lib/api';
import { COLORS, FONTS, getTireAlert } from '@/app/lib/constants';

import { AppHeader } from './ui/AppHeader';
import { Panel, Badge, MeterBar, WearDial } from './ui/RaceKit';

// ─── Sub-components ────────────────────────────────────────────────────────

function KmHero({ stats, tires }: { stats: StatsOut | null; tires: TireSetOut | null }) {
	const totalKm = stats?.total_km ?? 0;
	const front = tires?.front;
	const rear = tires?.rear;
	const sameTire = front && rear && front.name === rear.name && front.size === rear.size;

	const fmtDate = (iso: string) =>
		new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

	return (
		<div
			className="mx-5 mb-4 rounded-2xl p-5"
			style={{
				background: `linear-gradient(135deg, ${COLORS.blueDark} 0%, ${COLORS.blue} 100%)`,
				border: '1px solid rgba(255,255,255,0.12)',
				boxShadow: `0 12px 32px rgba(0,32,91,0.28), 0 1px 0 rgba(255,255,255,0.15) inset`,
			}}
		>
			<div
				className="mb-1 text-[10px] font-semibold tracking-widest uppercase"
				style={{ color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.title }}
			>
				Kilométrage Total Actuel
			</div>
			<div className="mb-3 flex items-end gap-2">
				<span
					className="leading-none font-black"
					style={{ fontFamily: FONTS.mono, fontSize: '52px', color: COLORS.yellow, letterSpacing: '-0.02em' }}
				>
					{totalKm.toLocaleString('fr-FR')}
				</span>
				<span className="mb-2 text-xl font-semibold text-white/70" style={{ fontFamily: FONTS.title }}>
					km
				</span>
			</div>

			<div className="flex gap-3">
				{sameTire ? (
					/* Même pneu AV + AR → une seule pill */
					<MetricPill
						icon={<Bike size={12} color={COLORS.yellow} />}
						value={front!.name}
						label={`Monté le ${fmtDate(front!.installed_date)}`}
					/>
				) : front && rear ? (
					/* Pneus différents → deux pills */
					<>
						<MetricPill icon={<Bike size={12} color={COLORS.yellow} />} value={front.name} label="Avant" />
						<MetricPill icon={<Bike size={12} color={COLORS.yellow} />} value={rear.name} label="Arrière" />
					</>
				) : null}
			</div>
		</div>
	);
}

function MetricPill({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
	return (
		<div
			className="flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5"
			style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
		>
			{icon}
			<span className="text-center text-[12px] font-bold text-white" style={{ fontFamily: FONTS.mono }}>
				{value}
			</span>
			<span
				className="text-[9px] tracking-wider uppercase"
				style={{ color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.body }}
			>
				{label}
			</span>
		</div>
	);
}

function TireCard({ animated, stats }: { animated: boolean; stats: StatsOut | null }) {
	const frontWear = stats?.front_wear ?? 0;
	const rearWear = stats?.rear_wear ?? 0;

	return (
		<Panel className="mx-5 mb-4 p-5">
			<div className="mb-3 text-center">
				<span
					className="text-[10px] font-bold uppercase"
					style={{ color: COLORS.gray50, fontFamily: FONTS.mono, letterSpacing: '0.25em' }}
				>
					Instrumentation Usure Pneus
				</span>
			</div>

			{/* Avant à gauche, Arrière à droite — compteurs façon tableau de bord */}
			<div className="flex items-center justify-around">
				<WearDial label="Roue Avant" wear={animated ? frontWear : 0} />
				<div className="h-24 w-px" style={{ background: COLORS.gray10 }} />
				<WearDial label="Roue Arrière" wear={animated ? rearWear : 0} />
			</div>
		</Panel>
	);
}

// ─── Comparison matrix — Grip Level / Mechanical Efficiency ──────────────────
// Ces deux métriques n'existent pas telles quelles côté API : on les dérive de
// manière réaliste à partir de l'usure réelle (wear_pct), seule donnée
// télémétrique fiable dont on dispose pour chaque pneu.

function deriveGrip(wear: number): number {
	return Math.max(0, Math.round(100 - wear * 0.35));
}

function deriveEfficiency(wear: number): number {
	return Math.max(0, Math.round(100 - wear * 0.22));
}

function wearNote(wear: number): string {
	if (wear >= 75) return 'Dégradation du composé détectée';
	if (wear >= 45) return 'Usure modérée — dans la norme';
	return 'État optimal — marge confortable';
}

function ComparisonMatrix({ stats }: { stats: StatsOut | null }) {
	const frontWear = stats?.front_wear ?? 0;
	const rearWear = stats?.rear_wear ?? 0;

	const tireStats = [
		{ position: 'Avant', wear: frontWear },
		{ position: 'Arrière', wear: rearWear },
	].map((t) => ({
		...t,
		grip: deriveGrip(t.wear),
		efficiency: deriveEfficiency(t.wear),
		note: wearNote(t.wear),
	}));

	return (
		<div className="mx-5 mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
			{tireStats.map((tire) => {
				const wearTone = tire.wear >= 75 ? 'danger' : tire.wear >= 45 ? 'gold' : 'success';
				return (
					<Panel key={tire.position} className="p-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<h3 className="text-[13px] font-bold" style={{ color: COLORS.heading, fontFamily: FONTS.title }}>
									{tire.position}
								</h3>
								<span
									className="text-[9px] tracking-wider uppercase"
									style={{ color: COLORS.gray40, fontFamily: FONTS.mono }}
								>
									Pneu
								</span>
							</div>
							<Badge tone={wearTone}>{tire.wear}% Usure</Badge>
						</div>

						<div className="mt-4 flex flex-col gap-4">
							<div>
								<div className="mb-1.5 flex items-baseline justify-between">
									<span className="text-[11px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
										Grip Level
									</span>
									<span className="text-[12px] font-semibold" style={{ color: COLORS.heading, fontFamily: FONTS.mono }}>
										{tire.grip}%
									</span>
								</div>
								<MeterBar value={tire.grip} tone={tire.grip >= 85 ? 'success' : 'gold'} />
							</div>
							<div>
								<div className="mb-1.5 flex items-baseline justify-between">
									<span className="text-[11px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
										Mechanical Efficiency
									</span>
									<span className="text-[12px] font-semibold" style={{ color: COLORS.heading, fontFamily: FONTS.mono }}>
										{tire.efficiency}%
									</span>
								</div>
								<MeterBar value={tire.efficiency} tone={tire.efficiency >= 95 ? 'success' : 'gold'} />
							</div>
							<p
								className="pt-3 text-[10px]"
								style={{ borderTop: `1px solid ${COLORS.gray10}`, color: COLORS.gray50, fontFamily: FONTS.body }}
							>
								{tire.note}
							</p>
						</div>
					</Panel>
				);
			})}
		</div>
	);
}

function TireAlert({ onNavigate, stats }: { onNavigate: (s: string) => void; stats: StatsOut | null }) {
	const frontWear = stats?.front_wear ?? 0;
	const rearWear = stats?.rear_wear ?? 0;
	const adherencePct = stats?.adherence_pct ?? 100;
	const alert = getTireAlert(frontWear, rearWear, adherencePct);
	const [reco, setReco] = useState<RecommendationsOut | null>(null);

	useEffect(() => {
		// L'offre/réduction n'a de sens que si le cycliste use déjà ses pneus —
		// pas avant la première sortie ("start") ni quand tout va bien ("ok").
		if (alert.severity !== 'critical' && alert.severity !== 'warning') return;
		tiresApi.getRecommendations().then(setReco).catch(console.error);
	}, [alert.severity]);

	const worstWheel: 'front' | 'rear' = frontWear >= rearWear ? 'front' : 'rear';
	const offer = reco ? reco[worstWheel] : null;

	const styles = {
		start: {
			border: COLORS.start,
			iconBg: COLORS.startLight,
			icon: <Bike size={18} color={COLORS.start} />,
			titleColor: COLORS.start,
		},
		critical: {
			border: COLORS.achieved,
			iconBg: COLORS.achievedLight,
			icon: <Trophy size={18} color={COLORS.achieved} />,
			titleColor: COLORS.achieved,
		},
		warning: {
			border: 'rgba(255,184,0,0.35)',
			iconBg: 'rgba(255,184,0,0.12)',
			icon: <AlertCircle size={18} color={COLORS.warning} />,
			titleColor: '#FFD79A',
		},
		ok: {
			border: COLORS.successDark,
			iconBg: 'rgba(52,211,153,0.12)',
			icon: <CheckCircle size={18} color={COLORS.success} />,
			titleColor: COLORS.success,
		},
	}[alert.severity];

	return (
		<div
			className="mx-5 mb-4 rounded-2xl p-4"
			style={{
				background: 'rgba(23,26,40,0.88)',
				backdropFilter: 'blur(14px) saturate(140%)',
				WebkitBackdropFilter: 'blur(14px) saturate(140%)',
				border: `1px solid ${styles.border}`,
				boxShadow: `0 8px 20px ${styles.border}25, 0 1px 0 rgba(255,255,255,0.06) inset`,
			}}
		>
			<div className="flex gap-3">
				<div
					className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
					style={{ background: styles.iconBg }}
				>
					{styles.icon}
				</div>
				<div className="flex-1">
					<p
						className="mb-1 text-[10px] font-black tracking-widest uppercase"
						style={{ color: styles.titleColor, fontFamily: FONTS.title }}
					>
						{alert.title}
					</p>
					<p className="text-[12px] leading-relaxed" style={{ color: COLORS.grayDark, fontFamily: FONTS.body }}>
						{alert.message}
					</p>

					{offer && offer.discount_pct > 0 && (
						<div className="mt-2 flex flex-wrap items-center gap-2">
							<span
								className="rounded-full px-2 py-0.5 text-[11px] font-black"
								style={{ background: COLORS.yellow, color: COLORS.onGold, fontFamily: FONTS.mono }}
							>
								-{offer.discount_pct}%
							</span>
							{offer.recommended && (
								<span className="text-[11px] font-semibold" style={{ color: COLORS.blue, fontFamily: FONTS.body }}>
									sur {offer.recommended.name}
								</span>
							)}
						</div>
					)}
				</div>
			</div>

			{alert.severity === 'start' && (
				<button
					onClick={() => onNavigate('challenges')}
					className="mt-3 flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-[12px] font-bold tracking-wider uppercase transition-all hover:opacity-90 active:scale-[0.98]"
					style={{ background: COLORS.start, color: COLORS.white, fontFamily: FONTS.title, letterSpacing: '0.1em' }}
				>
					Découvrir les défis
					<ChevronRight size={14} />
				</button>
			)}

			{(alert.severity === 'critical' || alert.severity === 'warning') && (
				<button
					onClick={() => onNavigate('tires')}
					className="mt-3 flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-[12px] font-bold tracking-wider uppercase transition-all hover:opacity-90 active:scale-[0.98]"
					style={{ background: COLORS.yellow, color: COLORS.onGold, fontFamily: FONTS.title, letterSpacing: '0.1em' }}
				>
					{offer && offer.discount_pct > 0 ? `Profiter de -${offer.discount_pct}%` : 'Voir les pneus recommandés'}
					<ChevronRight size={14} />
				</button>
			)}
		</div>
	);
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export function TelemetryScreen() {
	const router = useRouter();
	const [animated, setAnimated] = useState(false);
	const [stats, setStats] = useState<StatsOut | null>(null);
	const [tires, setTires] = useState<TireSetOut | null>(null);
	const [loading, setLoading] = useState(true);
	const onNavigate = (screen: string) => router.push(`/${screen}`);

	useEffect(() => {
		const t = setTimeout(() => setAnimated(true), 100);
		return () => clearTimeout(t);
	}, []);

	useEffect(() => {
		Promise.all([userApi.getStats(), tiresApi.getTires()])
			.then(([s, t]) => {
				setStats(s);
				setTires(t);
			})
			.catch(console.error)
			.finally(() => setLoading(false));
	}, []);

	return (
		<div className="flex h-full flex-col" style={{ background: COLORS.bgGradient, scrollbarWidth: 'none' }}>
			<AppHeader onPartnersClick={() => onNavigate('partners')} />

			<div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
				<div className="px-5 pt-5 pb-4">
					<p
						className="mb-0.5 text-[10px] tracking-widest uppercase"
						style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
					>
						Dashboard Télémétrie
					</p>
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
						Usure Prédictive
					</h1>
				</div>

				{loading ? (
					<div className="flex items-center justify-center py-20">
						<div
							className="h-8 w-8 animate-spin rounded-full border-2"
							style={{ borderColor: COLORS.blue, borderTopColor: 'transparent' }}
						/>
					</div>
				) : (
					<>
						<KmHero stats={stats} tires={tires} />
						<TireCard animated={animated} stats={stats} />
						<ComparisonMatrix stats={stats} />
						<TireAlert onNavigate={onNavigate} stats={stats} />
					</>
				)}
			</div>
		</div>
	);
}
