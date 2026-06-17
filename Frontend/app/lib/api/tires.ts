import type {
	TireOut,
	TireSetOut,
	TirePatch,
	TireCatalogOut,
	WearHistoryOut,
	WheelPosition,
	RecommendationsOut,
} from './types';

import api from './client';

export const tiresApi = {
	/** GET /tires — pneus montés sur les deux roues */
	getTires: (): Promise<TireSetOut> => api.get<TireSetOut>('/tires').then((r) => r.data),

	/** GET /tires/{wheel} */
	getTire: (wheel: WheelPosition): Promise<TireOut> => api.get<TireOut>(`/tires/${wheel}`).then((r) => r.data),

	/**
	 * PATCH /tires/{wheel}
	 * Pour Michelin : body.brand="michelin", body.catalog_id requis.
	 * Pour autre marque : body.brand="other", body.name requis.
	 * reset_wear=true (défaut) remet wear_pct à 0.
	 */
	updateTire: (wheel: WheelPosition, body: TirePatch): Promise<TireOut> =>
		api.patch<TireOut>(`/tires/${wheel}`, body).then((r) => r.data),

	/** GET /tires/catalog?type=Route|Gravel|VTT|Piste */
	getCatalog: (type?: string): Promise<TireCatalogOut[]> =>
		api.get<TireCatalogOut[]>('/tires/catalog', { params: type ? { type } : {} }).then((r) => r.data),

	/** GET /tires/catalog/{id} */
	getCatalogItem: (id: string): Promise<TireCatalogOut> =>
		api.get<TireCatalogOut>(`/tires/catalog/${id}`).then((r) => r.data),

	/**
	 * GET /tires/wear-history?days=30|60|90
	 * Retourne les snapshots quotidiens d'usure pour le graphique.
	 */
	getWearHistory: (days: 30 | 60 | 90 = 30): Promise<WearHistoryOut> =>
		api.get<WearHistoryOut>('/tires/wear-history', { params: { days } }).then((r) => r.data),

	/**
	 * GET /tires/recommendations
	 * Pneu recommandé + réduction personnalisée par roue, basés sur
	 * l'historique de sorties et l'usure actuelle.
	 */
	getRecommendations: (): Promise<RecommendationsOut> =>
		api.get<RecommendationsOut>('/tires/recommendations').then((r) => r.data),
};
