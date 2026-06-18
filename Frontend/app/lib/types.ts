export type Screen =
	| 'telemetry'
	| 'challenges'
	| 'profile'
	| 'tires'
	| 'settings'
	| 'legends'
	| 'coach'
	| 'strava-clubs';

export interface NavItem {
	id: Screen;
	icon: React.ReactNode;
	label: string;
}

export interface MichelinTire {
	id: string;
	name: string;
	type: 'Route' | 'Gravel' | 'VTT' | 'Piste';
	sizes: string[];
	description: string;
	maxPressure: string;
	weight: string;
	tag?: string;
}

export interface PastChallenge {
	id: string;
	name: string;
	date: string;
	km: number;
	rank: number;
	total: number;
	badge: string;
	badgeLabel: string;
	reward?: string;
}
