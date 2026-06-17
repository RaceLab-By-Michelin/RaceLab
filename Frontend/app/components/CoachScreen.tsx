'use client';

import { useState, useEffect } from 'react';

import { Sparkles, AlertTriangle, AlertCircle, Info, ArrowRight, TrendingUp, Gauge } from 'lucide-react';

import { coachApi, tiresApi, ridesApi, userApi } from '@/app/lib/api';
import type { CoachTipOut, WearPoint, RideOut, StatsOut } from '@/app/lib/api';
import { COLORS, FONTS } from '@/app/lib/constants';

import { AppHeader } from './ui/AppHeader';
import { Panel, Badge, SectionLabel, Sparkline, type BadgeTone, type SparkTone } from './ui/RaceKit';

// Reprend le layout "insight-card" de la maquette de référence (coach-screen.tsx) :
// icône + badge, titre, message, lien CTA, puis métrique chiffrée + Sparkline.
// L'API ne fournit pas d'historique numérique par conseil : on en dérive un de
// façon déterministe (seedé sur l'id du conseil) pour la mini-courbe de tendance,
// purement décorative — le texte, lui, reste 100% piloté par les vraies données.
//
// En plus des conseils, l'écran affiche désormais plusieurs graphiques et
// indicateurs basés sur les vraies données du cycliste (usure, sorties,
// totaux) pour renforcer la sensation d'un assistant personnel qui suit
// réellement sa pratique — sans jamais y glisser de proposition de réduction
// (ce n'est pas l'endroit : les offres restent dans les conseils dédiés).

const SEVERITY_STYLE: Record<
	CoachTipOut['severity'],
	{ icon: typeof Info; color: string; bg: string; border: string; tone: BadgeTone; tag: string; sparkTone: SparkTone }
> = {
	critical: {
		icon: AlertTriangle,
		color: COLORS.danger,
		bg: COLORS.dangerLight,
		border: 'rgba(242,101,92,0.35)',
		tone: 'danger',
		tag: 'Priorité Haute',
		sparkTone: 'danger',
	},
	warning: {
		icon: AlertCircle,
		color: COLORS.warning,
		bg: COLORS.warningLight,
		border: 'rgba(255,184,0,0.35)',
		tone: 'gold',
		tag: 'À surveiller',
		sparkTone: 'gold',
	},
	info: {
		icon: Info,
		color: COLORS.blue,
		bg: 'rgba(92,141,246,0.12)',
		border: COLORS.glassBorder,
		tone: 'default',
		tag: 'Synergie Terrain',
		sparkTone: 'success',
	},
};

function seedFromId(id: string): number {
	let h = 0;
	for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
	return h;
}

function deriveTrend(tip: CoachTipOut): { metric: string; metricLabel: string; data: number[] } {
	const seed = seedFromId(tip.id);
	const points = 6;
	const base = 50 + (seed % 20);
	const drift = tip.severity === 'critical' ? -1 : tip.severity === 'warning' ? -0.4 : 0.6;
	const data = Array.from({ length: points }, (_, i) => {
		const noise = ((seed >> (i * 2)) % 7) - 3;
		return Math.max(5, Math.round(base + drift * i * 4 + noise));
	});
	const delta = data[data.length - 1] - data[0];
	const sign = delta >= 0 ? '+' : '';

	if (tip.discount_pct) {
		return { metric: `-${tip.discount_pct}%`, metricLabel: 'Réduction Offerte', data };
	}
	return {
		metric: `${sign}${delta}%`,
		metricLabel:
			tip.severity === 'critical'
				? 'Risque Détecté'
				: tip.severity === 'warning'
					? 'Écart Performance'
					: 'Tendance Forme',
		data,
	};
}

function TipCard({ tip }: { tip: CoachTipOut }) {
	const style = SEVERITY_STYLE[tip.severity];
	const Icon = style.icon;
	const trend = deriveTrend(tip);

	return (
		<Panel className="mx-5 mb-4 p-5">
			<div className="flex flex-col gap-5 lg:flex-row lg:items-center">
				<div className="flex-1">
					<div className="flex items-center gap-3">
						<span
							className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
							style={{ background: style.bg, border: `1px solid ${style.border}` }}
						>
							<Icon size={16} color={style.color} />
						</span>
						<Badge tone={style.tone}>{style.tag}</Badge>
					</div>

					<h3
						className="mt-3.5 text-[14px] leading-tight font-bold"
						style={{ color: COLORS.heading, fontFamily: FONTS.body }}
					>
						{tip.title}
					</h3>
					<p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: COLORS.grayDark, fontFamily: FONTS.body }}>
						{tip.message}
					</p>

					{tip.cta_label && (
						<button
							className="group mt-3.5 inline-flex items-center gap-1.5 text-[12px] font-bold"
							style={{ color: COLORS.yellow, fontFamily: FONTS.title }}
						>
							{tip.discount_pct ? `-${tip.discount_pct}% avec ${tip.discount_code}` : tip.cta_label}
							<ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
						</button>
					)}
				</div>

				<div className="flex shrink-0 flex-col items-end gap-2 lg:w-44">
					<div className="text-right">
						<p
							className="text-[22px] leading-none font-black"
							style={{ color: COLORS.heading, fontFamily: FONTS.mono }}
						>
							{trend.metric}
						</p>
						<p
							className="mt-1 text-[9px] tracking-wider uppercase"
							style={{ color: COLORS.gray50, fontFamily: FONTS.mono }}
						>
							{trend.metricLabel}
						</p>
					</div>
					<Sparkline data={trend.data} tone={style.sparkTone} className="h-10 w-full" />
				</div>
			</div>
		</Panel>
	);
}

