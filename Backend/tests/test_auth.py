"""Tests pour /auth — register, login, logout, me."""
from datetime import datetime, timedelta

from app import models
from tests.conftest import make_user, auth_header_for


def test_register_creates_user_and_session(client, db_session):
    resp = client.post(
        "/auth/register",
        json={
            "name": "Alice Martin",
            "email": "Alice.Martin@Example.com",
            "password": "secret123",
            "weight_kg": 62,
            "height_cm": 168,
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["token"]
    # email normalisé en minuscule, username dérivé de la partie locale
    assert body["user"]["email"] == "alice.martin@example.com"
    assert body["user"]["username"] == "alice_martin"
    assert body["user"]["onboarding_completed"] is False
    assert body["user"]["avatar_url"] is None
    assert body["user"]["weight_kg"] == 62
    assert body["user"]["height_cm"] == 168

    user = db_session.query(models.User).filter_by(email="alice.martin@example.com").first()
    assert user is not None
    assert user.password_hash != "secret123"  # jamais en clair

    session = db_session.query(models.Session).filter_by(token=body["token"]).first()
    assert session is not None
    assert session.user_id == user.id


def test_register_rejects_invalid_email(client):
    resp = client.post("/auth/register", json={"name": "Bob", "email": "not-an-email", "password": "secret123"})
    assert resp.status_code == 422


def test_register_rejects_short_password(client):
    resp = client.post("/auth/register", json={"name": "Bob", "email": "bob@example.com", "password": "abc"})
    assert resp.status_code == 422


def test_register_rejects_duplicate_email(client):
    payload = {"name": "Bob", "email": "bob@example.com", "password": "secret123", "weight_kg": 75, "height_cm": 180}
    first = client.post("/auth/register", json=payload)
    assert first.status_code == 201

    second = client.post("/auth/register", json=payload)
    assert second.status_code == 409


def test_login_success(client):
    client.post(
        "/auth/register",
        json={"name": "Carla", "email": "carla@example.com", "password": "secret123", "weight_kg": 75, "height_cm": 180},
    )

    resp = client.post("/auth/login", json={"email": "carla@example.com", "password": "secret123"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["token"]
    assert body["user"]["email"] == "carla@example.com"


def test_login_wrong_password(client):
    client.post(
        "/auth/register",
        json={"name": "Carla", "email": "carla@example.com", "password": "secret123", "weight_kg": 75, "height_cm": 180},
    )

    resp = client.post("/auth/login", json={"email": "carla@example.com", "password": "wrong-password"})
    assert resp.status_code == 401


def test_login_unknown_email(client):
    resp = client.post("/auth/login", json={"email": "ghost@example.com", "password": "secret123"})
    assert resp.status_code == 401


def test_me_requires_auth(client):
    resp = client.get("/auth/me")
    assert resp.status_code == 401


def test_me_with_valid_token(client):
    register = client.post(
        "/auth/register",
        json={"name": "Dora", "email": "dora@example.com", "password": "secret123", "weight_kg": 75, "height_cm": 180},
    )
    token = register.json()["token"]

    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "dora@example.com"


def test_me_rejects_garbage_token(client):
    resp = client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert resp.status_code == 401


def test_me_rejects_expired_session(client, db_session):
    user = make_user(db_session, email="expired@example.com")
    expired_session = models.Session(
        token="expired-token-123",
        user_id=user.id,
        created_at=datetime.utcnow() - timedelta(days=40),
        expires_at=datetime.utcnow() - timedelta(days=10),
    )
    db_session.add(expired_session)
    db_session.commit()

    resp = client.get("/auth/me", headers={"Authorization": "Bearer expired-token-123"})
    assert resp.status_code == 401

    # La session expirée doit être purgée de la base lors de la vérification
    assert db_session.query(models.Session).filter_by(token="expired-token-123").first() is None


def test_logout_invalidates_session(client, db_session):
    register = client.post(
        "/auth/register",
        json={"name": "Eli", "email": "eli@example.com", "password": "secret123", "weight_kg": 75, "height_cm": 180},
    )
    token = register.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    logout_resp = client.post("/auth/logout", headers=headers)
    assert logout_resp.status_code == 204

    me_resp = client.get("/auth/me", headers=headers)
    assert me_resp.status_code == 401


def test_logout_without_token_is_noop(client):
    resp = client.post("/auth/logout")
    assert resp.status_code == 204
