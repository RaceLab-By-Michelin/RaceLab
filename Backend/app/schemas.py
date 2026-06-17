"""Pydantic schemas — request bodies and API responses."""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ─── User ────────────────────────────────────────────────────────────────────

class BikeOut(BaseModel):
    brand: str
    model: str
    year: int
    color: str

    model_config = {"from_attributes": True}


class UserOut(BaseModel):
    id: int
    name: str
    username: str
    email: str
    city: str
    member_since: str
    level: str
    level_progress: int
    bike: BikeOut
    onboarding_completed: bool = False
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class UserPatch(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    city: Optional[str] = None
    level: Optional[str] = None
    level_progress: Optional[int] = None


class BikePatch(BaseModel):
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None


# ─── Auth ────────────────────────────────────────────────────────────────────

class RegisterIn(BaseModel):
    name: str
    email: str
    password: str


class LoginIn(BaseModel):
    email: str
    password: str


class AuthOut(BaseModel):
    token: str
    user: UserOut


# ─── Onboarding ───────────────────────────────────────────────────────────────

class OnboardingTireIn(BaseModel):
    """Pneu déclaré par l'utilisateur à l'inscription (Michelin ou autre)."""
    brand: str                          # "michelin" | "other"
    catalog_id: Optional[str] = None
    name: Optional[str] = None
    size: str
    category: Optional[str] = None
    wear_pct: int = 0                   # estimation initiale donnée par l'utilisateur


class OnboardingIn(BaseModel):
    city: str = ""
    bike_brand: str
    bike_model: str
    bike_year: int
    front_tire: OnboardingTireIn
    rear_tire: OnboardingTireIn


# ─── Stats (telemetry + profile) ──────────────────────────────────────────────

class StatsOut(BaseModel):
    total_km: float
    total_rides: int
    total_elevation: int
    completed_challenges: int
    front_wear: int
    rear_wear: int
    adherence_pct: int


# ─── Tires ───────────────────────────────────────────────────────────────────

class TireOut(BaseModel):
    id: int
    wheel: str
    brand: str
    catalog_id: Optional[str]
    name: str
    size: str
    category: Optional[str]
    wear_pct: int
    installed_date: str
    installed_km: int

    model_config = {"from_attributes": True}


class TireSetOut(BaseModel):
    front: TireOut
    rear: TireOut


class TirePatch(BaseModel):
    """Mise à jour d'une roue. brand='michelin' → catalog_id requis. brand='other' → name+size requis."""
    brand: str                          # "michelin" | "other"
    catalog_id: Optional[str] = None
    name: Optional[str] = None
    size: str
    category: Optional[str] = None
    reset_wear: bool = True             # remettre wear_pct à 0


class TireCatalogOut(BaseModel):
    id: str
    name: str
    type: str
    sizes: list[str]
    description: str
    max_pressure: str
    weight: str
    tag: Optional[str]

    # Gamme premium — métadonnées enrichies (optionnelles : absentes sur les
    # entrées historiques du catalogue, peuplées pour la gamme premium)
    discipline: Optional[list[str]] = None
    sub_family: Optional[list[str]] = None
    tubeless: Optional[bool] = None
    casing: Optional[str] = None
    compound: Optional[str] = None
    protection_level: Optional[str] = None
    riding_priority: Optional[str] = None
    terrain_tags: Optional[list[str]] = None
    e_bike_compatible: Optional[bool] = None

    model_config = {"from_attributes": True}


# ─── Recommandation pneu + réduction personnalisée ───────────────────────────

class TireRecommendationOut(BaseModel):
    wheel: str
    current_name: str
    current_wear_pct: int
    recommended: Optional[TireCatalogOut] = None
    match_reason: str
    discount_pct: int
    discount_code: str

    model_config = {"from_attributes": True}


class RecommendationsOut(BaseModel):
    front: TireRecommendationOut
    rear: TireRecommendationOut


# ─── Wear history ─────────────────────────────────────────────────────────────

class WearPoint(BaseModel):
    date: datetime
    front_wear: float
    rear_wear: float

    model_config = {"from_attributes": True}


class WearHistoryOut(BaseModel):
    days: int
    points: list[WearPoint]
    avg_front_per_day: float
    avg_rear_per_day: float


# ─── Rides ───────────────────────────────────────────────────────────────────

class RideOut(BaseModel):
    id: int
    name: str
    date: datetime
    distance_km: float
    duration_seconds: int
    avg_speed: float
    elevation_gain: int
    strava_id: Optional[str]
    weather: Optional[str] = None
    surface_type: Optional[str] = None

    model_config = {"from_attributes": True}


class RideIn(BaseModel):
    """Création d'une sortie. weather/surface_type alimentent le calcul d'usure."""
    name: str
    date: Optional[datetime] = None
    distance_km: float
    duration_seconds: int
    elevation_gain: int = 0
    strava_id: Optional[str] = None
    weather: Optional[str] = None        # "dry" | "wet" | "mixed"
    surface_type: Optional[str] = None   # "road" | "gravel" | "mixed" | "mtb_trail"


class RideCreateOut(BaseModel):
    ride: RideOut
    front_wear_pct: int
    rear_wear_pct: int
    front_wear_delta: float
    rear_wear_delta: float


# ─── Challenges ──────────────────────────────────────────────────────────────

class ChallengeOut(BaseModel):
    id: int
    name: str
    description: str
    start_date: datetime
    end_date: datetime
    target_km: Optional[float]
    target_elevation: Optional[int]
    target_rides: Optional[int]
    progress_km: float
    progress_elevation: int
    progress_rides: int
    status: str
    participants: int
    rank: Optional[int]
    badge_emoji: Optional[str]
    badge_label: Optional[str]
    reward: Optional[str]

    model_config = {"from_attributes": True}


# ─── Events ──────────────────────────────────────────────────────────────────

class EventOut(BaseModel):
    id: int
    name: str
    description: str
    goal_type: str
    goal_value: float
    terrain_type: Optional[str]
    start_date: datetime
    end_date: datetime
    reward: Optional[str]
    created_by_user_id: int
    participants: int
    # Calculés pour l'utilisateur courant (None si non authentifié / non rejoint)
    joined: bool = False
    progress_value: float = 0
    rank: Optional[int] = None

    model_config = {"from_attributes": True}


class EventCreate(BaseModel):
    name: str
    description: str
    goal_type: str          # "distance" | "elevation" | "rides"
    goal_value: float
    terrain_type: Optional[str] = None
    start_date: datetime
    end_date: datetime
    reward: Optional[str] = None


class EventLeaderboardEntry(BaseModel):
    user_id: int
    name: str
    progress_value: float
    rank: int


class EventDetailOut(EventOut):
    leaderboard: list[EventLeaderboardEntry] = []


# ─── Michelin Lab (tirages au sort) ───────────────────────────────────────────

class TireTrialOut(BaseModel):
    id: int
    tire_name: str
    description: str
    target_profile: Optional[str]
    image_tag: Optional[str]
    entries_open_date: datetime
    entries_close_date: datetime
    draw_date: datetime
    slots: int
    status: str
    preorder_discount_pct: Optional[int]
    entries_count: int = 0
    entered: bool = False
    won: bool = False

    model_config = {"from_attributes": True}


class TireTrialEntryOut(BaseModel):
    id: int
    trial_id: int
    entered_at: datetime
    won: bool

    model_config = {"from_attributes": True}


# ─── Coach ───────────────────────────────────────────────────────────────────

class CoachTipOut(BaseModel):
    id: str
    severity: str            # "info" | "warning" | "critical"
    title: str
    message: str
    cta_label: Optional[str] = None
    cta_catalog_id: Optional[str] = None
    discount_pct: Optional[int] = None
    discount_code: Optional[str] = None


class CoachTipsOut(BaseModel):
    tips: list[CoachTipOut]


# ─── Settings ────────────────────────────────────────────────────────────────

class NotificationSettingsOut(BaseModel):
    enabled: bool
    pre_ride_enabled: bool
    delay_hours: int
    critical_only: bool

    model_config = {"from_attributes": True}


class NotificationSettingsPatch(BaseModel):
    enabled: Optional[bool] = None
    pre_ride_enabled: Optional[bool] = None
    delay_hours: Optional[int] = None
    critical_only: Optional[bool] = None


class StravaOut(BaseModel):
    connected: bool
    athlete_name: Optional[str]
    last_sync: Optional[datetime]

    model_config = {"from_attributes": True}


class StravaAuthorizeUrlOut(BaseModel):
    authorize_url: str


class StravaExchangeIn(BaseModel):
    code: str


class StravaSyncOut(BaseModel):
    imported: int
    skipped: int


# ─── Strava : clubs + membres (vue + invitation par lien à partager) ─────────

class StravaClubOut(BaseModel):
    id: int
    name: str
    profile_medium: Optional[str] = None
    cover_photo: Optional[str] = None
    sport_type: Optional[str] = None
    city: Optional[str] = None
    member_count: Optional[int] = None


class StravaClubMemberOut(BaseModel):
    strava_id: Optional[int] = None
    firstname: str
    lastname: str
    profile_medium: Optional[str] = None
    city: Optional[str] = None
    is_app_user: bool = False
    is_self: bool = False
