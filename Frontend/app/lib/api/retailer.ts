import type { RetailerDashboardOut } from './types';
import api from './client';

export const retailerApi = {
	/** GET /retailer/dashboard — vue agrégée par zone (profils dominants + pneus en fin de vie) */
	getDashboard: (): Promise<RetailerDashboardOut> =>
		api.get<RetailerDashboardOut>('/retailer/dashboard').then((r) => r.data),
};
