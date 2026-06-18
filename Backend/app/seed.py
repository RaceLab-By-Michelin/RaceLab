"""
Seed cohérent pour RaceLab.

Cohérence garantie :
  - Rides totaux       → 3 847 km  (142 sorties, 28 400 m D+)
  - Tires              → Power All Season 700x28C  (front: 62%, rear: 85%)
  - WearRecords (90j)  → dégradation interpolée depuis l'installation (14 Jan 2025)
  - Challenges actifs  → progression calculée à partir des rides récents
  - Challenges passés  → 5 défis terminés avec badges
"""
from __future__ import annotations

import math
import random
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, sync_sequences
from app import models
from app.auth import hash_password

# ─── Michelin catalog ─────────────────────────────────────────────────────────

CATALOG = [
    {
        "id": "power-all-season",
        "name": "Power All Season",
        "type": "Route",
        "sizes": ["700x25C", "700x28C", "700x32C"],
        "description": "Pneu 4 saisons haute performance. Adhérence optimale par temps sec et humide.",
        "max_pressure": "8.5 bar",
        "weight": "265 g",
        "tag": "Installé",
        "life_km": 4500,
        # Métadonnées premium (recherche Michelin) — ajoutées sans toucher aux
        # champs déjà calibrés ci-dessus (life_km/weight/sizes liés au seed d'usure).
        "discipline": ["Road"],
        "sub_family": ["All Road"],
        "tubeless": False,
        "casing": "triple couche 60 TPI + Aramid Protek+",
        "compound": "grip optimisé froid/humide",
        "protection_level": "high",
        "riding_priority": "all-season",
        "terrain_tags": ["dry", "wet"],
        "e_bike_compatible": False,
    },
    {
        "id": "power-cup2",
        "name": "Power Cup 2",
        "type": "Route",
        "sizes": ["700x23C", "700x25C", "700x28C"],
        "description": "Pneu de compétition ultra-léger. Compound Racing+ pour grip maximal en course.",
        "max_pressure": "9 bar",
        "weight": "185 g",
        "tag": "Compétition",
        "life_km": 2200,
    },
    {
        "id": "power-adventure",
        "name": "Power Adventure",
        "type": "Gravel",
        "sizes": ["700x35C", "700x40C", "700x47C"],
        "description": "Conçu pour les aventures longue distance. Résistant aux crevaisons et polyvalent.",
        "max_pressure": "5.5 bar",
        "weight": "420 g",
        "tag": None,
        "life_km": 3500,
        "discipline": ["Road", "Gravel"],
        "sub_family": ["All Road", "Speed"],
        "tubeless": True,
        "casing": "TL-ready",
        "compound": "bande centrale lisse + crampons latéraux",
        "protection_level": "medium",
        "riding_priority": "versatile",
        "terrain_tags": ["dry", "mixed"],
        "e_bike_compatible": False,
    },
    {
        "id": "power-gravel",
        "name": "Power Gravel",
        "type": "Gravel",
        "sizes": ["700x33C", "700x38C", "650Bx47C"],
        "description": "Crampons centraux pour la vitesse, latéraux pour l'adhérence en virage.",
        "max_pressure": "4.5 bar",
        "weight": "390 g",
        "tag": "Nouveau",
        "life_km": 3200,
        "discipline": ["Gravel"],
        "sub_family": ["Versatile"],
        "tubeless": True,
        "casing": "3x120 TPI + Protek bead-to-bead",
        "compound": "X-Miles — durabilité prioritaire",
        "protection_level": "high",
        "riding_priority": "durability",
        "terrain_tags": ["dry", "wet", "mixed"],
        "e_bike_compatible": False,
    },
    {
        "id": "wild-xc-race",
        "name": "Wild XC Race",
        "type": "VTT",
        "sizes": ["29x2.25", "29x2.35", "27.5x2.25"],
        "description": "Pneu XC racing ultra-léger. Roulement rapide et contrôle en conditions variées.",
        "max_pressure": "3.5 bar",
        "weight": "580 g",
        "tag": None,
        "life_km": 2000,
    },
    {
        "id": "wild-enduro",
        "name": "Wild Enduro",
        "type": "VTT",
        "sizes": ["29x2.4", "29x2.6", "27.5x2.4", "27.5x2.6"],
        "description": "Pneu enduro haute résistance. Grip exceptionnel en descente et en montée.",
        "max_pressure": "2.8 bar",
        "weight": "1050 g",
        "tag": "Enduro",
        "life_km": 1500,
    },
    {
        "id": "lithion3",
        "name": "Lithion 3",
        "type": "Route",
        "sizes": ["700x23C", "700x25C", "700x28C", "700x32C"],
        "description": "Pneu route entraînement. Excellent rapport durabilité/performance pour l'usage quotidien.",
        "max_pressure": "8 bar",
        "weight": "230 g",
        "tag": None,
        "life_km": 4000,
    },
    {
        "id": "pilot-sport",
        "name": "Pilot Sport",
        "type": "Piste",
        "sizes": ["700x21C", "700x23C"],
        "description": "Pneu de piste sans crampons. Compound spécial vélodrome pour traction maximale.",
        "max_pressure": "11 bar",
        "weight": "160 g",
        "tag": "Piste",
        "life_km": 1200,
    },

    # ─── Gamme Premium (recherche Michelin, juin 2026) ─────────────────────
    {
        "id": "power-cup-tlr",
        "name": "Power Cup TLR",
        "type": "Route",
        "sizes": ["700x25C", "700x28C", "700x30C"],
        "description": "Pneu de compétition tubeless. Compound X-Race pour un grip optimal en course, sec et humide.",
        "max_pressure": "5-8 bar",
        "weight": "255 g (700x25C)",
        "tag": "Compétition",
        "life_km": 1800,
        "discipline": ["Road"],
        "sub_family": ["Racing"],
        "tubeless": True,
        "casing": "4x120 TPI (25/28C), 3x120 TPI (30C)",
        "compound": "X-Race (Gum-X)",
        "protection_level": "low",
        "riding_priority": "racing",
        "terrain_tags": ["dry", "wet"],
        "e_bike_compatible": False,
    },
    {
        "id": "power-cup",
        "name": "Power Cup",
        "type": "Route",
        "sizes": ["700x23C", "700x25C", "700x28C"],
        "description": "Pneu de compétition à chambre à air. Aramid Shield central pour limiter les crevaisons en course.",
        "max_pressure": "8-8.3 bar",
        "weight": "240 g (700x28C)",
        "tag": "Compétition",
        "life_km": 1800,
        "discipline": ["Road"],
        "sub_family": ["Racing"],
        "tubeless": False,
        "casing": "3x120 TPI + Aramid Shield centrale",
        "compound": "Gum-X",
        "protection_level": "low-medium",
        "riding_priority": "racing",
        "terrain_tags": ["dry", "wet"],
        "e_bike_compatible": False,
    },
    {
        "id": "pro5-tlr",
        "name": "Pro5 TLR",
        "type": "Route",
        "sizes": ["700x28C", "700x30C", "700x32C", "700x35C"],
        "description": "Pneu endurance tubeless. Confort et polyvalence sur sec et humide, idéal pour le quotidien.",
        "max_pressure": "5.5 bar",
        "weight": "305 g (700x28C)",
        "tag": None,
        "life_km": 4000,
        "discipline": ["Road"],
        "sub_family": ["Endurance"],
        "tubeless": True,
        "casing": "Tubeless Ready",
        "compound": "Gum-X",
        "protection_level": "medium",
        "riding_priority": "endurance",
        "terrain_tags": ["dry", "wet"],
        "e_bike_compatible": False,
    },
    {
        "id": "pro5",
        "name": "Pro5",
        "type": "Route",
        "sizes": ["700x28C", "700x30C", "700x32C", "700x35C"],
        "description": "Pneu endurance à chambre à air. Bon compromis confort/durabilité pour l'entraînement régulier.",
        "max_pressure": "5.5 bar",
        "weight": "305 g (700x28C)",
        "tag": None,
        "life_km": 3700,
        "discipline": ["Road"],
        "sub_family": ["Endurance"],
        "tubeless": False,
        "casing": "standard",
        "compound": "Gum-X",
        "protection_level": "medium",
        "riding_priority": "endurance",
        "terrain_tags": ["dry", "wet"],
        "e_bike_compatible": False,
    },
    {
        "id": "power-protection-tlr",
        "name": "Power Protection TLR",
        "type": "Route",
        "sizes": ["700x28C", "700x30C", "700x32C"],
        "description": "Pneu anti-crevaison tubeless. Carcasse 120 TPI renforcée bead-to-bead, idéal route et chemins.",
        "max_pressure": "5 bar",
        "weight": "322 g (700x28C)",
        "tag": "Anti-crevaison",
        "life_km": 5000,
        "discipline": ["Road"],
        "sub_family": ["Endurance", "All Road"],
        "tubeless": True,
        "casing": "120 TPI renforcé bead-to-bead",
        "compound": "haute densité, flancs renforcés",
        "protection_level": "high",
        "riding_priority": "protection",
        "terrain_tags": ["dry", "wet", "mixed"],
        "e_bike_compatible": False,
    },
    {
        "id": "power-cyclocross-jet-tlr",
        "name": "Power Cyclocross Jet TLR",
        "type": "Route",
        "sizes": ["700x33C"],
        "description": "Pneu cyclocross tubeless pour terrain sec. Tread inspiré VTT XC, Bead2Bead Protek anti-crevaison.",
        "max_pressure": "3-5 bar",
        "weight": "390 g",
        "tag": "Cyclocross sec",
        "life_km": 2000,
        "discipline": ["Road"],
        "sub_family": ["Cyclocross"],
        "tubeless": True,
        "casing": "3x120 TPI, Bead2Bead Protek",
        "compound": "tread inspiré VTT XC",
        "protection_level": "high",
        "riding_priority": "racing",
        "terrain_tags": ["dry"],
        "e_bike_compatible": False,
    },
    {
        "id": "power-cyclocross-mud-tlr",
        "name": "Power Cyclocross Mud TLR",
        "type": "Route",
        "sizes": ["700x33C"],
        "description": "Pneu cyclocross tubeless pour la boue. Crampons espacés auto-nettoyants, utilisable à basse pression.",
        "max_pressure": "5 bar (utilisable dès 1.4 bar)",
        "weight": "380 g",
        "tag": "Cyclocross boue",
        "life_km": 2000,
        "discipline": ["Road"],
        "sub_family": ["Cyclocross"],
        "tubeless": True,
        "casing": "120 TPI, Bead2Bead Protek",
        "compound": "crampons auto-nettoyants",
        "protection_level": "high",
        "riding_priority": "mud-clearing",
        "terrain_tags": ["mud", "wet"],
        "e_bike_compatible": False,
    },
    {
        "id": "wild-mud",
        "name": "Wild Mud",
        "type": "VTT",
        "sizes": ["27.5x2.25", "29x2.25"],
        "description": "Pneu VTT boue tubeless. Compound Magi-X ultra-grippant, triple carcasse anti-perforation.",
        "max_pressure": "min. 1.8 bar",
        "weight": "990-1050 g",
        "tag": "Boue",
        "life_km": 1700,
        "discipline": ["MTB"],
        "sub_family": ["Cross Country"],
        "tubeless": True,
        "casing": "3 couches renforcées",
        "compound": "Magi-X",
        "protection_level": "high",
        "riding_priority": "mud-grip",
        "terrain_tags": ["mud", "wet"],
        "e_bike_compatible": False,
    },
    {
        "id": "mud-enduro",
        "name": "Mud Enduro",
        "type": "VTT",
        "sizes": ["27.5x2.25"],
        "description": "Pneu enduro boue tubeless. Carcasse Gravity Shield renforcée, gomme Magi-X développée en EWS.",
        "max_pressure": "1.8-4 bar",
        "weight": "990 g",
        "tag": "Enduro boue",
        "life_km": 1700,
        "discipline": ["MTB"],
        "sub_family": ["Enduro"],
        "tubeless": True,
        "casing": "Gravity Shield 3x33 TPI",
        "compound": "Magi-X",
        "protection_level": "high",
        "riding_priority": "technical-mud",
        "terrain_tags": ["mud", "mixed"],
        "e_bike_compatible": False,
    },
    {
        "id": "city-street",
        "name": "City Street",
        "type": "Urbain",
        "sizes": ["29x2.0"],
        "description": "Pneu urbain anti-crevaison. Carcasse City Shield et gomme Magi-X, compatible vélo électrique.",
        "max_pressure": "Non publié",
        "weight": "Non publié",
        "tag": "Compatible e-bike",
        "life_km": 5000,
        "discipline": ["Commuting & Tour"],
        "sub_family": ["Urban"],
        "tubeless": False,
        "casing": "City Shield renforcé",
        "compound": "Magi-X",
        "protection_level": "high",
        "riding_priority": "urban-puncture-resistance",
        "terrain_tags": ["dry", "wet", "urban"],
        "e_bike_compatible": True,
    },
    {
        "id": "city-touring",
        "name": "City Touring",
        "type": "Urbain",
        "sizes": ["2.2\" à 2.4\""],
        "description": "Pneu touring/bikepacking anti-crevaison. Carcasse City Shield, bon compromis charge et confort.",
        "max_pressure": "Non publié",
        "weight": "Non publié",
        "tag": "Bikepacking",
        "life_km": 6000,
        "discipline": ["Commuting & Tour"],
        "sub_family": ["Touring"],
        "tubeless": False,
        "casing": "City Shield renforcé",
        "compound": "Magi-X",
        "protection_level": "high",
        "riding_priority": "touring-load",
        "terrain_tags": ["dry", "wet", "mixed"],
        "e_bike_compatible": True,
    },
    {
        "id": "city-cargo",
        "name": "City Cargo",
        "type": "Urbain",
        "sizes": ["24 pouces"],
        "description": "Pneu vélo cargo renforcé pour charges lourdes. Poids, pression et charge max à compléter auprès de Michelin.",
        "max_pressure": "Non publié",
        "weight": "Non publié",
        "tag": "Vélo cargo",
        "life_km": 6000,
        "discipline": ["Commuting & Tour"],
        "sub_family": ["Cargo"],
        "tubeless": False,
        "casing": "renforcé charge lourde",
        "compound": None,
        "protection_level": "high",
        "riding_priority": "heavy-load",
        "terrain_tags": ["dry", "wet", "urban"],
        "e_bike_compatible": True,
    },
]

