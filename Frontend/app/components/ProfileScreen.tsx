'use client';

import { useState, useEffect } from 'react';

import {
	User,
	MapPin,
	Bike,
	Activity,
	Calendar,
	Zap,
	Check,
	X,
	Pencil,
	Loader,
	Mail,
	Weight,
	Ruler,
	Settings,
	Target,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { userApi, ridesApi } from '@/app/lib/api';
import type { UserOut, StatsOut, RideOut, BikeOut } from '@/app/lib/api';
import { COLORS, FONTS } from '@/app/lib/constants';

import { AppHeader } from './ui/AppHeader';
import { PassportSection } from './PassportCard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDuration(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	return `${h}h${String(m).padStart(2, '0')}`;
}

function fmtDate(iso: string): string {
	if (typeof window === 'undefined') return '';
	const d = new Date(iso);
	const now = new Date();
	const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
	if (diffDays === 0) return "Aujourd'hui";
	if (diffDays === 1) return 'Hier';
	return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function fmtMemberSince(iso: string): string {
	return new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

/** Génère 1 ou 2 initiales à partir d'un nom complet */
function initials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 0 || parts[0] === '') return '?';
	if (parts.length === 1) return parts[0][0].toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Inline input style ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
	width: '100%',
	padding: '8px 10px',
	borderRadius: '10px',
	border: `1px solid ${COLORS.gray20}`,
	fontSize: '13px',
	fontFamily: FONTS.body,
	color: COLORS.heading,
	background: COLORS.gray05,
	outline: 'none',
};

// ─── ProfileHero ─────────────────────────────────────────────────────────────

