import random
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/lab", tags=["lab"])


def _build_trial_out(db: Session, trial: models.TireTrial, user: models.User) -> schemas.TireTrialOut:
    entries = db.query(models.TireTrialEntry).filter(models.TireTrialEntry.trial_id == trial.id).all()
    my_entry = next((e for e in entries if e.user_id == user.id), None)
    return schemas.TireTrialOut(
        id=trial.id,
        tire_name=trial.tire_name,
        description=trial.description,
        target_profile=trial.target_profile,
        image_tag=trial.image_tag,
        entries_open_date=trial.entries_open_date,
        entries_close_date=trial.entries_close_date,
        draw_date=trial.draw_date,
        slots=trial.slots,
        status=trial.status,
        preorder_discount_pct=trial.preorder_discount_pct,
        entries_count=len(entries),
        entered=my_entry is not None,
        won=bool(my_entry and my_entry.won),
    )


@router.get("/trials", response_model=list[schemas.TireTrialOut])
def list_trials(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    trials = db.query(models.TireTrial).order_by(models.TireTrial.draw_date.desc()).all()
    return [_build_trial_out(db, t, user) for t in trials]


@router.post("/trials/{trial_id}/enter", response_model=schemas.TireTrialOut)
def enter_trial(trial_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    trial = db.query(models.TireTrial).filter(models.TireTrial.id == trial_id).first()
    if not trial:
        raise HTTPException(status_code=404, detail="Tirage introuvable")
    if trial.status != "open":
        raise HTTPException(status_code=400, detail="Les inscriptions sont fermées pour ce tirage")

    existing = (
        db.query(models.TireTrialEntry)
        .filter(models.TireTrialEntry.trial_id == trial_id, models.TireTrialEntry.user_id == user.id)
        .first()
    )
    if not existing:
        db.add(models.TireTrialEntry(trial_id=trial_id, user_id=user.id, entered_at=datetime.utcnow(), won=False))
        db.commit()

    return _build_trial_out(db, trial, user)


@router.post("/trials/{trial_id}/draw", response_model=schemas.TireTrialOut)
def draw_trial(trial_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """Effectue le tirage au sort parmi les inscrits — irréversible une fois 'drawn'."""
    trial = db.query(models.TireTrial).filter(models.TireTrial.id == trial_id).first()
    if not trial:
        raise HTTPException(status_code=404, detail="Tirage introuvable")
    if trial.status == "drawn":
        return _build_trial_out(db, trial, user)

    entries = db.query(models.TireTrialEntry).filter(models.TireTrialEntry.trial_id == trial_id).all()
    winners = random.sample(entries, k=min(trial.slots, len(entries))) if entries else []
    for entry in winners:
        entry.won = True

    trial.status = "drawn"
    db.commit()
    return _build_trial_out(db, trial, user)
