"""
Fixtures partagées pour la suite de tests backend.

Chaque test reçoit une base SQLite en mémoire fraîche (table créées depuis
`models.Base.metadata`, donc toujours alignées sur le schéma actuel, sans
dépendre d'alembic) et un TestClient FastAPI dont la dépendance `get_db` est
substituée pour pointer vers cette base isolée.

Important : on utilise `TestClient(app)` SANS le context manager `with`, ce
qui évite de déclencher l'event `startup` de l'app (donc `seed()` ne tourne
jamais pendant les tests) — chaque test construit exactement les données
dont il a besoin, de façon déterministe et isolée des autres tests.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Évite que l'import de app.main (qui appelle Base.metadata.create_all sur le
# moteur "réel" au niveau module) ne touche le fichier mbt.db de dev — toute
# la suite de tests passe par des bases SQLite en mémoire dédiées (cf.
# fixture db_session), ce moteur "réel" n'est donc jamais utilisé pour de
# vraies requêtes pendant les tests.
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app import models  # noqa: F401 (enregistre les modèles sur Base.metadata)
from app.main import app
from app.auth import create_session


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def client(db_session):
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    test_client = TestClient(app)
    try:
        yield test_client
    finally:
        app.dependency_overrides.clear()


def make_user(
    db_session,
    *,
    email: str = "rider@example.com",
    name: str = "Rider Test",
    password_hash: str = "",
    onboarding_completed: bool = False,
    **overrides,
) -> models.User:
    """Crée un utilisateur minimal directement en base (sans passer par /auth)."""
    defaults = dict(
        name=name,
        username=email.split("@")[0],
        email=email,
        city="",
        member_since="Janvier 2026",
        level="Débutant",
        level_progress=0,
        bike_brand="",
        bike_model="",
        bike_year=0,
        bike_color="#1A3A6B",
        password_hash=password_hash,
        onboarding_completed=onboarding_completed,
    )
    defaults.update(overrides)
    user = models.User(**defaults)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def auth_header_for(db_session, user: models.User) -> dict[str, str]:
    """Crée une session valide pour `user` et renvoie le header Authorization prêt à l'emploi."""
    session = create_session(db_session, user.id)
    return {"Authorization": f"Bearer {session.token}"}


@pytest.fixture()
def make_tire_catalog_entry(db_session):
    def _make(**overrides) -> models.TireCatalog:
        defaults = dict(
            id="power-all-season",
            name="Power All Season",
            type="Route",
            sizes=["700x28C"],
            description="Pneu 4 saisons.",
            max_pressure="8.5 bar",
            weight="265 g",
            tag=None,
            life_km=4500,
        )
        defaults.update(overrides)
        existing = db_session.query(models.TireCatalog).filter_by(id=defaults["id"]).first()
        if existing:
            return existing
        item = models.TireCatalog(**defaults)
        db_session.add(item)
        db_session.commit()
        db_session.refresh(item)
        return item

    return _make
