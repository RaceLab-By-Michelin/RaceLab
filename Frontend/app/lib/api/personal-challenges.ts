import type { PersonalChallengeStatusOut, PersonalChallengeOut, PersonalChallengeFeedbackIn } from './types';

import api from './client';

export const personalChallengesApi = {
	/** GET /personal-challenges/current — défi perso en cours (en génère un si besoin) */
	getCurrent: (): Promise<PersonalChallengeStatusOut> =>
		api.get<PersonalChallengeStatusOut>('/personal-challenges/current').then((r) => r.data),

	/** POST /personal-challenges/{id}/complete — marque le défi comme réalisé (passe en attente de feedback) */
	complete: (id: number): Promise<PersonalChallengeOut> =>
		api.post<PersonalChallengeOut>(`/personal-challenges/${id}/complete`).then((r) => r.data),

	/** POST /personal-challenges/{id}/feedback — envoie le questionnaire pneus, débloque la récompense */
	submitFeedback: (id: number, body: PersonalChallengeFeedbackIn): Promise<PersonalChallengeOut> =>
		api.post<PersonalChallengeOut>(`/personal-challenges/${id}/feedback`, body).then((r) => r.data),
};
