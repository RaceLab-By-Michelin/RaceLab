"""
Tests pour app/retailer.py — fonctions pures (sans DB), Feature 2
(dashboard B2B revendeur).

aggregate_by_zone() ne fait que lire des attributs sur ses arguments — on
utilise donc des SimpleNamespace en guise de modèles SQLAlchemy plutôt que
de monter une vraie base de test, conformément à la convention "fonction
pure, sans accès DB" documentée dans le module.
"""
from __future__ import annotations

from types import SimpleNamespace

from app import retailer


def profile(**overrides):
    defaults = dict(city="Paris", practice_type="route", tire_catalog_id="power-cup2", wear_pct=10, weekly_km=80.0)
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def catalog_entry(life_km=3500):
    return SimpleNamespace(life_km=life_km)


# ─── weekly_wear_rate_pct ──────────────────────────────────────────────────

def test_weekly_wear_rate_pct_basic():
    assert retailer.weekly_wear_rate_pct(weekly_km=350, life_km=3500) == 10.0


def test_weekly_wear_rate_pct_falls_back_to_default_life_km():
    rate_default = retailer.weekly_wear_rate_pct(weekly_km=350, life_km=None)
    rate_explicit = retailer.weekly_wear_rate_pct(weekly_km=350, life_km=retailer.DEFAULT_LIFE_KM)
    assert rate_default == rate_explicit


def test_weekly_wear_rate_pct_zero_life_km_falls_back_to_default():
    # life_km=0 est falsy en Python -> `life_km or DEFAULT_LIFE_KM` retombe sur
    # la durée de vie par défaut, exactement comme life_km=None (donnée absente).
    rate_zero = retailer.weekly_wear_rate_pct(weekly_km=100, life_km=0)
    rate_none = retailer.weekly_wear_rate_pct(weekly_km=100, life_km=None)
    assert rate_zero == rate_none
    assert rate_zero > 0


# ─── weeks_to_end_of_life ──────────────────────────────────────────────────

def test_weeks_to_end_of_life_basic():
    # 50% restant, 10%/semaine → 5 semaines
    assert retailer.weeks_to_end_of_life(wear_pct=50, weekly_rate_pct=10.0) == 5.0


def test_weeks_to_end_of_life_none_when_rate_zero_or_negative():
    assert retailer.weeks_to_end_of_life(wear_pct=50, weekly_rate_pct=0) is None
    assert retailer.weeks_to_end_of_life(wear_pct=50, weekly_rate_pct=-1) is None


def test_weeks_to_end_of_life_already_at_100():
    assert retailer.weeks_to_end_of_life(wear_pct=100, weekly_rate_pct=10.0) == 0.0


# ─── is_near_end_of_life ───────────────────────────────────────────────────

def test_is_near_end_of_life_true_above_threshold():
    assert retailer.is_near_end_of_life(wear_pct=85, weekly_km=10, life_km=3500) is True


def test_is_near_end_of_life_true_when_projected_within_horizon():
    # usure 70%, 350km/semaine sur 3500km de vie → 10%/semaine → 3 semaines restantes (<= 6)
    assert retailer.is_near_end_of_life(wear_pct=70, weekly_km=350, life_km=3500) is True


def test_is_near_end_of_life_false_when_far_off():
    assert retailer.is_near_end_of_life(wear_pct=10, weekly_km=20, life_km=3500) is False


# ─── aggregate_by_zone ──────────────────────────────────────────────────────

def test_aggregate_by_zone_groups_and_sorts_by_city():
    profiles = [profile(city="Lyon"), profile(city="Paris"), profile(city="Lyon")]
    catalog_by_id = {"power-cup2": catalog_entry()}
    zones = retailer.aggregate_by_zone(profiles, catalog_by_id)
    assert [z["city"] for z in zones] == ["Lyon", "Paris"]
    assert zones[0]["rider_count"] == 2
    assert zones[1]["rider_count"] == 1


def test_aggregate_by_zone_dominant_practice_and_breakdown():
    profiles = [
        profile(city="Paris", practice_type="route"),
        profile(city="Paris", practice_type="route"),
        profile(city="Paris", practice_type="gravel"),
    ]
    zones = retailer.aggregate_by_zone(profiles, {})
    paris = zones[0]
    assert paris["dominant_practice"] == "route"
    assert paris["dominant_practice_share_pct"] == 67  # 2/3 arrondi
    assert paris["practice_breakdown"] == {"route": 2, "gravel": 1}


def test_aggregate_by_zone_near_end_of_life_counts():
    profiles = [
        profile(city="Bordeaux", wear_pct=90, tire_catalog_id="power-cup2"),
        profile(city="Bordeaux", wear_pct=5, weekly_km=5, tire_catalog_id="power-cup2"),
    ]
    catalog_by_id = {"power-cup2": catalog_entry(life_km=3500)}
    zones = retailer.aggregate_by_zone(profiles, catalog_by_id)
    bordeaux = zones[0]
    assert bordeaux["tires_near_end_of_life"] == 1
    assert bordeaux["tires_near_end_of_life_pct"] == 50


def test_aggregate_by_zone_unknown_catalog_id_falls_back_to_default_life_km():
    # tire_catalog_id absent du dict catalog_by_id → ne doit pas lever d'erreur
    profiles = [profile(city="Lille", tire_catalog_id="unknown-id")]
    zones = retailer.aggregate_by_zone(profiles, {})
    assert zones[0]["rider_count"] == 1
