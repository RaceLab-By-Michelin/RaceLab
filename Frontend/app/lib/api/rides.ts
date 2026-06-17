import api from "./client";
import type { RideOut } from "./types";

export interface RidesParams {
  /** Nombre max de sorties retournées (défaut : 20) */
  limit?: number;
  /** Filtre sur les N derniers jours */
  days?: number;
}

export const ridesApi = {
  /**
   * GET /rides
   * Sorties triées par date décroissante.
   */
  getRides: (params?: RidesParams): Promise<RideOut[]> =>
    api.get<RideOut[]>("/rides", { params }).then((r) => r.data),

  /** GET /rides/{id} */
  getRide: (id: number): Promise<RideOut> =>
    api.get<RideOut>(`/rides/${id}`).then((r) => r.data),
};
