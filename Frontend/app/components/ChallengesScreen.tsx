'use client';

import { useState, useEffect } from 'react';

import {
	Trophy,
	Star,
	Clock,
	Flame,
	Medal,
	ChevronRight,
	Plus,
	Calendar,
	Target,
	Gift,
	Dice5,
	Sparkle,
	Check,
	Users,
	ArrowRight,
	Lock,
	Globe,
	Copy,
} from 'lucide-react';

import { challengesApi, eventsApi, labApi } from '@/app/lib/api';
import type { ChallengeOut, EventOut, EventGoalType, EventVisibility, TireTrialOut } from '@/app/lib/api';
import { COLORS, FONTS } from '@/app/lib/constants';

import { AppHeader } from './ui/AppHeader';
import { Badge } from './ui/RaceKit';

// ─── Concurrents fixes (non stockés en backend) ─────────────────────────────
// "Vous" n'a pas de rang fixe : sa position est recalculée dynamiquement en
// fonction de son kilométrage réel comparé à celui des autres concurrents
// (voir buildLeaderboard ci-dessous).

const OTHER_RACERS = [
	{ name: 'Alexandre M.', km: 98.4 },
	{ name: 'Sophie L.', km: 94.1 },
	{ name: 'Pierre D.', km: 91.7 },
	{ name: 'Marc T.', km: 87.2 },
	{ name: 'Julie R.', km: 83.6 },
	{ name: 'Thomas B.', km: 68.9 },
	{ name: 'Camille V.', km: 65.0 },
	{ name: 'Éric P.', km: 61.2 },
	{ name: 'Nadia K.', km: 58.4 },
] as const;

interface LeaderboardEntry {
	rank: number;
	name: string;
	km: number;
	badge?: string;
	isUser?: boolean;
}

/** Insère l'utilisateur parmi les autres concurrents en fonction de son
 * kilométrage réel, puis recalcule le classement (rang + médailles) pour
 * que "Vous" apparaisse à la bonne position plutôt qu'à un rang fixe. */
function buildLeaderboard(userKm: number): LeaderboardEntry[] {
	const all: { name: string; km: number; isUser?: boolean }[] = [
		...OTHER_RACERS,
		{ name: 'Vous', km: userKm, isUser: true },
	];
	return all
		.sort((a, b) => b.km - a.km)
		.map((entry, i) => {
			const rank = i + 1;
			const badge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : entry.isUser ? '★' : undefined;
			return { rank, name: entry.name, km: entry.km, badge, isUser: entry.isUser };
		});
}

// ─── Sub-components ────────────────────────────────────────────────────────

