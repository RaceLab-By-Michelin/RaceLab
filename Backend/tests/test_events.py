"""Tests pour /events : création, listing, jonction, classement/progression."""
from datetime import datetime, timedelta

from app import models
from tests.conftest import make_user, auth_header_for


def _event_payload(**overrides):
    now = datetime.utcnow()
    payload = {
        "name": "Défi distance",
        "description": "100km en une semaine",
        "goal_type": "distance",
        "goal_value": 100.0,
        "terrain_type": "route",
        "start_date": (now - timedelta(days=1)).isoformat(),
        "end_date": (now + timedelta(days=6)).isoformat(),
        "reward": "Badge or",
    }
    payload.update(overrides)
    return payload


def test_list_events_requires_auth(client):
    resp = client.get("/events")
    assert resp.status_code == 401


def test_create_event_auto_joins_creator(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)

    resp = client.post("/events", json=_event_payload(), headers=headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["joined"] is True
    assert body["participants"] == 1
    assert body["created_by_user_id"] == user.id


def test_create_event_rejects_invalid_goal_type(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)

    resp = client.post("/events", json=_event_payload(goal_type="speed"), headers=headers)
    assert resp.status_code == 400


def test_create_event_rejects_end_before_start(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)
    now = datetime.utcnow()

    resp = client.post(
        "/events",
        json=_event_payload(start_date=now.isoformat(), end_date=(now - timedelta(days=1)).isoformat()),
        headers=headers,
    )
    assert resp.status_code == 400


def test_join_event_then_progress_distance(client, db_session):
    creator = make_user(db_session, email="creator@example.com")
    rider = make_user(db_session, email="rider2@example.com")
    creator_headers = auth_header_for(db_session, creator)
    rider_headers = auth_header_for(db_session, rider)

    create_resp = client.post("/events", json=_event_payload(), headers=creator_headers)
    event_id = create_resp.json()["id"]

    join_resp = client.post(f"/events/{event_id}/join", headers=rider_headers)
    assert join_resp.status_code == 200
    assert join_resp.json()["joined"] is True
    assert join_resp.json()["participants"] == 2

    # Une sortie de 40km dans la fenêtre de l'événement doit compter dans la progression.
    event = db_session.query(models.Event).filter_by(id=event_id).first()
    db_session.add(models.Ride(
        user_id=rider.id, name="Sortie test", date=event.start_date + timedelta(hours=1),
        distance_km=40.0, duration_seconds=3600, avg_speed=40.0, elevation_gain=100,
        weather="dry", surface_type="road",
    ))
    db_session.commit()

    detail = client.get(f"/events/{event_id}", headers=rider_headers)
    assert detail.status_code == 200
    body = detail.json()
    assert body["progress_value"] == 40.0
    assert body["rank"] == 1  # seul participant à avoir roulé
    leaderboard = body["leaderboard"]
    assert any(entry["user_id"] == rider.id and entry["progress_value"] == 40.0 for entry in leaderboard)


def test_join_event_is_idempotent(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)
    event_id = client.post("/events", json=_event_payload(), headers=headers).json()["id"]

    first = client.post(f"/events/{event_id}/join", headers=headers)
    second = client.post(f"/events/{event_id}/join", headers=headers)
    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["participants"] == 1  # créateur déjà inscrit, pas de doublon


def test_get_event_not_found(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)
    resp = client.get("/events/999", headers=headers)
    assert resp.status_code == 404


def test_join_event_not_found(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)
    resp = client.post("/events/999/join", headers=headers)
    assert resp.status_code == 404
