import random
import string
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/events", tags=["events"])


def _generate_join_code(db: Session) -> str:
    """Code court (6 caractères, lettres majuscules + chiffres) à partager pour
    rejoindre un événement privé. Régénéré jusqu'à obtenir une valeur unique."""
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = "".join(random.choices(alphabet, k=6))
        exists = db.query(models.Event).filter(models.Event.join_code == code).first()
        if not exists:
            return code


def _progress_for(db: Session, user_id: int, event: models.Event) -> float:
    """Calcule la progression réelle de l'utilisateur sur la période de l'événement,
    à partir de ses sorties (Ride) — jamais d'un compteur stocké/figé."""
    rides = (
        db.query(models.Ride)
        .filter(
            models.Ride.user_id == user_id,
            models.Ride.date >= event.start_date,
            models.Ride.date <= event.end_date,
        )
        .all()
    )
    if event.goal_type == "distance":
        return round(sum(r.distance_km for r in rides), 1)
    if event.goal_type == "elevation":
        return float(sum(r.elevation_gain for r in rides))
    if event.goal_type == "rides":
        return float(len(rides))
    return 0.0


def _build_event_out(db: Session, event: models.Event, user: models.User) -> schemas.EventOut:
    participant_ids = [
        p.user_id for p in db.query(models.EventParticipant).filter(models.EventParticipant.event_id == event.id).all()
    ]
    joined = user.id in participant_ids

    rank = None
    progress_value = 0.0
    if joined:
        scores = sorted(
            ((uid, _progress_for(db, uid, event)) for uid in participant_ids),
            key=lambda t: t[1],
            reverse=True,
        )
        for idx, (uid, score) in enumerate(scores, start=1):
            if uid == user.id:
                rank = idx
                progress_value = score
                break

    is_creator = user.id == event.created_by_user_id

    return schemas.EventOut(
        id=event.id,
        name=event.name,
        description=event.description,
        goal_type=event.goal_type,
        goal_value=event.goal_value,
        terrain_type=event.terrain_type,
        start_date=event.start_date,
        end_date=event.end_date,
        reward=event.reward,
        created_by_user_id=event.created_by_user_id,
        participants=len(participant_ids),
        visibility=event.visibility,
        # Le code ne doit être visible que par le créateur, qui peut ensuite
        # le partager lui-même avec qui il souhaite.
        join_code=event.join_code if is_creator else None,
        joined=joined,
        progress_value=progress_value,
        rank=rank,
    )


@router.get("", response_model=list[schemas.EventOut])
def list_events(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    events = db.query(models.Event).order_by(models.Event.start_date.desc()).all()
    return [_build_event_out(db, e, user) for e in events]


@router.post("", response_model=schemas.EventOut, status_code=201)
def create_event(
    body: schemas.EventCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if body.goal_type not in ("distance", "elevation", "rides"):
        raise HTTPException(status_code=400, detail="goal_type invalide")
    if body.visibility not in ("public", "private"):
        raise HTTPException(status_code=400, detail="visibility invalide")
    if body.end_date <= body.start_date:
        raise HTTPException(status_code=400, detail="end_date doit être après start_date")

    event = models.Event(
        name=body.name,
        description=body.description,
        goal_type=body.goal_type,
        goal_value=body.goal_value,
        terrain_type=body.terrain_type,
        start_date=body.start_date,
        end_date=body.end_date,
        reward=body.reward,
        created_by_user_id=user.id,
        created_at=datetime.utcnow(),
        visibility=body.visibility,
        join_code=_generate_join_code(db) if body.visibility == "private" else None,
    )
    db.add(event)
    db.flush()

    # Le créateur rejoint automatiquement son propre événement
    db.add(models.EventParticipant(event_id=event.id, user_id=user.id, joined_at=datetime.utcnow()))
    db.commit()
    db.refresh(event)
    return _build_event_out(db, event, user)


@router.get("/{event_id}", response_model=schemas.EventDetailOut)
def get_event(event_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Événement introuvable")

    base = _build_event_out(db, event, user)

    participants = db.query(models.EventParticipant).filter(models.EventParticipant.event_id == event.id).all()
    scored = sorted(
        (
            (p.user_id, _progress_for(db, p.user_id, event))
            for p in participants
        ),
        key=lambda t: t[1],
        reverse=True,
    )
    leaderboard = []
    for idx, (uid, score) in enumerate(scored, start=1):
        u = db.query(models.User).filter(models.User.id == uid).first()
        if u:
            leaderboard.append(
                schemas.EventLeaderboardEntry(user_id=uid, name=u.name, progress_value=score, rank=idx)
            )

    return schemas.EventDetailOut(**base.model_dump(), leaderboard=leaderboard)


@router.post("/{event_id}/join", response_model=schemas.EventOut)
def join_event(
    event_id: int,
    body: schemas.EventJoin = schemas.EventJoin(),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Événement introuvable")

    existing = (
        db.query(models.EventParticipant)
        .filter(models.EventParticipant.event_id == event_id, models.EventParticipant.user_id == user.id)
        .first()
    )
    if not existing:
        if event.visibility == "private" and event.created_by_user_id != user.id:
            if not body.code or body.code.strip().upper() != (event.join_code or "").upper():
                raise HTTPException(status_code=403, detail="Code d'invitation invalide")
        db.add(models.EventParticipant(event_id=event_id, user_id=user.id, joined_at=datetime.utcnow()))
        db.commit()

    return _build_event_out(db, event, user)
