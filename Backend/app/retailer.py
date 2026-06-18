"""
Agrégation B2B revendeur (Feature 2) — fonction pure, sans accès DB.

Transforme une liste de profils de pratique (réels ou simulés) en vue par
zone : profil de pratique dominant et estimation des pneus qui arriveront
en fin de vie dans les prochaines semaines. Objectif produit : transformer
l'app en outil de prévision de la demande pour le réseau de distribution
Michelin, par zone géographique.

Hypothèses documentées :
- "Fin de vie proche" = usure déjà >= END_OF_LIFE_WEAR_THRESHOLD, OU usure
  projetée à dépasser 100% dans moins de WEEKS_HORIZON semaines.
- Le taux d'usure hebdomadaire est estimé linéairement à partir du
  kilométrage hebdomadaire du cycliste et de la durée de vie nominale
  (life_km) du pneu catalogue — même modèle linéaire que celui utilisé pour
  l'usure ailleurs dans l'app (cf. wear.py), appliqué ici à l'échelle d'une
  semaine plutôt qu'à une sortie individuelle.
- Si le pneu n'est pas un pneu catalogue Michelin (catalog_id absent) ou que
  life_km est inconnu, on retombe sur DEFAULT_LIFE_KM pour ne pas exclure
  le profil de la projection.
"""
from collections import Counter, defaultdict
from typing import Optional

from app import models

END_OF_LIFE_WEAR_THRESHOLD = 80
WEEKS_HORIZON = 6
DEFAULT_LIFE_KM = 3500


def weekly_wear_rate_pct(weekly_km: float, life_km: Optional[int]) -> float:
    """Pourcentage d'usure gagné par semaine, à kilométrage hebdo constant."""
    life = life_km or DEFAULT_LIFE_KM
    if life <= 0:
        return 0.0
    return (weekly_km / life) * 100


def weeks_to_end_of_life(wear_pct: int, weekly_rate_pct: float) -> Optional[float]:
    """Nombre de semaines avant d'atteindre 100% d'usure, au rythme actuel.
    None si le taux est nul ou négatif (pas de projection possible)."""
    if weekly_rate_pct <= 0:
        return None
    remaining = max(0, 100 - wear_pct)
    return remaining / weekly_rate_pct


def is_near_end_of_life(wear_pct: int, weekly_km: float, life_km: Optional[int]) -> bool:
    if wear_pct >= END_OF_LIFE_WEAR_THRESHOLD:
        return True
    rate = weekly_wear_rate_pct(weekly_km, life_km)
    weeks_left = weeks_to_end_of_life(wear_pct, rate)
    return weeks_left is not None and weeks_left <= WEEKS_HORIZON


def aggregate_by_zone(
    profiles: list["models.DemoRiderProfile"],
    catalog_by_id: dict[str, "models.TireCatalog"],
) -> list[dict]:
    """Regroupe les profils par ville et calcule, par zone : le profil de
    pratique dominant et la part de pneus proches de la fin de vie."""
    by_city: dict[str, list] = defaultdict(list)
    for p in profiles:
        by_city[p.city].append(p)

    zones = []
    for city, riders in sorted(by_city.items()):
        practice_counts = Counter(r.practice_type for r in riders)
        dominant_practice, dominant_count = practice_counts.most_common(1)[0]
        dominant_share_pct = round(dominant_count / len(riders) * 100)

        near_eol = 0
        for r in riders:
            catalog = catalog_by_id.get(r.tire_catalog_id) if r.tire_catalog_id else None
            life_km = catalog.life_km if catalog else None
            if is_near_end_of_life(r.wear_pct, r.weekly_km, life_km):
                near_eol += 1

        zones.append(
            {
                "city": city,
                "rider_count": len(riders),
                "dominant_practice": dominant_practice,
                "dominant_practice_share_pct": dominant_share_pct,
                "practice_breakdown": dict(practice_counts),
                "tires_near_end_of_life": near_eol,
                "tires_near_end_of_life_pct": round(near_eol / len(riders) * 100),
            }
        )
    return zones
