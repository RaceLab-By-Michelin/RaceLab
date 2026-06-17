import api from "./client";
import type { UserOut, UserPatch, BikeOut, BikePatch, StatsOut, OnboardingIn } from "./types";

export const userApi = {
  /** GET /users/me */
  getMe: (): Promise<UserOut> =>
    api.get<UserOut>("/users/me").then((r) => r.data),

  /** PATCH /users/me */
  patchMe: (body: UserPatch): Promise<UserOut> =>
    api.patch<UserOut>("/users/me", body).then((r) => r.data),

  /** GET /users/me/bike */
  getBike: (): Promise<BikeOut> =>
    api.get<BikeOut>("/users/me/bike").then((r) => r.data),

  /** PATCH /users/me/bike */
  patchBike: (body: BikePatch): Promise<BikeOut> =>
    api.patch<BikeOut>("/users/me/bike", body).then((r) => r.data),

  /**
   * GET /users/me/stats
   * Retourne les totaux (km, sorties, D+, challenges, usure, adhérence).
   * Source unique de vérité pour TelemetryScreen et ProfileScreen.
   */
  getStats: (): Promise<StatsOut> =>
    api.get<StatsOut>("/users/me/stats").then((r) => r.data),

  /** POST /users/onboarding — première saisie vélo + pneus */
  submitOnboarding: (body: OnboardingIn): Promise<UserOut> =>
    api.post<UserOut>("/users/onboarding", body).then((r) => r.data),
};
