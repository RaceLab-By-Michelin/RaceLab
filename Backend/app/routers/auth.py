from datetime import datetime
import httpx
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth as auth_lib, strava_client

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_to_out(user: models.User) -> schemas.UserOut:
    return schemas.UserOut(
        id=user.id,
        name=user.name,
        username=user.username,
        email=user.email,
        city=user.city,
        member_since=user.member_since,
        level=user.level,
        level_progress=user.level_progress,
        bike=schemas.BikeOut(
            brand=user.bike_brand,
            model=user.bike_model,
            year=user.bike_year,
            color=user.bike_color,
        ),
        onboarding_completed=user.onboarding_completed,
        avatar_url=user.avatar_url,
    )


def _strava_avatar_url(athlete: dict) -> str | None:
    """Extrait l'URL de la photo de profil Strava, si une vraie photo est définie.

    Quand l'athlète n'a pas de photo, Strava renvoie un chemin générique relatif
    (ex: "avatar/athlete/large.png") au lieu d'une URL absolue — on ne garde
    que les vraies URLs (http...).
    """
    url = athlete.get("profile") or athlete.get("profile_medium")
    if url and url.startswith("http"):
        return url
    return None


@router.post("/register", response_model=schemas.AuthOut, status_code=201)
def register(body: schemas.RegisterIn, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=422, detail="Email invalide")
    if len(body.password) < 6:
        raise HTTPException(status_code=422, detail="Le mot de passe doit contenir au moins 6 caractères")

    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Un compte existe déjà avec cet email")

    # Sans "@" : le frontend l'ajoute déjà à l'affichage (@{username}).
    username = email.split("@")[0].lower().replace(".", "_")
    user = models.User(
        name=body.name.strip() or email.split("@")[0],
        username=username,
        email=email,
        city="",
        member_since=datetime.utcnow().strftime("%B %Y"),
        level="Débutant",
        level_progress=0,
        bike_brand="",
        bike_model="",
        bike_year=0,
        bike_color="#1A3A6B",
        password_hash=auth_lib.hash_password(body.password),
        onboarding_completed=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    session = auth_lib.create_session(db, user.id)
    return schemas.AuthOut(token=session.token, user=_user_to_out(user))


@router.post("/login", response_model=schemas.AuthOut)
def login(body: schemas.LoginIn, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not user.password_hash or not auth_lib.verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    session = auth_lib.create_session(db, user.id)
    return schemas.AuthOut(token=session.token, user=_user_to_out(user))


@router.post("/logout", status_code=204)
def logout(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    if authorization and authorization.lower().startswith("bearer "):
        auth_lib.delete_session(db, authorization.split(" ", 1)[1].strip())
    return None


@router.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(auth_lib.get_current_user)):
    return _user_to_out(user)


# ─── Strava (s'inscrire / se connecter directement avec Strava) ──────────────
#
# Distinct du flux app/routers/settings.py::exchange_strava_code (qui suppose
# un utilisateur déjà authentifié et reconnecte son compte existant). Ici on
# n'a personne d'authentifié : on échange le code, on retrouve l'utilisateur
# via strava_athlete_id, ou on en crée un nouveau si c'est la première fois.

@router.get("/strava/authorize-url", response_model=schemas.StravaAuthorizeUrlOut)
def get_strava_login_authorize_url():
    return schemas.StravaAuthorizeUrlOut(authorize_url=strava_client.build_authorize_url(state="login"))


@router.post("/strava", response_model=schemas.AuthOut)
def auth_with_strava(body: schemas.StravaExchangeIn, db: Session = Depends(get_db)):
    try:
        data = strava_client.exchange_code(body.code)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Échange du code Strava échoué : {exc.response.text}")
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Impossible de contacter Strava.")

    athlete = data.get("athlete") or {}
    athlete_id = athlete.get("id")
    if not athlete_id:
        raise HTTPException(status_code=502, detail="Réponse Strava invalide (athlète manquant).")

    strava_conn = (
        db.query(models.StravaConnection)
        .filter(models.StravaConnection.strava_athlete_id == athlete_id)
        .first()
    )

    if strava_conn:
        user = db.query(models.User).filter(models.User.id == strava_conn.user_id).first()
    else:
        # Strava ne fournit pas d'email sous les scopes read,activity:read_all :
        # on génère un email synthétique unique, modifiable plus tard depuis le profil.
        email = f"strava-{athlete_id}@strava.placeholder"
        suffix = 1
        while db.query(models.User).filter(models.User.email == email).first():
            email = f"strava-{athlete_id}-{suffix}@strava.placeholder"
            suffix += 1

        name = f"{athlete.get('firstname', '')} {athlete.get('lastname', '')}".strip() or f"Athlète Strava {athlete_id}"
        user = models.User(
            name=name,
            username=f"strava_{athlete_id}",
            email=email,
            city=athlete.get("city") or "",
            member_since=datetime.utcnow().strftime("%B %Y"),
            level="Débutant",
            level_progress=0,
            bike_brand="",
            bike_model="",
            bike_year=0,
            bike_color="#1A3A6B",
            password_hash="",
            onboarding_completed=False,
            avatar_url=_strava_avatar_url(athlete),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        strava_conn = models.StravaConnection(user_id=user.id, connected=True)
        db.add(strava_conn)
        db.add(models.NotificationSettings(
            user_id=user.id, enabled=True, pre_ride_enabled=True, delay_hours=2, critical_only=False,
        ))

    strava_conn.connected = True
    strava_conn.access_token = data["access_token"]
    strava_conn.refresh_token = data["refresh_token"]
    strava_conn.expires_at = data["expires_at"]
    strava_conn.strava_athlete_id = athlete_id
    athlete_name = f"{athlete.get('firstname', '')} {athlete.get('lastname', '')}".strip()
    strava_conn.athlete_name = athlete_name or user.name
    # Toujours resynchroniser la photo de profil avec celle de Strava (compte déjà
    # existant sans avatar, ou photo changée depuis la dernière connexion).
    avatar_url = _strava_avatar_url(athlete)
    if avatar_url:
        user.avatar_url = avatar_url
    db.commit()
    db.refresh(user)

    session = auth_lib.create_session(db, user.id)
    return schemas.AuthOut(token=session.token, user=_user_to_out(user))