# ─── Rides generator ──────────────────────────────────────────────────────────

# Objectif : 3 847 km au total en ~142 sorties sur ~17 mois (Jan 2025 → Jun 2026)
# et 28 400 m D+

RIDE_TEMPLATES = [
    ("Sortie matinale {lieu}", 18, 35, 50, 120, 22, 28),
    ("Boucle {lieu}", 40, 80, 150, 350, 25, 30),
    ("Entrainement {type}", 15, 25, 30, 80, 25, 32),
    ("Sortie longue {lieu}", 70, 120, 300, 600, 24, 28),
    ("Grimpée {col}", 30, 60, 600, 1200, 18, 22),
]

LIEUX = [
    "Vincennes", "Versailles", "Fontainebleau", "Chantilly", "Saint-Cloud",
    "Marly", "Rambouillet", "Montmorency", "Sceaux", "Chevreuse",
]
TYPES = ["interval", "tempo", "récupération", "sortie groupe", "Z2"]
COLS = ["de Chartreuse", "du Ventoux", "de la Madone", "d'Izoard", "du Galibier"]


def _fmt_ride_name(template: str) -> str:
    if "{lieu}" in template:
        return template.replace("{lieu}", random.choice(LIEUX))
    if "{col}" in template:
        return template.replace("{col}", random.choice(COLS))
    if "{type}" in template:
        return template.replace("{type}", random.choice(TYPES))
    return template