// Reprend la carte "Events" de la maquette de référence (events-screen.tsx) :
// image 16:10 avec dégradé + badges en haut, infos en bas de l'image, puis
// boîte "Sponsorisé par" + boîte "Recommandation Télémétrie" avec CTA.
function ActiveChallengeBanner({ challenge }: { challenge: ChallengeOut | null }) {
	const progressKm = challenge?.progress_km ?? 0;
	const targetKm = challenge?.target_km ?? 100;
	const progressPct = targetKm > 0 ? Math.min(100, (progressKm / targetKm) * 100) : 0;
	const title = challenge?.name ?? '24H DU MANS — SCUDERIA FERRARI EDITION';

	return (
		<div className="glass-panel mx-5 mt-4 mb-4 overflow-hidden rounded-2xl">
			<div className="relative aspect-[3/1] overflow-hidden">
				<img
					src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=200&fit=crop&auto=format"
					alt="24h du Mans racing event"
					className="h-full w-full object-cover"
				/>
				<div
					className="absolute inset-0"
					style={{ background: 'linear-gradient(180deg, rgba(11,13,23,0.05) 0%, rgba(11,13,23,0.92) 100%)' }}
				/>

				<div className="absolute inset-x-0 top-0 flex items-center justify-between p-2.5">
					<div
						className="flex items-center gap-1 rounded-full px-2 py-0.5 backdrop-blur-md"
						style={{ background: 'rgba(183,28,28,0.85)' }}
					>
						<div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
						<span
							className="text-[8px] font-black tracking-wider text-white uppercase"
							style={{ fontFamily: FONTS.title }}
						>
							En Direct
						</span>
					</div>
					<Badge tone="gold">Partenaire</Badge>
				</div>

				<div className="absolute inset-x-0 bottom-0 p-3">
					<h2
						className="leading-tight text-white"
						style={{ fontFamily: FONTS.title, fontSize: '14px', fontWeight: 800 }}
					>
						{title.toUpperCase()}
					</h2>
					<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
						<span
							className="flex items-center gap-1 text-[10px]"
							style={{ color: COLORS.gray50, fontFamily: FONTS.body }}
						>
							<Users size={10} />
							{challenge?.participants ?? 0} participants
						</span>
						<span
							className="flex items-center gap-1 text-[10px]"
							style={{ color: COLORS.gray50, fontFamily: FONTS.mono }}
						>
							<Clock size={10} />
							{challenge
								? new Date(challenge.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
								: '—'}
						</span>
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-2.5 p-3.5">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<KmStat value={progressKm} label="km parcourus" />
						<span style={{ color: COLORS.gray20 }}>/</span>
						<KmStat value={targetKm} label="objectif km" />
					</div>
				</div>

				<div>
					<div className="mb-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: COLORS.gray10 }}>
						<div
							className="h-full rounded-full transition-all duration-1000"
							style={{ width: `${progressPct}%`, background: COLORS.yellow }}
						/>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[9px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
							{Math.round(progressPct)}% complété
						</span>
						<span className="text-[9px] font-semibold" style={{ color: COLORS.blue, fontFamily: FONTS.body }}>
							{(targetKm - progressKm).toFixed(1)} km restants
						</span>
					</div>
				</div>

				<div
					className="flex items-center justify-between rounded-xl px-3 py-2"
					style={{ background: 'rgba(255,200,0,0.06)', border: '1px solid rgba(255,200,0,0.2)' }}
				>
					<div>
						<p className="text-[8px] tracking-wider uppercase" style={{ color: COLORS.gray40, fontFamily: FONTS.mono }}>
							Recommandation Télémétrie — Sponsorisé par Alltricks
						</p>
						<p className="text-[11px] font-semibold" style={{ color: COLORS.yellow, fontFamily: FONTS.body }}>
							Top 10 : paire de pneus Michelin offerte
						</p>
					</div>
					<button
						className="inline-flex flex-shrink-0 items-center gap-1 text-[10px] font-bold"
						style={{ color: COLORS.yellow, fontFamily: FONTS.title }}
					>
						Voir
						<ArrowRight size={11} />
					</button>
				</div>
			</div>
		</div>
	);
}

function KmStat({ value, label }: { value: number; label: string }) {
	return (
		<div className="text-center">
			<div className="text-[14px] font-bold" style={{ color: COLORS.blue, fontFamily: FONTS.mono }}>
				{value.toFixed(value % 1 === 0 ? 0 : 1)}
			</div>
			<div className="text-[9px] tracking-wider uppercase" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
				{label}
			</div>
		</div>
	);
}

function LeaderboardRow({
	entry,
	isLast,
	gapKm,
	participants,
}: {
	entry: LeaderboardEntry;
	isLast: boolean;
	gapKm?: number;
	participants?: number;
}) {
	const isUser = !!entry.isUser;
	const km = entry.km;

	return (
		<div
			className="flex items-center gap-3 px-4 py-2.5 transition-all"
			style={{
				borderBottom: isLast ? 'none' : `1px solid ${COLORS.gray05}`,
				background: isUser ? 'rgba(252,229,0,0.10)' : 'transparent',
				borderLeft: isUser ? `3px solid ${COLORS.yellow}` : '3px solid transparent',
				boxShadow: isUser ? `0 0 0 1px ${COLORS.glowYellow} inset` : 'none',
			}}
		>
			<div className="w-5 text-center">
				{entry.badge ? (
					<span className="text-[12px]">{entry.badge}</span>
				) : (
					<span className="text-[11px]" style={{ color: COLORS.gray40, fontFamily: FONTS.mono }}>
						{entry.rank}
					</span>
				)}
			</div>
			<span
				className="flex-1 text-[12px]"
				style={{
					fontFamily: FONTS.body,
					fontWeight: isUser ? 700 : 400,
					color: isUser ? COLORS.blue : COLORS.grayDark,
				}}
			>
				{entry.name}
				{isUser && (
					<span className="ml-1 text-[9px] opacity-60" style={{ color: COLORS.blue }}>
						(vous){participants ? ` · ${entry.rank}e / ${participants}` : ''}
					</span>
				)}
			</span>
			<div className="flex-shrink-0 text-right">
				<div
					className="text-[11px]"
					style={{
						fontFamily: FONTS.mono,
						color: isUser ? COLORS.blue : COLORS.gray40,
						fontWeight: isUser ? 700 : 400,
					}}
				>
					{km.toFixed(1)} km
				</div>
				{gapKm !== undefined && gapKm > 0 && (
					<div className="text-[9px]" style={{ fontFamily: FONTS.mono, color: COLORS.gray40 }}>
						+{gapKm.toFixed(1)}km
					</div>
				)}
			</div>
		</div>
	);
}

function Leaderboard({ activeChallenge }: { activeChallenge: ChallengeOut | null }) {
	const userKm = activeChallenge?.progress_km ?? 0;
	const participants = activeChallenge?.participants;
	const leaderboard = buildLeaderboard(userKm);

	return (
		<div className="glass-panel mx-5 mb-4 overflow-hidden rounded-2xl">
			{/* Header */}
			<div
				className="flex items-center justify-between px-4 py-3"
				style={{ borderBottom: `1px solid ${COLORS.gray10}` }}
			>
				<div className="flex items-center gap-2">
					<Trophy size={13} color={COLORS.blue} />
					<span
						className="text-[12px] font-bold tracking-widest uppercase"
						style={{ color: COLORS.blue, fontFamily: FONTS.title }}
					>
						Classement Live
					</span>
				</div>
				<div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: COLORS.yellow }}>
					<Star size={9} color={COLORS.blueDark} fill={COLORS.blueDark} />
					<span className="text-[9px] font-bold uppercase" style={{ color: COLORS.heading, fontFamily: FONTS.title }}>
						TOP 10 : Pneus Offerts
					</span>
				</div>
			</div>

			{/* Rows */}
			{leaderboard.map((entry, i) => {
				const prevKm = i > 0 ? leaderboard[i - 1].km : undefined;
				const gapKm = prevKm !== undefined ? prevKm - entry.km : undefined;
				return (
					<LeaderboardRow
						key={entry.rank}
						entry={entry}
						isLast={i === leaderboard.length - 1}
						gapKm={gapKm}
						participants={participants}
					/>
				);
			})}

			{/* Reward note */}
			<div
				className="mx-3 mt-2 mb-3 rounded-xl px-3 py-2.5"
				style={{ background: 'rgba(255,184,0,0.12)', border: '1px solid #FDE68A' }}
			>
				<div className="flex items-center gap-2">
					<Star size={11} color="#FFC861" fill="#FFC861" />
					<p className="text-[11px]" style={{ color: '#FFD79A', fontFamily: FONTS.body }}>
						<span className="font-bold">Top 10 :</span> Paire de pneus MICHELIN offerte — expédiée par{' '}
						<span className="font-semibold">Alltricks</span>
					</p>
				</div>
			</div>
		</div>
	);
}

