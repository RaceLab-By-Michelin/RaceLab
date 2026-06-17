'use client';

import { Suspense, useEffect, useRef, useState } from 'react';

import { Loader, XCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { STRAVA_TOAST_KEY, STRAVA_TOAST_KIND_KEY } from '@/app/components/StravaToastListener';
import { settingsApi, authApi } from '@/app/lib/api';
import { useAuth } from '@/app/lib/auth-context';
import { COLORS, FONTS } from '@/app/lib/constants';

// Un code d'autorisation Strava est à usage unique : si cette page est montée
// deux fois pour le même code (Strict Mode en dev, rechargement, retour arrière…)
// le deuxième échange échoue côté Strava avec "AuthorizationCode invalid".
// On marque les codes déjà traités pour ne jamais les ré-échanger.
const EXCHANGED_KEY_PREFIX = 'strava_code_exchanged_';

// Dépose un message à afficher en popup (toast) une fois arrivé sur la page
// de destination — voir StravaToastListener, monté dans le layout racine.
function queueToast(message: string, kind: 'success' | 'error' = 'success') {
	sessionStorage.setItem(STRAVA_TOAST_KEY, message);
	sessionStorage.setItem(STRAVA_TOAST_KIND_KEY, kind);
}

// Cette page sert deux flux distincts, partagés via le même STRAVA_REDIRECT_URI :
// - state=login  → inscription/connexion directe avec Strava (utilisateur non authentifié)
// - state=settings (ou absent) → reconnexion depuis les réglages (utilisateur déjà authentifié)
// Elle vit donc EN DEHORS du groupe (app), qui exige une session existante.
//
// Pas d'écran "connexion réussie" : en cas de succès on redirige immédiatement
// et un popup (toast) s'affiche sur la page d'arrivée. Seul l'état d'erreur
// reste visible ici (l'utilisateur doit pouvoir revenir en arrière manuellement).
function StravaCallbackContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { refresh } = useAuth();
	const code = searchParams.get('code');
	const authError = searchParams.get('error');
	const isLoginFlow = searchParams.get('state') === 'login';
	const alreadyExchanged =
		!!code && typeof window !== 'undefined' && sessionStorage.getItem(EXCHANGED_KEY_PREFIX + code) === '1';
	const exchangeStarted = useRef(false);
	const backHref = isLoginFlow ? '/login' : '/settings';

	const [status, setStatus] = useState<'loading' | 'error'>(authError || !code ? 'error' : 'loading');
	const [message, setMessage] = useState(
		authError ? "Vous avez refusé l'autorisation Strava." : !code ? "Code d'autorisation manquant." : '',
	);

	// Code déjà échangé (double montage) : rien à refaire, on repart directement.
	useEffect(() => {
		if (alreadyExchanged) {
			queueToast('Compte Strava déjà connecté.');
			router.replace(backHref);
		}
	}, [alreadyExchanged, router, backHref]);

	useEffect(() => {
		if (authError || !code || alreadyExchanged || exchangeStarted.current) return;
		exchangeStarted.current = true;

		if (isLoginFlow) {
			authApi
				.loginWithStrava(code)
				.then(async (authOut) => {
					await refresh();
					sessionStorage.setItem(EXCHANGED_KEY_PREFIX + code, '1');
					queueToast('Bienvenue ! Connexion avec Strava réussie.');
					router.replace(authOut.user.onboarding_completed ? '/telemetry' : '/onboarding');
				})
				.catch(() => {
					setStatus('error');
					setMessage('La connexion avec Strava a échoué. Réessayez.');
				});
		} else {
			settingsApi
				.exchangeStravaCode(code)
				.then(() => {
					sessionStorage.setItem(EXCHANGED_KEY_PREFIX + code, '1');
					queueToast('Compte Strava connecté avec succès !');
					router.replace('/settings');
				})
				.catch(() => {
					setStatus('error');
					setMessage('La connexion à Strava a échoué. Réessayez depuis les paramètres.');
				});
		}
	}, [code, authError, alreadyExchanged, isLoginFlow, router, refresh]);

	return (
		<div
			className="flex min-h-screen flex-col items-center justify-center gap-4 px-4"
			style={{ background: COLORS.bgGradient }}
		>
			{status === 'loading' && <Loader size={28} color={COLORS.blue} className="animate-spin" />}
			{status === 'error' && <XCircle size={28} color={COLORS.danger} />}
			{status === 'loading' && (
				<p className="max-w-xs text-center text-[13px]" style={{ color: COLORS.heading, fontFamily: FONTS.body }}>
					Connexion à Strava en cours…
				</p>
			)}
			{status === 'error' && (
				<>
					<p className="max-w-xs text-center text-[13px]" style={{ color: COLORS.heading, fontFamily: FONTS.body }}>
						{message}
					</p>
					<button
						onClick={() => router.push(backHref)}
						className="rounded-xl px-4 py-2 text-[11px] font-bold tracking-wider uppercase"
						style={{ background: COLORS.yellow, color: COLORS.onGold, fontFamily: FONTS.title }}
					>
						{isLoginFlow ? 'Retour à la connexion' : 'Retour aux paramètres'}
					</button>
				</>
			)}
		</div>
	);
}

export default function StravaCallbackPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center" style={{ background: COLORS.bgGradient }}>
					<Loader size={28} color={COLORS.blue} className="animate-spin" />
				</div>
			}
		>
			<StravaCallbackContent />
		</Suspense>
	);
}
