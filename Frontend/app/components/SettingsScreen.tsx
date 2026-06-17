'use client';

import { useState, useEffect } from 'react';

import { ChevronRight, Settings, Shield, Info, Loader, LogOut, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { settingsApi, authApi } from '@/app/lib/api';
import type { StravaOut } from '@/app/lib/api';
import { useAuth } from '@/app/lib/auth-context';
import { COLORS, FONTS } from '@/app/lib/constants';

import { AppFooter } from './ui/AppFooter';

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
	return (
		<div className="px-5 pt-4 pb-2">
			<span
				className="text-[10px] font-bold tracking-widest uppercase"
				style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
			>
				{label}
			</span>
		</div>
	);
}

function SettingRow({
	icon,
	label,
	description,
	right,
}: {
	icon: React.ReactNode;
	label: string;
	description?: string;
	right: React.ReactNode;
}) {
	return (
		<div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: `1px solid ${COLORS.gray05}` }}>
			<div
				className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
				style={{ background: COLORS.gray05 }}
			>
				{icon}
			</div>
			<div className="min-w-0 flex-1">
				<div className="text-[13px] font-semibold" style={{ color: COLORS.heading, fontFamily: FONTS.body }}>
					{label}
				</div>
				{description && (
					<div className="mt-0.5 text-[10px] leading-relaxed" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
						{description}
					</div>
				)}
			</div>
			{right}
		</div>
	);
}

// ─── Strava section ──────────────────────────────────────────────────────────

function StravaSection({ onNavigate }: { onNavigate: (screen: string) => void }) {
	const [strava, setStrava] = useState<StravaOut | null>(null);
	const [loading, setLoading] = useState(true);
	const [acting, setActing] = useState(false);
	const [syncMessage, setSyncMessage] = useState<string | null>(null);

	useEffect(() => {
		settingsApi
			.getStrava()
			.then(setStrava)
			.catch(console.error)
			.finally(() => setLoading(false));
	}, []);

	const handleConnect = async () => {
		setActing(true);
		try {
			const { authorize_url } = await settingsApi.getStravaAuthorizeUrl();
			window.location.href = authorize_url;
		} catch {
			setActing(false);
		}
	};

	const handleSync = async () => {
		setActing(true);
		setSyncMessage(null);
		try {
			const result = await settingsApi.syncStrava();
			setStrava(await settingsApi.getStrava());
			setSyncMessage(`${result.imported} nouvelle(s) sortie(s) importée(s)`);
		} catch {
			setSyncMessage('Synchronisation impossible pour le moment.');
		} finally {
			setActing(false);
		}
	};

	if (loading) {
		return (
			<div className="glass-panel mx-5 mb-4 flex items-center justify-center rounded-2xl p-4">
				<Loader size={16} color={COLORS.gray40} className="animate-spin" />
			</div>
		);
	}

	const connected = strava?.connected ?? false;

	return (
		<div className="glass-panel mx-5 mb-4 overflow-hidden rounded-2xl">
			<SettingRow
				icon={<div className="h-4 w-4 rounded-full" style={{ background: '#FC4C02' }} />}
				label="Strava"
				description={
					connected
						? strava?.athlete_name
							? `Connecté en tant que ${strava.athlete_name}`
							: 'Synchronisation automatique activée'
						: 'Non connecté'
				}
				right={
					connected ? (
						<div className="flex items-center gap-1">
							<div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#34D399]" />
							<span className="text-[10px] font-semibold" style={{ color: '#34D399', fontFamily: FONTS.title }}>
								Connecté
							</span>
						</div>
					) : (
						<span className="text-[10px] font-semibold" style={{ color: COLORS.gray40, fontFamily: FONTS.title }}>
							Déconnecté
						</span>
					)
				}
			/>
			<div className="flex flex-col gap-2 px-4 py-3" style={{ borderTop: `1px solid ${COLORS.gray05}` }}>
				{connected ? (
					<button
						onClick={handleSync}
						disabled={acting}
						className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-[11px] font-bold tracking-wider uppercase transition-all"
						style={{
							background: 'rgba(92,141,246,0.12)',
							color: COLORS.blue,
							fontFamily: FONTS.title,
							border: `1px solid ${COLORS.glassBorder}`,
							opacity: acting ? 0.6 : 1,
						}}
					>
						{acting && <Loader size={12} className="animate-spin" />}
						Synchroniser mes sorties vélo
					</button>
				) : null}
				{connected && (
					<button
						onClick={() => onNavigate('strava-clubs')}
						className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-[11px] font-bold tracking-wider uppercase transition-all"
						style={{
							background: COLORS.gray05,
							color: COLORS.heading,
							fontFamily: FONTS.title,
							border: `1px solid ${COLORS.glassBorder}`,
						}}
					>
						<Users size={12} />
						Voir mes clubs &amp; inviter des amis
					</button>
				)}
				{!connected && (
					<button
						onClick={handleConnect}
						disabled={acting}
						className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-[11px] font-bold tracking-wider uppercase transition-all"
						style={{
							background: COLORS.yellow,
							color: COLORS.onGold,
							fontFamily: FONTS.title,
							border: '1px solid transparent',
							opacity: acting ? 0.6 : 1,
						}}
					>
						{acting && <Loader size={12} className="animate-spin" />}
						Connecter avec Strava
					</button>
				)}
				{syncMessage && (
					<p className="text-center text-[10px]" style={{ color: COLORS.gray50, fontFamily: FONTS.body }}>
						{syncMessage}
					</p>
				)}
			</div>
		</div>
	);
}

