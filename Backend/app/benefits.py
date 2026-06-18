"""
Bénéfices tangibles d'un changement de pneu — estimation pure, documentée.

Objectif : remplacer l'incitation par le prix (réduction %) par une
incitation par la performance, en traduisant la différence entre le pneu
actuel et le pneu recommandé en deux bénéfices concrets :
  1. Le temps gagné sur un parcours type (estimation).
  2. La résistance au roulement (indice estimé).

Aucune dépendance à la base de données — fonctions pures testables, dans le
même esprit que wear.py.

Hypothèses explicites (faute de données Crr mesurées dans le catalogue) :
  - L'indice de résistance au roulement est dérivé des métadonnées
    qualitatives du catalogue Michelin (compound, casing, protection_level,
    riding_priority, tubeless) + du poids quand il est renseigné. Plus
    l'indice est haut, plus la résistance — et donc l'effort à vitesse
    donnée — est élevée.
  - Un pneu usé est légèrement plus résistant qu'un pneu neuf équivalent
    (compound durci, profil aplati avec le temps) : pénalité proportionnelle
    à son usure actuelle.
  - Le temps gagné est dérivé d'une règle de proportionnalité simplifiée :
    on suppose que la résistance au roulement explique environ 30% de
    l'effort à vitesse de croisière route/gravel (ordre de grandeur courant
    en cyclisme, hors aérodynamique) — pas une mesure physique précise.
"""
from __future__ import annotations

import re
from typing import Optional

from app import models

# ─── Indice de résistance au roulement (estimation) ────────────────────────
# Échelle arbitraire : plus bas = moins de résistance = pneu plus rapide.

BASE_INDEX_BY_TYPE = {"Route": 72.0, "Gravel": 78.0, "VTT": 85.0, "Piste": 65.0, "Urbain": 80.0}

PROTECTION_DELTA = {"low": -8.0, "low-medium": -4.0, "medium": 0.0, "high": 8.0}

PRIORITY_DELTA = {
    "racing": -10.0,
    "endurance": -2.0,
    "versatile": 0.0,
    "all-season": 2.0,
    "durability": 4.0,
    "protection": 5.0,
    "mud-grip": 6.0,
    "mud-clearing": 6.0,
    "technical-mud": 7.0,
    "urban-puncture-resistance": 5.0,
    "touring-load": 8.0,
    "heavy-load": 10.0,
}

TUBELESS_DELTA = -3.0  # pression d'usage plus basse possible → un peu moins de résistance

WEIGHT_REFERENCE_G = 250.0   # poids "moyen" de référence pour l'écart pondéré
WEIGHT_FACTOR = 0.05         # points d'indice par gramme d'écart au poids de référence

WEAR_PENALTY_FACTOR = 0.08   # points d'indice supplémentaires par % d'usure du pneu actuel


def _parse_weight_grams(weight: Optional[str]) -> Optional[float]:
    """Extrait un poids en grammes depuis un champ texte libre du catalogue
    (ex: "265 g", "255 g (700x25C)"). Renvoie None si non numérique
    ("Non publié", plage de tailles, etc.)."""
    if not weight:
        return None
    match = re.search(r"(\d+(?:[.,]\d+)?)\s*g\b", weight)
    if not match:
        return None
    return float(match.group(1).replace(",", "."))


def rolling_resistance_index(tire: models.TireCatalog) -> float:
    """Indice estimé de résistance au roulement d'un pneu du catalogue
    (plus bas = plus rapide). Pas une mesure Crr réelle — voir hypothèses
    documentées en tête de module."""
    base = BASE_INDEX_BY_TYPE.get(tire.type, 75.0)
    delta = 0.0
    delta += PROTECTION_DELTA.get(tire.protection_level or "medium", 0.0)
    delta += PRIORITY_DELTA.get(tire.riding_priority or "", 0.0)
    if tire.tubeless:
        delta += TUBELESS_DELTA

    weight_g = _parse_weight_grams(tire.weight)
    if weight_g is not None:
        delta += (weight_g - WEIGHT_REFERENCE_G) * WEIGHT_FACTOR

    return round(base + delta, 1)


def current_tire_index(catalog_entry: Optional[models.TireCatalog], fallback_type: str, wear_pct: int) -> float:
    """Indice du pneu actuellement monté, pénalisé par son usure. Si le pneu
    n'est pas dans le catalogue Michelin (marque autre, ou pneu legacy sans
    métadonnées premium), on retombe sur l'indice de base du type de
    pratique dominant."""
    base = rolling_resistance_index(catalog_entry) if catalog_entry else BASE_INDEX_BY_TYPE.get(fallback_type, 75.0)
    return round(base + wear_pct * WEAR_PENALTY_FACTOR, 1)


# ─── Temps gagné sur un parcours type ───────────────────────────────────────

# Part estimée de l'effort à vitesse de croisière imputable à la résistance
# au roulement (hors aérodynamique) — hypothèse simplificatrice documentée.
ROLLING_RESISTANCE_SHARE = 0.30

DEFAULT_TYPICAL_RIDE_KM = 30.0
DEFAULT_AVG_SPEED_KMH = 25.0


def estimate_benefit(
    current_index: float,
    recommended_index: float,
    typical_ride_km: float = DEFAULT_TYPICAL_RIDE_KM,
    avg_speed_kmh: float = DEFAULT_AVG_SPEED_KMH,
) -> dict:
    """Traduit un écart d'indice de résistance au roulement en bénéfices
    tangibles : minutes gagnées sur un parcours type (basé sur la distance et
    la vitesse moyenne réelles du cycliste), et pourcentage de résistance en
    moins. Fonction pure, aucune dépendance DB."""
    if current_index <= 0:
        rel_improvement = 0.0
    else:
        rel_improvement = max(0.0, (current_index - recommended_index) / current_index)

    time_saving_share = rel_improvement * ROLLING_RESISTANCE_SHARE
    baseline_minutes = (typical_ride_km / avg_speed_kmh) * 60 if avg_speed_kmh > 0 else 0.0
    minutes_gained = round(baseline_minutes * time_saving_share, 1)

    return {
        "current_index": current_index,
        "recommended_index": recommended_index,
        "rolling_resistance_delta_pct": round(rel_improvement * 100, 1),
        "typical_ride_km": round(typical_ride_km, 1),
        "minutes_gained": minutes_gained,
    }
