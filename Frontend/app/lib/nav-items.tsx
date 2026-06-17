import { BarChart2, Trophy, CircleDot, User, Settings, Sparkles } from 'lucide-react';

import type { Screen } from './types';

import { COLORS } from './constants';

// Événements + Michelin Lab sont des onglets internes à l'écran "challenges"
// (pas d'item de nav dédié, pour ne pas surcharger la barre mobile).
export const NAV_ITEMS: { id: Screen; icon: (active: boolean) => React.ReactNode; label: string }[] = [
	{
		id: 'telemetry',
		icon: (a) => <BarChart2 size={16} color={a ? COLORS.blueDark : COLORS.gray40} />,
		label: 'Données',
	},
	{ id: 'challenges', icon: (a) => <Trophy size={16} color={a ? COLORS.blueDark : COLORS.gray40} />, label: 'Défis' },
	{ id: 'coach', icon: (a) => <Sparkles size={16} color={a ? COLORS.blueDark : COLORS.gray40} />, label: 'Coach' },
	{ id: 'tires', icon: (a) => <CircleDot size={16} color={a ? COLORS.blueDark : COLORS.gray40} />, label: 'Pneus' },
	{ id: 'profile', icon: (a) => <User size={16} color={a ? COLORS.blueDark : COLORS.gray40} />, label: 'Profil' },
	{
		id: 'settings',
		icon: (a) => <Settings size={16} color={a ? COLORS.blueDark : COLORS.gray40} />,
		label: 'Réglages',
	},
];
