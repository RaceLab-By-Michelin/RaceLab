"""
Moteur de recommandation pneu + réduction personnalisée.

Plutôt que d'afficher une alerte anxiogène quand un pneu est usé, on calcule :
  1. Le profil de pratique du cycliste (surface, météo, dénivelé) à partir
     de son historique de sorties.
  2. Le type de pneu du catalogue Michelin le plus adapté à ce profil.
  3. Une réduction personnalisée, d'autant plus intéressante que l'usure est
     avancée (urgence) et que le cycliste est déjà fidèle à la marque (loyauté).

Aucune dépendance à la base de données ici — fonctions pures testables.
"""
from __future__ import annotations

from collections import Counter
from typing import Optional

from app import models

# ─── Profil de pratique ────────────────────────────────────────────────────

SURFACE_TO_TYPE = {
    "road": "Route",
    "gravel": "Gravel",
    "mixed": "Gravel",
    "mtb_trail": "VTT",
}

TYPE_LABELS = {
    "Route": "vos sorties principalement sur route",
    "Gravel": "vos sorties gravel et chemins mixtes",
    "VTT": "vos sorties VTT et sentiers",
    "Piste": "vos sorties sur piste",
}

# Dénivelé (m/km) au-delà duquel on considère le profil "grimpeur"
CLIMBING_THRESHOLD = 10.0
# Part de sorties sous la pluie au-delà de laquelle l'adhérence pluie prime
WET_RATIO_THRESHOLD = 0.3


def rider_profile(rides: list[models.Ride]) -> dict:
    """Agrège les sorties récentes en un profil de pratique."""
    surface_counter = Counter(r.surface_type for r in rides if r.surface_type)
    weather_counter = Counter(r.weather for r in rides if r.weather)
    total_km = sum(r.distance_km for r in rides) or 1.0
    total_elev = sum(r.elevation_gain or 0 for r in rides)
    weather_total = sum(weather_counter.values()) or 1

    return {
        "surface_counter": surface_counter,
        "weather_counter": weather_counter,
        "climbing_intensity": total_elev / total_km,  # m / km
        "wet_ratio": weather_counter.get("wet", 0) / weather_total,
    }


def dominant_tire_type(profile: dict, fallback: str = "Route") -> str:
    """Type de pneu catalogue (Route/Gravel/VTT/Piste) le plus adapté au profil."""
    surface_counter: Counter = profile["surface_counter"]
    if not surface_counter:
        return fallback
    dominant_surface, _ = surface_counter.most_common(1)[0]
    return SURFACE_TO_TYPE.get(dominant_surface, fallback)


def match_reason(target_type: str, profile: dict) -> str:
    label = TYPE_LABELS.get(target_type, "votre pratique")
    if profile["wet_ratio"] > WET_RATIO_THRESHOLD:
        return f"Basé sur {label}, avec une bonne part de sorties sous la pluie."
    if profile["climbing_intensity"] >= CLIMBING_THRESHOLD:
        return f"Basé sur {label} et un profil avec beaucoup de dénivelé."
    return f"Basé sur {label}."


# ─── Sélection du pneu catalogue ────────────────────────────────────────────

def pick_best_tire(
    catalog: list[models.TireCatalog],
    target_type: str,
    current_catalog_id: Optional[str],
    profile: dict,
) -> Optional[models.TireCatalog]:
    """Choisit le meilleur pneu du catalogue pour le profil donné.

    On privilégie un pneu du type dominant, différent du pneu actuellement
    monté. Pour un profil plat / entraînement régulier, on privilégie la
    durabilité (life_km) — c'est ce qui compte le plus au quotidien. Pour un
    profil grimpeur / exigeant, on garde l'ordre naturel du catalogue, qui
    place les pneus performance/compétition en tête de chaque type.
    """
    candidates = [c for c in catalog if c.type == target_type] or list(catalog)
    others = [c for c in candidates if c.id != current_catalog_id]
    pool = others or candidates
    if not pool:
        return None

    prefer_durability = profile["climbing_intensity"] < CLIMBING_THRESHOLD
    if prefer_durability:
        pool = sorted(pool, key=lambda c: (c.life_km or 0), reverse=True)
    return pool[0]


# ─── Réduction personnalisée ────────────────────────────────────────────────

def compute_discount(wear_pct: int, brand: str) -> tuple[int, str]:
    """Réduction (%) + code promo, croissants avec l'usure (urgence) et la fidélité Michelin."""
    if wear_pct >= 90:
        base = 30
    elif wear_pct >= 80:
        base = 20
    elif wear_pct >= 60:
        base = 10
    else:
        base = 0

    if base and brand == "michelin":
        base += 5  # bonus fidélité

    base = min(base, 35)
    code = f"MICHELIN{base}" if base else ""
    return base, code
