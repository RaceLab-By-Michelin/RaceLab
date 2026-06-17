'use client';

import { useEffect } from 'react';

import { usePathname } from 'next/navigation';
import { toast } from 'sonner';

// Clé sessionStorage utilisée par /strava/callback pour transmettre un message
// à afficher en popup une fois la redirection effectuée (au lieu d'un écran dédié).
export const STRAVA_TOAST_KEY = 'strava_toast_message';
export const STRAVA_TOAST_KIND_KEY = 'strava_toast_kind';

/**
 * Monté une seule fois dans le layout racine. Comme ce layout n'est jamais
 * démonté lors d'une navigation côté client (App Router), on observe le
 * pathname pour détecter chaque arrivée sur une nouvelle page et vérifier
 * si un message Strava est en attente.
 */
export function StravaToastListener() {
	const pathname = usePathname();

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const message = sessionStorage.getItem(STRAVA_TOAST_KEY);
		if (!message) return;
		const kind = sessionStorage.getItem(STRAVA_TOAST_KIND_KEY);
		sessionStorage.removeItem(STRAVA_TOAST_KEY);
		sessionStorage.removeItem(STRAVA_TOAST_KIND_KEY);
		if (kind === 'error') {
			toast.error(message);
		} else {
			toast.success(message);
		}
	}, [pathname]);

	return null;
}