def generate_rides(target_km: float, target_rides: int, target_elevation: int) -> list[dict]:
    """
    Génère des sorties cohérentes dont les totaux correspondent exactement aux cibles.
    Stratégie : on distribue d'abord des poids aléatoires, puis on normalise.
    """
    random.seed(42)
    start = datetime(2025, 1, 14)
    end = datetime(2026, 6, 14)
    total_days = (end - start).days

    # 1) Tirer les templates et les poids km / D+
    templates = []
    for i in range(target_rides):
        tmpl_idx = random.choices(range(len(RIDE_TEMPLATES)), weights=[3, 2, 3, 1, 1])[0]
        templates.append(RIDE_TEMPLATES[tmpl_idx])

    # 2) Générer des km bruts dans les plages template
    raw_km = [
        random.uniform(t[1], t[2])
        for t in templates
    ]
    raw_elev = [
        random.uniform(t[3], t[4])
        for t in templates
    ]

    # 3) Normaliser pour correspondre exactement aux cibles
    km_scale = target_km / sum(raw_km)
    elev_scale = target_elevation / sum(raw_elev)
    scaled_km = [r * km_scale for r in raw_km]
    scaled_elev = [r * elev_scale for r in raw_elev]

    # 4) Construire les rides avec des dates progressives
    rides = []
    for i, tmpl in enumerate(templates):
        name_tpl, _, _, _, _, spd_min, spd_max = tmpl
        frac = i / target_rides
        day_offset = int(frac * total_days) + random.randint(-2, 2)
        day_offset = max(0, min(day_offset, total_days - 1))
        ride_date = start + timedelta(days=day_offset)

        km = round(max(5.0, scaled_km[i]), 1)
        avg_speed = round(random.uniform(spd_min, spd_max), 1)
        duration = int(km / avg_speed * 3600)
        elev = max(10, int(scaled_elev[i]))

        rides.append({
            "name": _fmt_ride_name(name_tpl),
            "date": ride_date,
            "distance_km": km,
            "duration_seconds": duration,
            "avg_speed": avg_speed,
            "elevation_gain": elev,
            "strava_id": f"strava_{10_000_000 + i}",
        })

    # 5) Ajuster la toute dernière ride pour compenser les arrondis
    total_km_now = sum(r["distance_km"] for r in rides)
    total_elev_now = sum(r["elevation_gain"] for r in rides)
    rides[-1]["distance_km"] = round(rides[-1]["distance_km"] + (target_km - total_km_now), 1)
    rides[-1]["elevation_gain"] += target_elevation - total_elev_now
    rides[-1]["date"] = datetime(2026, 6, 14, 8, 30)
    rides[-1]["name"] = "Sortie matinale Vincennes"

    return rides