function ProfileHero({ user, onUpdateUser }: { user: UserOut | null; onUpdateUser: (u: UserOut) => void }) {
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState({ name: '', username: '', city: '' });

	const name = user?.name ?? '—';
	const username = user?.username ?? '';
	const city = user?.city ?? '';
	const levelProgress = user?.level_progress ?? 0;
	const memberSince = user?.member_since ? fmtMemberSince(user.member_since) : '—';
	const avatarUrl = user?.avatar_url;

	const openEdit = () => {
		setForm({ name: user?.name ?? '', username: user?.username ?? '', city: user?.city ?? '' });
		setEditing(true);
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			const updated = await userApi.patchMe(form);
			onUpdateUser(updated);
			setEditing(false);
		} catch (e) {
			console.error(e);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div
			className="mx-5 mb-4 overflow-hidden rounded-2xl"
			style={{
				background: `linear-gradient(135deg, ${COLORS.blueDark} 0%, ${COLORS.blue} 100%)`,
				border: '1px solid rgba(255,255,255,0.12)',
				boxShadow: `0 12px 32px rgba(0,32,91,0.28), 0 1px 0 rgba(255,255,255,0.15) inset`,
			}}
		>
			<div className="p-5">
				<div className="flex items-start gap-4">
					{/* Photo Strava si disponible, sinon avatar générique avec initiales */}
					{avatarUrl ? (
						<img
							src={avatarUrl}
							alt={name}
							className="h-16 w-16 flex-shrink-0 rounded-2xl object-cover select-none"
							style={{ border: '2px solid rgba(255,255,255,0.3)' }}
							onError={(e) => {
								// Photo Strava parfois temporairement inaccessible : on retombe
								// sur les initiales plutôt que de casser le layout.
								(e.currentTarget as HTMLImageElement).style.display = 'none';
							}}
						/>
					) : (
						<div
							className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl select-none"
							style={{
								background: COLORS.yellow,
								border: '2px solid rgba(255,255,255,0.3)',
								fontSize: '22px',
								fontWeight: 900,
								color: COLORS.heading,
								fontFamily: FONTS.title,
								letterSpacing: '0.04em',
							}}
						>
							{initials(name)}
						</div>
					)}

					{/* Infos ou formulaire */}
					<div className="min-w-0 flex-1">
						{editing ? (
							<div className="flex flex-col gap-2">
								<input
									style={{ ...inputStyle }}
									placeholder="Nom complet"
									value={form.name}
									onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
								/>
								<input
									style={{ ...inputStyle }}
									placeholder="Nom d'utilisateur"
									value={form.username}
									onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
								/>
								<input
									style={{ ...inputStyle }}
									placeholder="Ville"
									value={form.city}
									onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
								/>
								<div className="mt-1 flex gap-2">
									<button
										onClick={handleSave}
										disabled={saving}
										className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all"
										style={{ background: COLORS.yellow, color: COLORS.onGold, fontFamily: FONTS.title }}
									>
										{saving ? <Loader size={11} className="animate-spin" /> : <Check size={11} />}
										Enregistrer
									</button>
									<button
										onClick={() => setEditing(false)}
										disabled={saving}
										className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all"
										style={{
											background: 'rgba(255,255,255,0.15)',
											color: 'rgba(255,255,255,0.9)',
											fontFamily: FONTS.title,
										}}
									>
										<X size={11} />
										Annuler
									</button>
								</div>
							</div>
						) : (
							<>
								<div className="flex items-center gap-2">
									<h2 className="text-[18px] leading-tight font-black text-white" style={{ fontFamily: FONTS.title }}>
										{name}
									</h2>
									<button
										onClick={openEdit}
										className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
										style={{ background: 'rgba(255,255,255,0.15)' }}
										title="Modifier mes infos"
									>
										<Pencil size={10} color="rgba(255,255,255,0.9)" />
									</button>
								</div>
								<div className="mt-0.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.body }}>
									@{username}
								</div>
								{city && (
									<div className="mt-1 flex items-center gap-1">
										<MapPin size={9} color="rgba(255,255,255,0.5)" />
										<span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.body }}>
											{city}
										</span>
									</div>
								)}
							</>
						)}
					</div>
				</div>

				{!editing && (
					<div className="mt-4">
						<div className="mb-1.5 flex items-center justify-between">
							<span
								className="text-[9px] font-bold tracking-widest uppercase"
								style={{ color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.title }}
							>
								Progression niveau
							</span>
							<span className="text-[11px] font-bold" style={{ color: COLORS.yellow, fontFamily: FONTS.mono }}>
								{levelProgress}%
							</span>
						</div>
						<div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
							<div
								className="h-full rounded-full transition-all duration-700"
								style={{ width: `${Math.max(0, Math.min(100, levelProgress))}%`, background: COLORS.yellow }}
							/>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

// ─── BikeCard ────────────────────────────────────────────────────────────────

function BikeCard({ user, onUpdateBike }: { user: UserOut | null; onUpdateBike: (b: BikeOut) => void }) {
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const bike = user?.bike;
	const [form, setForm] = useState({
		brand: '',
		model: '',
		year: '',
	});

	const openEdit = () => {
		setForm({
			brand: bike?.brand ?? '',
			model: bike?.model ?? '',
			year: String(bike?.year ?? new Date().getFullYear()),
		});
		setEditing(true);
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			const updated = await userApi.patchBike({
				brand: form.brand || undefined,
				model: form.model || undefined,
				year: form.year ? Number(form.year) : undefined,
			});
			onUpdateBike(updated);
			setEditing(false);
		} catch (e) {
			console.error(e);
		} finally {
			setSaving(false);
		}
	};

	const bikeColor = COLORS.blue;

	return (
		<div className="glass-panel mx-5 mb-4 rounded-2xl p-4">
			<div className="mb-3 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Bike size={13} color={COLORS.blue} />
					<span
						className="text-[12px] font-bold tracking-widest uppercase"
						style={{ color: COLORS.blue, fontFamily: FONTS.title }}
					>
						Mon Vélo
					</span>
				</div>
				{!editing && (
					<button
						onClick={openEdit}
						className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold"
						style={{ background: COLORS.gray05, color: COLORS.blue, fontFamily: FONTS.title }}
					>
						<Pencil size={9} />
						Modifier
					</button>
				)}
			</div>

			{editing ? (
				<div className="flex flex-col gap-2.5">
					<div className="grid grid-cols-2 gap-2">
						<div>
							<label
								className="mb-1 block text-[9px] font-bold tracking-widest uppercase"
								style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
							>
								Marque
							</label>
							<input
								style={inputStyle}
								placeholder="Trek, Canyon…"
								value={form.brand}
								onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
							/>
						</div>
						<div>
							<label
								className="mb-1 block text-[9px] font-bold tracking-widest uppercase"
								style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
							>
								Modèle
							</label>
							<input
								style={inputStyle}
								placeholder="Domane, CF SL…"
								value={form.model}
								onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
							/>
						</div>
					</div>
					<div>
						<label
							className="mb-1 block text-[9px] font-bold tracking-widest uppercase"
							style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
						>
							Année
						</label>
						<input
							style={inputStyle}
							type="number"
							placeholder="2023"
							value={form.year}
							onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
						/>
					</div>

					<div className="mt-1 flex gap-2">
						<button
							onClick={handleSave}
							disabled={saving}
							className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold"
							style={{ background: COLORS.blue, color: 'white', fontFamily: FONTS.title }}
						>
							{saving ? <Loader size={11} className="animate-spin" /> : <Check size={11} />}
							Enregistrer
						</button>
						<button
							onClick={() => setEditing(false)}
							disabled={saving}
							className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold"
							style={{ background: COLORS.gray10, color: COLORS.grayDark, fontFamily: FONTS.title }}
						>
							<X size={11} />
							Annuler
						</button>
					</div>
				</div>
			) : (
				<div className="flex items-center gap-4">
					{/* Icône vélo colorée */}
					<div
						className="flex h-14 w-16 flex-shrink-0 items-center justify-center rounded-xl"
						style={{ background: COLORS.gray05 }}
					>
						<svg viewBox="0 0 60 40" width="52" height="36" fill="none" stroke={bikeColor} strokeWidth="2.5">
							<circle cx="12" cy="28" r="9" />
							<circle cx="12" cy="28" r="6" />
							<circle cx="12" cy="28" r="1.5" fill={bikeColor} />
							<circle cx="48" cy="28" r="9" />
							<circle cx="48" cy="28" r="6" />
							<circle cx="48" cy="28" r="1.5" fill={bikeColor} />
							<line x1="12" y1="28" x2="26" y2="12" />
							<line x1="26" y1="12" x2="40" y2="28" />
							<line x1="26" y1="12" x2="30" y2="28" />
							<line x1="30" y1="28" x2="40" y2="28" />
							<line x1="30" y1="28" x2="48" y2="28" />
							<line x1="40" y1="13" x2="44" y2="13" />
							<line x1="40" y1="13" x2="40" y2="28" />
						</svg>
					</div>

					<div>
						<div className="text-[15px] font-black" style={{ color: COLORS.heading, fontFamily: FONTS.title }}>
							{bike ? `${bike.brand} ${bike.model}` : '—'}
						</div>
						{bike && (
							<div className="mt-0.5 text-[11px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
								Millésime {bike.year}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

// ─── PhysicalInfoCard ──────────────────────────────────────────────────────────

function PhysicalInfoCard({ user, onUpdateUser }: { user: UserOut | null; onUpdateUser: (u: UserOut) => void }) {
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [form, setForm] = useState({ weight_kg: '', height_cm: '' });

	const openEdit = () => {
		setForm({
			weight_kg: user?.weight_kg != null ? String(user.weight_kg) : '',
			height_cm: user?.height_cm != null ? String(user.height_cm) : '',
		});
		setError(null);
		setEditing(true);
	};

	const handleSave = async () => {
		const weight = Number(form.weight_kg);
		const height = Number(form.height_cm);
		if (!weight || weight < 30 || weight > 250) {
			setError('Poids invalide (entre 30 et 250 kg).');
			return;
		}
		if (!height || height < 100 || height > 230) {
			setError('Taille invalide (entre 100 et 230 cm).');
			return;
		}
		setError(null);
		setSaving(true);
		try {
			const updated = await userApi.patchMe({ weight_kg: weight, height_cm: height });
			onUpdateUser(updated);
			setEditing(false);
		} catch (e) {
			console.error(e);
			setError("Impossible d'enregistrer ces informations.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="glass-panel mx-5 mb-4 rounded-2xl p-4">
			<div className="mb-3 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<User size={13} color={COLORS.blue} />
					<span
						className="text-[12px] font-bold tracking-widest uppercase"
						style={{ color: COLORS.blue, fontFamily: FONTS.title }}
					>
						Mes informations
					</span>
				</div>
				{!editing && (
					<button
						onClick={openEdit}
						className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold"
						style={{ background: COLORS.gray05, color: COLORS.blue, fontFamily: FONTS.title }}
					>
						<Pencil size={9} />
						Modifier
					</button>
				)}
			</div>

			{editing ? (
				<div className="flex flex-col gap-2.5">
					<div className="grid grid-cols-2 gap-2">
						<div>
							<label
								className="mb-1 block text-[9px] font-bold tracking-widest uppercase"
								style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
							>
								Poids (kg)
							</label>
							<input
								style={inputStyle}
								type="number"
								placeholder="75"
								value={form.weight_kg}
								onChange={(e) => setForm((f) => ({ ...f, weight_kg: e.target.value }))}
							/>
						</div>
						<div>
							<label
								className="mb-1 block text-[9px] font-bold tracking-widest uppercase"
								style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
							>
								Taille (cm)
							</label>
							<input
								style={inputStyle}
								type="number"
								placeholder="180"
								value={form.height_cm}
								onChange={(e) => setForm((f) => ({ ...f, height_cm: e.target.value }))}
							/>
						</div>
					</div>
					{error && (
						<div className="text-[10px] font-semibold" style={{ color: COLORS.danger, fontFamily: FONTS.body }}>
							{error}
						</div>
					)}
					<div className="mt-1 flex gap-2">
						<button
							onClick={handleSave}
							disabled={saving}
							className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold"
							style={{ background: COLORS.blue, color: 'white', fontFamily: FONTS.title }}
						>
							{saving ? <Loader size={11} className="animate-spin" /> : <Check size={11} />}
							Enregistrer
						</button>
						<button
							onClick={() => setEditing(false)}
							disabled={saving}
							className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold"
							style={{ background: COLORS.gray10, color: COLORS.grayDark, fontFamily: FONTS.title }}
						>
							<X size={11} />
							Annuler
						</button>
					</div>
				</div>
			) : (
				<div className="grid grid-cols-3 gap-3">
					<div className="flex items-center gap-2">
						<div
							className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
							style={{ background: COLORS.gray05 }}
						>
							<Mail size={13} color={COLORS.blue} />
						</div>
						<div className="min-w-0">
							<div className="text-[9px] tracking-widest uppercase" style={{ color: COLORS.gray40, fontFamily: FONTS.title }}>
								Email
							</div>
							<div className="truncate text-[11px] font-semibold" style={{ color: COLORS.heading, fontFamily: FONTS.body }}>
								{user?.email ?? '—'}
							</div>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<div
							className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
							style={{ background: COLORS.gray05 }}
						>
							<Weight size={13} color={COLORS.blue} />
						</div>
						<div className="min-w-0">
							<div className="text-[9px] tracking-widest uppercase" style={{ color: COLORS.gray40, fontFamily: FONTS.title }}>
								Poids
							</div>
							<div className="text-[11px] font-semibold" style={{ color: COLORS.heading, fontFamily: FONTS.body }}>
								{user?.weight_kg != null ? `${user.weight_kg} kg` : '—'}
							</div>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<div
							className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
							style={{ background: COLORS.gray05 }}
						>
							<Ruler size={13} color={COLORS.blue} />
						</div>
						<div className="min-w-0">
							<div className="text-[9px] tracking-widest uppercase" style={{ color: COLORS.gray40, fontFamily: FONTS.title }}>
								Taille
							</div>
							<div className="text-[11px] font-semibold" style={{ color: COLORS.heading, fontFamily: FONTS.body }}>
								{user?.height_cm != null ? `${user.height_cm} cm` : '—'}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// ─── GoalCard ────────────────────────────────────────────────────────────────

function GoalCard({ user, stats, onUpdateUser }: { user: UserOut | null; stats: StatsOut | null; onUpdateUser: (u: UserOut) => void }) {
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [form, setForm] = useState({ goal_km: '' });

	const totalKm = stats?.total_km ?? 0;
	const goalKm = user?.goal_km ?? null;
	const goalReached = !!goalKm && totalKm >= goalKm;

	const openEdit = () => {
		setForm({ goal_km: goalKm != null ? String(goalKm) : '' });
		setError(null);
		setEditing(true);
	};

	const handleSave = async () => {
		const goal = Number(form.goal_km);
		if (!goal || goal < 1) {
			setError('Objectif invalide (supérieur à 0 km).');
			return;
		}
		setError(null);
		setSaving(true);
		try {
			const updated = await userApi.patchMe({ goal_km: goal });
			onUpdateUser(updated);
			setEditing(false);
		} catch (e) {
			console.error(e);
			setError("Impossible d'enregistrer cet objectif.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="glass-panel mx-5 mb-4 rounded-2xl p-4">
			<div className="mb-3 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Target size={13} color={COLORS.blue} />
					<span
						className="text-[12px] font-bold tracking-widest uppercase"
						style={{ color: COLORS.blue, fontFamily: FONTS.title }}
					>
						Mon Objectif
					</span>
				</div>
				{!editing && (
					<button
						onClick={openEdit}
						className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold"
						style={{ background: COLORS.gray05, color: COLORS.blue, fontFamily: FONTS.title }}
					>
						<Pencil size={9} />
						{goalKm != null ? 'Modifier' : 'Définir'}
					</button>
				)}
			</div>

			{editing ? (
				<div className="flex flex-col gap-2.5">
					<div>
						<label
							className="mb-1 block text-[9px] font-bold tracking-widest uppercase"
							style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
						>
							Objectif (km)
						</label>
						<input
							style={inputStyle}
							type="number"
							placeholder="1000"
							value={form.goal_km}
							onChange={(e) => setForm({ goal_km: e.target.value })}
						/>
					</div>
					{error && (
						<div className="text-[10px] font-semibold" style={{ color: COLORS.danger, fontFamily: FONTS.body }}>
							{error}
						</div>
					)}
					<div className="mt-1 flex gap-2">
						<button
							onClick={handleSave}
							disabled={saving}
							className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold"
							style={{ background: COLORS.blue, color: 'white', fontFamily: FONTS.title }}
						>
							{saving ? <Loader size={11} className="animate-spin" /> : <Check size={11} />}
							Enregistrer
						</button>
						<button
							onClick={() => setEditing(false)}
							disabled={saving}
							className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold"
							style={{ background: COLORS.gray10, color: COLORS.grayDark, fontFamily: FONTS.title }}
						>
							<X size={11} />
							Annuler
						</button>
					</div>
				</div>
			) : goalKm != null ? (
				<div>
					<div className="mb-2 flex items-end justify-between">
						<span className="text-[18px] leading-none font-black" style={{ color: COLORS.heading, fontFamily: FONTS.mono }}>
							{Math.round(totalKm).toLocaleString('fr-FR')}{' '}
							<span className="text-[12px] font-semibold" style={{ color: COLORS.gray50 }}>
								/ {goalKm.toLocaleString('fr-FR')} km
							</span>
						</span>
					</div>
					<div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: COLORS.gray10 }}>
						<div
							className="h-full rounded-full"
							style={{ width: `${Math.min(100, (totalKm / goalKm) * 100)}%`, background: goalReached ? COLORS.yellow : COLORS.blue }}
						/>
					</div>
					{goalReached && (
						<div className="mt-2 text-[11px] font-semibold" style={{ color: COLORS.yellow, fontFamily: FONTS.body }}>
							Objectif atteint ! Augmente-le pour continuer à progresser.
						</div>
					)}
				</div>
			) : (
				<div className="text-[11px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
					Aucun objectif défini. Fixe-toi un cap pour suivre ta progression.
				</div>
			)}
		</div>
	);
}

// ─── StatsGrid ────────────────────────────────────────────────────────────────

function StatsGrid({ stats }: { stats: StatsOut | null }) {
	const items = [
		{
			label: 'Km totaux',
			value: stats ? Math.round(stats.total_km).toLocaleString('fr-FR') : '—',
			unit: 'km',
			icon: <Activity size={14} color={COLORS.blue} />,
			accent: false,
		},
		{
			label: 'Sorties',
			value: stats ? String(stats.total_rides) : '—',
			unit: 'rides',
			icon: <Calendar size={14} color={COLORS.blue} />,
			accent: false,
		},
		{
			label: 'Challenges',
			value: stats ? String(stats.completed_challenges) : '—',
			unit: 'complétés',
			icon: <Zap size={14} color={COLORS.yellow} />,
			accent: true,
		},
		{
			label: 'Dénivelé',
			value: stats ? stats.total_elevation.toLocaleString('fr-FR') : '—',
			unit: 'm D+',
			icon: <MapPin size={14} color={COLORS.blue} />,
			accent: false,
		},
	];

	return (
		<div className="mx-5 mb-4 grid grid-cols-2 gap-3">
			{items.map((stat) => (
				<div
					key={stat.label}
					className="glass-panel rounded-2xl p-3.5"
					style={stat.accent ? { border: '1px solid rgba(255,200,0,0.3)' } : undefined}
				>
					<div className="mb-1.5 flex items-center gap-1.5">
						{stat.icon}
						<span
							className="text-[9px] tracking-widest uppercase"
							style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
						>
							{stat.label}
						</span>
					</div>
					<div
						className="text-[18px] leading-none font-black"
						style={{ color: stat.accent ? COLORS.yellow : COLORS.heading, fontFamily: FONTS.mono }}
					>
						{stat.value}
					</div>
					<div className="mt-0.5 text-[9px]" style={{ color: COLORS.gray40, fontFamily: FONTS.body }}>
						{stat.unit}
					</div>
				</div>
			))}
		</div>
	);
}

// ─── RecentRides ─────────────────────────────────────────────────────────────

function RecentRides({ rides }: { rides: RideOut[] }) {
	return (
		<div className="glass-panel mx-5 mb-4 overflow-hidden rounded-2xl">
			<div
				className="flex items-center justify-between px-4 py-3"
				style={{ borderBottom: `1px solid ${COLORS.gray10}` }}
			>
				<div className="flex items-center gap-2">
					<Activity size={13} color={COLORS.blue} />
					<span
						className="text-[12px] font-bold tracking-widest uppercase"
						style={{ color: COLORS.blue, fontFamily: FONTS.title }}
					>
						Dernières sorties
					</span>
				</div>
				<div
					className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold"
					style={{ background: COLORS.successLight, color: COLORS.success, fontFamily: FONTS.title }}
				>
					<div className="h-1 w-1 rounded-full" style={{ background: COLORS.success }} />
					Strava
				</div>
			</div>

			{rides.length === 0 ? (
				<div className="px-4 py-6 text-center text-[12px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
					Aucune sortie récente
				</div>
			) : (
				rides.map((ride, i) => (
					<div
						key={ride.id}
						className="flex items-center gap-3 px-4 py-3"
						style={{ borderBottom: i < rides.length - 1 ? `1px solid ${COLORS.gray05}` : 'none' }}
					>
						<div
							className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
							style={{ background: COLORS.gray05 }}
						>
							<Bike size={14} color={COLORS.blue} />
						</div>
						<div className="min-w-0 flex-1">
							<div
								className="truncate text-[12px] font-semibold"
								style={{ color: COLORS.heading, fontFamily: FONTS.body }}
							>
								{ride.name}
							</div>
							<div className="mt-0.5 text-[10px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
								{fmtDate(ride.date)} · {fmtDuration(ride.duration_seconds)} · {ride.avg_speed.toFixed(1)} km/h
							</div>
						</div>
						<div className="flex-shrink-0 text-[13px] font-bold" style={{ color: COLORS.blue, fontFamily: FONTS.mono }}>
							{ride.distance_km.toFixed(1)} km
						</div>
					</div>
				))
			)}
		</div>
	);
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function ProfileScreen() {
	const router = useRouter();
	const [user, setUser] = useState<UserOut | null>(null);
	const [stats, setStats] = useState<StatsOut | null>(null);
	const [rides, setRides] = useState<RideOut[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		Promise.all([userApi.getMe(), userApi.getStats(), ridesApi.getRides({ limit: 3 })])
			.then(([u, s, r]) => {
				setUser(u);
				setStats(s);
				setRides(r);
			})
			.catch(console.error)
			.finally(() => setLoading(false));
	}, []);

	const handleUpdateUser = (u: UserOut) => setUser(u);

	const handleUpdateBike = (b: BikeOut) => {
		setUser((prev) => (prev ? { ...prev, bike: b } : prev));
	};

	return (
		<div className="flex h-full flex-col" style={{ background: COLORS.bgGradient }}>
			<div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
				<div className="flex items-start justify-between px-5 pt-5 pb-4">
					<div>
						<div className="mb-1 flex items-center gap-2">
							<User size={12} color={COLORS.warning} />
							<p
								className="text-[10px] tracking-widest uppercase"
								style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
							>
								Mon Compte
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
							Mon Profil
						</h1>
					</div>
					<button
						onClick={() => router.push('/settings')}
						aria-label="Réglages"
						className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80"
						style={{ background: COLORS.gray05, border: `1px solid ${COLORS.glassBorder}` }}
					>
						<Settings size={16} color={COLORS.blue} />
					</button>
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
						<ProfileHero user={user} onUpdateUser={handleUpdateUser} />
						<StatsGrid stats={stats} />
						<GoalCard user={user} stats={stats} onUpdateUser={handleUpdateUser} />
						<PhysicalInfoCard user={user} onUpdateUser={handleUpdateUser} />
						<BikeCard user={user} onUpdateBike={handleUpdateBike} />
						<PassportSection />
						<RecentRides rides={rides} />
					</>
				)}
			</div>
		</div>
	);
}
