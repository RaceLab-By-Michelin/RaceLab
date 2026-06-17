import api from "./client";
import type { CoachTipsOut } from "./types";

export const coachApi = {
  /** GET /coach/tips — conseils personnalisés (Strava + usure pneus) */
  getTips: (): Promise<CoachTipsOut> => api.get<CoachTipsOut>("/coach/tips").then((r) => r.data),
};
