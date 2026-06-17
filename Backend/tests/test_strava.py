"""Tests pour le flux Strava : login/register via Strava, settings exchange,
sync (pagination + dédup), avatar, disconnect.

Toutes les requêtes HTTP vers l'API Strava elle-même sont mockées (on ne
touche jamais le réseau réel) en patchant les fonctions de `app.strava_client`
utilisées par les routers `app.routers.auth` et `app.routers.settings`.
"""
from datetime import datetime, timedelta

import httpx
import pytest

from app import models
from tests.conftest import make_user, auth_header_for


def _token_payload(athlete: dict, access_token="access-token-1", refresh_token="refresh-token-1"):
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_at": int(datetime.utcnow().timestamp()) + 3600,
        "athlete": athlete,
    }


ATHLETE_NO_PHOTO = {
    "id": 555,
    "firstname": "Jean",
    "lastname": "Dupont",
    "city": "Lyon",
    "profile": "avatar/athlete/large.png",  # chemin générique, pas une vraie URL
}

ATHLETE_WITH_PHOTO = {
    "id": 777,
    "firstname": "Marie",
    "lastname": "Curie",
    "city": "Paris",
    "profile": "https://dgalywyr863hv.cloudfront.net/pictures/athletes/777/large.jpg",
}


# ─── /auth/strava (inscription / connexion directe) ───────────────────────

