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
}

export interface UserPatch {
  name?: string;
  username?: string;
  city?: string;
  level?: string;
  level_progress?: number;
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

export type WheelPosition = "front" | "rear";
export type TireBrand = "michelin" | "other";
export type TireType = "Route" | "Gravel" | "VTT" | "Piste";

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
}

export interface RecommendationsOut {
  front: TireRecommendationOut;
  rear: TireRecommendationOut;
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

export type ChallengeStatus = "active" | "completed";

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

export type EventGoalType = "distance" | "elevation" | "rides";

export type EventVisibility = "public" | "private";

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
  status: "open" | "closed" | "drawn";
  preorder_discount_pct: number | null;
  entries_count: number;
  entered: boolean;
  won: boolean;
}

// ─── Coach ───────────────────────────────────────────────────────────────────

export interface CoachTipOut {
  id: string;
  severity: "info" | "warning" | "critical";
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