// ─── Déconnexion ──────────────────────────────────────────────────────────────

function LogoutSection() {
	const router = useRouter();
	const { setUser } = useAuth();
	const [loggingOut, setLoggingOut] = useState(false);

	const handleLogout = async () => {
		setLoggingOut(true);
		try {
			await authApi.logout();
		} finally {
			// Le jeton est effacé côté client/serveur, mais le contexte gardait
			// encore l'utilisateur en mémoire : sans ça, /login le voit toujours
			// "connecté" et nous renvoie aussitôt dans l'appli.
			setUser(null);
			router.push('/login');
		}
	};

	return (
		<div className="mx-5 mb-4">
			<button
				onClick={handleLogout}
				disabled={loggingOut}
				className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[12px] font-bold tracking-wider uppercase transition-all"
				style={{
					background: COLORS.dangerLight,
					color: COLORS.danger,
					fontFamily: FONTS.title,
					border: `1px solid ${COLORS.dangerDark}`,
					opacity: loggingOut ? 0.6 : 1,
				}}
			>
				{loggingOut ? <Loader size={14} className="animate-spin" /> : <LogOut size={14} />}
				{loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
			</button>
		</div>
	);
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export function SettingsScreen() {
	const router = useRouter();

	return (
		<div className="flex h-full flex-col" style={{ background: COLORS.bgGradient }}>
			<div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
				{/* Header */}
				<div className="px-5 pt-5 pb-4">
					<div className="mb-1 flex items-center gap-2">
						<Settings size={12} color={COLORS.warning} />
						<p
							className="text-[10px] tracking-widest uppercase"
							style={{ color: COLORS.gray50, fontFamily: FONTS.title }}
						>
							Application
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
						Paramètres
					</h1>
				</div>

				{/* Strava */}
				<SectionHeader label="Intégrations" />
				<StravaSection onNavigate={(screen) => router.push(`/${screen}`)} />

				{/* À propos */}
				<SectionHeader label="À propos" />
				<div className="glass-panel mx-5 mb-4 overflow-hidden rounded-2xl">
					<SettingRow
						icon={<Info size={15} color={COLORS.gray50} />}
						label="Version"
						right={
							<span className="text-[11px]" style={{ color: COLORS.gray40, fontFamily: FONTS.mono }}>
								v1.0.0
							</span>
						}
					/>
					<SettingRow
						icon={<Shield size={15} color={COLORS.gray50} />}
						label="Confidentialité & CGU"
						right={<ChevronRight size={14} color={COLORS.gray40} />}
					/>
				</div>

				{/* Compte */}
				<SectionHeader label="Compte" />
				<LogoutSection />

				{/* Michelin branding */}
				<div className="flex items-center gap-2 px-5 pb-2">
					<div
						className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm"
						style={{ background: COLORS.blue }}
					>
						<svg width="11" height="9" viewBox="0 0 18 14" fill="none">
							<path
								d="M1 13V1L5 9L9 1L13 9L17 1V13"
								stroke="white"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</div>
					<span className="text-[10px]" style={{ color: COLORS.gray40, fontFamily: FONTS.title }}>
						MICHELIN RaceLab © 2026
					</span>
				</div>

				<AppFooter />
			</div>
		</div>
	);
}
