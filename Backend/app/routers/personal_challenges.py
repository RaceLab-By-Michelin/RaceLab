from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app import recommend
from app.recommend import (
    pick_personal_challenge,
    compute_personal_challenge_reward,
    evaluate_giveaway_eligibility,
    GIVEAWAY_TIER_THRESHOLD,
)

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
        giveaway_tier_reached=completed_count >= GIVEAWAY_TIER_THRESHOLD,
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

    actual_km = (
        db.query(models.Ride)
        .filter(
            models.Ride.user_id == user.id,
            models.Ride.date >= challenge.created_at,
            models.Ride.date <= (challenge.completed_at or datetime.utcnow()),
        )
        .with_entities(models.Ride.distance_km)
        .all()
    )
    actual_km_total = sum(km for (km,) in actual_km)

    if evaluate_giveaway_eligibility(completed_count, challenge.target_km, actual_km_total):
        # Mérité : palier de fidélité atteint + objectif du défi largement
        # dépassé → on offre le pneu recommandé pour son profil plutôt qu'une
        # réduction, jamais par tirage au sort.
        rides = db.query(models.Ride).filter(models.Ride.user_id == user.id).all()
        catalog = db.query(models.TireCatalog).all()
        front_tire = db.query(models.Tire).filter(
            models.Tire.user_id == user.id, models.Tire.wheel == "front"
        ).first()
        current_catalog_id = front_tire.catalog_id if front_tire else None

        profile = recommend.rider_profile(rides)
        target_type = recommend.dominant_tire_type(profile, fallback=challenge.discipline)
        best = recommend.pick_best_tire(catalog, target_type, current_catalog_id, profile)

        challenge.reward_type = "giveaway"
        challenge.reward_giveaway_tire_catalog_id = best.id if best else None
        challenge.reward_giveaway_tire_name = best.name if best else None
        challenge.reward_giveaway_status = "won"
        challenge.reward_discount_pct = None
        challenge.reward_discount_code = None
    else:
        pct, code = compute_personal_challenge_reward(completed_count)
        challenge.reward_type = "discount"
        challenge.reward_discount_pct = pct
        challenge.reward_discount_code = code

    challenge.status = "completed"

    db.commit()
    db.refresh(challenge)
    return challenge
