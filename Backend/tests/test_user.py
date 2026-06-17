"""Tests pour /users : profil, vélo, stats, onboarding."""
from datetime import datetime

from app import models
from tests.conftest import make_user, auth_header_for


def _michelin_tire(**overrides):
    payload = {
        "brand": "michelin",
        "catalog_id": "power-all-season",
        "size": "700x28C",
        "wear_pct": 0,
    }
    payload.update(overrides)
    return payload


def _other_tire(**overrides):
    payload = {
        "brand": "other",
        "name": "Continental GP5000",
        "size": "700x25C",
        "category": "Route",
        "wear_pct": 10,
    }
    payload.update(overrides)
    return payload


# ─── /users/me ──────────────────────────────────────────────────────────

def test_get_me_requires_auth(client):
    resp = client.get("/users/me")
    assert resp.status_code == 401


def test_get_me_returns_profile(client, db_session):
    user = make_user(db_session, email="profile@example.com", city="Lyon")
    headers = auth_header_for(db_session, user)

    resp = client.get("/users/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "profile@example.com"
    assert resp.json()["city"] == "Lyon"


def test_patch_me_updates_allowed_fields_only(client, db_session):
    user = make_user(db_session, email="patchme@example.com")
    headers = auth_header_for(db_session, user)

    resp = client.patch("/users/me", json={"name": "Nouveau Nom", "city": "Marseille"}, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Nouveau Nom"
    assert body["city"] == "Marseille"
    # email n'est pas patchable via ce schéma -> reste inchangé
    assert body["email"] == "patchme@example.com"


# ─── /users/me/bike ─────────────────────────────────────────────────────

def test_get_bike(client, db_session):
    user = make_user(db_session, bike_brand="Trek", bike_model="Domane", bike_year=2023, bike_color="#FF0000")
    headers = auth_header_for(db_session, user)

    resp = client.get("/users/me/bike", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body == {"brand": "Trek", "model": "Domane", "year": 2023, "color": "#FF0000"}


def test_patch_bike_updates_fields(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)

    resp = client.patch("/users/me/bike", json={"brand": "Specialized", "year": 2024}, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["brand"] == "Specialized"
    assert body["year"] == 2024


# ─── /users/me/stats ────────────────────────────────────────────────────

def test_stats_with_no_data_defaults_to_zero(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)

    resp = client.get("/users/me/stats", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_km"] == 0.0
    assert body["total_rides"] == 0
    assert body["total_elevation"] == 0
    assert body["front_wear"] == 0
    assert body["rear_wear"] == 0
    assert body["adherence_pct"] == 100


def test_stats_aggregates_rides_and_tires(client, db_session):
    user = make_user(db_session)

    db_session.add_all([
        models.Ride(
            user_id=user.id, name="Sortie 1", date=datetime.utcnow(), distance_km=30.0,
            duration_seconds=3600, avg_speed=30.0, elevation_gain=200, weather="dry", surface_type="road",
        ),
        models.Ride(
            user_id=user.id, name="Sortie 2", date=datetime.utcnow(), distance_km=45.5,
            duration_seconds=5400, avg_speed=28.0, elevation_gain=350, weather="wet", surface_type="road",
        ),
        models.Tire(
            user_id=user.id, wheel="front", brand="michelin", catalog_id="power-all-season",
            name="Power All Season", size="700x28C", category="Route", wear_pct=40,
            installed_date="1 Jan 2026", installed_km=0,
        ),
        models.Tire(
            user_id=user.id, wheel="rear", brand="michelin", catalog_id="power-all-season",
            name="Power All Season", size="700x28C", category="Route", wear_pct=60,
            installed_date="1 Jan 2026", installed_km=0,
        ),
    ])
    db_session.commit()

    headers = auth_header_for(db_session, user)
    resp = client.get("/users/me/stats", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_km"] == 75.5
    assert body["total_rides"] == 2
    assert body["total_elevation"] == 550
    assert body["front_wear"] == 40
    assert body["rear_wear"] == 60
    # adherence = 100 - max(40,60)*0.35 = 100 - 21 = 79
    assert body["adherence_pct"] == 79


# ─── /users/onboarding ──────────────────────────────────────────────────

def test_onboarding_requires_auth(client):
    resp = client.post("/users/onboarding", json={})
    assert resp.status_code == 401


def test_onboarding_with_michelin_tires(client, db_session, make_tire_catalog_entry):
    make_tire_catalog_entry()
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)

    payload = {
        "city": "Lyon",
        "bike_brand": "Trek",
        "bike_model": "Domane",
        "bike_year": 2022,
        "front_tire": _michelin_tire(),
        "rear_tire": _michelin_tire(wear_pct=5),
    }
    resp = client.post("/users/onboarding", json=payload, headers=headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["onboarding_completed"] is True
    assert body["city"] == "Lyon"
    assert body["bike"]["brand"] == "Trek"

    tires = db_session.query(models.Tire).filter_by(user_id=user.id).all()
    assert len(tires) == 2
    front = next(t for t in tires if t.wheel == "front")
    assert front.name == "Power All Season"
    assert front.catalog_id == "power-all-season"

    # Settings annexes créés automatiquement
    assert db_session.query(models.NotificationSettings).filter_by(user_id=user.id).first() is not None
    assert db_session.query(models.StravaConnection).filter_by(user_id=user.id).first() is not None


def test_onboarding_with_other_brand_tires(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)

    payload = {
        "city": "Paris",
        "bike_brand": "Canyon",
        "bike_model": "Ultimate",
        "bike_year": 2021,
        "front_tire": _other_tire(),
        "rear_tire": _other_tire(name="Continental GP5000 TR"),
    }
    resp = client.post("/users/onboarding", json=payload, headers=headers)
    assert resp.status_code == 201

    tires = db_session.query(models.Tire).filter_by(user_id=user.id).all()
    front = next(t for t in tires if t.wheel == "front")
    assert front.brand == "other"
    assert front.catalog_id is None
    assert front.name == "Continental GP5000"


def test_onboarding_michelin_without_catalog_id_returns_422(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)

    payload = {
        "city": "Lyon",
        "bike_brand": "Trek",
        "bike_model": "Domane",
        "bike_year": 2022,
        "front_tire": _michelin_tire(catalog_id=None),
        "rear_tire": _michelin_tire(),
    }
    resp = client.post("/users/onboarding", json=payload, headers=headers)
    assert resp.status_code == 422


def test_onboarding_michelin_unknown_catalog_id_returns_404(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)

    payload = {
        "city": "Lyon",
        "bike_brand": "Trek",
        "bike_model": "Domane",
        "bike_year": 2022,
        "front_tire": _michelin_tire(catalog_id="does-not-exist"),
        "rear_tire": _michelin_tire(catalog_id="does-not-exist"),
    }
    resp = client.post("/users/onboarding", json=payload, headers=headers)
    assert resp.status_code == 404


def test_onboarding_other_without_name_returns_422(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)

    payload = {
        "city": "Lyon",
        "bike_brand": "Trek",
        "bike_model": "Domane",
        "bike_year": 2022,
        "front_tire": _other_tire(name=None),
        "rear_tire": _other_tire(),
    }
    resp = client.post("/users/onboarding", json=payload, headers=headers)
    assert resp.status_code == 422


def test_onboarding_is_idempotent_and_replaces_tires(client, db_session, make_tire_catalog_entry):
    make_tire_catalog_entry()
    make_tire_catalog_entry(id="power-cup", name="Power Cup", life_km=3000)
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)

    first_payload = {
        "city": "Lyon",
        "bike_brand": "Trek",
        "bike_model": "Domane",
        "bike_year": 2022,
        "front_tire": _michelin_tire(),
        "rear_tire": _michelin_tire(),
    }
    first = client.post("/users/onboarding", json=first_payload, headers=headers)
    assert first.status_code == 201

    second_payload = dict(first_payload)
    second_payload["front_tire"] = _michelin_tire(catalog_id="power-cup", wear_pct=15)
    second = client.post("/users/onboarding", json=second_payload, headers=headers)
    assert second.status_code == 201

    tires = db_session.query(models.Tire).filter_by(user_id=user.id).all()
    assert len(tires) == 2  # pas de doublon créé
    front = next(t for t in tires if t.wheel == "front")
    assert front.catalog_id == "power-cup"
    assert front.wear_pct == 15