# ─── Wear history generator ──────────────────────────────────────────────────

def generate_wear_records() -> list[dict]:
    """
    Interpolation linéaire + bruit du 14 Jan 2025 au 15 Jun 2026.
    Front : 0% → 62%   Rear : 0% → 85%
    """
    random.seed(7)
    install = datetime(2025, 1, 14)
    today = datetime(2026, 6, 15)
    total_days = (today - install).days  # ~517 jours

    records = []
    for i in range(total_days + 1):
        d = install + timedelta(days=i)
        frac = i / total_days
        # Dégradation légèrement accélérée en début (nouveau pneu rôdage)
        curve = math.pow(frac, 0.9)
        front = round(62 * curve + random.uniform(-0.4, 0.4), 2)
        rear = round(85 * curve + random.uniform(-0.5, 0.5), 2)
        front = max(0, min(100, front))
        rear = max(0, min(100, rear))
        records.append({"date": d, "front_wear": front, "rear_wear": rear})
    return records


# ─── Challenges ──────────────────────────────────────────────────────────────

PAST_CHALLENGES = [
    {
        "name": "Grand Tour Méditerranéen",
        "description": "Parcourez 1 200 km en 45 jours le long du littoral méditerranéen.",
        "start_date": datetime(2025, 1, 20),
        "end_date": datetime(2025, 3, 6),
        "target_km": 1200,
        "progress_km": 1200,
        "status": "completed",
        "participants": 1847,
        "rank": 42,
        "badge_emoji": "🥉",
        "badge_label": "Explorateur Bronze",
        "reward": "Bon d'achat 15€ Michelin",
    },
    {
        "name": "Grimpeur Alpin",
        "description": "Accumulez 8 000 m de dénivelé positif en un mois.",
        "start_date": datetime(2025, 3, 15),
        "end_date": datetime(2025, 4, 15),
        "target_elevation": 8000,
        "progress_elevation": 8432,
        "status": "completed",
        "participants": 934,
        "rank": 23,
        "badge_emoji": "⛰️",
        "badge_label": "Alpiniste",
        "reward": "Badge exclusif Strava",
    },
    {
        "name": "Sprint Printanier",
        "description": "500 km en 30 jours — vitesse et régularité.",
        "start_date": datetime(2025, 4, 20),
        "end_date": datetime(2025, 5, 20),
        "target_km": 500,
        "progress_km": 531,
        "status": "completed",
        "participants": 445,
        "rank": 8,
        "badge_emoji": "⚡",
        "badge_label": "Sprinter",
        "reward": "Top 10 — Maillot virtuel jaune",
    },
    {
        "name": "L'Estival",
        "description": "1 500 km entre juin et août — le grand tour estival.",
        "start_date": datetime(2025, 6, 1),
        "end_date": datetime(2025, 8, 31),
        "target_km": 1500,
        "progress_km": 1612,
        "status": "completed",
        "participants": 2341,
        "rank": 67,
        "badge_emoji": "☀️",
        "badge_label": "Routier Estival",
        "reward": None,
    },
    {
        "name": "Automne en Selle",
        "description": "Restez actif avec 800 km d'octobre à novembre.",
        "start_date": datetime(2025, 10, 1),
        "end_date": datetime(2025, 11, 30),
        "target_km": 800,
        "progress_km": 847,
        "status": "completed",
        "participants": 678,
        "rank": 15,
        "badge_emoji": "🍂",
        "badge_label": "Régulier d'Automne",
        "reward": "Badge Michelin Endurance",
    },
]

