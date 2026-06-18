'use client';

import { useState, useEffect } from 'react';

import { ChevronRight, Bike, Trophy, CheckCircle, Sparkles, Star, Gift, Send, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { userApi, tiresApi, personalChallengesApi } from '@/app/lib/api';
import type { StatsOut, TireSetOut, PersonalChallengeStatusOut } from '@/app/lib/api';
import { COLORS, FONTS } from '@/app/lib/constants';

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
						label={`Montés le ${fmtDate(front!.installed_date)}`}
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
					Performance totale de vos pneus
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
							</div>
							<Badge tone={wearTone}>{tire.wear}% Utilisation</Badge>
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
						</div>
					</Panel>
				);
			})}
		</div>
	);
}

// ─── "Pneu pour toi" — défi personnel unique ─────────────────────────────────
// Un seul défi à la fois, généré pour CET utilisateur précis (jamais partagé) —
// on insiste visuellement sur le caractère personnel. Après réalisation, un
// questionnaire ciblé pneus débloque une réduction dont le palier augmente
// avec le nombre de défis déjà complétés.

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
	return (
		<div className="flex items-center justify-between gap-3">
			<span className="text-[11px] font-semibold" style={{ color: COLORS.heading, fontFamily: FONTS.body }}>
				{label}
			</span>
			<div className="flex gap-1">
				{[1, 2, 3, 4, 5].map((n) => (
					<button
						key={n}
						type="button"
						onClick={() => onChange(n)}
						className="transition-transform hover:scale-110"
						aria-label={`${label} : ${n}/5`}
					>
						<Star size={18} fill={n <= value ? COLORS.yellow : 'none'} color={n <= value ? COLORS.yellow : COLORS.gray40} />
					</button>
				))}
			</div>
		</div>
	);
}

