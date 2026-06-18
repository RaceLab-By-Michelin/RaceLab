"""
Coach — croise les données de sorties (Strava-like) avec l'état réel des
pneus pour produire des conseils personnalisés que le cycliste ne peut pas
calculer lui-même (corrélation usure / performance, tendance d'usure,
adéquation profil/pneu). Chaque conseil impliquant un changement de matériel
se termine par un CTA d'achat (réduction personnalisée, comme /tires/recommendations).
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, recommend, ride_narrative
from app.auth import get_current_user

router = APIRouter(prefix="/coach", tags=["coach"])


def _get_tire(wheel: str, user_id: int, db: Session) -> models.Tire | None:
    return db.query(models.Tire).filter(models.Tire.user_id == user_id, models.Tire.wheel == wheel).first()


@router.get("/tips", response_model=schemas.CoachTipsOut)
def get_coach_tips(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    tips: list[schemas.CoachTipOut] = []

    rides = (
        db.query(models.Ride)
        .filter(models.Ride.user_id == user.id)
        .order_by(models.Ride.date.desc())
        .limit(100)
        .all()
    )
    front = _get_tire("front", user.id, db)
    rear = _get_tire("rear", user.id, db)
    catalog = db.query(models.TireCatalog).all()

    if not rides or not front or not rear:
        tips.append(
            schemas.CoachTipOut(
                id="no-data",
                severity="info",
                title="Pas encore assez de données",
                message="Enregistrez quelques sorties pour que le Coach puisse analyser vos performances et l'état de vos pneus.",
            )
        )
        return schemas.CoachTipsOut(tips=tips)

    # ── 0. Analyse de descente — points chauds mécaniques simulés ──────────
    # Pas de vraie intégration Strava (streams GPS/vitesse) dans ce projet :
    # on simule un récit de descente plausible et déterministe à partir des
    # agrégats de la sortie la plus vallonnée récente (cf. ride_narrative.py).
    rear_catalog = (
        db.query(models.TireCatalog).filter(models.TireCatalog.id == rear.catalog_id).first()
        if rear.catalog_id else None
    )
    rear_category = rear.category or (rear_catalog.type if rear_catalog else None)
    rear_life_km = rear_catalog.life_km if rear_catalog else None

    candidates = [r for r in rides if r.distance_km > 0]
    candidates.sort(key=lambda r: (r.elevation_gain or 0) / r.distance_km, reverse=True)
    for ride in candidates[:5]:
        hotspot = ride_narrative.generate_descent_hotspot(ride, rear_category, rear_life_km)
        if hotspot:
            tips.append(
                schemas.CoachTipOut(
                    id=f"ride-hotspot-{ride.id}",
                    severity="warning",
                    title=f"Analyse de descente — {ride.name}",
                    message=hotspot["message"],
                )
            )
            break

    # ── 1. Corrélation usure / vitesse moyenne sur sorties vallonnées ──────
    hilly = [r for r in rides if r.distance_km > 0 and (r.elevation_gain or 0) / r.distance_km >= 10]
    if len(hilly) >= 4:
        mid = len(hilly) // 2
        recent_speed = sum(r.avg_speed for r in hilly[:mid]) / mid
        older_speed = sum(r.avg_speed for r in hilly[mid:]) / (len(hilly) - mid)
        delta = older_speed - recent_speed
        worn_wheel = "avant" if front.wear_pct >= rear.wear_pct else "arrière"
        worn_pct = max(front.wear_pct, rear.wear_pct)
        if delta >= 0.5 and worn_pct >= 50:
            tips.append(
                schemas.CoachTipOut(
                    id="hilly-speed-drop",
                    severity="warning" if worn_pct < 80 else "critical",
                    title=f"Perte de vitesse sur vos sorties vallonnées",
                    message=(
                        f"Vous perdez environ {delta:.1f} km/h sur vos sorties à fort dénivelé depuis que "
                        f"votre pneu {worn_wheel} a dépassé {worn_pct}% d'usure. L'adhérence en montée et "
                        f"en virage se dégrade avec l'usure du pneu."
                    ),
                )
            )

    # ── 2. Usure avancée → recommandation + CTA achat ───────────────────────
    for wheel, tire in (("front", front), ("rear", rear)):
        if tire.wear_pct >= 60:
            tire_catalog = (
                db.query(models.TireCatalog).filter(models.TireCatalog.id == tire.catalog_id).first()
                if tire.catalog_id else None
            )
            profile = recommend.rider_profile(rides)
            target_type = recommend.dominant_tire_type(profile)
            best = recommend.pick_best_tire(catalog, target_type, tire.catalog_id, profile)
            discount_pct, discount_code = recommend.compute_discount(tire.wear_pct, tire.brand)
            severity = "critical" if tire.wear_pct >= 80 else "warning"
            wheel_label = "avant" if wheel == "front" else "arrière"
            tips.append(
                schemas.CoachTipOut(
                    id=f"wear-{wheel}",
                    severity=severity,
                    title=f"Pneu {wheel_label} à {tire.wear_pct}% d'usure",
                    message=(
                        f"Votre pneu {wheel_label} approche de la fin de sa durée de vie. "
                        + (f"Le {best.name} correspond mieux à {recommend.match_reason(target_type, profile).lower()}" if best else "Pensez à le remplacer prochainement.")
                    ),
                    cta_label="Voir l'offre" if discount_pct else None,
                    cta_catalog_id=best.id if best else None,
                    discount_pct=discount_pct or None,
                    discount_code=discount_code or None,
                )
            )

    # ── 3. Tendance d'usure récente (accélération) ──────────────────────────
    since = datetime.utcnow() - timedelta(days=30)
    recent_records = (
        db.query(models.WearRecord)
        .filter(models.WearRecord.user_id == user.id, models.WearRecord.date >= since)
        .order_by(models.WearRecord.date)
        .all()
    )
    if len(recent_records) >= 4:
        span_days = max(1, (recent_records[-1].date - recent_records[0].date).days)
        front_rate = (recent_records[-1].front_wear - recent_records[0].front_wear) / span_days
        if front_rate > 0.5:
            days_left = max(0, round((100 - front.wear_pct) / front_rate)) if front_rate > 0 else None
            if days_left and days_left <= 30:
                tips.append(
                    schemas.CoachTipOut(
                        id="wear-pace",
                        severity="warning",
                        title="Usure plus rapide que d'habitude",
                        message=(
                            f"Au rythme actuel, votre pneu avant atteindra 100% d'usure dans environ "
                            f"{days_left} jours. Adaptez votre pression ou anticipez le remplacement avant un gros objectif."
                        ),
                    )
                )

    # ── 4. Profil dominant non couvert par le pneu actuel ───────────────────
    profile = recommend.rider_profile(rides)
    target_type = recommend.dominant_tire_type(profile)
    front_catalog = db.query(models.TireCatalog).filter(models.TireCatalog.id == front.catalog_id).first() if front.catalog_id else None
    if front_catalog and front_catalog.type != target_type and front.wear_pct < 60:
        tips.append(
            schemas.CoachTipOut(
                id="profile-mismatch",
                severity="info",
                title="Votre pratique a évolué",
                message=(
                    f"Vos dernières sorties sont majoritairement de type {target_type}, alors que votre pneu actuel "
                    f"est plutôt orienté {front_catalog.type}. Un pneu adapté améliorerait votre confort et votre adhérence."
                ),
            )
        )

    # ── 5. Sécurité pluie — exposition réelle + argument compound grip ──────
    # On relie l'argument "gomme grip pluie" à un scénario concret (part de
    # sorties sous la pluie réellement enregistrées), pas à une affirmation
    # abstraite.
    wet_ratio = profile["wet_ratio"]
    if wet_ratio >= recommend.WET_RATIO_THRESHOLD:
        wet_rides_count = sum(1 for r in rides if r.weather == "wet")
        wet_tire = next(
            (c for c in catalog if c.terrain_tags and "wet" in c.terrain_tags and c.protection_level in ("medium", "high")),
            None,
        )
        wet_pct = round(wet_ratio * 100)
        tips.append(
            schemas.CoachTipOut(
                id="safety-wet-grip",
                severity="warning" if wet_pct >= 50 else "info",
                title="Sécurité pluie : votre exposition est élevée",
                message=(
                    f"{wet_pct}% de vos {len(rides)} dernières sorties se sont faites sous la pluie "
                    f"({wet_rides_count} sortie{'s' if wet_rides_count > 1 else ''}). "
                    + (
                        f"Le compound grip humide du {wet_tire.name} réduit la distance de freinage et le "
                        f"risque de glissade en virage mouillé."
                        if wet_tire
                        else "Une gomme à grip renforcé en conditions humides réduit le risque de glissade en virage."
                    )
                ),
                cta_label="Voir le pneu adapté" if wet_tire else None,
                cta_catalog_id=wet_tire.id if wet_tire else None,
            )
        )

    # ── 6. Sécurité crevaison hors-route (gravel/VTT) ───────────────────────
    total_km = sum(r.distance_km for r in rides) or 1.0
    offroad_km = sum(r.distance_km for r in rides if r.surface_type in ("gravel", "mixed", "mtb_trail"))
    offroad_ratio = offroad_km / total_km
    if offroad_ratio >= 0.25 and (not rear_catalog or rear_catalog.protection_level != "high"):
        protection_tire = next(
            (c for c in catalog if c.protection_level == "high" and c.type in ("Gravel", "VTT")),
            None,
        )
        tips.append(
            schemas.CoachTipOut(
                id="safety-puncture-offroad",
                severity="warning",
                title="Risque de crevaison hors-route",
                message=(
                    f"{round(offroad_ratio * 100)}% de votre kilométrage récent se fait sur gravel, chemins ou "
                    f"sentiers. "
                    + (
                        f"La carcasse anti-crevaison du {protection_tire.name} limite les crevaisons par "
                        f"pincement et coupures sur ce type de terrain."
                        if protection_tire
                        else "Une carcasse renforcée limite les crevaisons par pincement sur ce type de terrain."
                    )
                ),
                cta_label="Voir le pneu adapté" if protection_tire else None,
                cta_catalog_id=protection_tire.id if protection_tire else None,
            )
        )

    # ── 7. Sécurité en descente — carcasse anti-crevaison à haute vitesse ──
    # S'appuie sur la même sortie la plus pentue que l'analyse de descente
    # (#0), mais avec un angle sécurité (résistance de la carcasse) plutôt
    # que performance.
    if candidates:
        steepest = candidates[0]
        gradient = (steepest.elevation_gain or 0) / steepest.distance_km
        if gradient >= 15:
            protection_tire = next((c for c in catalog if c.protection_level == "high"), None)
            tips.append(
                schemas.CoachTipOut(
                    id="safety-descent-casing",
                    severity="info",
                    title=f"Descentes exigeantes — {steepest.name}",
                    message=(
                        f"Votre sortie la plus pentue ({round(gradient)} m/km de dénivelé) sollicite fortement "
                        f"la carcasse en descente et au freinage. "
                        + (
                            f"La carcasse renforcée du {protection_tire.name} réduit le risque de crevaison par "
                            f"pincement sur les irrégularités de la route à haute vitesse."
                            if protection_tire
                            else "Une carcasse renforcée réduit le risque de crevaison par pincement à haute vitesse."
                        )
                    ),
                    cta_label="Voir le pneu adapté" if protection_tire else None,
                    cta_catalog_id=protection_tire.id if protection_tire else None,
                )
            )

    if not tips:
        tips.append(
            schemas.CoachTipOut(
                id="all-good",
                severity="info",
                title="Tout est sous contrôle",
                message="Vos pneus sont en bon état et vos performances sont stables. Continuez sur cette lancée !",
            )
        )

    return schemas.CoachTipsOut(tips=tips[:8])
