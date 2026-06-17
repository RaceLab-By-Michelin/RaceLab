from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, strava_client
from app.auth import get_current_user

router = APIRouter(prefix="/settings", tags=["settings"])


# ─── Notifications ────────────────────────────────────────────────────────────

@router.get("/notifications", response_model=schemas.NotificationSettingsOut)
def get_notifications(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    n = db.query(models.NotificationSettings).filter(models.NotificationSettings.user_id == user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Paramètres introuvables")
    return n


@router.patch("/notifications", response_model=schemas.NotificationSettingsOut)
def patch_notifications(
    body: schemas.NotificationSettingsPatch,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    n = db.query(models.NotificationSettings).filter(models.NotificationSettings.user_id == user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Paramètres introuvables")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(n, field, value)
    db.commit()
    db.refresh(n)
    return n


# ─── Strava (OAuth réel) ───────────────────────────────────────────────────────
#
# Flux : le frontend appelle GET /strava/authorize-url, redirige le navigateur
# vers l'URL Strava renvoyée ; l'utilisateur autorise l'accès sur strava.com ;
# Strava redirige vers STRAVA_REDIRECT_URI?code=... ; le frontend récupère ce
# code et le transmet à POST /strava/exchange, qui échange le code contre des
# tokens (côté serveur, avec le client_secret) et les persiste.

def _get_connection(user_id: int, db: Session) -> models.StravaConnection:
    s = db.query(models.StravaConnection).filter(models.StravaConnection.user_id == user_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Connexion Strava introuvable")
    return s


@router.get("/strava", response_model=schemas.StravaOut)
def get_strava(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return _get_connection(user.id, db)


@router.get("/strava/authorize-url", response_model=schemas.StravaAuthorizeUrlOut)
def get_strava_authorize_url(user: models.User = Depends(get_current_user)):
    return schemas.StravaAuthorizeUrlOut(authorize_url=strava_client.build_authorize_url(state="settings"))


@router.post("/strava/exchange", response_model=schemas.StravaOut)
def exchange_strava_code(
    body: schemas.StravaExchangeIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    s = _get_connection(user.id, db)
    try:
        data = strava_client.exchange_code(body.code)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Échange du code Strava échoué : {exc.response.text}")
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Impossible de contacter Strava.")

    athlete = data.get("athlete") or {}
    s.connected = True
    s.access_token = data["access_token"]
    s.refresh_token = data["refresh_token"]
    s.expires_at = data["expires_at"]
    s.strava_athlete_id = athlete.get("id")
    name = f"{athlete.get('firstname', '')} {athlete.get('lastname', '')}".strip()
    s.athlete_name = name or user.name

    # Récupère la photo de profil Strava pour l'utiliser comme avatar du compte
    # (Strava renvoie un chemin générique "avatar/athlete/large.png" — pas une
    # vraie URL — quand l'athlète n'a pas de photo).
    avatar_url = athlete.get("profile") or athlete.get("profile_medium")
    if avatar_url and avatar_url.startswith("http"):
        user.avatar_url = avatar_url

    db.commit()
    db.refresh(s)
    return s


@router.post("/strava/sync", response_model=schemas.StravaSyncOut)
def sync_strava_activities(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    s = _get_connection(user.id, db)
    if not s.connected or not s.access_token:
        raise HTTPException(status_code=400, detail="Strava n'est pas connecté.")

    # Premier sync depuis cette connexion -> on remonte tout l'historique des
    # sorties vélo. Les fois suivantes, on ne demande à Strava que ce qui est
    # postérieur au dernier sync (paramètre `after`), donc plus aucune sortie
    # déjà importée n'est même téléchargée.
    after_ts = int(s.last_sync.timestamp()) if s.last_sync else None

    try:
        access_token = strava_client.ensure_fresh_token(s)
        activities = strava_client.fetch_activities(access_token, after=after_ts)
    except httpx.HTTPError:
        db.commit()  # persiste un éventuel refresh de token avant l'erreur
        raise HTTPException(status_code=502, detail="Impossible de récupérer les activités Strava.")

    # Filet de sécurité : une seule requête pour connaître les strava_id déjà
    # importés, plutôt qu'une requête DB par activité reçue.
    incoming_ids = {str(a["id"]) for a in activities}
    already_imported = {
        row.strava_id
        for row in db.query(models.Ride.strava_id).filter(models.Ride.strava_id.in_(incoming_ids)).all()
    }

    imported, skipped = 0, 0
    for act in activities:
        strava_id = str(act["id"])
        if strava_id in already_imported:
            skipped += 1
            continue

        distance_km = round((act.get("distance") or 0) / 1000.0, 2)
        duration_seconds = act.get("moving_time") or act.get("elapsed_time") or 0
        avg_speed = round((act.get("average_speed") or 0) * 3.6, 1)  # m/s → km/h

        ride = models.Ride(
            user_id=user.id,
            name=act.get("name") or "Sortie Strava",
            date=datetime.fromisoformat((act.get("start_date") or "").replace("Z", "+00:00")),
            distance_km=distance_km,
            duration_seconds=duration_seconds,
            avg_speed=avg_speed,
            elevation_gain=round(act.get("total_elevation_gain") or 0),
            strava_id=strava_id,
            weather="dry",
            surface_type="road" if act.get("type") == "Ride" else "gravel",
        )
        db.add(ride)
        imported += 1

    s.last_sync = datetime.utcnow()
    db.commit()
    return schemas.StravaSyncOut(imported=imported, skipped=skipped)


@router.delete("/strava/disconnect", response_model=schemas.StravaOut)
def disconnect_strava(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    s = _get_connection(user.id, db)
    s.connected = False
    s.athlete_name = None
    s.last_sync = None
    s.access_token = None
    s.refresh_token = None
    s.expires_at = None
    s.strava_athlete_id = None
    db.commit()
    db.refresh(s)
    return s