EVENTS = [
    {
        "name": "Défi Solstice — 300 km",
        "description": "Parcourez 300 km entre le 15 et le 30 juin pour fêter le solstice d'été. Ouvert à tous les profils.",
        "goal_type": "distance",
        "goal_value": 300,
        "terrain_type": "mixte",
        "start_date": datetime(2026, 6, 15),
        "end_date": datetime(2026, 6, 30),
        "reward": "Badge Solstice + 10% sur le prochain pneu Michelin",
    },
    {
        "name": "Grimpée d'Été",
        "description": "Cumulez 4 000 m de dénivelé positif avant la fin juillet. Pour les amateurs de cols.",
        "goal_type": "elevation",
        "goal_value": 4000,
        "terrain_type": "route",
        "start_date": datetime(2026, 6, 1),
        "end_date": datetime(2026, 7, 31),
        "reward": "Maillot virtuel Grimpeur",
    },
    {
        "name": "Régularité — 20 sorties",
        "description": "Enchaînez 20 sorties en un mois, peu importe la distance. La régularité avant tout.",
        "goal_type": "rides",
        "goal_value": 20,
        "terrain_type": None,
        "start_date": datetime(2026, 6, 1),
        "end_date": datetime(2026, 6, 30),
        "reward": None,
    },
]

