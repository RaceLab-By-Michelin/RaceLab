"""Tests pour /tires : catalogue, pneus montés, usure, recommandations."""
from datetime import datetime, timedelta

from app import models
from tests.conftest import make_user, auth_header_for


def _mount_tires(db_session, user, *, front_catalog_id="power-all-season", rear_catalog_id="power-all-season"):
    db_session.add_all([
        models.Tire(
            user_id=user.id, wheel="front", brand="michelin", catalog_id=front_catalog_id,
            name="Power All Season", size="700x28C", category="Route", wear_pct=20,
            installed_date="1 Jan 2026", installed_km=0,
        ),
        models.Tire(
            user_id=user.id, wheel="rear", brand="michelin", catalog_id=rear_catalog_id,
            name="Power All Season", size="700x28C", category="Route", wear_pct=30,
            installed_date="1 Jan 2026", installed_km=0,
        ),
    ])
    db_session.commit()


# ─── Catalogue (public, sans auth) ──────────────────────────────────────

def test_list_catalog_empty(client):
    resp = client.get("/tires/catalog")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_catalog_filters_by_type(client, make_tire_catalog_entry):
    make_tire_catalog_entry(id="power-road", name="Power Road", type="Route")
    make_tire_catalog_entry(id="power-gravel", name="Power Gravel", type="Gravel")

    resp = client.get("/tires/catalog", params={"type": "Gravel"})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["id"] == "power-gravel"


def test_get_catalog_item_not_found(client):
    resp = client.get("/tires/catalog/does-not-exist")
    assert resp.status_code == 404


def test_get_catalog_item_found(client, make_tire_catalog_entry):
    make_tire_catalog_entry()
    resp = client.get("/tires/catalog/power-all-season")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Power All Season"


# ─── Pneus montés ────────────────────────────────────────────────────────

def test_get_tires_requires_auth(client):
    resp = client.get("/tires")
    assert resp.status_code == 401


def test_get_tires_404_when_not_onboarded(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)
    resp = client.get("/tires", headers=headers)
    assert resp.status_code == 404


def test_get_tires_returns_front_and_rear(client, db_session, make_tire_catalog_entry):
    make_tire_catalog_entry()
    user = make_user(db_session)
    _mount_tires(db_session, user)
    headers = auth_header_for(db_session, user)

    resp = client.get("/tires", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["front"]["wear_pct"] == 20
    assert body["rear"]["wear_pct"] == 30


def test_get_tire_invalid_wheel(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)
    resp = client.get("/tires/middle", headers=headers)
    assert resp.status_code == 422


def test_patch_tire_to_michelin_requires_catalog_id(client, db_session, make_tire_catalog_entry):
    make_tire_catalog_entry()
    user = make_user(db_session)
    _mount_tires(db_session, user)
    headers = auth_header_for(db_session, user)

    resp = client.patch(
        "/tires/front", json={"brand": "michelin", "size": "700x28C"}, headers=headers
    )
    assert resp.status_code == 422


def test_patch_tire_to_michelin_success_resets_wear(client, db_session, make_tire_catalog_entry):
    make_tire_catalog_entry()
    make_tire_catalog_entry(id="power-cup", name="Power Cup")
    user = make_user(db_session)
    _mount_tires(db_session, user)
    headers = auth_header_for(db_session, user)

    resp = client.patch(
        "/tires/front",
        json={"brand": "michelin", "catalog_id": "power-cup", "size": "700x25C", "reset_wear": True},
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Power Cup"
    assert body["wear_pct"] == 0
    assert body["size"] == "700x25C"


def test_patch_tire_to_other_brand_requires_name(client, db_session, make_tire_catalog_entry):
    make_tire_catalog_entry()
    user = make_user(db_session)
    _mount_tires(db_session, user)
    headers = auth_header_for(db_session, user)

    resp = client.patch("/tires/rear", json={"brand": "other", "size": "700x28C"}, headers=headers)
    assert resp.status_code == 422


def test_patch_tire_to_other_brand_success(client, db_session, make_tire_catalog_entry):
    make_tire_catalog_entry()
    user = make_user(db_session)
    _mount_tires(db_session, user)
    headers = auth_header_for(db_session, user)

    resp = client.patch(
        "/tires/rear",
        json={"brand": "other", "name": "Continental GP5000", "size": "700x28C", "category": "Route"},
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["brand"] == "other"
    assert body["catalog_id"] is None
    assert body["name"] == "Continental GP5000"


def test_patch_tire_without_reset_keeps_wear(client, db_session, make_tire_catalog_entry):
    make_tire_catalog_entry()
    user = make_user(db_session)
    _mount_tires(db_session, user)
    headers = auth_header_for(db_session, user)

    resp = client.patch(
        "/tires/front",
        json={"brand": "michelin", "catalog_id": "power-all-season", "size": "700x28C", "reset_wear": False},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["wear_pct"] == 20  # inchangé


# ─── Historique d'usure ─────────────────────────────────────────────────

def test_wear_history_empty(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)
    resp = client.get("/tires/wear-history", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["points"] == []
    assert body["avg_front_per_day"] == 0.0


def test_wear_history_computes_daily_average(client, db_session):
    user = make_user(db_session)
    now = datetime.utcnow()
    db_session.add_all([
        models.WearRecord(user_id=user.id, date=now - timedelta(days=10), front_wear=10, rear_wear=15),
        models.WearRecord(user_id=user.id, date=now, front_wear=20, rear_wear=25),
    ])
    db_session.commit()
    headers = auth_header_for(db_session, user)

    resp = client.get("/tires/wear-history", params={"days": 30}, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["points"]) == 2
    assert body["avg_front_per_day"] == 1.0  # (20-10)/10 jours
    assert body["avg_rear_per_day"] == 1.0


def test_wear_history_invalid_days_param(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)
    resp = client.get("/tires/wear-history", params={"days": 0}, headers=headers)
    assert resp.status_code == 422


# ─── Recommandations ────────────────────────────────────────────────────

def test_recommendations_requires_mounted_tires(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)
    resp = client.get("/tires/recommendations", headers=headers)
    assert resp.status_code == 404


def test_recommendations_returns_front_and_rear(client, db_session, make_tire_catalog_entry):
    make_tire_catalog_entry()
    user = make_user(db_session)
    _mount_tires(db_session, user)
    headers = auth_header_for(db_session, user)

    resp = client.get("/tires/recommendations", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["front"]["wheel"] == "front"
    assert body["rear"]["wheel"] == "rear"
    assert "match_reason" in body["front"]