def test_auth_strava_creates_new_user_without_real_photo(client, monkeypatch, db_session):
    import app.routers.auth as auth_router

    monkeypatch.setattr(
        auth_router.strava_client, "exchange_code", lambda code: _token_payload(ATHLETE_NO_PHOTO)
    )

    resp = client.post("/auth/strava", json={"code": "fake-code"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["user"]["name"] == "Jean Dupont"
    assert body["user"]["avatar_url"] is None  # chemin générique filtré
    assert body["token"]

    user = db_session.query(models.User).filter_by(email="strava-555@strava.placeholder").first()
    assert user is not None
    conn = db_session.query(models.StravaConnection).filter_by(user_id=user.id).first()
    assert conn is not None
    assert conn.connected is True
    assert conn.strava_athlete_id == 555


def test_auth_strava_creates_new_user_with_real_photo(client, monkeypatch, db_session):
    import app.routers.auth as auth_router

    monkeypatch.setattr(
        auth_router.strava_client, "exchange_code", lambda code: _token_payload(ATHLETE_WITH_PHOTO)
    )

    resp = client.post("/auth/strava", json={"code": "fake-code"})
    assert resp.status_code == 200
    assert resp.json()["user"]["avatar_url"] == ATHLETE_WITH_PHOTO["profile"]


def test_auth_strava_reconnects_existing_athlete(client, monkeypatch, db_session):
    import app.routers.auth as auth_router

    monkeypatch.setattr(
        auth_router.strava_client, "exchange_code", lambda code: _token_payload(ATHLETE_NO_PHOTO)
    )
    first = client.post("/auth/strava", json={"code": "fake-code"})
    first_user_id = first.json()["user"]["id"]

    # Deuxième connexion avec le même athlete_id -> même utilisateur, pas de doublon.
    second = client.post("/auth/strava", json={"code": "fake-code-2"})
    assert second.json()["user"]["id"] == first_user_id
    assert db_session.query(models.User).count() == 1


def test_auth_strava_propagates_token_exchange_failure(client, monkeypatch):
    import app.routers.auth as auth_router

    def _boom(code):
        raise httpx.HTTPStatusError(
            "bad code", request=httpx.Request("POST", "https://strava.com"), response=httpx.Response(400)
        )

    monkeypatch.setattr(auth_router.strava_client, "exchange_code", _boom)

    resp = client.post("/auth/strava", json={"code": "invalid"})
    assert resp.status_code == 502


def test_auth_strava_authorize_url(client):
    resp = client.get("/auth/strava/authorize-url")
    assert resp.status_code == 200
    assert resp.json()["authorize_url"].startswith("https://www.strava.com/oauth/authorize")
    assert "state=login" in resp.json()["authorize_url"]


# ─── /settings/strava (reconnexion d'un compte déjà authentifié) ──────────

def _setup_user_with_strava_connection(db_session, *, connected=False):
    user = make_user(db_session, email="settings-strava@example.com")
    conn = models.StravaConnection(user_id=user.id, connected=connected)
    db_session.add(conn)
    db_session.add(models.NotificationSettings(
        user_id=user.id, enabled=True, pre_ride_enabled=True, delay_hours=2, critical_only=False,
    ))
    db_session.commit()
    return user


def test_get_strava_settings_requires_existing_connection(client, db_session):
    user = make_user(db_session, email="no-strava@example.com")
    headers = auth_header_for(db_session, user)

    resp = client.get("/settings/strava", headers=headers)
    assert resp.status_code == 404


def test_exchange_strava_code_updates_connection_and_avatar(client, monkeypatch, db_session):
    import app.routers.settings as settings_router

    user = _setup_user_with_strava_connection(db_session)
    headers = auth_header_for(db_session, user)

    monkeypatch.setattr(
        settings_router.strava_client, "exchange_code", lambda code: _token_payload(ATHLETE_WITH_PHOTO)
    )

    resp = client.post("/settings/strava/exchange", json={"code": "fake-code"}, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["connected"] is True
    assert body["athlete_name"] == "Marie Curie"

    db_session.refresh(user)
    assert user.avatar_url == ATHLETE_WITH_PHOTO["profile"]


def test_exchange_strava_code_failure_returns_502(client, monkeypatch, db_session):
    import app.routers.settings as settings_router

    user = _setup_user_with_strava_connection(db_session)
    headers = auth_header_for(db_session, user)

    def _boom(code):
        raise httpx.HTTPError("network down")

    monkeypatch.setattr(settings_router.strava_client, "exchange_code", _boom)

    resp = client.post("/settings/strava/exchange", json={"code": "x"}, headers=headers)
    assert resp.status_code == 502


def test_sync_requires_connected_strava(client, db_session):
    user = _setup_user_with_strava_connection(db_session, connected=False)
    headers = auth_header_for(db_session, user)

    resp = client.post("/settings/strava/sync", headers=headers)
    assert resp.status_code == 400


def test_sync_imports_activities_and_dedupes(client, monkeypatch, db_session):
    import app.routers.settings as settings_router

    user = _setup_user_with_strava_connection(db_session, connected=True)
    conn = db_session.query(models.StravaConnection).filter_by(user_id=user.id).first()
    conn.access_token = "valid-token"
    conn.refresh_token = "refresh"
    conn.expires_at = int(datetime.utcnow().timestamp()) + 3600
    db_session.commit()

    # Une activité déjà importée (même strava_id) + deux nouvelles.
    existing_ride = models.Ride(
        user_id=user.id,
        name="Déjà importée",
        date=datetime.utcnow() - timedelta(days=5),
        distance_km=10,
        duration_seconds=1000,
        avg_speed=20,
        elevation_gain=50,
        strava_id="1001",
        weather="dry",
        surface_type="road",
    )
    db_session.add(existing_ride)
    db_session.commit()

    activities = [
        {
            "id": 1001,
            "name": "Sortie déjà connue",
            "start_date": "2026-06-01T08:00:00Z",
            "distance": 30000,
            "moving_time": 3600,
            "average_speed": 8.3,
            "total_elevation_gain": 300,
            "type": "Ride",
        },
        {
            "id": 1002,
            "name": "Nouvelle sortie route",
            "start_date": "2026-06-10T08:00:00Z",
            "distance": 45000,
            "moving_time": 5400,
            "average_speed": 8.33,
            "total_elevation_gain": 450,
            "type": "Ride",
        },
        {
            "id": 1003,
            "name": "Nouvelle sortie gravel",
            "start_date": "2026-06-12T08:00:00Z",
            "distance": 20000,
            "moving_time": 3000,
            "average_speed": 6.6,
            "total_elevation_gain": 120,
            "type": "GravelRide",
        },
    ]

    monkeypatch.setattr(settings_router.strava_client, "ensure_fresh_token", lambda s: "valid-token")
    monkeypatch.setattr(settings_router.strava_client, "fetch_activities", lambda token, after=None: activities)

    headers = auth_header_for(db_session, user)
    resp = client.post("/settings/strava/sync", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["imported"] == 2
    assert body["skipped"] == 1

    rides = db_session.query(models.Ride).filter_by(user_id=user.id).all()
    assert len(rides) == 3  # 1 existante + 2 nouvelles
    new_gravel = next(r for r in rides if r.strava_id == "1003")
    assert new_gravel.surface_type == "gravel"
    new_road = next(r for r in rides if r.strava_id == "1002")
    assert new_road.surface_type == "road"


def test_sync_passes_last_sync_as_after_param(client, monkeypatch, db_session):
    import app.routers.settings as settings_router

    user = _setup_user_with_strava_connection(db_session, connected=True)
    conn = db_session.query(models.StravaConnection).filter_by(user_id=user.id).first()
    conn.access_token = "valid-token"
    last_sync = datetime.utcnow() - timedelta(days=2)
    conn.last_sync = last_sync
    db_session.commit()

    captured = {}

    def _fake_fetch(token, after=None):
        captured["after"] = after
        return []

    monkeypatch.setattr(settings_router.strava_client, "ensure_fresh_token", lambda s: "valid-token")
    monkeypatch.setattr(settings_router.strava_client, "fetch_activities", _fake_fetch)

    headers = auth_header_for(db_session, user)
    resp = client.post("/settings/strava/sync", headers=headers)
    assert resp.status_code == 200
    assert captured["after"] == int(last_sync.timestamp())


def test_sync_failure_still_persists_token_refresh(client, monkeypatch, db_session):
    import app.routers.settings as settings_router

    user = _setup_user_with_strava_connection(db_session, connected=True)
    conn = db_session.query(models.StravaConnection).filter_by(user_id=user.id).first()
    conn.access_token = "old-token"
    db_session.commit()

    def _ensure_fresh(s):
        s.access_token = "refreshed-token"
        return "refreshed-token"

    def _boom(token, after=None):
        raise httpx.HTTPError("Strava down")

    monkeypatch.setattr(settings_router.strava_client, "ensure_fresh_token", _ensure_fresh)
    monkeypatch.setattr(settings_router.strava_client, "fetch_activities", _boom)

    headers = auth_header_for(db_session, user)
    resp = client.post("/settings/strava/sync", headers=headers)
    assert resp.status_code == 502

    db_session.refresh(conn)
    assert conn.access_token == "refreshed-token"


def test_disconnect_strava_clears_connection_fields(client, db_session):
    user = _setup_user_with_strava_connection(db_session, connected=True)
    conn = db_session.query(models.StravaConnection).filter_by(user_id=user.id).first()
    conn.access_token = "tok"
    conn.refresh_token = "rtok"
    conn.strava_athlete_id = 42
    conn.athlete_name = "Some Athlete"
    conn.last_sync = datetime.utcnow()
    db_session.commit()

    headers = auth_header_for(db_session, user)
    resp = client.delete("/settings/strava/disconnect", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["connected"] is False
    assert body["athlete_name"] is None
    assert body["last_sync"] is None


def test_settings_strava_authorize_url_requires_auth(client):
    resp = client.get("/settings/strava/authorize-url")
    assert resp.status_code == 401


def test_settings_strava_authorize_url_with_auth(client, db_session):
    user = make_user(db_session, email="auth-url@example.com")
    headers = auth_header_for(db_session, user)

    resp = client.get("/settings/strava/authorize-url", headers=headers)
    assert resp.status_code == 200
    assert "state=settings" in resp.json()["authorize_url"]


# ─── /settings/strava/clubs et /clubs/{id}/members ────────────────────────

CLUB_RAW = {
    "id": 42,
    "name": "Lyon Cycling Club",
    "profile_medium": "https://example.com/club42.jpg",
    "cover_photo": "https://example.com/cover42.jpg",
    "sport_type": "cycling",
    "city": "Lyon",
    "member_count": 120,
}


def _connected_user_with_token(db_session, *, strava_athlete_id=None):
    user = _setup_user_with_strava_connection(db_session, connected=True)
    conn = db_session.query(models.StravaConnection).filter_by(user_id=user.id).first()
    conn.access_token = "valid-token"
    conn.refresh_token = "refresh"
    conn.expires_at = int(datetime.utcnow().timestamp()) + 3600
    conn.strava_athlete_id = strava_athlete_id
    db_session.commit()
    return user, conn


def test_get_strava_clubs_requires_connected_strava(client, db_session):
    user = _setup_user_with_strava_connection(db_session, connected=False)
    headers = auth_header_for(db_session, user)

    resp = client.get("/settings/strava/clubs", headers=headers)
    assert resp.status_code == 400


def test_get_strava_clubs_returns_mapped_clubs(client, monkeypatch, db_session):
    import app.routers.settings as settings_router

    user, _ = _connected_user_with_token(db_session)
    headers = auth_header_for(db_session, user)

    monkeypatch.setattr(settings_router.strava_client, "ensure_fresh_token", lambda s: "valid-token")
    monkeypatch.setattr(settings_router.strava_client, "fetch_athlete_clubs", lambda token: [CLUB_RAW])

    resp = client.get("/settings/strava/clubs", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["id"] == 42
    assert body[0]["name"] == "Lyon Cycling Club"
    assert body[0]["member_count"] == 120


def test_get_strava_clubs_propagates_strava_failure_as_502(client, monkeypatch, db_session):
    import app.routers.settings as settings_router

    user, _ = _connected_user_with_token(db_session)
    headers = auth_header_for(db_session, user)

    def _boom(token):
        raise httpx.HTTPError("Strava down")

    monkeypatch.setattr(settings_router.strava_client, "ensure_fresh_token", lambda s: "valid-token")
    monkeypatch.setattr(settings_router.strava_client, "fetch_athlete_clubs", _boom)

    resp = client.get("/settings/strava/clubs", headers=headers)
    assert resp.status_code == 502


def test_get_strava_club_members_requires_connected_strava(client, db_session):
    user = _setup_user_with_strava_connection(db_session, connected=False)
    headers = auth_header_for(db_session, user)

    resp = client.get("/settings/strava/clubs/42/members", headers=headers)
    assert resp.status_code == 400


def test_get_strava_club_members_flags_app_users_and_self(client, monkeypatch, db_session):
    import app.routers.settings as settings_router

    # L'utilisateur courant est lui-même membre du club (même strava_athlete_id).
    user, conn = _connected_user_with_token(db_session, strava_athlete_id=999)

    # Un autre utilisateur de l'app, déjà connecté à Strava avec l'id 555.
    other_app_user = make_user(db_session, email="other-app-user@example.com")
    db_session.add(models.StravaConnection(user_id=other_app_user.id, connected=True, strava_athlete_id=555))
    db_session.commit()

    members_raw = [
        {"id": 999, "firstname": "Moi", "lastname": "Même", "profile_medium": None, "city": "Lyon"},
        {"id": 555, "firstname": "Déjà", "lastname": "Inscrit", "profile_medium": None, "city": "Paris"},
        {"id": 111, "firstname": "Pas", "lastname": "Encore", "profile_medium": None, "city": "Nantes"},
        {"id": None, "firstname": "Anonyme", "lastname": "P.", "profile_medium": None, "city": None},
    ]

    monkeypatch.setattr(settings_router.strava_client, "ensure_fresh_token", lambda s: "valid-token")
    monkeypatch.setattr(
        settings_router.strava_client, "fetch_club_members", lambda token, club_id: members_raw
    )

    headers = auth_header_for(db_session, user)
    resp = client.get("/settings/strava/clubs/42/members", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 4

    by_id = {m["strava_id"]: m for m in body if m["strava_id"] is not None}
    assert by_id[999]["is_self"] is True
    assert by_id[999]["is_app_user"] is True  # lui-même est aussi un utilisateur de l'app
    assert by_id[555]["is_app_user"] is True
    assert by_id[555]["is_self"] is False
    assert by_id[111]["is_app_user"] is False
    assert by_id[111]["is_self"] is False

    anonymous = next(m for m in body if m["strava_id"] is None)
    assert anonymous["is_app_user"] is False
    assert anonymous["is_self"] is False
    assert anonymous["firstname"] == "Anonyme"


def test_get_strava_club_members_matches_self_without_strava_id(client, monkeypatch, db_session):
    """Reproduit le cas réel : l'API "club members" de Strava ne renvoie pas
    l'id de l'athlète et tronque son nom de famille à une initiale. On doit
    quand même reconnaître l'utilisateur courant (et ne jamais lui proposer
    de s'inviter lui-même), via son prénom + nom stockés dans athlete_name.
    """
    import app.routers.settings as settings_router

    user, conn = _connected_user_with_token(db_session, strava_athlete_id=999)
    conn.athlete_name = "Alexandre Cassan"
    db_session.commit()

    other_app_user = make_user(db_session, email="other-app-user-2@example.com")
    db_session.add(
        models.StravaConnection(
            user_id=other_app_user.id, connected=True, strava_athlete_id=None, athlete_name="Julie Martin"
        )
    )
    db_session.commit()

    members_raw = [
        # Soi-même, comme renvoyé en pratique par Strava : pas d'id, nom tronqué.
        {"id": None, "firstname": "Alexandre", "lastname": "C.", "profile_medium": None, "city": "Lyon"},
        # Un autre utilisateur de l'app, déjà connecté, même format tronqué.
        {"id": None, "firstname": "Julie", "lastname": "M.", "profile_medium": None, "city": "Paris"},
        # Un inconnu, jamais inscrit sur l'app.
        {"id": None, "firstname": "Paul", "lastname": "D.", "profile_medium": None, "city": "Nantes"},
    ]

    monkeypatch.setattr(settings_router.strava_client, "ensure_fresh_token", lambda s: "valid-token")
    monkeypatch.setattr(
        settings_router.strava_client, "fetch_club_members", lambda token, club_id: members_raw
    )

    headers = auth_header_for(db_session, user)
    resp = client.get("/settings/strava/clubs/42/members", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 3

    by_firstname = {m["firstname"]: m for m in body}
    assert by_firstname["Alexandre"]["is_self"] is True
    assert by_firstname["Alexandre"]["is_app_user"] is True
    assert by_firstname["Julie"]["is_self"] is False
    assert by_firstname["Julie"]["is_app_user"] is True
    assert by_firstname["Paul"]["is_self"] is False
    assert by_firstname["Paul"]["is_app_user"] is False


def test_get_strava_club_members_propagates_strava_failure_as_502(client, monkeypatch, db_session):
    import app.routers.settings as settings_router

    user, _ = _connected_user_with_token(db_session)
    headers = auth_header_for(db_session, user)

    def _boom(token, club_id):
        raise httpx.HTTPError("Strava down")

    monkeypatch.setattr(settings_router.strava_client, "ensure_fresh_token", lambda s: "valid-token")
    monkeypatch.setattr(settings_router.strava_client, "fetch_club_members", _boom)

    resp = client.get("/settings/strava/clubs/42/members", headers=headers)
    assert resp.status_code == 502