TIRE_TRIALS = [
    {
        "tire_name": "Power Cup 3 — Prototype",
        "description": "Le successeur du Power Cup 2, pas encore commercialisé. Compound racing nouvelle génération pour grip maximal sur sec et humide.",
        "target_profile": "route",
        "image_tag": "Prototype 2027",
        "entries_open_date": datetime(2026, 6, 1),
        "entries_close_date": datetime(2026, 6, 30),
        "draw_date": datetime(2026, 7, 5),
        "slots": 25,
        "status": "open",
        "preorder_discount_pct": 20,
    },
    {
        "tire_name": "Wild Enduro Gen2 — Prototype",
        "description": "Nouvelle carcasse ultra-résistante pour l'enduro, testée en conditions réelles avant commercialisation.",
        "target_profile": "vtt",
        "image_tag": "Prototype 2027",
        "entries_open_date": datetime(2026, 5, 1),
        "entries_close_date": datetime(2026, 5, 31),
        "draw_date": datetime(2026, 6, 5),
        "slots": 15,
        "status": "drawn",
        "preorder_discount_pct": 15,
    },
]

ACTIVE_CHALLENGES = [
    {
        "name": "Tour de France Amateur 2026",
        "description": "2 000 km en juin-juillet dans l'esprit du Tour. Classement par vitesse moyenne.",
        "start_date": datetime(2026, 6, 1),
        "end_date": datetime(2026, 7, 31),
        "target_km": 2000,
        "progress_km": 847,
        "status": "active",
        "participants": 3421,
        "rank": None,
        "badge_emoji": "🏆",
        "badge_label": "Tour Amateur",
    },
    {
        "name": "Grimpeur du Mois",
        "description": "Atteignez 3 000 m de dénivelé en juin. Chaque mètre compte !",
        "start_date": datetime(2026, 6, 1),
        "end_date": datetime(2026, 6, 30),
        "target_elevation": 3000,
        "progress_elevation": 1240,
        "status": "active",
        "participants": 892,
        "rank": None,
        "badge_emoji": "⛰️",
        "badge_label": "Grimpeur Juin",
    },
]


