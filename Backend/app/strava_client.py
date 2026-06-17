"""
Client HTTP minimal pour l'OAuth Strava et la récupération d'activités.

Toutes les requêtes vers l'API Strava (token, refresh, activités) passent
par ce module — le client_secret n'y est lu que depuis app.config (donc
depuis l'environnement serveur), jamais transmis au frontend.
"""
from __future__ import annotations

import time

import httpx

from app import config

TOKEN_URL = "https://www.strava.com/oauth/token"
ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities"

AUTHORIZE_BASE_URL = "https://www.strava.com/oauth/authorize"


def build_authorize_url(state: str | None = None) -> str:
    """URL vers laquelle rediriger l'utilisateur pour qu'il autorise l'accès.

    `state` est renvoyé tel quel par Strava sur l'URL de callback : on s'en
    sert pour distinguer un "connecter Strava depuis les réglages" (state
    absent ou "settings") d'un "s'inscrire/se connecter avec Strava" (state
    "login") sur la même page de callback.
    """
    params = {
        "client_id": config.STRAVA_CLIENT_ID,
        "redirect_uri": config.STRAVA_REDIRECT_URI,
        "response_type": "code",
        "approval_prompt": "auto",
        "scope": "read,activity:read_all",
    }
    if state:
        params["state"] = state
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{AUTHORIZE_BASE_URL}?{query}"


def exchange_code(code: str) -> dict:
    """Échange le code d'autorisation contre un access_token + refresh_token."""
    resp = httpx.post(
        TOKEN_URL,
        data={
            "client_id": config.STRAVA_CLIENT_ID,
            "client_secret": config.STRAVA_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
        },
        timeout=15.0,
    )
    resp.raise_for_status()
    return resp.json()


def refresh_access_token(refresh_token: str) -> dict:
    """Renouvelle un access_token expiré à partir du refresh_token."""
    resp = httpx.post(
        TOKEN_URL,
        data={
            "client_id": config.STRAVA_CLIENT_ID,
            "client_secret": config.STRAVA_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=15.0,
    )
    resp.raise_for_status()
    return resp.json()


def ensure_fresh_token(strava: "models.StravaConnection") -> str:  # noqa: F821 (annotation only)
    """Retourne un access_token valide pour `strava`, en le renouvelant si besoin.

    Ne fait PAS le commit en DB — l'appelant est responsable de persister les
    nouveaux tokens si `refresh_access_token` a été utilisé.
    """
    now = int(time.time())
    if strava.expires_at and strava.expires_at > now + 60:
        return strava.access_token

    data = refresh_access_token(strava.refresh_token)
    strava.access_token = data["access_token"]
    strava.refresh_token = data["refresh_token"]
    strava.expires_at = data["expires_at"]
    return strava.access_token


def fetch_recent_activities(access_token: str, per_page: int = 30) -> list[dict]:
    """Récupère les activités récentes de l'athlète connecté (type Ride uniquement)."""
    resp = httpx.get(
        ACTIVITIES_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        params={"per_page": per_page},
        timeout=15.0,
    )
    resp.raise_for_status()
    activities = resp.json()
    return [a for a in activities if a.get("type") in ("Ride", "VirtualRide", "GravelRide", "MountainBikeRide")]
