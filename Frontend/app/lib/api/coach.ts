import type { CoachTipsOut } from './types';

import api from './client';

export const coachApi = {
	/** GET /coach/tips — conseils personnalisés (Strava + usure pneus) */
	getTips: (): Promise<CoachTipsOut> => api.get<CoachTipsOut>('/coach/tips').then((r) => r.data),
};