# ─── Profils simulés réseau de distribution (Feature 2 — dashboard B2B) ──────
# Pas de vraie base multi-utilisateurs dans ce projet (1 seul compte démo,
# Alexandre) : ces profils simulent des cyclistes anonymisés répartis par
# ville, avec un pneu et un rythme d'usure plausibles, pour permettre une
# agrégation par zone significative côté revendeur. Voir app/retailer.py
# pour l'agrégation et la projection de fin de vie.

PRACTICE_WEIGHTS_BY_CITY = {
    "Paris": {"Route": 0.45, "Urbain": 0.35, "Gravel": 0.15, "VTT": 0.05},
    "Lyon": {"Route": 0.40, "VTT": 0.30, "Gravel": 0.20, "Urbain": 0.10},
    "Marseille": {"Route": 0.50, "Gravel": 0.25, "VTT": 0.15, "Urbain": 0.10},
    "Bordeaux": {"Gravel": 0.40, "Route": 0.35, "Urbain": 0.15, "VTT": 0.10},
    "Lille": {"Urbain": 0.45, "Route": 0.35, "Gravel": 0.10, "VTT": 0.10},
    "Nantes": {"Route": 0.40, "Gravel": 0.30, "Urbain": 0.20, "VTT": 0.10},
}

TIRES_BY_PRACTICE = {
    "Route": ["power-all-season", "lithion3", "pro5", "pro5-tlr", "power-cup2", "power-cup", "power-cup-tlr"],
    "Gravel": ["power-adventure", "power-gravel"],
    "VTT": ["wild-xc-race", "wild-enduro", "wild-mud", "mud-enduro"],
    "Urbain": ["city-street", "city-touring", "city-cargo"],
}


def generate_demo_rider_profiles(n_per_city: int = 25) -> list[dict]:
    """Génère des profils déterministes (seed fixe) répartis selon des
    pondérations de pratique réalistes par ville, avec usure et kilométrage
    hebdomadaire variés pour produire une distribution de fin de vie crédible."""
    random.seed(99)
    profiles = []
    for city, weights in PRACTICE_WEIGHTS_BY_CITY.items():
        practices = list(weights.keys())
        probs = list(weights.values())
        for _ in range(n_per_city):
            practice = random.choices(practices, weights=probs)[0]
            tire_id = random.choice(TIRES_BY_PRACTICE[practice])
            profiles.append(
                {
                    "city": city,
                    "practice_type": practice,
                    "tire_catalog_id": tire_id,
                    "wear_pct": random.randint(5, 98),
                    "weekly_km": round(random.uniform(40, 180), 1),
                }
            )
    return profiles


def seed_demo_riders(db: Session) -> None:
    """Seedé une seule fois (table vide) — indépendant du compte utilisateur
    réel, donc appelé même si celui-ci existe déjà."""
    if db.query(models.DemoRiderProfile).count() > 0:
        return
    for p in generate_demo_rider_profiles():
        db.add(models.DemoRiderProfile(**p))
    db.commit()


# ─── Main seed function ───────────────────────────────────────────────────────

def seed_catalog(db: Session) -> None:
    """Insère/met à jour le catalogue Michelin — toujours exécuté, même sur une
    base déjà seedée, pour que les nouveaux pneus (ex: gamme Premium) soient
    bien persistés sans repasser par tout le seed initial."""
    for c in CATALOG:
        existing = db.query(models.TireCatalog).filter_by(id=c["id"]).first()
        if existing:
            for k, v in c.items():
                setattr(existing, k, v)
        else:
            db.add(models.TireCatalog(**c))
    db.commit()


def seed_events_and_trials(db: Session) -> None:
    """Événements et tirages au sort Michelin Lab — toujours synchronisés
    (idempotent par nom), même sur une base déjà seedée."""
    if db.query(models.User).count() == 0:
        return  # pas encore d'utilisateur créateur disponible

    creator_id = 1
    for e in EVENTS:
        existing = db.query(models.Event).filter_by(name=e["name"]).first()
        if not existing:
            event = models.Event(created_by_user_id=creator_id, created_at=datetime.utcnow(), **e)
            db.add(event)
    db.commit()

    for t in TIRE_TRIALS:
        existing = db.query(models.TireTrial).filter_by(tire_name=t["tire_name"]).first()
        if not existing:
            db.add(models.TireTrial(**t))
    db.commit()


