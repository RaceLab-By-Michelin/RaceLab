"""
Simulation de "points chauds" mécaniques par sortie.

Strava ne nous donne pas (et même avec un vrai compte Strava connecté, le
stream "temp" est quasi toujours vide — peu de capteurs grand public en
mesurent) : on n'a aucune trace GPS seconde-par-seconde dans ce projet, juste
des agrégats par sortie (distance, D+ total, météo, surface). Plutôt que
d'attendre une vraie intégration Strava (payante / nécessite l'OAuth d'un
compte réel), ce module *simule* une analyse de descente plausible à partir
de ces agrégats, avec des valeurs déterministes (seedées sur l'id de la
sortie) pour que le récit ne change pas à chaque rechargement.

Le multiplicateur de stress thermique/cornering est calibré pour rester
cohérent avec le modèle d'usure réel (`app/wear.py`) : le nombre de "km
d'usure équivalente" annoncé dérive du même taux de base (%/km) que celui
utilisé pour calculer l'usure réelle du pneu, pas d'une valeur inventée.
"""
from __future__ import annotations

import random
from datetime import datetime

from app import models, wear

# Température moyenne de l'air par mois (France, climat tempéré) — sert de
# point de départ avant d'ajouter l'effet d'exposition solaire de la chaussée.
AIR_TEMP_BY_MONTH = {
    1: 5, 2: 6, 3: 9, 4: 12, 5: 16, 6: 20,
    7: 23, 8: 23, 9: 19, 10: 14, 11: 9, 12: 6,
}

# Écart bitume/air selon les conditions : grand soleil sur asphalte sec
# (+15 à +20°C typique), nettement moins sous nuages/pluie.
ROAD_TEMP_OFFSET_BY_WEATHER = {
    "dry": 18.0,
    "mixed": 8.0,
    "wet": 2.0,
}

ORDINALS_FR = {
    1: "premier", 2: "deuxième", 3: "troisième", 4: "quatrième",
    5: "cinquième", 6: "sixième", 7: "septième",
}

BRAKING_LABELS = ["modéré", "appuyé", "très appuyé"]
BRAKING_FACTOR = {"modéré": 1.0, "appuyé": 1.4, "très appuyé": 1.8}

# Seuils à partir desquels une sortie est jugée assez vallonnée/longue pour
# contenir une descente technique racontable (sinon on ne génère rien).
MIN_DISTANCE_KM = 15.0
MIN_ELEVATION_RATIO = 8.0  # m de D+ par km
METERS_PER_CLIMB = 220  # taille moyenne d'un "col" pour estimer leur nombre


def estimate_road_temp_c(ride_date: datetime, weather_cond: str | None) -> float:
    """Estimation — pas une mesure. Approxime la température de surface de
    la route à partir de la saison et de la météo déclarée de la sortie."""
    air_temp = AIR_TEMP_BY_MONTH.get(ride_date.month, 15)
    offset = ROAD_TEMP_OFFSET_BY_WEATHER.get(weather_cond or "dry", 12.0)
    return air_temp + offset


def _ordinal(n: int) -> str:
    return ORDINALS_FR.get(n, f"{n}e")


def generate_descent_hotspot(
    ride: models.Ride,
    rear_tire_category: str | None,
    rear_tire_life_km: int | None,
) -> dict | None:
    """Simule un évènement de descente technique pour `ride`, ou None si la
    sortie n'est pas assez vallonnée/longue pour que ce récit soit crédible.

    Déterministe : seedé sur l'id de la sortie, donc stable entre deux appels
    de /coach/tips pour la même sortie.
    """
    if ride.distance_km < MIN_DISTANCE_KM:
        return None
    ratio = (ride.elevation_gain or 0) / ride.distance_km
    if ratio < MIN_ELEVATION_RATIO:
        return None

    rng = random.Random(f"ride-hotspot-{ride.id}")

    num_climbs = max(1, round((ride.elevation_gain or 0) / METERS_PER_CLIMB))
    col_index = min(3, num_climbs)  # "3e col" si dispo, sinon le dernier existant

    corner_count = rng.randint(3, 6)
    peak_speed_kmh = rng.uniform(46, 64)
    braking = rng.choice(BRAKING_LABELS)
    road_temp_c = estimate_road_temp_c(ride.date, ride.weather) + rng.uniform(-2, 2)

    # Stress thermique/cornering : croît avec le carré de la vitesse (énergie
    # cinétique à dissiper au freinage), avec la température de surface
    # (la gomme ramollit, l'abrasion augmente), et avec l'intensité de
    # freinage juste avant l'épingle.
    speed_factor = (peak_speed_kmh / 40.0) ** 2
    temp_factor = max(1.0, road_temp_c / 25.0)
    brake_factor = BRAKING_FACTOR[braking]
    stress_multiplier = speed_factor * temp_factor * brake_factor

    # On exprime le résultat en "km d'usure standard équivalente" en
    # réutilisant le taux de base (%/km) du vrai modèle d'usure : la sortie
    # type "quelques virages serrés" représente ~0.6 km de route, mais sous
    # ce stress elle équivaut à `stress_multiplier` fois plus d'usure que ces
    # mêmes 0.6 km roulés normalement.
    k_base = wear.base_rate(rear_tire_life_km, rear_tire_category)
    effective_km = 0.6
    equivalent_wear_pct = effective_km * k_base * stress_multiplier
    equivalent_km = equivalent_wear_pct / k_base if k_base > 0 else 0.0

    message = (
        f"Dans la descente du {_ordinal(col_index)} col, la combinaison de ta vitesse "
        f"({peak_speed_kmh:.0f} km/h), d'un freinage {braking} avant l'épingle et de la "
        f"température estimée du sol ({road_temp_c:.0f}°C) a généré un pic de contrainte "
        f"thermique sur ta gomme arrière. Tu as consommé l'équivalent de {equivalent_km:.0f} km "
        f"d'usure standard en seulement {corner_count} virages."
    )

    return {
        "col_index": col_index,
        "corner_count": corner_count,
        "peak_speed_kmh": round(peak_speed_kmh),
        "road_temp_c": round(road_temp_c),
        "braking": braking,
        "equivalent_km": round(equivalent_km, 1),
        "message": message,
    }
