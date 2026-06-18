/**
 * Types miroirs des schemas Pydantic du backend FastAPI.
 * Chaque interface correspond exactement à un schéma de réponse (*Out).
 */

// ─── User ────────────────────────────────────────────────────────────────────

export interface BikeOut {
	brand: string;
	model: string;
	year: number;
	color: string;
}

export interface UserOut {
	id: number;
	name: string;
	username: string;
	email: string;
	city: string;
	member_since: string;
	level: string;
	level_progress: number;
	bike: BikeOut;
	onboarding_completed: boolean;
	avatar_url?: string | null;
	weight_kg: number;
	height_cm: number;
	goal_km?: number | null;
}

export interface UserPatch {
	name?: string;
	username?: string;
	city?: string;
	level?: string;
	level_progress?: number;
	weight_kg?: number;
	height_cm?: number;
	goal_km?: number;
}

export interface BikePatch {
	brand?: string;
	model?: string;
	year?: number;
	color?: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface RegisterIn {
	name: string;
	email: string;
	password: string;
	weight_kg: number;
	height_cm: number;
}

export interface LoginIn {
	email: string;
	password: string;
}

export interface AuthOut {
	token: string;
	user: UserOut;
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export interface OnboardingTireIn {
	brand: TireBrand;
	catalog_id?: string;
	name?: string;
	size: string;
	category?: string;
	wear_pct?: number;
}

export interface OnboardingIn {
	city?: string;
	bike_brand: string;
	bike_model: string;
	bike_year: number;
	front_tire: OnboardingTireIn;
	rear_tire: OnboardingTireIn;
}

// ─── Stats (télémétrie + profil) ─────────────────────────────────────────────

export interface StatsOut {
	total_km: number;
	total_rides: number;
	total_elevation: number;
	completed_challenges: number;
	front_wear: number;
	rear_wear: number;
	adherence_pct: number;
}

// ─── Tires ───────────────────────────────────────────────────────────────────

export type WheelPosition = 'front' | 'rear';
export type TireBrand = 'michelin' | 'other';
export type TireType = 'Route' | 'Gravel' | 'VTT' | 'Piste';

export interface TireOut {
	id: number;
	wheel: WheelPosition;
	brand: TireBrand;
	catalog_id: string | null;
	name: string;
	size: string;
	category: string | null;
	wear_pct: number;
	installed_date: string;
	installed_km: number;
}

export interface TireSetOut {
	front: TireOut;
	rear: TireOut;
}

export interface TirePatch {
	brand: TireBrand;
	catalog_id?: string;
	name?: string;
	size: string;
	category?: string;
	reset_wear?: boolean;
}

export interface TireCatalogOut {
	id: string;
	name: string;
	type: TireType;
	sizes: string[];
	description: string;
	max_pressure: string;
	weight: string;
	tag: string | null;
	// Gamme premium — absentes sur les entrées historiques du catalogue
	discipline?: string[] | null;
	sub_family?: string[] | null;
	tubeless?: boolean | null;
	casing?: string | null;
	compound?: string | null;
	protection_level?: string | null;
	riding_priority?: string | null;
	terrain_tags?: string[] | null;
	e_bike_compatible?: boolean | null;
}

// ─── Recommandation pneu + réduction personnalisée ───────────────────────────

export interface TireRecommendationOut {
	wheel: WheelPosition;
	current_name: string;
	current_wear_pct: number;
	recommended: TireCatalogOut | null;
	match_reason: string;
	discount_pct: number;
	discount_code: string;
	// Bénéfices tangibles (estimés) — vendre la performance, pas le prix
	rolling_resistance_current: number;
	rolling_resistance_recommended: number;
	rolling_resistance_delta_pct: number;
	typical_ride_km: number;
	minutes_gained: number;
}

export interface RecommendationsOut {
	front: TireRecommendationOut;
	rear: TireRecommendationOut;
}

// ─── Passeport pneu partageable ──────────────────────────────────────────────

export interface PassportCardOut {
	wheel: WheelPosition;
	tire_name: string;
	km_on_tire: number;
	days_installed: number;
	milestone_km: number | null;
	headline: string;
}

export interface PassportOut {
	front: PassportCardOut;
	rear: PassportCardOut;
}

// ─── Wear history ─────────────────────────────────────────────────────────────

export interface WearPoint {
	date: string; // ISO 8601 datetime
	front_wear: number;
	rear_wear: number;
}

export interface WearHistoryOut {
	days: number;
	points: WearPoint[];
	avg_front_per_day: number;
	avg_rear_per_day: number;
}

// ─── Rides ───────────────────────────────────────────────────────────────────

export interface RideOut {
	id: number;
	name: string;
	date: string; // ISO 8601 datetime
	distance_km: number;
	duration_seconds: number;
	avg_speed: number;
	elevation_gain: number;
	strava_id: string | null;
}

// ─── Challenges ──────────────────────────────────────────────────────────────

export type ChallengeStatus = 'active' | 'completed';

export interface ChallengeOut {
	id: number;
	name: string;
	description: string;
	start_date: string;
	end_date: string;
	target_km: number | null;
	target_elevation: number | null;
	target_rides: number | null;
	progress_km: number;
	progress_elevation: number;
	progress_rides: number;
	status: ChallengeStatus;
	participants: number;
	rank: number | null;
	badge_emoji: string | null;
	badge_label: string | null;
	reward: string | null;
}

// ─── Events ──────────────────────────────────────────────────────────────────

export type EventGoalType = 'distance' | 'elevation' | 'rides';

export type EventVisibility = 'public' | 'private';

export interface EventOut {
	id: number;
	name: string;
	description: string;
	goal_type: EventGoalType;
	goal_value: number;
	terrain_type: string | null;
	start_date: string;
	end_date: string;
	reward: string | null;
	created_by_user_id: number;
	participants: number;
	visibility: EventVisibility;
	// Renvoyé uniquement au créateur de l'événement
	join_code: string | null;
	joined: boolean;
	progress_value: number;
	rank: number | null;
}

export interface EventCreateIn {
	name: string;
	description: string;
	goal_type: EventGoalType;
	goal_value: number;
	terrain_type?: string | null;
	start_date: string;
	end_date: string;
	reward?: string | null;
	visibility?: EventVisibility;
}

export interface EventLeaderboardEntry {
	user_id: number;
	name: string;
	progress_value: number;
	rank: number;
}

export interface EventDetailOut extends EventOut {
	leaderboard: EventLeaderboardEntry[];
}

// ─── Défi personnalisé ("Pneu pour toi") ──────────────────────────────────

export type PersonalChallengeStatus = 'active' | 'pending_feedback' | 'completed';

export interface PersonalChallengeOut {
	id: number;
	title: string;
	description: string;
	discipline: string;
	target_km: number;
	status: PersonalChallengeStatus;
	created_at: string;
	completed_at: string | null;
	adherence_rating: number | null;
	comfort_rating: number | null;
	speed_rating: number | null;
	feedback_comment: string | null;
	reward_discount_pct: number | null;
	reward_discount_code: string | null;
	// Giveaway pneu mérité — alternative à la réduction
	reward_type: 'discount' | 'giveaway';
	reward_giveaway_tire_catalog_id: string | null;
	reward_giveaway_tire_name: string | null;
	reward_giveaway_status: string | null;
}

export interface PersonalChallengeStatusOut {
	challenge: PersonalChallengeOut;
	completed_count: number;
	next_reward_pct: number;
	giveaway_tier_reached: boolean;
}

export interface PersonalChallengeFeedbackIn {
	adherence_rating: number;
	comfort_rating: number;
	speed_rating: number;
	comment?: string | null;
}

// ─── Michelin Lab (tirages au sort) ───────────────────────────────────────────

export interface TireTrialOut {
	id: number;
	tire_name: string;
	description: string;
	target_profile: string | null;
	image_tag: string | null;
	entries_open_date: string;
	entries_close_date: string;
	draw_date: string;
	slots: number;
	status: 'open' | 'closed' | 'drawn';
	preorder_discount_pct: number | null;
	entries_count: number;
	entered: boolean;
	won: boolean;
}

// ─── Retailer B2B (dashboard revendeur) ──────────────────────────────────────

export interface RetailerZoneOut {
	city: string;
	rider_count: number;
	dominant_practice: string;
	dominant_practice_share_pct: number;
	practice_breakdown: Record<string, number>;
	tires_near_end_of_life: number;
	tires_near_end_of_life_pct: number;
}

export interface RetailerDashboardOut {
	zones: RetailerZoneOut[];
	total_riders: number;
	weeks_horizon: number;
	generated_note: string;
}

// ─── Coach ───────────────────────────────────────────────────────────────────

export interface CoachTipOut {
	id: string;
	severity: 'info' | 'warning' | 'critical';
	title: string;
	message: string;
	cta_label: string | null;
	cta_catalog_id: string | null;
	discount_pct: number | null;
	discount_code: string | null;
}

export interface CoachTipsOut {
	tips: CoachTipOut[];
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface NotificationSettingsOut {
	enabled: boolean;
	pre_ride_enabled: boolean;
	delay_hours: number;
	critical_only: boolean;
}

export interface NotificationSettingsPatch {
	enabled?: boolean;
	pre_ride_enabled?: boolean;
	delay_hours?: number;
	critical_only?: boolean;
}

export interface StravaOut {
	connected: boolean;
	athlete_name: string | null;
	last_sync: string | null;
}

export interface StravaAuthorizeUrlOut {
	authorize_url: string;
}

export interface StravaSyncOut {
	imported: number;
	skipped: number;
}

export interface StravaClubOut {
	id: number;
	name: string;
	profile_medium: string | null;
	cover_photo: string | null;
	sport_type: string | null;
	city: string | null;
	member_count: number | null;
}

export interface StravaClubMemberOut {
	strava_id: number | null;
	firstname: string;
	lastname: string;
	profile_medium: string | null;
	city: string | null;
	is_app_user: boolean;
	is_self: boolean;
}
