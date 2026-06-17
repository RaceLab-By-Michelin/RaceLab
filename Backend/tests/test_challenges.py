"""Tests pour /challenges (lecture seule, pas d'auth requise)."""
from datetime import datetime, timedelta

from app import models


def _make_challenge(db_session, *, status="active", name="Défi", **overrides):
    now = datetime.utcnow()
    defaults = dict(
        name=name,
        description="Description du défi",
        start_date=now - timedelta(days=5),
        end_date=now + timedelta(days=5),
        target_km=100.0,
        target_elevation=None,
        target_rides=None,
        progress_km=0,
        progress_elevation=0,
        progress_rides=0,
        status=status,
    )
    defaults.update(overrides)
    c = models.Challenge(**defaults)
    db_session.add(c)
    db_session.commit()
    db_session.refresh(c)
    return c


def test_list_active_challenges(client, db_session):
    active = _make_challenge(db_session, status="active", name="Actif")
    _make_challenge(db_session, status="completed", name="Terminé")

    resp = client.get("/challenges")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["id"] == active.id


def test_list_past_challenges(client, db_session):
    _make_challenge(db_session, status="active", name="Actif")
    past = _make_challenge(db_session, status="completed", name="Terminé")

    resp = client.get("/challenges/past")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["id"] == past.id


def test_get_challenge_not_found(client):
    resp = client.get("/challenges/999")
    assert resp.status_code == 404


def test_get_challenge_found(client, db_session):
    c = _make_challenge(db_session)
    resp = client.get(f"/challenges/{c.id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Défi"
