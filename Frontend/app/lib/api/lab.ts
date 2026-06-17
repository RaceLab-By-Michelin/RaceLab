import type { TireTrialOut } from './types';

import api from './client';

export const labApi = {
	/** GET /lab/trials — tirages au sort Michelin Lab (pneus pas encore commercialisés) */
	listTrials: (): Promise<TireTrialOut[]> => api.get<TireTrialOut[]>('/lab/trials').then((r) => r.data),

	/** POST /lab/trials/{id}/enter — participer au tirage */
	enter: (id: number): Promise<TireTrialOut> => api.post<TireTrialOut>(`/lab/trials/${id}/enter`).then((r) => r.data),
};
