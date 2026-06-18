"""
Calcul de l'usure des pneus.

Modèle :
    usure_sortie (%) = distance_km
                        * k_base                (taux %/km calibré sur la durée de vie nominale du pneu)
                        * f_denivelé
                        * f_meteo
                        * f_surface
                        * f_position_roue
                        * f_poids_cycliste

Plus un terme de vieillissement passif lié au temps écoulé (dégradation de la
gomme même hors utilisation), appliqué séparément via `aging_wear`.

Le poids du cycliste influence directement l'usure : un pneu chargé davantage
(cycliste + vélo plus lourds) se déforme plus sous la roue, chauffe plus et
use sa gomme plus vite — c'est un effet physique bien documenté (cf. f_poids_cycliste
ci-dessous). La taille n'a pas d'effet direct sur l'usure d'un pneu (ce n'est
pas une charge) : elle n'intervient donc pas dans ce calcul, mais elle est tout
de même demandée et stockée pour le profil cycliste.

Toutes les fonctions sont pures (aucun accès DB) pour rester faciles à tester.
"""
from __future__ import annotations

from app import models

# Durée de vie par défaut (km) si aucune valeur n'est définie au catalogue,
# indexée sur la catégorie du pneu.
DEFAULT_LIFE_KM_BY_CATEGORY = {
    "Route": 4000,
    "Gravel": 3300,
    "VTT": 1800,
    "Piste": 1200,
}
FALLBACK_LIFE_KM = 3000

# Usure passive : un pneu se dégrade légèrement même sans rouler
# (UV, ozone, durcissement de la gomme). ~0.01 %/jour ≈ 3.6%/an.
DAILY_AGING_PCT = 0.01

# Le pneu arrière transmet la puissance et porte plus de poids → s'use plus vite.
WHEEL_POSITION_FACTOR = {
    "front": 1.0,
    "rear": 1.35,
}

WEATHER_FACTOR = {
    "dry": 1.0,
    "mixed": 1.15,
    "wet": 1.3,
}

SURFACE_FACTOR = {
    "road": 1.0,
    "mixed": 1.2,
    "gravel": 1.35,
    "mtb_trail": 1.5,
}

# Au-delà de ce ratio (m de D+ par km), chaque tranche supplémentaire
# pèse plus dans le facteur dénivelé (freinages/relances répétés).
ELEVATION_REF_M_PER_KM = 10.0
ELEVATION_MAX_FACTOR = 1.4

# Poids "système" de référence (cycliste, gabarit moyen 1m80/75kg) utilisé pour
# calibrer le taux de base : un cycliste plus lourd charge davantage ses pneus
# (plus de déformation/chaleur → usure plus rapide), un cycliste plus léger les
# préserve. ~0.6%/kg d'écart, borné pour rester réaliste sur les gabarits extrêmes.
REFERENCE_RIDER_WEIGHT_KG = 75.0
RIDER_WEIGHT_SENSITIVITY = 0.006
RIDER_WEIGHT_FACTOR_MIN = 0.7
RIDER_WEIGHT_FACTOR_MAX = 1.5


def base_rate(life_km: int | None, category: str | None) -> float:
    """Taux d'usure de base (%/km), calibré pour atteindre 100% à life_km."""
    if life_km and life_km > 0:
        life = life_km
    else:
        life = DEFAULT_LIFE_KM_BY_CATEGORY.get(category or "", FALLBACK_LIFE_KM)
    return 100.0 / life


def elevation_factor(distance_km: float, elevation_gain: int) -> float:
    """Plus le D+/km est élevé, plus les freinages/relances usent le pneu."""
    if distance_km <= 0:
        return 1.0
    ratio = (elevation_gain or 0) / distance_km  # m de D+ par km
    factor = 1.0 + 0.4 * (ratio / ELEVATION_REF_M_PER_KM)
    return min(factor, ELEVATION_MAX_FACTOR)


def weather_factor(weather: str | None) -> float:
    return WEATHER_FACTOR.get(weather or "dry", 1.0)


def surface_factor(surface_type: str | None) -> float:
    return SURFACE_FACTOR.get(surface_type or "road", 1.0)


def wheel_factor(wheel: str) -> float:
    return WHEEL_POSITION_FACTOR.get(wheel, 1.0)


def rider_weight_factor(weight_kg: float | None) -> float:
    """Plus le cycliste est lourd, plus la charge sur le pneu (donc l'usure)
    augmente ; à l'inverse un gabarit léger préserve la gomme. Linéaire autour
    du gabarit de référence (75 kg), borné pour éviter les effets extrêmes."""
    if not weight_kg or weight_kg <= 0:
        weight_kg = REFERENCE_RIDER_WEIGHT_KG
    factor = 1.0 + RIDER_WEIGHT_SENSITIVITY * (weight_kg - REFERENCE_RIDER_WEIGHT_KG)
    return min(RIDER_WEIGHT_FACTOR_MAX, max(RIDER_WEIGHT_FACTOR_MIN, factor))


def compute_ride_wear_delta(
    tire: models.Tire,
    ride: models.Ride,
    catalog: models.TireCatalog | None,
    rider_weight_kg: float | None = None,
) -> float:
    """Usure (en points de %) ajoutée à `tire` par `ride`."""
    life_km = catalog.life_km if catalog else None
    category = tire.category or (catalog.type if catalog else None)

    k = base_rate(life_km, category)
    f_elev = elevation_factor(ride.distance_km, ride.elevation_gain)
    f_weather = weather_factor(ride.weather)
    f_surface = surface_factor(ride.surface_type)
    f_wheel = wheel_factor(tire.wheel)
    f_weight = rider_weight_factor(rider_weight_kg)

    delta = ride.distance_km * k * f_elev * f_weather * f_surface * f_wheel * f_weight
    return round(delta, 3)


def aging_wear(days_elapsed: int) -> float:
    """Usure passive liée au temps écoulé, indépendante du kilométrage."""
    return round(max(0, days_elapsed) * DAILY_AGING_PCT, 3)


def apply_wear(tire: models.Tire, delta_pct: float) -> int:
    """Applique un delta d'usure à un pneu, borné à [0, 100], retourne le nouveau wear_pct."""
    new_pct = (tire.wear_pct or 0) + delta_pct
    return int(round(max(0, min(100, new_pct))))