function PersonalChallengeCard() {
	const [status, setStatus] = useState<PersonalChallengeStatusOut | null>(null);
	const [loading, setLoading] = useState(true);
	const [working, setWorking] = useState(false);
	const [reward, setReward] = useState<{
		type: 'discount' | 'giveaway';
		pct: number;
		code: string;
		tireName: string | null;
	} | null>(null);
	const [ratings, setRatings] = useState({ adherence: 0, comfort: 0, speed: 0 });
	const [comment, setComment] = useState('');

	const fetchCurrent = () => {
		setLoading(true);
		personalChallengesApi
			.getCurrent()
			.then(setStatus)
			.catch(console.error)
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		fetchCurrent();
	}, []);

	if (loading) {
		return (
			<div className="mx-5 mb-4 flex h-32 items-center justify-center rounded-2xl" style={{ background: COLORS.gray05 }}>
				<div
					className="h-6 w-6 animate-spin rounded-full border-2"
					style={{ borderColor: COLORS.blue, borderTopColor: 'transparent' }}
				/>
			</div>
		);
	}
	if (!status) return null;

	const challenge = status.challenge;
	const ratingsComplete = ratings.adherence > 0 && ratings.comfort > 0 && ratings.speed > 0;

	async function handleComplete() {
		setWorking(true);
		try {
			await personalChallengesApi.complete(challenge.id);
			setStatus({ ...status!, challenge: { ...challenge, status: 'pending_feedback' } });
		} catch {
			// silently — l'utilisateur peut réessayer
		} finally {
			setWorking(false);
		}
	}

	async function handleSubmitFeedback() {
		if (!ratingsComplete) return;
		setWorking(true);
		try {
			const updated = await personalChallengesApi.submitFeedback(challenge.id, {
				adherence_rating: ratings.adherence,
				comfort_rating: ratings.comfort,
				speed_rating: ratings.speed,
				comment: comment.trim() || undefined,
			});
			setReward({
				type: updated.reward_type,
				pct: updated.reward_discount_pct ?? 0,
				code: updated.reward_discount_code ?? '',
				tireName: updated.reward_giveaway_tire_name ?? null,
			});
		} catch {
			// silently
		} finally {
			setWorking(false);
		}
	}

	function handleNextChallenge() {
		setReward(null);
		setRatings({ adherence: 0, comfort: 0, speed: 0 });
		setComment('');
		fetchCurrent();
	}

	// ── Récompense débloquée — affichée juste après l'envoi du questionnaire ──
	if (reward) {
		return (
			<div
				className="speed-pop-in mx-5 mb-4 overflow-hidden rounded-2xl p-5 text-center"
				style={{ background: `linear-gradient(135deg, ${COLORS.successDark} 0%, #14532D 100%)` }}
			>
				<div
					className="speed-pulse mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
					style={{ background: COLORS.yellow }}
				>
					<Gift size={22} color={COLORS.onGold} />
				</div>
				<div className="text-[13px] font-black tracking-wide uppercase" style={{ color: 'white', fontFamily: FONTS.title }}>
					{reward.type === 'giveaway' ? 'Pneu mérité !' : 'Merci pour ton retour !'}
				</div>
				<p className="mt-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.body }}>
					{reward.type === 'giveaway'
						? `Ton assiduité et ce défi dépassé t'offrent un ${reward.tireName ?? 'pneu Michelin'} — sans tirage au sort, juste mérité.`
						: 'Tu débloques une réduction sur ton prochain pneu Michelin.'}
				</p>
				{reward.type === 'giveaway' ? (
					<div className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2" style={{ background: COLORS.yellow }}>
						<Gift size={14} color={COLORS.onGold} />
						<span className="text-[12px] font-black" style={{ color: COLORS.onGold, fontFamily: FONTS.mono }}>
							{reward.tireName ?? 'Pneu offert'}
						</span>
					</div>
				) : (
					reward.pct > 0 && (
						<div className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2" style={{ background: COLORS.yellow }}>
							<span className="text-[14px] font-black" style={{ color: COLORS.onGold, fontFamily: FONTS.mono }}>
								-{reward.pct}%
							</span>
							<span className="text-[11px] font-bold" style={{ color: COLORS.onGold, fontFamily: FONTS.mono }}>
								{reward.code}
							</span>
						</div>
					)
				)}
				<button
					onClick={handleNextChallenge}
					className="mt-4 w-full rounded-xl py-2.5 text-[11px] font-bold tracking-wider uppercase transition-all hover:opacity-90"
					style={{ background: 'rgba(255,255,255,0.12)', color: 'white', fontFamily: FONTS.title }}
				>
					Découvrir mon prochain défi
				</button>
			</div>
		);
	}

	return (
		<Panel className="mx-5 mb-4 overflow-hidden p-5" borderColor="rgba(255,200,0,0.3)">
			<div className="mb-3 flex items-center justify-between">
				<Badge tone="gold">
					<Sparkles size={11} />
					Juste pour toi
				</Badge>
				{status.completed_count > 0 && (
					<span className="text-[10px] font-semibold" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
						{status.completed_count} défi{status.completed_count > 1 ? 's' : ''} relevé
						{status.completed_count > 1 ? 's' : ''}
					</span>
				)}
			</div>

			{challenge.status === 'active' && (
				<>
					<h3 className="text-[16px] font-black break-words" style={{ color: COLORS.heading, fontFamily: FONTS.title }}>
						{challenge.title}
					</h3>
					<p className="mt-1.5 text-[12px] leading-relaxed break-words" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
						{challenge.description}
					</p>

					<div
						className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5"
						style={{ background: 'rgba(255,200,0,0.08)', border: '1px solid rgba(255,200,0,0.2)' }}
					>
						<Gift size={14} color={COLORS.yellow} className="flex-shrink-0" />
						<span className="text-[11px] font-semibold" style={{ color: COLORS.heading, fontFamily: FONTS.body }}>
							{status.giveaway_tier_reached ? (
								<>
									Dépasse cet objectif et un <strong>pneu Michelin t&apos;est offert</strong> — mérité, pas tiré au sort
								</>
							) : (
								<>
									Termine-le pour débloquer jusqu&apos;à <strong>-{status.next_reward_pct}%</strong> sur ton prochain pneu
								</>
							)}
						</span>
					</div>

					<button
						onClick={handleComplete}
						disabled={working}
						className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[12px] font-bold tracking-wider uppercase transition-all hover:opacity-90"
						style={{ background: COLORS.yellow, color: COLORS.onGold, fontFamily: FONTS.title }}
					>
						{working ? (
							<div
								className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
								style={{ borderColor: COLORS.onGold, borderTopColor: 'transparent' }}
							/>
						) : (
							<CheckCircle size={14} />
						)}
						J&apos;ai terminé mon défi
					</button>
				</>
			)}

			{challenge.status === 'pending_feedback' && (
				<>
					<h3 className="text-[14px] font-black break-words" style={{ color: COLORS.heading, fontFamily: FONTS.title }}>
						Bravo ! Quelques mots sur tes pneus ?
					</h3>
					<p className="mt-1 text-[11px] break-words" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
						Ton retour débloque ta récompense.
					</p>

					<div className="mt-4 flex flex-col gap-3">
						<StarRating label="Adhérence" value={ratings.adherence} onChange={(v) => setRatings((r) => ({ ...r, adherence: v }))} />
						<StarRating label="Confort" value={ratings.comfort} onChange={(v) => setRatings((r) => ({ ...r, comfort: v }))} />
						<StarRating
							label="Vitesse perçue"
							value={ratings.speed}
							onChange={(v) => setRatings((r) => ({ ...r, speed: v }))}
						/>
					</div>

					<textarea
						value={comment}
						onChange={(e) => setComment(e.target.value)}
						placeholder="Un commentaire (optionnel)…"
						rows={2}
						className="mt-3 w-full resize-none rounded-xl px-3 py-2.5 text-[12px] outline-none"
						style={{
							background: COLORS.gray05,
							border: `1px solid ${COLORS.gray10}`,
							color: COLORS.heading,
							fontFamily: FONTS.body,
						}}
					/>

					<button
						onClick={handleSubmitFeedback}
						disabled={!ratingsComplete || working}
						className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[12px] font-bold tracking-wider uppercase transition-all hover:opacity-90"
						style={{
							background: ratingsComplete ? COLORS.yellow : COLORS.gray10,
							color: ratingsComplete ? COLORS.onGold : COLORS.gray40,
							fontFamily: FONTS.title,
						}}
					>
						{working ? (
							<div
								className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
								style={{ borderColor: COLORS.gray40, borderTopColor: 'transparent' }}
							/>
						) : (
							<Send size={13} />
						)}
						Envoyer mon retour
					</button>
				</>
			)}
		</Panel>
	);
}

