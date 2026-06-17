"""Tests unitaires directs pour app/strava_client.py (sans passer par les routers).

Contrairement à tests/test_strava.py qui mocke `strava_client` entier pour
tester les routers, ici on mocke seulement `httpx.post`/`httpx.get` pour
vérifier le comportement réel du client : pagination, garde-fou MAX_PAGES,
filtrage par type d'activité, refresh de token.
"""
import time

import httpx
import pytest

from app import strava_client


def _resp(json_data, status_code=200):
    request = httpx.Request("GET", "https://example.com")
    return httpx.Response(status_code, json=json_data, request=request)


def test_build_authorize_url_without_state():
    url = strava_client.build_authorize_url()
    assert url.startswith("https://www.strava.com/oauth/authorize?")
    assert "state=" not in url
    assert "scope=read,activity:read_all" in url


def test_build_authorize_url_with_state():
    url = strava_client.build_authorize_url(state="settings")
    assert "state=settings" in url


def test_exchange_code_returns_json_payload(monkeypatch):
    def _fake_post(url, data, timeout):
        assert url == strava_client.TOKEN_URL
        assert data["grant_type"] == "authorization_code"
        assert data["code"] == "abc123"
        return _resp({"access_token": "a", "refresh_token": "r", "expires_at": 123, "athlete": {"id": 1}})

    monkeypatch.setattr(httpx, "post", _fake_post)
    data = strava_client.exchange_code("abc123")
    assert data["access_token"] == "a"


def test_exchange_code_raises_on_http_error(monkeypatch):
    def _fake_post(url, data, timeout):
        return _resp({"message": "bad"}, status_code=400)

    monkeypatch.setattr(httpx, "post", _fake_post)
    with pytest.raises(httpx.HTTPStatusError):
        strava_client.exchange_code("bad-code")


def test_refresh_access_token(monkeypatch):
    def _fake_post(url, data, timeout):
        assert data["grant_type"] == "refresh_token"
        assert data["refresh_token"] == "old-refresh"
        return _resp({"access_token": "new-access", "refresh_token": "new-refresh", "expires_at": 999})

    monkeypatch.setattr(httpx, "post", _fake_post)
    data = strava_client.refresh_access_token("old-refresh")
    assert data["access_token"] == "new-access"


class _FakeConn:
    def __init__(self, access_token, refresh_token, expires_at):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.expires_at = expires_at


def test_ensure_fresh_token_returns_existing_when_not_expired():
    conn = _FakeConn("still-valid", "r", int(time.time()) + 3600)
    token = strava_client.ensure_fresh_token(conn)
    assert token == "still-valid"


def test_ensure_fresh_token_refreshes_when_expired(monkeypatch):
    conn = _FakeConn("expired-token", "refresh-tok", int(time.time()) - 10)

    def _fake_post(url, data, timeout):
        return _resp({"access_token": "fresh-token", "refresh_token": "fresh-refresh", "expires_at": int(time.time()) + 3600})

    monkeypatch.setattr(httpx, "post", _fake_post)
    token = strava_client.ensure_fresh_token(conn)
    assert token == "fresh-token"
    assert conn.access_token == "fresh-token"
    assert conn.refresh_token == "fresh-refresh"


def test_fetch_activities_filters_non_bike_types(monkeypatch):
    activities = [
        {"id": 1, "type": "Ride"},
        {"id": 2, "type": "Run"},
        {"id": 3, "type": "GravelRide"},
        {"id": 4, "type": "Swim"},
    ]

    def _fake_get(url, headers, params, timeout):
        return _resp(activities if params["page"] == 1 else [])

    monkeypatch.setattr(httpx, "get", _fake_get)
    result = strava_client.fetch_activities("token", after=None)
    assert {a["id"] for a in result} == {1, 3}


def test_fetch_activities_paginates_until_short_page(monkeypatch):
    pages = {
        1: [{"id": i, "type": "Ride"} for i in range(100)],
        2: [{"id": i, "type": "Ride"} for i in range(100, 150)],  # page courte -> dernière page
    }
    calls = []

    def _fake_get(url, headers, params, timeout):
        calls.append(params["page"])
        return _resp(pages.get(params["page"], []))

    monkeypatch.setattr(httpx, "get", _fake_get)
    result = strava_client.fetch_activities("token", after=None)
    assert len(result) == 150
    assert calls == [1, 2]  # s'arrête dès qu'une page < per_page est reçue