// ─── Past Challenges + Badges ───────────────────────────────────────────────

function BadgesWall({ challenges }: { challenges: ChallengeOut[] }) {
	if (challenges.length === 0) return null;
	return (
		<div className="glass-panel mx-5 mb-4 rounded-2xl p-4">
			<div className="mb-3 flex items-center gap-2">
				<Medal size={13} color={COLORS.blue} />
				<span
					className="text-[12px] font-bold tracking-widest uppercase"
					style={{ color: COLORS.blue, fontFamily: FONTS.title }}
				>
					Badges Gagnés
				</span>
				<div
					className="ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold"
					style={{ background: COLORS.yellow, color: COLORS.onGold, fontFamily: FONTS.title }}
				>
					{challenges.length} challenges
				</div>
			</div>
			<div className="flex flex-wrap gap-2">
				{challenges.map((c) => (
					<div
						key={c.id}
						className="flex flex-col items-center gap-1 rounded-xl p-2.5"
						style={{ background: COLORS.gray05, minWidth: '56px' }}
					>
						<span className="text-2xl">{c.badge_emoji ?? '🏅'}</span>
						<span
							className="text-center text-[8px] leading-tight font-bold tracking-wider uppercase"
							style={{ color: COLORS.blue, fontFamily: FONTS.title }}
						>
							{c.badge_label ?? 'Complété'}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

function PastChallengeRow({ challenge, isLast }: { challenge: ChallengeOut; isLast: boolean }) {
	const rank = challenge.rank ?? 0;
	const podium = rank > 0 && rank <= 3;
	const totalKm = challenge.target_km ?? challenge.progress_km;
	const date = new Date(challenge.end_date).toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});

	return (
		<div
			className="flex items-center gap-3 px-4 py-3"
			style={{
				borderBottom: isLast ? 'none' : `1px solid ${COLORS.gray05}`,
				background: podium ? 'rgba(255,184,0,0.12)' : 'transparent',
			}}
		>
			<span className="w-7 flex-shrink-0 text-center text-xl">{challenge.badge_emoji ?? '🏅'}</span>
			<div className="min-w-0 flex-1">
				<div className="truncate text-[12px] font-bold" style={{ color: COLORS.heading, fontFamily: FONTS.body }}>
					{challenge.name}
				</div>
				<div className="mt-0.5 flex items-center gap-2">
					<span className="text-[9px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
						{date}
					</span>
					<span className="text-[9px]" style={{ color: COLORS.gray20 }}>
						•
					</span>
					<span className="text-[9px]" style={{ color: COLORS.gray50, fontFamily: FONTS.mono }}>
						{challenge.progress_km.toFixed(0)} km
					</span>
				</div>
				{challenge.reward && (
					<div className="mt-1 text-[9px] font-semibold" style={{ color: '#FFC861' }}>
						🎁 {challenge.reward}
					</div>
				)}
			</div>
			{rank > 0 && (
				<div className="flex-shrink-0 text-right">
					<div
						className="text-[13px] font-black"
						style={{ color: podium ? COLORS.blue : COLORS.grayDark, fontFamily: FONTS.mono }}
					>
						#{rank}
					</div>
					<div className="text-[9px]" style={{ color: COLORS.gray40, fontFamily: FONTS.body }}>
						/{challenge.participants}
					</div>
				</div>
			)}
		</div>
	);
}

function PastChallengesHistory({ challenges }: { challenges: ChallengeOut[] }) {
	const [expanded, setExpanded] = useState(false);
	const visible = expanded ? challenges : challenges.slice(0, 3);

	return (
		<div className="glass-panel mx-5 mb-4 overflow-hidden rounded-2xl">
			<div
				className="flex items-center justify-between px-4 py-3"
				style={{ borderBottom: `1px solid ${COLORS.gray10}` }}
			>
				<div className="flex items-center gap-2">
					<Trophy size={13} color={COLORS.blue} />
					<span
						className="text-[12px] font-bold tracking-widest uppercase"
						style={{ color: COLORS.blue, fontFamily: FONTS.title }}
					>
						Historique
					</span>
				</div>
				<span className="text-[10px]" style={{ color: COLORS.gray40, fontFamily: FONTS.mono }}>
					{challenges.length} courses
				</span>
			</div>

			{challenges.length === 0 ? (
				<div className="px-4 py-6 text-center text-[12px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
					Aucun challenge terminé
				</div>
			) : (
				visible.map((c, i) => (
					<PastChallengeRow
						key={c.id}
						challenge={c}
						isLast={i === visible.length - 1 && (expanded || challenges.length <= 3)}
					/>
				))
			)}

			{challenges.length > 3 && (
				<button
					onClick={() => setExpanded(!expanded)}
					className="flex w-full items-center justify-center gap-1.5 py-2.5 transition-all"
					style={{
						borderTop: `1px solid ${COLORS.gray10}`,
						color: COLORS.blue,
						fontFamily: FONTS.title,
						fontSize: '11px',
						fontWeight: 700,
					}}
				>
					{expanded ? 'Voir moins' : `Voir ${challenges.length - 3} de plus`}
					<ChevronRight
						size={12}
						style={{ transform: expanded ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 0.2s' }}
					/>
				</button>
			)}
		</div>
	);
}

// ─── Tabs ───────────────────────────────────────────────────────────────────

type ChallengesTab = 'defis' | 'evenements' | 'lab';

function TabBar({ active, onChange }: { active: ChallengesTab; onChange: (t: ChallengesTab) => void }) {
	const tabs: { id: ChallengesTab; label: string }[] = [
		{ id: 'defis', label: 'Défis' },
		{ id: 'evenements', label: 'Événements' },
		{ id: 'lab', label: 'Lab' },
	];
	return (
		<div className="mx-5 mb-3 flex gap-1.5 rounded-xl p-1" style={{ background: COLORS.gray05 }}>
			{tabs.map((t) => (
				<button
					key={t.id}
					onClick={() => onChange(t.id)}
					className="flex-1 rounded-lg py-2 text-[11px] font-bold tracking-wider uppercase transition-all"
					style={{
						fontFamily: FONTS.title,
						background: active === t.id ? COLORS.surfaceStrong : 'transparent',
						color: active === t.id ? COLORS.blueLight : COLORS.gray50,
						boxShadow: active === t.id ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
					}}
				>
					{t.label}
				</button>
			))}
		</div>
	);
}

// ─── Événements ─────────────────────────────────────────────────────────────

const GOAL_TYPE_LABELS: Record<EventGoalType, string> = {
	distance: 'km',
	elevation: 'm D+',
	rides: 'sorties',
};

function EventCard({ event, onJoin }: { event: EventOut; onJoin: (id: number, code?: string) => Promise<void> }) {
	const progressPct = event.goal_value > 0 ? Math.min(100, (event.progress_value / event.goal_value) * 100) : 0;
	const ended = new Date(event.end_date) < new Date();
	const isPrivate = event.visibility === 'private';
	// Le code n'est présent que pour le créateur (jamais renvoyé aux autres) —
	// sa présence sert ici simplement à savoir si on doit l'afficher.
	const isCreatorView = !!event.join_code;

	const [showCodeInput, setShowCodeInput] = useState(false);
	const [code, setCode] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [joining, setJoining] = useState(false);
	const [copied, setCopied] = useState(false);

	async function handleJoinClick() {
		if (isPrivate && !isCreatorView && !showCodeInput) {
			setShowCodeInput(true);
			return;
		}
		setError(null);
		setJoining(true);
		try {
			await onJoin(event.id, code.trim() || undefined);
		} catch {
			setError("Code d'invitation invalide.");
		} finally {
			setJoining(false);
		}
	}

	function handleCopyCode() {
		if (!event.join_code) return;
		navigator.clipboard?.writeText(event.join_code).catch(() => {});
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}

	return (
		<div className="glass-panel mx-5 mb-4 overflow-hidden rounded-2xl p-4">
			<div className="mb-2 flex items-start justify-between gap-2">
				<div className="flex min-w-0 items-center gap-1.5">
					{isPrivate ? <Lock size={11} color={COLORS.gray40} /> : <Globe size={11} color={COLORS.gray40} />}
					<h3
						className="truncate text-[14px] leading-tight font-bold"
						style={{ color: COLORS.heading, fontFamily: FONTS.body }}
					>
						{event.name}
					</h3>
				</div>
				{event.joined && (
					<span
						className="flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
						style={{ background: COLORS.achievedLight, color: COLORS.achieved, fontFamily: FONTS.title }}
					>
						<Check size={9} /> Inscrit
					</span>
				)}
			</div>

			<p className="mb-3 text-[11px] leading-snug" style={{ color: COLORS.grayDark, fontFamily: FONTS.body }}>
				{event.description}
			</p>

			{isCreatorView && (
				<button
					onClick={handleCopyCode}
					className="mb-3 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2"
					style={{ background: 'rgba(255,200,0,0.06)', border: '1px solid rgba(255,200,0,0.2)' }}
				>
					<div className="text-left">
						<p className="text-[8px] tracking-wider uppercase" style={{ color: COLORS.gray40, fontFamily: FONTS.mono }}>
							Code d&apos;invitation
						</p>
						<p
							className="text-[13px] font-black tracking-widest"
							style={{ color: COLORS.yellow, fontFamily: FONTS.mono }}
						>
							{event.join_code}
						</p>
					</div>
					<span
						className="flex items-center gap-1 text-[10px] font-bold"
						style={{ color: COLORS.yellow, fontFamily: FONTS.title }}
					>
						<Copy size={11} /> {copied ? 'Copié' : 'Copier'}
					</span>
				</button>
			)}

			<div className="mb-3 flex flex-wrap items-center gap-3">
				<div className="flex items-center gap-1">
					<Target size={11} color={COLORS.blue} />
					<span className="text-[10px]" style={{ color: COLORS.gray50, fontFamily: FONTS.mono }}>
						Objectif {event.goal_value} {GOAL_TYPE_LABELS[event.goal_type]}
					</span>
				</div>
				<div className="flex items-center gap-1">
					<Calendar size={11} color={COLORS.blue} />
					<span className="text-[10px]" style={{ color: COLORS.gray50, fontFamily: FONTS.mono }}>
						{new Date(event.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} →{' '}
						{new Date(event.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
					</span>
				</div>
				{event.terrain_type && (
					<span
						className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase"
						style={{ background: COLORS.startLight, color: COLORS.blue, fontFamily: FONTS.title }}
					>
						{event.terrain_type}
					</span>
				)}
			</div>

			{event.reward && (
				<div className="mb-3 flex items-center gap-1.5">
					<Gift size={11} color="#FFC861" />
					<span className="text-[10px] font-semibold" style={{ color: '#FFD79A', fontFamily: FONTS.body }}>
						{event.reward}
					</span>
				</div>
			)}

			{event.joined ? (
				<>
					<div className="mb-1.5 h-2 w-full overflow-hidden rounded-full" style={{ background: COLORS.gray10 }}>
						<div
							className="h-full rounded-full transition-all duration-1000"
							style={{ width: `${progressPct}%`, background: COLORS.yellow }}
						/>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[10px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
							{event.progress_value.toFixed(0)} / {event.goal_value} {GOAL_TYPE_LABELS[event.goal_type]}
						</span>
						<span className="text-[10px] font-semibold" style={{ color: COLORS.blue, fontFamily: FONTS.body }}>
							{event.participants} participant{event.participants > 1 ? 's' : ''}
							{event.rank ? ` · #${event.rank}` : ''}
						</span>
					</div>
				</>
			) : (
				<>
					{showCodeInput && (
						<input
							autoFocus
							placeholder="Code d'invitation (6 caractères)"
							value={code}
							onChange={(e) => {
								setCode(e.target.value.toUpperCase());
								setError(null);
							}}
							maxLength={6}
							className="mb-2 w-full rounded-xl px-3 py-2.5 text-center text-[12px] font-bold tracking-widest outline-none"
							style={{
								fontFamily: FONTS.mono,
								background: COLORS.surface,
								border: `1px solid ${error ? COLORS.danger : COLORS.gray10}`,
							}}
						/>
					)}
					{error && (
						<p className="mb-2 text-center text-[10px]" style={{ color: COLORS.danger, fontFamily: FONTS.body }}>
							{error}
						</p>
					)}
					<button
						onClick={handleJoinClick}
						disabled={ended || joining || (showCodeInput && code.trim().length === 0)}
						className="w-full rounded-xl py-2.5 text-[11px] font-bold tracking-wider uppercase transition-opacity disabled:opacity-40"
						style={{ background: COLORS.blue, color: COLORS.white, fontFamily: FONTS.title }}
					>
						{ended
							? 'Terminé'
							: joining
								? '…'
								: showCodeInput
									? 'Valider le code'
									: isPrivate
										? 'Entrer un code'
										: 'Rejoindre'}
					</button>
				</>
			)}
		</div>
	);
}

function CreateEventForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [goalType, setGoalType] = useState<EventGoalType>('distance');
	const [goalValue, setGoalValue] = useState('100');
	const [terrainType, setTerrainType] = useState('');
	const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
	const [endDate, setEndDate] = useState(() => {
		const d = new Date();
		d.setDate(d.getDate() + 14);
		return d.toISOString().slice(0, 10);
	});
	const [reward, setReward] = useState('');
	const [visibility, setVisibility] = useState<EventVisibility>('public');
	const [submitting, setSubmitting] = useState(false);

	const inputStyle = {
		fontFamily: FONTS.body,
		background: COLORS.surface,
		border: `1px solid ${COLORS.gray10}`,
	};

	async function handleSubmit() {
		if (!name.trim() || !description.trim() || !goalValue) return;
		setSubmitting(true);
		try {
			await eventsApi.create({
				name: name.trim(),
				description: description.trim(),
				goal_type: goalType,
				goal_value: parseFloat(goalValue),
				terrain_type: terrainType || null,
				start_date: new Date(startDate).toISOString(),
				end_date: new Date(endDate).toISOString(),
				reward: reward || null,
				visibility,
			});
			onCreated();
		} catch (e) {
			console.error(e);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="glass-panel mx-5 mb-4 overflow-hidden rounded-2xl p-4">
			<h3
				className="mb-3 text-[12px] font-bold tracking-widest uppercase"
				style={{ color: COLORS.blue, fontFamily: FONTS.title }}
			>
				Nouvel événement
			</h3>

			<div className="flex flex-col gap-2.5">
				<input
					placeholder="Nom du défi"
					value={name}
					onChange={(e) => setName(e.target.value)}
					className="rounded-xl px-3 py-2.5 text-[12px] outline-none"
					style={inputStyle}
				/>
				<textarea
					placeholder="Décrivez l'objectif du défi"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					rows={2}
					className="resize-none rounded-xl px-3 py-2.5 text-[12px] outline-none"
					style={inputStyle}
				/>
				<div className="flex gap-2">
					<select
						value={goalType}
						onChange={(e) => setGoalType(e.target.value as EventGoalType)}
						className="flex-1 rounded-xl px-3 py-2.5 text-[12px] outline-none"
						style={inputStyle}
					>
						<option value="distance">Distance (km)</option>
						<option value="elevation">Dénivelé (m)</option>
						<option value="rides">Nombre de sorties</option>
					</select>
					<input
						type="number"
						placeholder="Valeur"
						value={goalValue}
						onChange={(e) => setGoalValue(e.target.value)}
						className="w-24 rounded-xl px-3 py-2.5 text-[12px] outline-none"
						style={inputStyle}
					/>
				</div>
				<input
					placeholder="Terrain (route, gravel, vtt, mixte) — facultatif"
					value={terrainType}
					onChange={(e) => setTerrainType(e.target.value)}
					className="rounded-xl px-3 py-2.5 text-[12px] outline-none"
					style={inputStyle}
				/>
				<div className="flex gap-2">
					<input
						type="date"
						value={startDate}
						onChange={(e) => setStartDate(e.target.value)}
						className="flex-1 rounded-xl px-3 py-2.5 text-[12px] outline-none"
						style={inputStyle}
					/>
					<input
						type="date"
						value={endDate}
						onChange={(e) => setEndDate(e.target.value)}
						className="flex-1 rounded-xl px-3 py-2.5 text-[12px] outline-none"
						style={inputStyle}
					/>
				</div>
				<input
					placeholder="Récompense — facultatif"
					value={reward}
					onChange={(e) => setReward(e.target.value)}
					className="rounded-xl px-3 py-2.5 text-[12px] outline-none"
					style={inputStyle}
				/>

				<div>
					<p
						className="mb-1.5 text-[9px] tracking-wider uppercase"
						style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
					>
						Visibilité
					</p>
					<div className="flex gap-2">
						{(['public', 'private'] as EventVisibility[]).map((v) => (
							<button
								key={v}
								onClick={() => setVisibility(v)}
								className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold tracking-wider uppercase transition-all"
								style={{
									fontFamily: FONTS.title,
									background: visibility === v ? COLORS.yellow : COLORS.gray05,
									color: visibility === v ? COLORS.onGold : COLORS.gray50,
								}}
							>
								{v === 'public' ? <Globe size={12} /> : <Lock size={12} />}
								{v === 'public' ? 'Public' : 'Privé'}
							</button>
						))}
					</div>
					{visibility === 'private' && (
						<p className="mt-1.5 text-[10px] leading-relaxed" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
							Un code d&apos;invitation à 6 caractères sera généré — partagez-le avec les personnes que vous voulez
							inviter.
						</p>
					)}
				</div>
			</div>

			<div className="mt-3 flex gap-2">
				<button
					onClick={onCancel}
					className="flex-1 rounded-xl py-2.5 text-[11px] font-bold tracking-wider uppercase"
					style={{ background: COLORS.gray05, color: COLORS.gray50, fontFamily: FONTS.title }}
				>
					Annuler
				</button>
				<button
					onClick={handleSubmit}
					disabled={submitting || !name.trim() || !description.trim()}
					className="flex-1 rounded-xl py-2.5 text-[11px] font-bold tracking-wider uppercase disabled:opacity-40"
					style={{ background: COLORS.blue, color: COLORS.white, fontFamily: FONTS.title }}
				>
					{submitting ? 'Création…' : 'Créer'}
				</button>
			</div>
		</div>
	);
}

function EventsTab() {
	const [events, setEvents] = useState<EventOut[]>([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);

	function refresh() {
		eventsApi
			.list()
			.then(setEvents)
			.catch(console.error)
			.finally(() => setLoading(false));
	}

	useEffect(() => {
		refresh();
	}, []);

	async function handleJoin(id: number, code?: string) {
		// Pas de try/catch ici : un code invalide (403) doit remonter jusqu'à
		// l'EventCard pour afficher l'erreur inline, plutôt qu'être avalé ici.
		const updated = await eventsApi.join(id, code);
		setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<div
					className="h-8 w-8 animate-spin rounded-full border-2"
					style={{ borderColor: COLORS.blue, borderTopColor: 'transparent' }}
				/>
			</div>
		);
	}

	return (
		<>
			<div className="mx-5 mb-4">
				<button
					onClick={() => setShowForm((v) => !v)}
					className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold tracking-wider uppercase transition-opacity"
					style={{
						background: showForm ? COLORS.gray05 : COLORS.yellow,
						color: COLORS.onGold,
						fontFamily: FONTS.title,
					}}
				>
					<Plus size={13} /> {showForm ? 'Fermer' : 'Créer un événement'}
				</button>
			</div>

			{showForm && (
				<CreateEventForm
					onCreated={() => {
						setShowForm(false);
						refresh();
					}}
					onCancel={() => setShowForm(false)}
				/>
			)}

			{events.length === 0 ? (
				<div className="glass-panel mx-5 mb-4 rounded-2xl p-6 text-center">
					<p className="text-[12px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
						Aucun événement pour le moment. Créez le premier !
					</p>
				</div>
			) : (
				events.map((e) => <EventCard key={e.id} event={e} onJoin={handleJoin} />)
			)}
		</>
	);
}

// ─── Michelin Lab (tirages au sort) ───────────────────────────────────────────

function TrialCard({ trial, onEnter }: { trial: TireTrialOut; onEnter: (id: number) => void }) {
	const statusLabel =
		trial.status === 'open'
			? 'Inscriptions ouvertes'
			: trial.status === 'closed'
				? 'Inscriptions closes'
				: 'Tirage effectué';
	const statusColor =
		trial.status === 'open' ? COLORS.achieved : trial.status === 'closed' ? COLORS.warning : COLORS.gray50;
	const statusBg =
		trial.status === 'open' ? COLORS.achievedLight : trial.status === 'closed' ? COLORS.warningLight : COLORS.gray05;

	return (
		<div className="glass-panel mx-5 mb-4 overflow-hidden rounded-2xl p-4">
			<div className="mb-2 flex items-start justify-between gap-2">
				<div className="flex items-center gap-2">
					<Dice5 size={14} color={COLORS.blue} />
					<h3 className="text-[14px] leading-tight font-bold" style={{ color: COLORS.heading, fontFamily: FONTS.body }}>
						{trial.tire_name}
					</h3>
				</div>
				<span
					className="flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
					style={{ background: statusBg, color: statusColor, fontFamily: FONTS.title }}
				>
					{statusLabel}
				</span>
			</div>

			<p className="mb-3 text-[11px] leading-snug" style={{ color: COLORS.grayDark, fontFamily: FONTS.body }}>
				{trial.description}
			</p>

			<div className="mb-3 flex flex-wrap items-center gap-3">
				{trial.target_profile && (
					<span
						className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase"
						style={{ background: COLORS.startLight, color: COLORS.blue, fontFamily: FONTS.title }}
					>
						{trial.target_profile}
					</span>
				)}
				<div className="flex items-center gap-1">
					<Calendar size={11} color={COLORS.blue} />
					<span className="text-[10px]" style={{ color: COLORS.gray50, fontFamily: FONTS.mono }}>
						Tirage le {new Date(trial.draw_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
					</span>
				</div>
				<span className="text-[10px]" style={{ color: COLORS.gray50, fontFamily: FONTS.mono }}>
					{trial.entries_count} candidat{trial.entries_count > 1 ? 's' : ''} · {trial.slots} place
					{trial.slots > 1 ? 's' : ''}
				</span>
			</div>

			{trial.preorder_discount_pct && (
				<div className="mb-3 flex items-center gap-1.5">
					<Gift size={11} color="#FFC861" />
					<span className="text-[10px] font-semibold" style={{ color: '#FFD79A', fontFamily: FONTS.body }}>
						-{trial.preorder_discount_pct}% en pré-commande pour les gagnants
					</span>
				</div>
			)}

			{trial.won ? (
				<div
					className="w-full rounded-xl py-2.5 text-center text-[11px] font-bold tracking-wider uppercase"
					style={{ background: COLORS.achievedLight, color: COLORS.achieved, fontFamily: FONTS.title }}
				>
					🎉 Gagné — testez ce pneu en avant-première
				</div>
			) : trial.entered ? (
				<div
					className="w-full rounded-xl py-2.5 text-center text-[11px] font-bold tracking-wider uppercase"
					style={{ background: COLORS.gray05, color: COLORS.gray50, fontFamily: FONTS.title }}
				>
					{trial.status === 'drawn' ? 'Tirage effectué — non sélectionné' : 'Candidature envoyée'}
				</div>
			) : (
				<button
					onClick={() => onEnter(trial.id)}
					disabled={trial.status !== 'open'}
					className="w-full rounded-xl py-2.5 text-[11px] font-bold tracking-wider uppercase transition-opacity disabled:opacity-40"
					style={{ background: COLORS.blue, color: COLORS.white, fontFamily: FONTS.title }}
				>
					Participer au tirage
				</button>
			)}
		</div>
	);
}

function LabTab() {
	const [trials, setTrials] = useState<TireTrialOut[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		labApi
			.listTrials()
			.then(setTrials)
			.catch(console.error)
			.finally(() => setLoading(false));
	}, []);

	async function handleEnter(id: number) {
		try {
			const updated = await labApi.enter(id);
			setTrials((prev) => prev.map((t) => (t.id === id ? updated : t)));
		} catch (e) {
			console.error(e);
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<div
					className="h-8 w-8 animate-spin rounded-full border-2"
					style={{ borderColor: COLORS.blue, borderTopColor: 'transparent' }}
				/>
			</div>
		);
	}

	return (
		<>
			<div
				className="mx-5 mb-4 flex items-center gap-2 rounded-xl px-3 py-2.5"
				style={{ background: 'rgba(92,141,246,0.12)', border: `1px solid ${COLORS.glassBorder}` }}
			>
				<Sparkle size={13} color={COLORS.blue} />
				<p className="text-[10px] leading-snug" style={{ color: COLORS.blue, fontFamily: FONTS.body }}>
					Testez en exclusivité des prototypes Michelin pas encore commercialisés.
				</p>
			</div>

			{trials.length === 0 ? (
				<div className="glass-panel mx-5 mb-4 rounded-2xl p-6 text-center">
					<p className="text-[12px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
						Aucun tirage au sort en cours.
					</p>
				</div>
			) : (
				trials.map((t) => <TrialCard key={t.id} trial={t} onEnter={handleEnter} />)
			)}
		</>
	);
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export function ChallengesScreen() {
	const [tab, setTab] = useState<ChallengesTab>('defis');
	const [activeChallenge, setActiveChallenge] = useState<ChallengeOut | null>(null);
	const [pastChallenges, setPastChallenges] = useState<ChallengeOut[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		Promise.all([challengesApi.getActive(), challengesApi.getPast()])
			.then(([active, past]) => {
				setActiveChallenge(active[0] ?? null);
				setPastChallenges(past);
			})
			.catch(console.error)
			.finally(() => setLoading(false));
	}, []);

	return (
		<div className="flex h-full flex-col" style={{ background: COLORS.bgGradient }}>
			<AppHeader showLiveEvent />

			<div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
				{/* Section title */}
				<div className="px-5 pt-5 pb-2">
					<div className="mb-1 flex items-center gap-2">
						<Flame size={12} color={COLORS.warning} />
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
						ENDURANCE CHALLENGES
					</h1>
				</div>

				<div className="pt-3">
					<TabBar active={tab} onChange={setTab} />
				</div>

				{tab === 'defis' &&
					(loading ? (
						<div className="flex items-center justify-center py-20">
							<div
								className="h-8 w-8 animate-spin rounded-full border-2"
								style={{ borderColor: COLORS.blue, borderTopColor: 'transparent' }}
							/>
						</div>
					) : (
						<>
							<ActiveChallengeBanner challenge={activeChallenge} />
							<Leaderboard activeChallenge={activeChallenge} />
							<BadgesWall challenges={pastChallenges} />
							<PastChallengesHistory challenges={pastChallenges} />
						</>
					))}

				{tab === 'evenements' && <EventsTab />}
				{tab === 'lab' && <LabTab />}
			</div>
		</div>
	);
}
