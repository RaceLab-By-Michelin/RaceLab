from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, wear
from app.auth import get_current_user

router = APIRouter(prefix="/rides", tags=["rides"])


@router.get("", response_model=list[schemas.RideOut])
def list_rides(
    limit: int = Query(20, ge=1, le=200),
    days: int | None = Query(None, ge=1, le=365),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    q = db.query(models.Ride).filter(models.Ride.user_id == user.id).order_by(models.Ride.date.desc())
    if days is not None:
        since = datetime.utcnow() - timedelta(days=days)
        q = q.filter(models.Ride.date >= since)
    return q.limit(limit).all()


@router.get("/{ride_id}", response_model=schemas.RideOut)
def get_ride(ride_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    ride = db.query(models.Ride).filter(models.Ride.id == ride_id, models.Ride.user_id == user.id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Sortie introuvable")
    return ride


@router.post("", response_model=schemas.RideCreateOut, status_code=201)
def create_ride(
    body: schemas.RideIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Enregistre une sortie et met à jour l'usure des deux pneus en fonction de :
    distance, dénivelé, météo, type de revêtement et position de la roue,
    plus le vieillissement passif lié au temps écoulé depuis le dernier relevé.
    """
    ride_date = body.date or datetime.utcnow()
    if ride_date.tzinfo is not None:
        ride_date = ride_date.astimezone(timezone.utc).replace(tzinfo=None)

    ride = models.Ride(
        user_id=user.id,
        name=body.name,
        date=ride_date,
        distance_km=body.distance_km,
        duration_seconds=body.duration_seconds,
        avg_speed=round(body.distance_km / (body.duration_seconds / 3600), 1) if body.duration_seconds else 0.0,
        elevation_gain=body.elevation_gain,
        strava_id=body.strava_id,
        weather=body.weather,
        surface_type=body.surface_type,
    )
    db.add(ride)
    db.flush()  # récupère ride.id sans committer

    front = db.query(models.Tire).filter(models.Tire.user_id == user.id, models.Tire.wheel == "front").first()
    rear = db.query(models.Tire).filter(models.Tire.user_id == user.id, models.Tire.wheel == "rear").first()
    if not front or not rear:
        raise HTTPException(status_code=404, detail="Pneus front/rear introuvables")

    front_catalog = (
        db.query(models.TireCatalog).filter(models.TireCatalog.id == front.catalog_id).first()
        if front.catalog_id else None
    )
    rear_catalog = (
        db.query(models.TireCatalog).filter(models.TireCatalog.id == rear.catalog_id).first()
        if rear.catalog_id else None
    )

    # Vieillissement passif depuis le dernier WearRecord (ou depuis la date de la sortie à défaut)
    last_record = (
        db.query(models.WearRecord)
        .filter(models.WearRecord.user_id == user.id)
        .order_by(models.WearRecord.date.desc())
        .first()
    )
    reference_date = last_record.date if last_record else ride_date
    if reference_date.tzinfo is not None:
        reference_date = reference_date.astimezone(timezone.utc).replace(tzinfo=None)
    days_elapsed = max(0, (ride_date - reference_date).days)
    passive_delta = wear.aging_wear(days_elapsed)

    front_delta = wear.compute_ride_wear_delta(front, ride, front_catalog) + passive_delta
    rear_delta = wear.compute_ride_wear_delta(rear, ride, rear_catalog) + passive_delta

    front.wear_pct = wear.apply_wear(front, front_delta)
    rear.wear_pct = wear.apply_wear(rear, rear_delta)

    db.add(models.WearRecord(user_id=user.id, date=ride_date, front_wear=front.wear_pct, rear_wear=rear.wear_pct))

    db.commit()
    db.refresh(ride)
    db.refresh(front)
    db.refresh(rear)

    return schemas.RideCreateOut(
        ride=ride,
        front_wear_pct=front.wear_pct,
        rear_wear_pct=rear.wear_pct,
        front_wear_delta=round(front_delta, 3),
        rear_wear_delta=round(rear_delta, 3),
    )
