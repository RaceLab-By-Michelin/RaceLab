from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, recommend
from app.auth import get_current_user

router = APIRouter(prefix="/tires", tags=["tires"])

WHEELS = ("front", "rear")


def _get_tire(wheel: str, user_id: int, db: Session) -> models.Tire:
    tire = db.query(models.Tire).filter(models.Tire.user_id == user_id, models.Tire.wheel == wheel).first()
    if not tire:
        raise HTTPException(status_code=404, detail=f"Pneu {wheel} non trouvé")
    return tire


def _current_km(user_id: int, db: Session) -> int:
    return round(
        db.query(func.sum(models.Ride.distance_km)).filter(models.Ride.user_id == user_id).scalar() or 0
    )


# ─── Catalogue ───────────────────────────────────────────────────────────────

@router.get("/catalog", response_model=list[schemas.TireCatalogOut])
def list_catalog(type: str | None = Query(None), db: Session = Depends(get_db)):
    q = db.query(models.TireCatalog)
    if type:
        q = q.filter(models.TireCatalog.type == type)
    return q.all()


@router.get("/catalog/{tire_id}", response_model=schemas.TireCatalogOut)
def get_catalog_item(tire_id: str, db: Session = Depends(get_db)):
    item = db.query(models.TireCatalog).filter(models.TireCatalog.id == tire_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Pneu introuvable dans le catalogue")
    return item


# ─── Pneus montés ────────────────────────────────────────────────────────────

@router.get("", response_model=schemas.TireSetOut)
def get_tires(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    front = _get_tire("front", user.id, db)
    rear = _get_tire("rear", user.id, db)
    return schemas.TireSetOut(front=front, rear=rear)


@router.get("/wear-history", response_model=schemas.WearHistoryOut)
def wear_history(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    from datetime import datetime, timedelta

    since = datetime.utcnow() - timedelta(days=days)
    records = (
        db.query(models.WearRecord)
        .filter(models.WearRecord.user_id == user.id, models.WearRecord.date >= since)
        .order_by(models.WearRecord.date)
        .all()
    )

    points = [schemas.WearPoint.model_validate(r) for r in records]

    if len(points) >= 2:
        delta_front = points[-1].front_wear - points[0].front_wear
        delta_rear = points[-1].rear_wear - points[0].rear_wear
        span_days = max(1, (points[-1].date - points[0].date).days)
        avg_front = round(delta_front / span_days, 3)
        avg_rear = round(delta_rear / span_days, 3)
    else:
        avg_front = avg_rear = 0.0

    return schemas.WearHistoryOut(days=days, points=points, avg_front_per_day=avg_front, avg_rear_per_day=avg_rear)


@router.get("/recommendations", response_model=schemas.RecommendationsOut)
def get_recommendations(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """
    Recommandation de pneu + réduction personnalisée par roue, basée sur
    l'historique de sorties (surface, météo, dénivelé) et l'usure actuelle.
    Remplace l'ancienne logique d'alerte sécurité par une incitation à l'achat.
    """
    front = _get_tire("front", user.id, db)
    rear = _get_tire("rear", user.id, db)
    catalog = db.query(models.TireCatalog).all()
    rides = (
        db.query(models.Ride)
        .filter(models.Ride.user_id == user.id)
        .order_by(models.Ride.date.desc())
        .limit(100)
        .all()
    )

    profile = recommend.rider_profile(rides)
    target_type = recommend.dominant_tire_type(profile)
    reason = recommend.match_reason(target_type, profile)

    def build(tire: models.Tire) -> schemas.TireRecommendationOut:
        best = recommend.pick_best_tire(catalog, target_type, tire.catalog_id, profile)
        discount_pct, discount_code = recommend.compute_discount(tire.wear_pct, tire.brand)
        return schemas.TireRecommendationOut(
            wheel=tire.wheel,
            current_name=tire.name,
            current_wear_pct=tire.wear_pct,
            recommended=schemas.TireCatalogOut.model_validate(best) if best else None,
            match_reason=reason,
            discount_pct=discount_pct,
            discount_code=discount_code,
        )

    return schemas.RecommendationsOut(front=build(front), rear=build(rear))


@router.get("/{wheel}", response_model=schemas.TireOut)
def get_tire(wheel: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if wheel not in WHEELS:
        raise HTTPException(status_code=422, detail="wheel doit être 'front' ou 'rear'")
    return _get_tire(wheel, user.id, db)


@router.patch("/{wheel}", response_model=schemas.TireOut)
def update_tire(
    wheel: str,
    body: schemas.TirePatch,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Remplace le pneu d'une roue.
    - brand='michelin' → catalog_id requis, name déduit du catalogue
    - brand='other'    → name requis, catalog_id ignoré
    """
    if wheel not in WHEELS:
        raise HTTPException(status_code=422, detail="wheel doit être 'front' ou 'rear'")

    tire = _get_tire(wheel, user.id, db)

    if body.brand == "michelin":
        if not body.catalog_id:
            raise HTTPException(status_code=422, detail="catalog_id requis pour une marque Michelin")
        catalog = db.query(models.TireCatalog).filter(models.TireCatalog.id == body.catalog_id).first()
        if not catalog:
            raise HTTPException(status_code=404, detail="Pneu introuvable dans le catalogue")
        tire.brand = "michelin"
        tire.catalog_id = catalog.id
        tire.name = catalog.name
        tire.category = catalog.type
    else:
        if not body.name:
            raise HTTPException(status_code=422, detail="name requis pour une marque autre")
        tire.brand = "other"
        tire.catalog_id = None
        tire.name = body.name
        tire.category = body.category

    tire.size = body.size
    if body.reset_wear:
        tire.wear_pct = 0
        tire.installed_km = _current_km(user.id, db)
        tire.installed_date = date.today().strftime("%-d %b %Y")

    db.commit()
    db.refresh(tire)
    return tire
