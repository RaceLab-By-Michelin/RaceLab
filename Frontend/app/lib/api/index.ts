/**
 * Point d'entrée unique pour la couche API.
 *
 * Usage dans un composant :
 *   import { userApi, tiresApi } from "@/app/lib/api";
 *   const stats = await userApi.getStats();
 */
export { userApi } from './user';
export { authApi } from './auth';
export { getAuthToken, setAuthToken, clearAuthToken } from './client';
export { tiresApi } from './tires';
export { ridesApi } from './rides';
export { challengesApi } from './challenges';
export { settingsApi } from './settings';
export { eventsApi } from './events';
export { labApi } from './lab';
export { coachApi } from './coach';
export type * from './types';
