import type {
	ChallengeOut,
	CoachTipsOut,
	EventOut,
	RecommendationsOut,
	RideOut,
	StatsOut,
	StravaClubMemberOut,
	StravaClubOut,
	StravaOut,
	TireCatalogOut,
	TireSetOut,
	TireTrialOut,
	UserOut,
} from '@/app/lib/api';

export const authToken = 'e2e-token';

export const completedUser: UserOut = {
	id: 1,
	name: 'Alex Martin',
	username: 'alex',
	email: 'alex@example.com',
	city: 'Lyon',
	member_since: '2026-01-10T12:00:00Z',
	level: 'Rider',
	level_progress: 64,
	onboarding_completed: true,
	avatar_url: null,
	weight_kg: 75,
	height_cm: 180,
	bike: {
		brand: 'Canyon',
		model: 'Endurace',
		year: 2025,
		color: '#27509B',
	},
};

export const incompleteUser: UserOut = {
	...completedUser,
	id: 2,
	name: 'New Rider',
	username: 'newrider',
	email: 'new@example.com',
	city: '',
	onboarding_completed: false,
};

export const stats: StatsOut = {
	total_km: 1248,
	total_rides: 28,
	total_elevation: 13640,
	completed_challenges: 3,
	front_wear: 24,
	rear_wear: 41,
	adherence_pct: 91,
};

export const tires: TireSetOut = {
	front: {
		id: 10,
		wheel: 'front',
		brand: 'michelin',
		catalog_id: 'power-cup',
		name: 'Power Cup',
		size: '700x28C',
		category: 'Route',
		wear_pct: 24,
		installed_date: '2026-02-01T09:00:00Z',
		installed_km: 0,
	},
	rear: {
		id: 11,
		wheel: 'rear',
		brand: 'michelin',
		catalog_id: 'power-cup',
		name: 'Power Cup',
		size: '700x28C',
		category: 'Route',
		wear_pct: 41,
		installed_date: '2026-02-01T09:00:00Z',
		installed_km: 0,
	},
};

export const catalogTire: TireCatalogOut = {
	id: 'power-cup',
	name: 'Power Cup',
	type: 'Route',
	sizes: ['700x25C', '700x28C'],
	description: 'Fast road tire for race day and training.',
	max_pressure: '6.5 bar',
	weight: '250 g',
	tag: 'Race',
};

export const recommendations: RecommendationsOut = {
	front: {
		wheel: 'front',
		current_name: 'Power Cup',
		current_wear_pct: 24,
		recommended: catalogTire,
		match_reason: 'Ideal for your road profile',
		discount_pct: 0,
		discount_code: '',
		rolling_resistance_current: 12.5,
		rolling_resistance_recommended: 10.8,
		rolling_resistance_delta_pct: 13.6,
		typical_ride_km: 45,
		minutes_gained: 1.2,
	},
	rear: {
		wheel: 'rear',
		current_name: 'Power Cup',
		current_wear_pct: 41,
		recommended: catalogTire,
		match_reason: 'Best match for your recent rides',
		discount_pct: 10,
		discount_code: 'RACELAB10',
		rolling_resistance_current: 14.2,
		rolling_resistance_recommended: 10.8,
		rolling_resistance_delta_pct: 23.9,
		typical_ride_km: 45,
		minutes_gained: 2.1,
	},
};

export const rides: RideOut[] = [
	{
		id: 101,
		name: 'Morning endurance loop',
		date: '2026-06-10T07:30:00Z',
		distance_km: 54.2,
		duration_seconds: 6410,
		avg_speed: 30.4,
		elevation_gain: 620,
		strava_id: 'ride-101',
	},
];

export const activeChallenges: ChallengeOut[] = [
	{
		id: 201,
		name: '24H du Mans',
		description: 'Ride 100 km during the partner challenge.',
		start_date: '2026-06-01T00:00:00Z',
		end_date: '2026-06-30T23:59:59Z',
		target_km: 100,
		target_elevation: null,
		target_rides: null,
		progress_km: 68.4,
		progress_elevation: 1200,
		progress_rides: 3,
		status: 'active',
		participants: 150,
		rank: 12,
		badge_emoji: null,
		badge_label: null,
		reward: 'Pneus offerts',
	},
];

export const pastChallenges: ChallengeOut[] = [
	{
		...activeChallenges[0],
		id: 202,
		name: 'Spring Classics',
		status: 'completed',
		progress_km: 105,
		badge_emoji: '*',
		badge_label: 'Finisher',
	},
];

export const events: EventOut[] = [
	{
		id: 301,
		name: 'Col de la Croix',
		description: 'A climbing-focused local event.',
		goal_type: 'elevation',
		goal_value: 1500,
		terrain_type: 'Route',
		start_date: '2026-06-01T00:00:00Z',
		end_date: '2026-06-20T23:59:59Z',
		reward: 'Badge Grimpeur',
		created_by_user_id: 1,
		participants: 18,
		visibility: 'public',
		join_code: null,
		joined: false,
		progress_value: 400,
		rank: null,
	},
];

export const trials: TireTrialOut[] = [
	{
		id: 401,
		tire_name: 'Michelin Prototype X',
		description: 'Early test batch for road riders.',
		target_profile: 'Route',
		image_tag: null,
		entries_open_date: '2026-06-01T00:00:00Z',
		entries_close_date: '2026-06-21T00:00:00Z',
		draw_date: '2026-06-25T00:00:00Z',
		slots: 20,
		status: 'open',
		preorder_discount_pct: 20,
		entries_count: 42,
		entered: false,
		won: false,
	},
];

export const coachTips: CoachTipsOut = {
	tips: [
		{
			id: 'tip-1',
			severity: 'info',
			title: 'Rear tire wear is rising',
			message: 'Rotate your next intense sessions to keep grip predictable.',
			cta_label: null,
			cta_catalog_id: null,
			discount_pct: null,
			discount_code: null,
		},
	],
};

export const stravaDisconnected: StravaOut = {
	connected: false,
	athlete_name: null,
	last_sync: null,
};

export const clubs: StravaClubOut[] = [
	{
		id: 501,
		name: 'RaceLab Lyon',
		profile_medium: null,
		cover_photo: null,
		sport_type: 'Ride',
		city: 'Lyon',
		member_count: 12,
	},
];

export const clubMembers: StravaClubMemberOut[] = [
	{
		strava_id: 601,
		firstname: 'Alex',
		lastname: 'Martin',
		profile_medium: null,
		city: 'Lyon',
		is_app_user: true,
		is_self: true,
	},
];