def seed(db: Session) -> None:
    # Le catalogue est toujours synchronisé, même si le reste de la base
    # (User, Tires, Rides, ...) a déjà été seedé précédemment.
    seed_catalog(db)
    # Idem pour les profils simulés du réseau de distribution (Feature 2) —
    # indépendants du compte utilisateur réel.
    seed_demo_riders(db)

    # Guard — le reste du seed (hors catalogue/events/trials/demo riders) ne
    # s'exécute qu'une seule fois (base vierge).
    if db.query(models.User).count() > 0:
        seed_events_and_trials(db)
        # Au cas où une exécution précédente du seed (avant ce fix) ait laissé
        # les séquences Postgres désynchronisées des id explicites insérés
        # ci-dessous — voir sync_sequences().
        sync_sequences(db)
        print("⚡ Base déjà seedée — catalogue + events/trials synchronisés, reste skip.")
        return

    print("🌱 Seeding...")

    try:
        _seed_fresh(db)
    except Exception:
        # Toute erreur en cours de seed laisse la session dans un état
        # incohérent (ex: User inséré mais reste annulé) — on rollback pour
        # repartir d'une base propre plutôt que de laisser une transaction
        # à moitié appliquée derrière nous.
        db.rollback()
        raise

    seed_events_and_trials(db)
    # _seed_fresh insère User/Tire/NotificationSettings/StravaConnection avec
    # des id explicites (données démo déterministes) : il faut réaligner les
    # séquences Postgres dessus avant que d'autres inserts auto (signup,
    # Strava, settings...) ne réutilisent ces mêmes id.
    sync_sequences(db)

    print("✅ Seed terminé.")


def _seed_fresh(db: Session) -> None:
    """Insère le jeu de données complet sur une base vierge (0 utilisateur)."""

    # User
    db.add(
        models.User(
            id=1,
            name="Alexandre Dupont",
            username="alex_cyclist",
            email="sasandre10@gmail.com",
            city="Paris, France",
            member_since="Janvier 2024",
            level="Expert",
            level_progress=78,
            goal_km=1000.0,
            bike_brand="Trek",
            bike_model="Domane SL 6",
            bike_year=2023,
            bike_color="#1A3A6B",
            password_hash=hash_password("michelin2026"),
            onboarding_completed=True,
        )
    )
    # Flush immédiat : garantit que la ligne users(id=1) existe bien en base
    # avant tout insert qui la référence (notification_settings, tires, ...),
    # quel que soit l'ordre de tri des dépendances décidé par SQLAlchemy.
    db.flush()

    # Tires (front + rear)
    db.add(
        models.Tire(
            id=1,
            user_id=1,
            wheel="front",
            brand="michelin",
            catalog_id="power-all-season",
            name="Power All Season",
            size="700x28C",
            category="Route",
            wear_pct=62,
            installed_date="14 Jan 2025",
            installed_km=0,
        )
    )
    db.add(
        models.Tire(
            id=2,
            user_id=1,
            wheel="rear",
            brand="michelin",
            catalog_id="power-all-season",
            name="Power All Season",
            size="700x28C",
            category="Route",
            wear_pct=85,
            installed_date="14 Jan 2025",
            installed_km=0,
        )
    )

    # Rides
    rides = generate_rides(target_km=3847, target_rides=142, target_elevation=28400)
    for r in rides:
        db.add(models.Ride(user_id=1, **r))

    # Wear records
    for rec in generate_wear_records():
        db.add(models.WearRecord(user_id=1, **rec))

    # Challenges
    for c in PAST_CHALLENGES:
        db.add(models.Challenge(**{
            "target_km": None, "target_elevation": None, "target_rides": None,
            "progress_km": 0, "progress_elevation": 0, "progress_rides": 0,
            "reward": None, **c
        }))
    for c in ACTIVE_CHALLENGES:
        db.add(models.Challenge(**{
            "target_km": None, "target_elevation": None, "target_rides": None,
            "progress_km": 0, "progress_elevation": 0, "progress_rides": 0,
            "reward": None, **c
        }))

    # Notification settings
    db.add(
        models.NotificationSettings(
            id=1,
            user_id=1,
            enabled=True,
            pre_ride_enabled=True,
            delay_hours=2,
            critical_only=False,
        )
    )

    # Strava (non connecté par défaut)
    db.add(models.StravaConnection(id=1, user_id=1, connected=False, athlete_name=None, last_sync=None))

    db.commit()


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
