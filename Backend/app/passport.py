"""
Passeport pneu (Feature 3) — fonction pure, sans accès DB.

Transforme l'usage réel d'un pneu (kilométrage, durée d'installation) en
objet social/viral valorisant la durabilité comme un badge plutôt qu'une
contrainte (ex. "4000 km sur le même Michelin Power Cup, 0 crevaison
signalée"), à afficher dans l'app et exporter en image partageable.

Hypothèses documentées :
- km_on_tire = kilométrage total du cycliste depuis tire.installed_km — même
  proxy d'usage déjà utilisé par tires.py (reset_wear) pour borner la durée
  de vie d'un pneu donné.
- days_installed = jours écoulés depuis tire.installed_date (format
  "%d %b %Y", celui produit par tires.py lors d'un remplacement).
- "0 crevaison signalée" est une donnée factuelle : l'app ne capte aucun
  événement de crevaison, donc l'absence d'incident enregistré est vraie par
  construction — ce n'est pas une garantie produit, seulement le reflet de
  ce qui a été déclaré dans l'app.
- milestone_km = le palier rond le plus proche déjà dépassé, pour une
  accroche nette ("4000 km" plutôt que "3 847 km").
"""
from datetime import datetime
from typing import Optional

MILESTONES_KM = [500, 1000, 2000, 3000, 4000, 5000, 7500, 10000, 15000]


def parse_installed_date(installed_date: str) -> Optional[datetime]:
    try:
        return datetime.strptime(installed_date, "%d %b %Y")
    except ValueError:
        return None


def days_since_installed(installed_date: str, today: Optional[datetime] = None) -> int:
    parsed = parse_installed_date(installed_date)
    if not parsed:
        return 0
    today = today or datetime.utcnow()
    return max(0, (today - parsed).days)


def km_on_tire(total_km_now: float, installed_km: int) -> float:
    return max(0.0, total_km_now - installed_km)


def best_milestone(km: float) -> Optional[int]:
    passed = [m for m in MILESTONES_KM if km >= m]
    return passed[-1] if passed else None


def build_passport(tire_name: str, km: float, days: int) -> dict:
    milestone = best_milestone(km)
    headline_km = milestone if milestone else round(km)
    headline = f"{headline_km:,} km sur le même {tire_name}, 0 crevaison signalée".replace(",", " ")
    return {
        "tire_name": tire_name,
        "km_on_tire": round(km, 1),
        "days_installed": days,
        "milestone_km": milestone,
        "headline": headline,
    }
