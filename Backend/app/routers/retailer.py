"""
Dashboard B2B revendeur (Feature 2) — vue agrégée par zone géographique pour
le réseau de distribution Michelin : profil de pratique dominant et pneus
proches de la fin de vie. Pas d'authentification dédiée revendeur (décision
produit : nouvelle page interne de démonstration, pas de vrai compte
revendeur dans ce projet).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, retailer

router = APIRouter(prefix="/retailer", tags=["retailer"])


@router.get("/dashboard", response_model=schemas.RetailerDashboardOut)
def get_dashboard(db: Session = Depends(get_db)):
    profiles = db.query(models.DemoRiderProfile).all()
    catalog_by_id = {c.id: c for c in db.query(models.TireCatalog).all()}
    zones = retailer.aggregate_by_zone(profiles, catalog_by_id)
    return schemas.RetailerDashboardOut(
        zones=[schemas.RetailerZoneOut(**z) for z in zones],
        total_riders=len(profiles),
        weeks_horizon=retailer.WEEKS_HORIZON,
    )
