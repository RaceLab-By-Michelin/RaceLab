import api, { setAuthToken, clearAuthToken, getAuthToken } from "./client";
import type { AuthOut, LoginIn, RegisterIn, UserOut, StravaAuthorizeUrlOut } from "./types";

export const authApi = {
  /** POST /auth/register — crée le compte et stocke le jeton de session */
  register: async (body: RegisterIn): Promise<AuthOut> => {
    const { data } = await api.post<AuthOut>("/auth/register", body);
    setAuthToken(data.token);
    return data;
  },

  /** POST /auth/login — authentifie et stocke le jeton de session */
  login: async (body: LoginIn): Promise<AuthOut> => {
    const { data } = await api.post<AuthOut>("/auth/login", body);
    setAuthToken(data.token);
    return data;
  },

  /** GET /auth/strava/authorize-url — URL Strava pour s'inscrire/se connecter directement */
  getStravaLoginAuthorizeUrl: (): Promise<StravaAuthorizeUrlOut> =>
    api.get<StravaAuthorizeUrlOut>("/auth/strava/authorize-url").then((r) => r.data),

  /** POST /auth/strava — échange le code reçu sur /strava/callback?state=login, crée le compte si besoin */
  loginWithStrava: async (code: string): Promise<AuthOut> => {
    const { data } = await api.post<AuthOut>("/auth/strava", { code });
    setAuthToken(data.token);
    return data;
  },

  /** POST /auth/logout — invalide le jeton côté serveur puis l'efface localement */
  logout: async (): Promise<void> => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearAuthToken();
    }
  },

  /** GET /auth/me — utilisateur courant (ou rejette si non authentifié) */
  me: (): Promise<UserOut> => api.get<UserOut>("/auth/me").then((r) => r.data),

  /** Vrai si un jeton de session est stocké localement (ne garantit pas sa validité). */
  hasToken: (): boolean => !!getAuthToken(),
};
