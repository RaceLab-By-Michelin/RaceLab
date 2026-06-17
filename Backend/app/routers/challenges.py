from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/challenges", tags=["challenges"])


@router.get("", response_model=list[schemas.ChallengeOut])
def list_active(db: Session = Depends(get_db)):
    return (
        db.query(models.Challenge)
        .filter(models.Challenge.status == "active")
        .order_by(models.Challenge.end_date)
        .all()
    )


@router.get("/past", response_model=list[schemas.ChallengeOut])
def list_past(db: Session = Depends(get_db)):
    return (
        db.query(models.Challenge)
        .filter(models.Challenge.status == "completed")
        .order_by(models.Challenge.end_date.desc())
        .all()
    )


@router.get("/{challenge_id}", response_model=schemas.ChallengeOut)
def get_challenge(challenge_id: int, db: Session = Depends(get_db)):
    c = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Challenge introuvable")
    return c
