from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.recommend import pick_personal_challenge, compute_personal_challenge_reward

router = APIRouter(prefix="/personal-challenges", tags=["personal-challenges"])


def _completed_count(db: Session, user_id: int) -> int:
    return (
        db.query(models.PersonalChallenge)
        .filter(models.PersonalChallenge.user_id == user_id, models.PersonalChallenge.status == "completed")
        .count()
    )


@router.get("/current", response_model=schemas.PersonalChallengeStatusOut)
def get_current_challenge(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """Renvoie le défi personnel en cours de l'utilisateur (active ou en
    attente de feedback). S'il n'en existe aucun, en génère un nouveau à
    partir de son profil de pratique — jamais partagé avec d'autres riders."""
    challenge = (
        db.query(models.PersonalChallenge)
        .filter(
            models.PersonalChallenge.user_id == user.id,
            models.PersonalChallenge.status.in_(["active", "pending_feedback"]),
        )
        .order_by(models.PersonalChallenge.created_at.desc())
        .first()
    )

    if not challenge:
        rides = db.query(models.Ride).filter(models.Ride.user_id == user.id).all()
        picked = pick_personal_challenge(rides)
        challenge = models.PersonalChallenge(
            user_id=user.id,
            title=picked["title"],
            description=picked["description"],
            discipline=picked["discipline"],
            target_km=picked["target_km"],
            status="active",
            created_at=datetime.utcnow(),
        )
        db.add(challenge)
        db.commit()
        db.refresh(challenge)

    completed_count = _completed_count(db, user.id)
    next_reward_pct, _ = compute_personal_challenge_reward(completed_count)

    return schemas.PersonalChallengeStatusOut(
        challenge=challenge,
        completed_count=completed_count,
        next_reward_pct=next_reward_pct,
    )


@router.post("/{challenge_id}/complete", response_model=schemas.PersonalChallengeOut)
def complete_challenge(
    challenge_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Marque le défi comme réalisé — passe en attente de feedback avant que
    la récompense ne soit calculée."""
    challenge = (
        db.query(models.PersonalChallenge)
        .filter(models.PersonalChallenge.id == challenge_id, models.PersonalChallenge.user_id == user.id)
        .first()
    )
    if not challenge:
        raise HTTPException(status_code=404, detail="Défi introuvable")
    if challenge.status != "active":
        raise HTTPException(status_code=400, detail="Ce défi n'est pas en cours")

    challenge.status = "pending_feedback"
    challenge.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(challenge)
    return challenge


@router.post("/{challenge_id}/feedback", response_model=schemas.PersonalChallengeOut)
def submit_feedback(
    challenge_id: int,
    body: schemas.PersonalChallengeFeedbackIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Enregistre le questionnaire pneus post-défi et débloque la récompense
    (réduction), dont le palier augmente avec le nombre de défis personnels
    déjà complétés."""
    challenge = (
        db.query(models.PersonalChallenge)
        .filter(models.PersonalChallenge.id == challenge_id, models.PersonalChallenge.user_id == user.id)
        .first()
    )
    if not challenge:
        raise HTTPException(status_code=404, detail="Défi introuvable")
    if challenge.status != "pending_feedback":
        raise HTTPException(status_code=400, detail="Ce défi n'attend pas de feedback")

    for field_name in ("adherence_rating", "comfort_rating", "speed_rating"):
        value = getattr(body, field_name)
        if value < 1 or value > 5:
            raise HTTPException(status_code=400, detail=f"{field_name} doit être entre 1 et 5")

    challenge.adherence_rating = body.adherence_rating
    challenge.comfort_rating = body.comfort_rating
    challenge.speed_rating = body.speed_rating
    challenge.feedback_comment = body.comment

    completed_count = _completed_count(db, user.id)
    pct, code = compute_personal_challenge_reward(completed_count)
    challenge.reward_discount_pct = pct
    challenge.reward_discount_code = code
    challenge.status = "completed"

    db.commit()
    db.refresh(challenge)
    return challenge