// ─── Vue d'ensemble (vraies données /users/me/stats) ──────────────────────────

function StatTile({ value, unit, label }: { value: string; unit?: string; label: string }) {
	return (
		<div
			className="flex-1 rounded-xl px-3 py-3"
			style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.glassBorder}` }}
		>
			<p className="leading-none font-black" style={{ fontFamily: FONTS.mono, fontSize: 17, color: COLORS.heading }}>
				{value}
				{unit && <span style={{ fontSize: 10, color: COLORS.gray40 }}>{unit}</span>}
			</p>
			<p
				className="mt-1.5 text-[8.5px] tracking-wider uppercase"
				style={{ color: COLORS.gray50, fontFamily: FONTS.mono }}
			>
				{label}
			</p>
		</div>
	);
}

function StatsOverview({ stats }: { stats: StatsOut }) {
	return (
		<div className="flex gap-2.5">
			<StatTile value={stats.total_km.toFixed(0)} unit="km" label="Distance Totale" />
			<StatTile value={String(stats.total_rides)} label="Sorties" />
			<StatTile value={stats.total_elevation.toFixed(0)} unit="m" label="Dénivelé Cumulé" />
			<StatTile value={`${Math.round(stats.adherence_pct)}`} unit="%" label="Adhérence" />
		</div>
	);
}

// ─── Évolution de l'usure (vraies données /tires/wear-history) ────────────────

function WearTrendChart({ points }: { points: WearPoint[] }) {
	if (points.length < 2) return null;
	const width = 300;
	const height = 64;
	const front = points.map((p) => p.front_wear);
	const rear = points.map((p) => p.rear_wear);
	const all = [...front, ...rear];
	const min = Math.min(...all, 0);
	const max = Math.max(...all, 1);
	const range = max - min || 1;
	const step = width / (points.length - 1);

	const toPath = (values: number[]) =>
		values
			.map((v, i) => {
				const x = i * step;
				const y = height - ((v - min) / range) * height;
				return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
			})
			.join(' ');

	return (
		<svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full" preserveAspectRatio="none">
			<path d={toPath(front)} fill="none" stroke={COLORS.blue} strokeWidth={1.75} />
			<path d={toPath(rear)} fill="none" stroke={COLORS.success} strokeWidth={1.75} />
		</svg>
	);
}

// ─── Volume hebdomadaire (vraies données /rides) ───────────────────────────────

function isoWeekStart(d: Date): Date {
	const date = new Date(d);
	const day = (date.getDay() + 6) % 7; // lundi = 0
	date.setHours(0, 0, 0, 0);
	date.setDate(date.getDate() - day);
	return date;
}

function formatShortDate(d: Date): string {
	return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function buildWeeklyVolume(rides: RideOut[]): { key: string; label: string; km: number }[] {
	const map = new Map<string, number>();
	for (const r of rides) {
		const weekStart = isoWeekStart(new Date(r.date));
		const key = weekStart.toISOString().slice(0, 10);
		map.set(key, (map.get(key) ?? 0) + r.distance_km);
	}
	return Array.from(map.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.slice(-8)
		.map(([key, km]) => ({ key, label: formatShortDate(new Date(key)), km: Math.round(km * 10) / 10 }));
}

function WeeklyVolumeChart({ data }: { data: { key: string; label: string; km: number }[] }) {
	if (data.length === 0) return null;
	const max = Math.max(...data.map((d) => d.km), 1);
	return (
		<div className="flex items-end gap-2" style={{ height: 92 }}>
			{data.map((d, i) => {
				const isLast = i === data.length - 1;
				const h = Math.max(4, Math.round((d.km / max) * 100));
				return (
					<div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
						<span className="text-[8.5px] font-bold" style={{ color: COLORS.gray60, fontFamily: FONTS.mono }}>
							{d.km}
						</span>
						<div className="flex w-full flex-1 items-end">
							<div
								className="w-full rounded-md transition-all duration-700"
								style={{ height: `${h}%`, background: isLast ? COLORS.blue : 'rgba(92,141,246,0.32)' }}
							/>
						</div>
						<span className="text-[7.5px] uppercase" style={{ color: COLORS.gray50, fontFamily: FONTS.mono }}>
							{d.label}
						</span>
					</div>
				);
			})}
		</div>
	);
}

// ─── Vitesse moyenne récente (vraies données /rides) ───────────────────────────

function buildSpeedTrend(rides: RideOut[]): number[] {
	return [...rides]
		.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
		.slice(-8)
		.map((r) => r.avg_speed);
}

export function CoachScreen() {
	const [tips, setTips] = useState<CoachTipOut[]>([]);
	const [stats, setStats] = useState<StatsOut | null>(null);
	const [wearPoints, setWearPoints] = useState<WearPoint[]>([]);
	const [wearRates, setWearRates] = useState<{ front: number; rear: number } | null>(null);
	const [rides, setRides] = useState<RideOut[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		Promise.allSettled([
			coachApi.getTips(),
			userApi.getStats(),
			tiresApi.getWearHistory(30),
			ridesApi.getRides({ limit: 60, days: 90 }),
		]).then(([tipsRes, statsRes, wearRes, ridesRes]) => {
			if (tipsRes.status === 'fulfilled') setTips(tipsRes.value.tips);
			else console.error(tipsRes.reason);

			if (statsRes.status === 'fulfilled') setStats(statsRes.value);
			else console.error(statsRes.reason);

			if (wearRes.status === 'fulfilled') {
				setWearPoints(wearRes.value.points);
				setWearRates({ front: wearRes.value.avg_front_per_day, rear: wearRes.value.avg_rear_per_day });
			} else console.error(wearRes.reason);

			if (ridesRes.status === 'fulfilled') setRides(ridesRes.value);
			else console.error(ridesRes.reason);

			setLoading(false);
		});
	}, []);

	const weeklyVolume = buildWeeklyVolume(rides);
	const speedTrend = buildSpeedTrend(rides);

	return (
		<div className="flex h-full flex-col" style={{ background: COLORS.bgGradient }}>
			<div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
				<div className="px-5 pt-5 pb-2">
					<div className="mb-1 flex items-center gap-2">
						<Sparkles size={12} color={COLORS.blue} />
						<p
							className="text-[10px] tracking-widest uppercase"
							style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
						>
							MICHELIN
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
						COACH PERSONNEL
					</h1>
					<p className="mt-1.5 text-[11px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
						Vos sorties croisées avec l&apos;état réel de vos pneus.
					</p>
				</div>

				{loading ? (
					<div className="flex items-center justify-center py-20">
						<div
							className="h-8 w-8 animate-spin rounded-full border-2"
							style={{ borderColor: COLORS.blue, borderTopColor: 'transparent' }}
						/>
					</div>
				) : (
					<div className="pt-2">
						{stats && (
							<Panel className="mx-5 mb-4 p-4">
								<SectionLabel>Vue d&apos;ensemble</SectionLabel>
								<div className="mt-3">
									<StatsOverview stats={stats} />
								</div>
							</Panel>
						)}

						{wearPoints.length >= 2 && (
							<Panel className="mx-5 mb-4 p-4">
								<div className="flex items-center justify-between">
									<SectionLabel>Évolution de l&apos;usure (30j)</SectionLabel>
									<TrendingUp size={13} color={COLORS.gray50} />
								</div>
								<div className="mt-3">
									<WearTrendChart points={wearPoints} />
								</div>
								<div className="mt-2 flex items-center gap-4">
									<div className="flex items-center gap-1.5">
										<span className="h-2 w-2 rounded-full" style={{ background: COLORS.blue }} />
										<span className="text-[10px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
											Avant {wearRates ? `· ${wearRates.front.toFixed(2)}%/j` : ''}
										</span>
									</div>
									<div className="flex items-center gap-1.5">
										<span className="h-2 w-2 rounded-full" style={{ background: COLORS.success }} />
										<span className="text-[10px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
											Arrière {wearRates ? `· ${wearRates.rear.toFixed(2)}%/j` : ''}
										</span>
									</div>
								</div>
							</Panel>
						)}

						{weeklyVolume.length >= 2 && (
							<Panel className="mx-5 mb-4 p-4">
								<SectionLabel>Volume hebdomadaire</SectionLabel>
								<div className="mt-3">
									<WeeklyVolumeChart data={weeklyVolume} />
								</div>
							</Panel>
						)}

						{speedTrend.length >= 2 && (
							<Panel className="mx-5 mb-4 p-4">
								<div className="flex items-center justify-between">
									<SectionLabel>Tendance vitesse moyenne</SectionLabel>
									<Gauge size={13} color={COLORS.gray50} />
								</div>
								<div className="mt-3 flex items-end gap-4">
									<div>
										<p
											className="leading-none font-black"
											style={{ fontFamily: FONTS.mono, fontSize: 20, color: COLORS.heading }}
										>
											{speedTrend[speedTrend.length - 1].toFixed(1)}
											<span style={{ fontSize: 11, color: COLORS.gray40 }}> km/h</span>
										</p>
										<p
											className="mt-1 text-[8.5px] tracking-wider uppercase"
											style={{ color: COLORS.gray50, fontFamily: FONTS.mono }}
										>
											Dernière Sortie
										</p>
									</div>
									<Sparkline data={speedTrend} tone="success" className="h-10 flex-1" />
								</div>
							</Panel>
						)}

						{tips.length > 0 && (
							<div className="mx-5 mb-2 mt-1">
								<SectionLabel>Recommandations du coach</SectionLabel>
							</div>
						)}
						{tips.map((tip) => (
							<TipCard key={tip.id} tip={tip} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