def test_fetch_activities_respects_max_pages_safety_net(monkeypatch):
    call_count = {"n": 0}

    def _fake_get(url, headers, params, timeout):
        call_count["n"] += 1
        # Toujours une page pleine -> sans garde-fou, boucle infinie.
        return _resp([{"id": params["page"] * 1000 + i, "type": "Ride"} for i in range(100)])

    monkeypatch.setattr(httpx, "get", _fake_get)
    result = strava_client.fetch_activities("token", after=None)
    assert call_count["n"] == strava_client.MAX_PAGES
    assert len(result) == strava_client.MAX_PAGES * 100


def test_fetch_activities_passes_after_param(monkeypatch):
    captured = {}

    def _fake_get(url, headers, params, timeout):
        captured.update(params)
        return _resp([])

    monkeypatch.setattr(httpx, "get", _fake_get)
    strava_client.fetch_activities("token", after=1234567890)
    assert captured["after"] == 1234567890


# ─── fetch_athlete_clubs / fetch_club_members ──────────────────────────────

def test_fetch_athlete_clubs_single_page(monkeypatch):
    clubs = [{"id": 1, "name": "Club A"}, {"id": 2, "name": "Club B"}]

    def _fake_get(url, headers, params, timeout):
        assert url == strava_client.ATHLETE_CLUBS_URL
        return _resp(clubs if params["page"] == 1 else [])

    monkeypatch.setattr(httpx, "get", _fake_get)
    result = strava_client.fetch_athlete_clubs("token")
    assert result == clubs


def test_fetch_athlete_clubs_paginates_until_short_page(monkeypatch):
    pages = {
        1: [{"id": i} for i in range(30)],
        2: [{"id": i} for i in range(30, 35)],  # page courte -> dernière page
    }
    calls = []

    def _fake_get(url, headers, params, timeout):
        calls.append(params["page"])
        return _resp(pages.get(params["page"], []))

    monkeypatch.setattr(httpx, "get", _fake_get)
    result = strava_client.fetch_athlete_clubs("token", per_page=30)
    assert len(result) == 35
    assert calls == [1, 2]


def test_fetch_athlete_clubs_respects_max_pages_safety_net(monkeypatch):
    call_count = {"n": 0}

    def _fake_get(url, headers, params, timeout):
        call_count["n"] += 1
        return _resp([{"id": params["page"] * 1000 + i} for i in range(30)])

    monkeypatch.setattr(httpx, "get", _fake_get)
    result = strava_client.fetch_athlete_clubs("token", per_page=30)
    assert call_count["n"] == strava_client.CLUB_MAX_PAGES
    assert len(result) == strava_client.CLUB_MAX_PAGES * 30


def test_fetch_club_members_single_page(monkeypatch):
    members = [{"id": 1, "firstname": "A"}, {"id": 2, "firstname": "B"}]

    def _fake_get(url, headers, params, timeout):
        assert url == strava_client.CLUB_MEMBERS_URL.format(club_id=42)
        return _resp(members if params["page"] == 1 else [])

    monkeypatch.setattr(httpx, "get", _fake_get)
    result = strava_client.fetch_club_members("token", 42)
    assert result == members


def test_fetch_club_members_paginates_until_short_page(monkeypatch):
    pages = {
        1: [{"id": i} for i in range(100)],
        2: [{"id": i} for i in range(100, 140)],
    }
    calls = []

    def _fake_get(url, headers, params, timeout):
        calls.append(params["page"])
        return _resp(pages.get(params["page"], []))

    monkeypatch.setattr(httpx, "get", _fake_get)
    result = strava_client.fetch_club_members("token", 42)
    assert len(result) == 140
    assert calls == [1, 2]


def test_fetch_club_members_respects_max_pages_safety_net(monkeypatch):
    call_count = {"n": 0}

    def _fake_get(url, headers, params, timeout):
        call_count["n"] += 1
        return _resp([{"id": params["page"] * 1000 + i} for i in range(100)])

    monkeypatch.setattr(httpx, "get", _fake_get)
    result = strava_client.fetch_club_members("token", 42)
    assert call_count["n"] == strava_client.CLUB_MAX_PAGES
    assert len(result) == strava_client.CLUB_MAX_PAGES * 100
