import api from "./client";
import type {
  NotificationSettingsOut,
  NotificationSettingsPatch,
  StravaOut,
  StravaAuthorizeUrlOut,
  StravaSyncOut,
  StravaClubOut,
  StravaClubMemberOut,
} from "./types";

export const settingsApi = {
  // ── Notifications ─────────────────────────────────────────────────────────

  /** GET /settings/notifications */
  getNotifications: (): Promise<NotificationSettingsOut> =>
    api.get<NotificationSettingsOut>("/settings/notifications").then((r) => r.data),

  /** PATCH /settings/notifications */
  patchNotifications: (
    body: NotificationSettingsPatch
  ): Promise<NotificationSettingsOut> =>
    api
      .patch<NotificationSettingsOut>("/settings/notifications", body)
      .then((r) => r.data),

  // ── Strava ────────────────────────────────────────────────────────────────

  /** GET /settings/strava */
  getStrava: (): Promise<StravaOut> =>
    api.get<StravaOut>("/settings/strava").then((r) => r.data),

  /** GET /settings/strava/authorize-url — URL OAuth Strava vers laquelle rediriger */
  getStravaAuthorizeUrl: (): Promise<StravaAuthorizeUrlOut> =>
    api.get<StravaAuthorizeUrlOut>("/settings/strava/authorize-url").then((r) => r.data),

  /** POST /settings/strava/exchange — échange le code reçu sur /strava/callback */
  exchangeStravaCode: (code: string): Promise<StravaOut> =>
    api.post<StravaOut>("/settings/strava/exchange", { code }).then((r) => r.data),

  /** POST /settings/strava/sync — importe les sorties Strava récentes */
  syncStrava: (): Promise<StravaSyncOut> =>
    api.post<StravaSyncOut>("/settings/strava/sync").then((r) => r.data),

  /** DELETE /settings/strava/disconnect */
  disconnectStrava: (): Promise<StravaOut> =>
    api.delete<StravaOut>("/settings/strava/disconnect").then((r) => r.data),

  /** GET /settings/strava/clubs — clubs Strava de l'athlète connecté */
  getStravaClubs: (): Promise<StravaClubOut[]> =>
    api.get<StravaClubOut[]>("/settings/strava/clubs").then((r) => r.data),

  /** GET /settings/strava/clubs/{id}/members — membres d'un club, avec is_app_user/is_self */
  getStravaClubMembers: (clubId: number): Promise<StravaClubMemberOut[]> =>
    api.get<StravaClubMemberOut[]>(`/settings/strava/clubs/${clubId}/members`).then((r) => r.data),
};
