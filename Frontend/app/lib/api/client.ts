import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

/**
 * Instance axios partagée.
 * Tous les endpoints importent cet objet — ne jamais appeler axios directement.
 */
const api = axios.create({
	baseURL: BASE_URL,
	headers: {
		'Content-Type': 'application/json',
		Accept: 'application/json',
	},
	timeout: 10_000,
});

export const AUTH_TOKEN_KEY = 'mbt_auth_token';

export function getAuthToken(): string | null {
	if (typeof window === 'undefined') return null;
	return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
	if (typeof window === 'undefined') return;
	window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

// Intercepteur de requête — attache le jeton de session Bearer
api.interceptors.request.use((config) => {
	const token = getAuthToken();
	if (token) {
		config.headers = config.headers ?? {};
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

// Intercepteur de réponse — remonte les erreurs HTTP lisibles
api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (axios.isAxiosError(error)) {
			const status = error.response?.status ?? 0;
			const detail = (error.response?.data as { detail?: string })?.detail ?? error.message;
			console.error(`[API] ${status} — ${detail}`);
		}
		return Promise.reject(error);
	},
);

export default api;
