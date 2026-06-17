import api from "./client";
import type { ChallengeOut } from "./types";

export const challengesApi = {
  /** GET /challenges — défis actifs en cours */
  getActive: (): Promise<ChallengeOut[]> =>
    api.get<ChallengeOut[]>("/challenges").then((r) => r.data),

  /** GET /challenges/past — défis terminés avec badges */
  getPast: (): Promise<ChallengeOut[]> =>
    api.get<ChallengeOut[]>("/challenges/past").then((r) => r.data),

  /** GET /challenges/{id} */
  getChallenge: (id: number): Promise<ChallengeOut> =>
    api.get<ChallengeOut>(`/challenges/${id}`).then((r) => r.data),
};
