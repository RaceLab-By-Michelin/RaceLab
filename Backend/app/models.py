from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON, ForeignKey
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    username = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    city = Column(String, nullable=False, default="")
    member_since = Column(String, nullable=False)   # ex: "Janvier 2024"
    level = Column(String, default="Expert")
    level_progress = Column(Integer, default=0)     # 0-100
    bike_brand = Column(String, nullable=False, default="")
    bike_model = Column(String, nullable=False, default="")
    bike_year = Column(Integer, nullable=False, default=0)
    bike_color = Column(String, default="#1A3A6B")

    # ── Auth ──────────────────────────────────────────────────────────────
    password_hash = Column(String, nullable=False, default="")
    # False jusqu'à ce que l'utilisateur ait renseigné vélo + pneus la première fois
    onboarding_completed = Column(Boolean, default=False)


class Session(Base):
    """Jeton de session opaque (Bearer) — pas de JWT, juste une table de tokens."""
    __tablename__ = "sessions"

    token = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, nullable=False)
    expires_at = Column(DateTime, nullable=False)


class Tire(Base):
    """Pneu actuellement monté sur une roue (front / rear)."""
    __tablename__ = "tires"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    wheel = Column(String, nullable=False)          # "front" | "rear"
    brand = Column(String, nullable=False)          # "michelin" | "other"
    catalog_id = Column(String, nullable=True)      # id dans TireCatalog
    name = Column(String, nullable=False)           # nom affiché
    size = Column(String, nullable=False)
    category = Column(String, nullable=True)        # pour marque "other"
    wear_pct = Column(Integer, default=0)           # 0-100
    installed_date = Column(String, nullable=False)
    installed_km = Column(Integer, default=0)       # kilométrage total à l'installation


class TireCatalog(Base):
    """Catalogue Michelin — réplique du MICHELIN_TIRES côté frontend."""
    __tablename__ = "tire_catalog"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)           # Route | Gravel | VTT | Piste | Urbain (legacy, sert au matching recommend.py)
    sizes = Column(JSON, nullable=False)            # list[str]
    description = Column(Text, nullable=False)
    max_pressure = Column(String, nullable=False)
    weight = Column(String, nullable=False)
    tag = Column(String, nullable=True)
    life_km = Column(Integer, nullable=True)        # durée de vie nominale (km), sert au calcul d'usure

    # ── Gamme premium : métadonnées enrichies (recherche Michelin) ──────────
    discipline = Column(JSON, nullable=True)        # list[str] ex: ["Road"], ["Road","Gravel"]
    sub_family = Column(JSON, nullable=True)        # list[str] ex: ["Racing"], ["Endurance","All Road"]
    tubeless = Column(Boolean, nullable=True)        # compatible TLR
    casing = Column(String, nullable=True)           # ex: "3x120 TPI + Protek bead-to-bead"
    compound = Column(String, nullable=True)         # ex: "Gum-X", "Magi-X", "X-Miles"
    protection_level = Column(String, nullable=True) # "low" | "medium" | "high"
    riding_priority = Column(String, nullable=True)  # "racing" | "endurance" | "protection" | "durability" | ...
    terrain_tags = Column(JSON, nullable=True)        # list[str] ex: ["dry","wet","mud"]
    e_bike_compatible = Column(Boolean, nullable=True)


class WearRecord(Base):
    """Snapshot quotidien d'usure — alimente le graphique 30/60/90 jours."""
    __tablename__ = "wear_records"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(DateTime, nullable=False, index=True)
    front_wear = Column(Float, nullable=False)
    rear_wear = Column(Float, nullable=False)


class Ride(Base):
    """Sortie vélo (Strava-like)."""
    __tablename__ = "rides"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    date = Column(DateTime, nullable=False, index=True)
    distance_km = Column(Float, nullable=False)
    duration_seconds = Column(Integer, nullable=False)
    avg_speed = Column(Float, nullable=False)
    elevation_gain = Column(Integer, default=0)
    strava_id = Column(String, nullable=True)
    weather = Column(String, nullable=True)         # "dry" | "wet" | "mixed"
    surface_type = Column(String, nullable=True)    # "road" | "gravel" | "mixed" | "mtb_trail"


class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    # Objectifs (nullable selon le type)
    target_km = Column(Float, nullable=True)
    target_elevation = Column(Integer, nullable=True)
    target_rides = Column(Integer, nullable=True)
    # Progression
    progress_km = Column(Float, default=0)
    progress_elevation = Column(Integer, default=0)
    progress_rides = Column(Integer, default=0)
    # Résultat
    status = Column(String, default="active")       # "active" | "completed"
    participants = Column(Integer, default=0)
    rank = Column(Integer, nullable=True)           # classement final
    badge_emoji = Column(String, nullable=True)
    badge_label = Column(String, nullable=True)
    reward = Column(String, nullable=True)


class Event(Base):
    """Événement créé par un utilisateur — défi collectif à distance, sans lieu de RDV."""
    __tablename__ = "events"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    # Objectif (un seul rempli selon goal_type)
    goal_type = Column(String, nullable=False)        # "distance" | "elevation" | "rides"
    goal_value = Column(Float, nullable=False)
    terrain_type = Column(String, nullable=True)      # "route" | "gravel" | "vtt" | "mixte"
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    reward = Column(String, nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, nullable=False)


class EventParticipant(Base):
    """Lien utilisateur <-> événement rejoint."""
    __tablename__ = "event_participants"

    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    joined_at = Column(DateTime, nullable=False)


class TireTrial(Base):
    """Michelin Lab — tirage au sort pour tester un pneu pas encore commercialisé."""
    __tablename__ = "tire_trials"

    id = Column(Integer, primary_key=True)
    tire_name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    target_profile = Column(String, nullable=True)    # "route" | "gravel" | "vtt" | "tous"
    image_tag = Column(String, nullable=True)          # libellé visuel ("Prototype 2026", etc.)
    entries_open_date = Column(DateTime, nullable=False)
    entries_close_date = Column(DateTime, nullable=False)
    draw_date = Column(DateTime, nullable=False)
    slots = Column(Integer, nullable=False, default=1)  # nombre de gagnants tirés au sort
    status = Column(String, default="open")             # "open" | "closed" | "drawn"
    preorder_discount_pct = Column(Integer, nullable=True)  # offre pré-commande exclusive post-essai


class TireTrialEntry(Base):
    """Participation d'un utilisateur à un tirage au sort Michelin Lab."""
    __tablename__ = "tire_trial_entries"

    id = Column(Integer, primary_key=True)
    trial_id = Column(Integer, ForeignKey("tire_trials.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    entered_at = Column(DateTime, nullable=False)
    won = Column(Boolean, default=False)


class NotificationSettings(Base):
    __tablename__ = "notification_settings"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    enabled = Column(Boolean, default=True)
    pre_ride_enabled = Column(Boolean, default=True)
    delay_hours = Column(Integer, default=2)        # 1 | 2 | 4 | 12
    critical_only = Column(Boolean, default=False)


class StravaConnection(Base):
    __tablename__ = "strava_connection"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    connected = Column(Boolean, default=False)
    athlete_name = Column(String, nullable=True)
    last_sync = Column(DateTime, nullable=True)

    # OAuth Strava réel — restent null tant que le compte n'est pas connecté.
    strava_athlete_id = Column(Integer, nullable=True)
    access_token = Column(String, nullable=True)
    refresh_token = Column(String, nullable=True)
    expires_at = Column(Integer, nullable=True)  # timestamp unix (UTC) fourni par Strava
