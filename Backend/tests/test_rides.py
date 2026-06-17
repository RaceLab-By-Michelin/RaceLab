"""Tests pour /rides : liste, détail, création + effets sur l'usure des pneus."""
from datetime import datetime, timedelta

from app import models
from tests.conftest import make_user, auth_header_for


def _mount_tires(db_session, user, *, front_wear=0, rear_wear=0, catalog_id="power-all-season"):
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


def test_list_rides_requires_auth(client):
    resp = client.get("/rides")
    assert resp.status_code == 401


def test_list_rides_empty(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)
    resp = client.get("/rides", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_rides_ordered_desc_and_limited(client, db_session):
    user = make_user(db_session)
    now = datetime.utcnow()
    db_session.add_all([
        models.Ride(
            user_id=user.id, name=f"Sortie {i}", date=now - timedelta(days=i), distance_km=10 + i,
            duration_seconds=1800, avg_speed=20, elevation_gain=100, weather="dry", surface_type="road",
        )
        for i in range(5)
    ])
    db_session.commit()
    headers = auth_header_for(db_session, user)

    resp = client.get("/rides", params={"limit": 3}, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 3
    assert body[0]["name"] == "Sortie 0"  # plus récente d'abord


def test_list_rides_filters_by_days(client, db_session):
    user = make_user(db_session)
    now = datetime.utcnow()
    db_session.add_all([
        models.Ride(
            user_id=user.id, name="Récente", date=now - timedelta(days=2), distance_km=20,
            duration_seconds=1800, avg_speed=20, elevation_gain=100, weather="dry", surface_type="road",
        ),
        models.Ride(
            user_id=user.id, name="Ancienne", date=now - timedelta(days=60), distance_km=20,
            duration_seconds=1800, avg_speed=20, elevation_gain=100, weather="dry", surface_type="road",
        ),
    ])
    db_session.commit()
    headers = auth_header_for(db_session, user)

    resp = client.get("/rides", params={"days": 30}, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["name"] == "Récente"


def test_get_ride_not_found(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)
    resp = client.get("/rides/999", headers=headers)
    assert resp.status_code == 404


def test_get_ride_belongs_to_other_user_is_404(client, db_session):
    owner = make_user(db_session, email="owner@example.com")
    other = make_user(db_session, email="other@example.com")
    ride = models.Ride(
        user_id=owner.id, name="Privée", date=datetime.utcnow(), distance_km=10,
        duration_seconds=1200, avg_speed=20, elevation_gain=50, weather="dry", surface_type="road",
    )
    db_session.add(ride)
    db_session.commit()

    headers = auth_header_for(db_session, other)
    resp = client.get(f"/rides/{ride.id}", headers=headers)
    assert resp.status_code == 404


def test_get_ride_success(client, db_session):
    user = make_user(db_session)
    ride = models.Ride(
        user_id=user.id, name="Ma sortie", date=datetime.utcnow(), distance_km=15,
        duration_seconds=1800, avg_speed=30, elevation_gain=80, weather="dry", surface_type="road",
    )
    db_session.add(ride)
    db_session.commit()
    headers = auth_header_for(db_session, user)

    resp = client.get(f"/rides/{ride.id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Ma sortie"


def test_create_ride_requires_mounted_tires(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)

    payload = {
        "name": "Sortie sans pneus",
        "distance_km": 30,
        "duration_seconds": 3600,
        "elevation_gain": 100,
        "weather": "dry",
        "surface_type": "road",
    }
    resp = client.post("/rides", json=payload, headers=headers)
    assert resp.status_code == 404


def test_create_ride_computes_avg_speed_and_increases_wear(client, db_session, make_tire_catalog_entry):
    make_tire_catalog_entry()
    user = make_user(db_session)
    _mount_tires(db_session, user, front_wear=10, rear_wear=10)
    headers = auth_header_for(db_session, user)

    payload = {
        "name": "Sortie route",
        "distance_km": 36.0,
        "duration_seconds": 3600,  # 1h -> 36 km/h
        "elevation_gain": 200,
        "weather": "dry",
        "surface_type": "road",
    }
    resp = client.post("/rides", json=payload, headers=headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["ride"]["avg_speed"] == 36.0
    assert body["front_wear_pct"] > 10
    assert body["rear_wear_pct"] > 10
    # le pneu arrière s'use plus vite (facteur position roue 1.35 > 1.0)
    assert body["rear_wear_delta"] > body["front_wear_delta"]

    front = db_session.query(models.Tire).filter_by(user_id=user.id, wheel="front").first()
    rear = db_session.query(models.Tire).filter_by(user_id=user.id, wheel="rear").first()
    assert front.wear_pct == body["front_wear_pct"]
    assert rear.wear_pct == body["rear_wear_pct"]

    # Un WearRecord doit avoir été créé pour suivre l'historique
    record = db_session.query(models.WearRecord).filter_by(user_id=user.id).first()
    assert record is not None
    assert record.front_wear == front.wear_pct


def test_create_ride_wear_capped_at_100(client, db_session, make_tire_catalog_entry):
    make_tire_catalog_entry()
    user = make_user(db_session)
    _mount_tires(db_session, user, front_wear=99, rear_wear=99)
    headers = auth_header_for(db_session, user)

    payload = {
        "name": "Sortie longue",
        "distance_km": 500.0,
        "duration_seconds": 36000,
        "elevation_gain": 5000,
        "weather": "wet",
        "surface_type": "gravel",
    }
    resp = client.post("/rides", json=payload, headers=headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["front_wear_pct"] == 100
    assert body["rear_wear_pct"] == 100


def test_create_ride_zero_duration_has_zero_avg_speed(client, db_session, make_tire_catalog_entry):
    make_tire_catalog_entry()
    user = make_user(db_session)
    _mount_tires(db_session, user)
    headers = auth_header_for(db_session, user)

    payload = {
        "name": "Données GPS incomplètes",
        "distance_km": 10.0,
        "duration_seconds": 0,
        "elevation_gain": 0,
        "weather": "dry",
        "surface_type": "road",
    }
    resp = client.post("/rides", json=payload, headers=headers)
    assert resp.status_code == 201
    assert resp.json()["ride"]["avg_speed"] == 0.0
