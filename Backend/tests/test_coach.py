"""Tests pour /coach/tips : génération de conseils basés sur usure + sorties."""
from datetime import datetime, timedelta

from app import models
from tests.conftest import make_user, auth_header_for


def test_coach_tips_requires_auth(client):
    resp = client.get("/coach/tips")
    assert resp.status_code == 401


def test_coach_tips_no_data_returns_info_tip(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)

    resp = client.get("/coach/tips", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["tips"]) == 1
    assert body["tips"][0]["id"] == "no-data"
    assert body["tips"][0]["severity"] == "info"


def _mount_tires(db_session, user, *, front_wear=20, rear_wear=20, catalog_id=None):
    db_session.add_all([
        models.Tire(
            user_id=user.id, wheel="front", brand="michelin", catalog_id=catalog_id,
            name="Power All Season", size="700x28C", category="Route", wear_pct=front_wear,
            installed_date="1 Jan 2026", installed_km=0,
        ),
        models.Tire(
            user_id=user.id, wheel="rear", brand="michelin", catalog_id=catalog_id,
            name="Power All Season", size="700x28C", category="Route", wear_pct=rear_wear,
            installed_date="1 Jan 2026", installed_km=0,
        ),
    ])
    db_session.commit()


def test_coach_tips_all_good_when_low_wear_and_few_rides(client, db_session):
    user = make_user(db_session)
    _mount_tires(db_session, user, front_wear=10, rear_wear=10)
    db_session.add(models.Ride(
        user_id=user.id, name="Petite sortie", date=datetime.utcnow(), distance_km=20,
        duration_seconds=3600, avg_speed=20, elevation_gain=50, weather="dry", surface_type="road",
    ))
    db_session.commit()
    headers = auth_header_for(db_session, user)

    resp = client.get("/coach/tips", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert any(t["id"] == "all-good" for t in body["tips"])


def test_coach_tips_high_wear_triggers_critical_tip(client, db_session, make_tire_catalog_entry):
    make_tire_catalog_entry()
    user = make_user(db_session)
    _mount_tires(db_session, user, front_wear=85, rear_wear=20, catalog_id="power-all-season")
    db_session.add(models.Ride(
        user_id=user.id, name="Sortie", date=datetime.utcnow(), distance_km=20,
        duration_seconds=3600, avg_speed=20, elevation_gain=50, weather="dry", surface_type="road",
    ))
    db_session.commit()
    headers = auth_header_for(db_session, user)

    resp = client.get("/coach/tips", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    wear_tip = next((t for t in body["tips"] if t["id"] == "wear-front"), None)
    assert wear_tip is not None
    assert wear_tip["severity"] == "critical"


def test_coach_tips_moderate_wear_triggers_warning_tip(client, db_session, make_tire_catalog_entry):
    make_tire_catalog_entry()
    user = make_user(db_session)
    _mount_tires(db_session, user, front_wear=20, rear_wear=65, catalog_id="power-all-season")
    db_session.add(models.Ride(
        user_id=user.id, name="Sortie", date=datetime.utcnow(), distance_km=20,
        duration_seconds=3600, avg_speed=20, elevation_gain=50, weather="dry", surface_type="road",
    ))
    db_session.commit()
    headers = auth_header_for(db_session, user)

    resp = client.get("/coach/tips", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    wear_tip = next((t for t in body["tips"] if t["id"] == "wear-rear"), None)
    assert wear_tip is not None
    assert wear_tip["severity"] == "warning"


def test_coach_tips_returns_at_most_five(client, db_session, make_tire_catalog_entry):
    make_tire_catalog_entry()
    user = make_user(db_session)
    _mount_tires(db_session, user, front_wear=85, rear_wear=85, catalog_id="power-all-season")

    now = datetime.utcnow()
    # 8 sorties vallonnées (D+/km >= 10) pour déclencher la corrélation usure/vitesse,
    # + wear records pour la tendance d'usure -> on génère un maximum de tips possibles.
    for i in range(8):
        db_session.add(models.Ride(
            user_id=user.id, name=f"Sortie vallonnée {i}", date=now - timedelta(days=i),
            distance_km=20, duration_seconds=3600, avg_speed=20.0 - i * 0.2, elevation_gain=400,
            weather="dry", surface_type="road",
        ))
    for i in range(5):
        db_session.add(models.WearRecord(
            user_id=user.id, date=now - timedelta(days=30 - i * 5), front_wear=50 + i * 8, rear_wear=50 + i * 8,
        ))
    db_session.commit()
    headers = auth_header_for(db_session, user)

    resp = client.get("/coach/tips", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["tips"]) <= 5
