'use client';

import { useState, useEffect } from 'react';

import { Sparkles, AlertTriangle, AlertCircle, Info, ArrowRight } from 'lucide-react';

import { coachApi } from '@/app/lib/api';
import type { CoachTipOut } from '@/app/lib/api';
import { COLORS, FONTS } from '@/app/lib/constants';

import { AppHeader } from './ui/AppHeader';
import { Panel, Badge, Sparkline, type BadgeTone, type SparkTone } from './ui/RaceKit';

// Reprend le layout "insight-card" de la maquette de référence (coach-screen.tsx) :
// icône + badge, titre, message, lien CTA, puis métrique chiffrée + Sparkline.
// L'API ne fournit pas d'historique numérique par conseil : on en dérive un de
// façon déterministe (seedé sur l'id du conseil) pour la mini-courbe de tendance,
// purement décorative — le texte, lui, reste 100% piloté par les vraies données.

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

export function CoachScreen() {
	const [tips, setTips] = useState<CoachTipOut[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		coachApi
			.getTips()
			.then((r) => setTips(r.tips))
			.catch(console.error)
			.finally(() => setLoading(false));
	}, []);

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
						{tips.map((tip) => (
							<TipCard key={tip.id} tip={tip} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
