import api from "./client";
import type { EventOut, EventCreateIn, EventDetailOut } from "./types";

export const eventsApi = {
  /** GET /events — tous les événements (créés/rejoignables), avec progression de l'utilisateur courant */
  list: (): Promise<EventOut[]> => api.get<EventOut[]>("/events").then((r) => r.data),

  /** GET /events/{id} — détail + classement complet */
  get: (id: number): Promise<EventDetailOut> => api.get<EventDetailOut>(`/events/${id}`).then((r) => r.data),

  /** POST /events — crée un événement (le créateur le rejoint automatiquement) */
  create: (body: EventCreateIn): Promise<EventOut> => api.post<EventOut>("/events", body).then((r) => r.data),

  /** POST /events/{id}/join — rejoindre un événement existant (code requis si privé) */
  join: (id: number, code?: string): Promise<EventOut> =>
    api.post<EventOut>(`/events/${id}/join`, { code: code || null }).then((r) => r.data),
};
