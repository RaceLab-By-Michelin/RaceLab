"""
Tests pour app/passport.py — fonctions pures (sans DB), Feature 3
(passeport pneu partageable).
"""
from __future__ import annotations

from datetime import datetime, timedelta

from app import passport


def test_parse_installed_date_valid():
    parsed = passport.parse_installed_date("14 Jan 2025")
    assert parsed is not None
    assert parsed.year == 2025 and parsed.month == 1 and parsed.day == 14


def test_parse_installed_date_invalid():
    assert passport.parse_installed_date("not-a-date") is None


def test_days_since_installed():
    today = datetime(2025, 6, 1)
    installed = (today - timedelta(days=42)).strftime("%d %b %Y")
    assert passport.days_since_installed(installed, today=today) == 42


def test_days_since_installed_invalid_date_returns_zero():
    assert passport.days_since_installed("garbage", today=datetime(2025, 6, 1)) == 0


def test_days_since_installed_never_negative():
    today = datetime(2025, 6, 1)
    future = (today + timedelta(days=5)).strftime("%d %b %Y")
    assert passport.days_since_installed(future, today=today) == 0


def test_km_on_tire():
    assert passport.km_on_tire(total_km_now=4200, installed_km=1200) == 3000.0


def test_km_on_tire_never_negative():
    # installed_km > total_km_now ne doit jamais produire un km négatif
    assert passport.km_on_tire(total_km_now=100, installed_km=500) == 0.0


def test_best_milestone_picks_highest_passed():
    assert passport.best_milestone(3847) == 3000
    assert passport.best_milestone(10500) == 10000


def test_best_milestone_none_below_first():
    assert passport.best_milestone(200) is None


def test_build_passport_uses_milestone_when_reached():
    card = passport.build_passport("Power Cup 2", km=4123.4, days=87)
    assert card["milestone_km"] == 4000
    assert "4 000 km" in card["headline"] or "4000 km" in card["headline"].replace(" ", "")
    assert "0 crevaison signalée" in card["headline"]
    assert card["tire_name"] == "Power Cup 2"
    assert card["days_installed"] == 87


def test_build_passport_falls_back_to_rounded_km_below_first_milestone():
    card = passport.build_passport("Power All Season", km=312.0, days=10)
    assert card["milestone_km"] is None
    assert "312 km" in card["headline"]
