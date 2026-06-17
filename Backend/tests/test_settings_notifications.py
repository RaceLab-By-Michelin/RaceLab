"""Tests pour /settings/notifications."""
from app import models
from tests.conftest import make_user, auth_header_for


def _with_notifications(db_session, user, **overrides):
    defaults = dict(user_id=user.id, enabled=True, pre_ride_enabled=True, delay_hours=2, critical_only=False)
    defaults.update(overrides)
    n = models.NotificationSettings(**defaults)
    db_session.add(n)
    db_session.commit()
    return n


def test_get_notifications_requires_auth(client):
    resp = client.get("/settings/notifications")
    assert resp.status_code == 401


def test_get_notifications_not_found(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)
    resp = client.get("/settings/notifications", headers=headers)
    assert resp.status_code == 404


def test_get_notifications_success(client, db_session):
    user = make_user(db_session)
    _with_notifications(db_session, user)
    headers = auth_header_for(db_session, user)

    resp = client.get("/settings/notifications", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["enabled"] is True
    assert body["delay_hours"] == 2


def test_patch_notifications_updates_only_provided_fields(client, db_session):
    user = make_user(db_session)
    _with_notifications(db_session, user)
    headers = auth_header_for(db_session, user)

    resp = client.patch("/settings/notifications", json={"delay_hours": 4, "critical_only": True}, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["delay_hours"] == 4
    assert body["critical_only"] is True
    assert body["enabled"] is True  # non touché, reste à la valeur initiale
    assert body["pre_ride_enabled"] is True


def test_patch_notifications_disable_all(client, db_session):
    user = make_user(db_session)
    _with_notifications(db_session, user)
    headers = auth_header_for(db_session, user)

    resp = client.patch("/settings/notifications", json={"enabled": False}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["enabled"] is False


def test_patch_notifications_not_found(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)
    resp = client.patch("/settings/notifications", json={"enabled": False}, headers=headers)
    assert resp.status_code == 404


def test_notifications_scoped_per_user(client, db_session):
    user_a = make_user(db_session, email="a@example.com")
    user_b = make_user(db_session, email="b@example.com")
    _with_notifications(db_session, user_a, delay_hours=1)
    _with_notifications(db_session, user_b, delay_hours=9)

    headers_a = auth_header_for(db_session, user_a)
    resp = client.get("/settings/notifications", headers=headers_a)
    assert resp.json()["delay_hours"] == 1
