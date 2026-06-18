'use client';

import { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';
import { Store, MapPin, AlertTriangle, Users as UsersIcon } from 'lucide-react';

import { retailerApi } from '@/app/lib/api';
import type { RetailerZoneOut, RetailerDashboardOut } from '@/app/lib/api';
import { COLORS, FONTS } from '@/app/lib/constants';

import { AppHeader } from './ui/AppHeader';
import { Panel, SectionLabel } from './ui/RaceKit';

// Feature 2 — dashboard B2B revendeur. Page interne, sans authentification
// revendeur dédiée (décision produit) : accessible via un lien discret depuis
// Paramètres, pas depuis la barre de navigation principale (réservée aux 6
// écrans cycliste). Les données sont simulées (réseau de distribution),
// distinctes du compte cycliste réel de la démo — cf. Backend/app/seed.py.

const PRACTICE_COLOR: Record<string, string> = {
	Route: COLORS.blue,
	Gravel: COLORS.warning,
	VTT: COLORS.success,
	Urbain: COLORS.danger,
	Piste: COLORS.gray50,
};

function ZoneCard({ zone }: { zone: RetailerZoneOut }) {
	const practiceEntries = Object.entries(zone.practice_breakdown).sort((a, b) => b[1] - a[1]);
	const total = practiceEntries.reduce((sum, [, count]) => sum + count, 0);
	const eolSeverity = zone.tires_near_end_of_life_pct >= 35 ? COLORS.danger : COLORS.warning;

	return (
		<Panel className="mx-5 mb-4 p-5">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<MapPin size={14} color={COLORS.blue} />
					<h3 className="text-[15px] font-bold" style={{ color: COLORS.heading, fontFamily: FONTS.title }}>
						{zone.city}
					</h3>
				</div>
				<div className="flex items-center gap-1.5">
					<UsersIcon size={12} color={COLORS.gray50} />
					<span className="text-[11px]" style={{ color: COLORS.gray50, fontFamily: FONTS.mono }}>
						{zone.rider_count} cyclistes
					</span>
				</div>
			</div>

			{/* Profil de pratique dominant */}
			<div className="mt-4">
				<p className="text-[10px] tracking-wider uppercase" style={{ color: COLORS.gray50, fontFamily: FONTS.mono }}>
					Pratique dominante
				</p>
				<div className="mt-1.5 flex items-center gap-2">
					<span
						className="rounded-full px-2.5 py-1 text-[12px] font-bold"
						style={{
							background: `${PRACTICE_COLOR[zone.dominant_practice] ?? COLORS.blue}1F`,
							color: PRACTICE_COLOR[zone.dominant_practice] ?? COLORS.blue,
							fontFamily: FONTS.title,
						}}
					>
						{zone.dominant_practice}
					</span>
					<span className="text-[11px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
						{zone.dominant_practice_share_pct}% des cyclistes de la zone
					</span>
				</div>

				{/* Répartition complète, en barre empilée */}
				<div className="mt-3 flex h-2 w-full overflow-hidden rounded-full" style={{ background: COLORS.gray05 }}>
					{practiceEntries.map(([practice, count]) => (
						<div
							key={practice}
							style={{
								width: `${(count / total) * 100}%`,
								background: PRACTICE_COLOR[practice] ?? COLORS.gray40,
							}}
						/>
					))}
				</div>
			</div>

			{/* Pneus en fin de vie proche */}
			<div
				className="mt-4 flex items-center gap-3 rounded-xl p-3"
				style={{ background: 'rgba(242,101,92,0.08)', border: `1px solid ${eolSeverity}35` }}
			>
				<AlertTriangle size={16} color={eolSeverity} />
				<div>
					<p className="text-[13px] font-bold" style={{ color: COLORS.heading, fontFamily: FONTS.body }}>
						{zone.tires_near_end_of_life} pneus en fin de vie proche ({zone.tires_near_end_of_life_pct}%)
					</p>
					<p className="mt-0.5 text-[10.5px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
						Usure ≥ 80% ou projection à moins de 6 semaines — demande de remplacement à anticiper.
					</p>
				</div>
			</div>
		</Panel>
	);
}

export function RetailerScreen() {
	const router = useRouter();
	const [data, setData] = useState<RetailerDashboardOut | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		retailerApi
			.getDashboard()
			.then(setData)
			.catch(console.error)
			.finally(() => setLoading(false));
	}, []);

	return (
		<div className="flex h-full flex-col" style={{ background: COLORS.bgGradient }}>
			<AppHeader onBack={() => router.push('/settings')} />
			<div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
				<div className="px-5 pt-5 pb-2">
					<div className="mb-1 flex items-center gap-2">
						<Store size={12} color={COLORS.blue} />
						<p className="text-[10px] tracking-widest uppercase" style={{ color: COLORS.gray50, fontFamily: FONTS.title }}>
							MICHELIN · RÉSEAU REVENDEURS
						</p>
					</div>
					<h1
						className="leading-none uppercase"
						style={{ fontFamily: FONTS.title, fontSize: '26px', fontWeight: 800, letterSpacing: '0.04em', color: COLORS.blue }}
					>
						Prévision de la demande
					</h1>
					<p className="mt-1.5 text-[11px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
						Profils de pratique dominants et pneus en fin de vie, par zone — pour anticiper les stocks du réseau.
					</p>
				</div>

				{loading ? (
					<div className="flex items-center justify-center py-20">
						<div
							className="h-8 w-8 animate-spin rounded-full border-2"
							style={{ borderColor: COLORS.blue, borderTopColor: 'transparent' }}
						/>
					</div>
				) : data && data.zones.length > 0 ? (
					<div className="pt-2">
						<Panel className="mx-5 mb-4 p-4">
							<SectionLabel>Vue d&apos;ensemble réseau</SectionLabel>
							<div className="mt-3 flex gap-2.5">
								<div
									className="flex-1 rounded-xl px-3 py-3"
									style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.glassBorder}` }}
								>
									<p className="leading-none font-black" style={{ fontFamily: FONTS.mono, fontSize: 17, color: COLORS.heading }}>
										{data.total_riders}
									</p>
									<p className="mt-1.5 text-[8.5px] tracking-wider uppercase" style={{ color: COLORS.gray50, fontFamily: FONTS.mono }}>
										Cyclistes suivis
									</p>
								</div>
								<div
									className="flex-1 rounded-xl px-3 py-3"
									style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.glassBorder}` }}
								>
									<p className="leading-none font-black" style={{ fontFamily: FONTS.mono, fontSize: 17, color: COLORS.heading }}>
										{data.zones.length}
									</p>
									<p className="mt-1.5 text-[8.5px] tracking-wider uppercase" style={{ color: COLORS.gray50, fontFamily: FONTS.mono }}>
										Zones couvertes
									</p>
								</div>
								<div
									className="flex-1 rounded-xl px-3 py-3"
									style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.glassBorder}` }}
								>
									<p className="leading-none font-black" style={{ fontFamily: FONTS.mono, fontSize: 17, color: COLORS.heading }}>
										{data.weeks_horizon}
									</p>
									<p className="mt-1.5 text-[8.5px] tracking-wider uppercase" style={{ color: COLORS.gray50, fontFamily: FONTS.mono }}>
										Semaines d&apos;horizon
									</p>
								</div>
							</div>
							<p className="mt-3 text-[10px] italic" style={{ color: COLORS.gray40, fontFamily: FONTS.body }}>
								{data.generated_note}
							</p>
						</Panel>

						<div className="mx-5 mb-2 mt-1">
							<SectionLabel>Détail par zone</SectionLabel>
						</div>
						{data.zones.map((zone) => (
							<ZoneCard key={zone.city} zone={zone} />
						))}
					</div>
				) : (
					<p className="px-5 py-10 text-center text-[12px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
						Aucune donnée disponible pour le moment.
					</p>
				)}
			</div>
		</div>
	);
}
