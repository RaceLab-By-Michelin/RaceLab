from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


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
        weight_kg=user.weight_kg,
        height_cm=user.height_cm,
        goal_km=user.goal_km,
    )


@router.get("/me", response_model=schemas.UserOut)
def get_me(user: models.User = Depends(get_current_user)):
    return _user_to_out(user)


@router.patch("/me", response_model=schemas.UserOut)
def patch_me(
    body: schemas.UserPatch,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return _user_to_out(user)


@router.get("/me/bike", response_model=schemas.BikeOut)
def get_bike(user: models.User = Depends(get_current_user)):
    return schemas.BikeOut(
        brand=user.bike_brand,
        model=user.bike_model,
        year=user.bike_year,
        color=user.bike_color,
    )


@router.patch("/me/bike", response_model=schemas.BikeOut)
def patch_bike(
    body: schemas.BikePatch,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mapping = {"brand": "bike_brand", "model": "bike_model", "year": "bike_year", "color": "bike_color"}
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, mapping[field], value)
    db.commit()
    db.refresh(user)
    return schemas.BikeOut(
        brand=user.bike_brand,
        model=user.bike_model,
        year=user.bike_year,
        color=user.bike_color,
    )


@router.get("/me/stats", response_model=schemas.StatsOut)
def get_stats(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_km = (
        db.query(func.sum(models.Ride.distance_km)).filter(models.Ride.user_id == user.id).scalar() or 0.0
    )
    total_rides = (
        db.query(func.count(models.Ride.id)).filter(models.Ride.user_id == user.id).scalar() or 0
    )
    total_elevation = (
        db.query(func.sum(models.Ride.elevation_gain)).filter(models.Ride.user_id == user.id).scalar() or 0
    )
    completed = (
        db.query(func.count(models.Challenge.id))
        .filter(models.Challenge.status == "completed")
        .scalar()
        or 0
    )

    front = db.query(models.Tire).filter(models.Tire.user_id == user.id, models.Tire.wheel == "front").first()
    rear = db.query(models.Tire).filter(models.Tire.user_id == user.id, models.Tire.wheel == "rear").first()
    front_wear = front.wear_pct if front else 0
    rear_wear = rear.wear_pct if rear else 0

    # Adhérence estimée : dégradation linéaire à partir de l'usure max
    max_wear = max(front_wear, rear_wear)
    adherence_pct = max(0, round(100 - max_wear * 0.35))

    return schemas.StatsOut(
        total_km=round(total_km, 1),
        total_rides=total_rides,
        total_elevation=total_elevation,
        completed_challenges=completed,
        front_wear=front_wear,
        rear_wear=rear_wear,
        adherence_pct=adherence_pct,
    )


# ─── Onboarding ───────────────────────────────────────────────────────────────

@router.post("/onboarding", response_model=schemas.UserOut, status_code=201)
def submit_onboarding(
    body: schemas.OnboardingIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Première saisie de données par l'utilisateur (vélo + pneus avant/arrière).
    Crée les deux pneus montés et marque le compte comme "onboardé".
    Idempotent : si déjà onboardé, remplace simplement les pneus existants.
    """
    user.city = body.city
    user.bike_brand = body.bike_brand
    user.bike_model = body.bike_model
    user.bike_year = body.bike_year

    today_str = date.today().strftime("%-d %b %Y")

    for wheel, tire_in in (("front", body.front_tire), ("rear", body.rear_tire)):
        existing = (
            db.query(models.Tire)
            .filter(models.Tire.user_id == user.id, models.Tire.wheel == wheel)
            .first()
        )
        if tire_in.brand == "michelin":
            if not tire_in.catalog_id:
                raise HTTPException(status_code=422, detail="catalog_id requis pour un pneu Michelin")
            catalog = db.query(models.TireCatalog).filter(models.TireCatalog.id == tire_in.catalog_id).first()
            if not catalog:
                raise HTTPException(status_code=404, detail="Pneu introuvable dans le catalogue")
            name = catalog.name
            category = catalog.type
        else:
            if not tire_in.name:
                raise HTTPException(status_code=422, detail="name requis pour un pneu non-Michelin")
            name = tire_in.name
            category = tire_in.category

        if existing:
            existing.brand = tire_in.brand
            existing.catalog_id = tire_in.catalog_id if tire_in.brand == "michelin" else None
            existing.name = name
            existing.size = tire_in.size
            existing.category = category
            existing.wear_pct = max(0, min(100, tire_in.wear_pct))
            existing.installed_date = today_str
            existing.installed_km = 0
        else:
            db.add(models.Tire(
                user_id=user.id,
                wheel=wheel,
                brand=tire_in.brand,
                catalog_id=tire_in.catalog_id if tire_in.brand == "michelin" else None,
                name=name,
                size=tire_in.size,
                category=category,
                wear_pct=max(0, min(100, tire_in.wear_pct)),
                installed_date=today_str,
                installed_km=0,
            ))

    if not db.query(models.NotificationSettings).filter(models.NotificationSettings.user_id == user.id).first():
        db.add(models.NotificationSettings(user_id=user.id, enabled=True, pre_ride_enabled=True, delay_hours=2, critical_only=False))
    if not db.query(models.StravaConnection).filter(models.StravaConnection.user_id == user.id).first():
        db.add(models.StravaConnection(user_id=user.id, connected=False))

    user.onboarding_completed = True
    db.commit()
    db.refresh(user)
    return _user_to_out(user)
