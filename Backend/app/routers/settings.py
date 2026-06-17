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


def _split_name(full_name: str | None) -> tuple[str, str]:
    """Découpe un "athlete_name" stocké (ex: "Alexandre Cassan") en (prénom, nom)."""
    parts = (full_name or "").strip().split(" ", 1)
    first = parts[0] if parts else ""
    last = parts[1] if len(parts) > 1 else ""
    return first, last


def _is_same_athlete(member_firstname: str, member_lastname: str, ref_first: str, ref_last: str) -> bool:
    """Compare un membre de club Strava à un athlète connu (soi-même ou un
    autre utilisateur de l'app) sans s'appuyer sur l'id Strava.

    L'endpoint "club members" de Strava n'expose en pratique pas l'id de
    l'athlète, et tronque souvent son nom de famille à une initiale (ex:
    "Alexandre C."). On compare donc le prénom exactement, et le nom de
    famille seulement par préfixe (les deux sens, au cas où c'est l'un ou
    l'autre des deux noms qui est tronqué).
    """
    if not member_firstname or not ref_first:
        return False
    if member_firstname.strip().lower() != ref_first.strip().lower():
        return False
    member_last = (member_lastname or "").strip().rstrip(".").lower()
    ref_last_clean = (ref_last or "").strip().lower()
    if not member_last or not ref_last_clean:
        # Pas de nom de famille exploitable d'un côté ou de l'autre : le
        # prénom seul fait foi (suffisant dans le contexte d'un club Strava).
        return True
    return ref_last_clean.startswith(member_last) or member_last.startswith(ref_last_clean)


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


@router.get("/strava/clubs", response_model=list[schemas.StravaClubOut])
def get_strava_clubs(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    s = _get_connection(user.id, db)
    if not s.connected or not s.access_token:
        raise HTTPException(status_code=400, detail="Strava n'est pas connecté.")

    try:
        access_token = strava_client.ensure_fresh_token(s)
        clubs = strava_client.fetch_athlete_clubs(access_token)
    except httpx.HTTPError:
        db.commit()  # persiste un éventuel refresh de token avant l'erreur
        raise HTTPException(status_code=502, detail="Impossible de récupérer les clubs Strava.")

    db.commit()
    return [
        schemas.StravaClubOut(
            id=c["id"],
            name=c.get("name") or "",
            profile_medium=c.get("profile_medium"),
            cover_photo=c.get("cover_photo"),
            sport_type=c.get("sport_type"),
            city=c.get("city"),
            member_count=c.get("member_count"),
        )
        for c in clubs
    ]


@router.get("/strava/clubs/{club_id}/members", response_model=list[schemas.StravaClubMemberOut])
def get_strava_club_members(
    club_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    s = _get_connection(user.id, db)
    if not s.connected or not s.access_token:
        raise HTTPException(status_code=400, detail="Strava n'est pas connecté.")

    try:
        access_token = strava_client.ensure_fresh_token(s)
        members = strava_client.fetch_club_members(access_token, club_id)
    except httpx.HTTPError:
        db.commit()
        raise HTTPException(status_code=502, detail="Impossible de récupérer les membres du club Strava.")

    db.commit()

    # Une seule requête pour récupérer les athlètes déjà connus de l'app.
    rows = (
        db.query(models.StravaConnection.strava_athlete_id, models.StravaConnection.athlete_name)
        .filter(models.StravaConnection.connected.is_(True))
        .all()
    )
    app_athlete_ids = {row.strava_athlete_id for row in rows if row.strava_athlete_id is not None}
    app_athlete_names = [row.athlete_name for row in rows if row.athlete_name]
    own_first, own_last = _split_name(s.athlete_name)

    result = []
    for m in members:
        mid = m.get("id")
        firstname = m.get("firstname") or ""
        lastname = m.get("lastname") or ""

        if mid is not None:
            # L'id Strava est disponible (rare en pratique, mais le cas le
            # plus fiable quand on l'a) : on matche dessus.
            is_self = mid == s.strava_athlete_id
            is_app_user = mid in app_athlete_ids
        else:
            # Cas réel le plus fréquent : l'API "club members" de Strava ne
            # renvoie pas l'id de l'athlète. On retombe sur une comparaison
            # par prénom + nom de famille (potentiellement tronqué).
            is_self = _is_same_athlete(firstname, lastname, own_first, own_last)
            is_app_user = is_self or any(
                _is_same_athlete(firstname, lastname, *_split_name(name)) for name in app_athlete_names
            )

        result.append(
            schemas.StravaClubMemberOut(
                strava_id=mid,
                firstname=firstname,
                lastname=lastname,
                profile_medium=m.get("profile_medium"),
                city=m.get("city"),
                is_app_user=is_app_user,
                is_self=is_self,
            )
        )
    return result


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