// ─── Bouton header + modale pour le défi personnel ────────────────────────────
// Affiché uniquement sur la page d'accueil (passé en rightSlot de AppHeader) :
// ouvre une modale plutôt que d'occuper de la place directement dans la page.

function ChallengeHeaderButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			onClick={onClick}
			aria-label="Mon défi personnel"
			className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80"
			style={{ background: 'rgba(255,200,0,0.14)', border: '1px solid rgba(255,200,0,0.35)' }}
		>
			<Sparkles size={16} color={COLORS.yellow} />
		</button>
	);
}

function ChallengeModal({ onClose }: { onClose: () => void }) {
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			style={{ background: 'rgba(8,10,18,0.72)' }}
			onClick={onClose}
		>
			<div
				className="max-h-[85vh] w-full max-w-sm overflow-y-auto"
				style={{ scrollbarWidth: 'none' }}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="mb-1 flex items-center justify-between px-1">
					<span
						className="text-[10px] font-bold tracking-widest uppercase"
						style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
					>
						Mon défi personnel
					</span>
					<button
						onClick={onClose}
						aria-label="Fermer"
						className="flex h-8 w-8 items-center justify-center rounded-full transition-opacity hover:opacity-70"
						style={{ background: 'rgba(255,255,255,0.08)' }}
					>
						<X size={16} color={COLORS.gray60} />
					</button>
				</div>
				<PersonalChallengeCard />
			</div>
		</div>
	);
}

function LegendsLink({ onNavigate }: { onNavigate: (s: string) => void }) {
	return (
		<Panel className="mx-5 mb-4 p-0 overflow-hidden">
			<button
				onClick={() => onNavigate('legends')}
				className="speed-pop-in relative flex w-full items-center gap-3 px-4 py-4 text-left transition-all hover:opacity-90"
				style={{ background: `linear-gradient(120deg, ${COLORS.blueDark} 0%, ${COLORS.blueDark02} 100%)` }}
			>
				<div
					className="speed-pulse flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
					style={{ background: COLORS.yellow }}
				>
					<Trophy size={18} color={COLORS.onGold} />
				</div>
				<div className="min-w-0 flex-1">
					<div
						className="text-[12px] font-black tracking-wide break-words uppercase"
						style={{ color: COLORS.heading, fontFamily: FONTS.title }}
					>
						Ils ont choisi Michelin, et ça leur réussit !
					</div>
					<div className="mt-0.5 text-[10px] break-words" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
						Romain Bardet, Team Picnic PostNL, MotoGP... découvrez les champions Michelin
					</div>
				</div>
				<ChevronRight size={16} color={COLORS.blue} className="flex-shrink-0" />
			</button>
		</Panel>
	);
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export function TelemetryScreen() {
	const router = useRouter();
	const [animated, setAnimated] = useState(false);
	const [stats, setStats] = useState<StatsOut | null>(null);
	const [tires, setTires] = useState<TireSetOut | null>(null);
	const [loading, setLoading] = useState(true);
	const [challengeOpen, setChallengeOpen] = useState(false);
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
			<AppHeader rightSlot={<ChallengeHeaderButton onClick={() => setChallengeOpen(true)} />} />

			<div className="flex-1 overflow-x-hidden overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
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
						Suivi d'utilisation
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
						<LegendsLink onNavigate={onNavigate} />
					</>
				)}
			</div>

			{challengeOpen && <ChallengeModal onClose={() => setChallengeOpen(false)} />}
		</div>
	);
}
