"""
Fixtures partagées pour la suite de tests backend.

Chaque test reçoit une base Postgres dédiée aux tests ("racelab_test", servie
par le même conteneur que le Postgres de dev — voir docker-compose.yml et
init-test-db.sql), avec les tables recréées depuis `models.Base.metadata`
(donc toujours alignées sur le schéma actuel, sans dépendre d'alembic) avant
chaque test puis droppées après. Un TestClient FastAPI a sa dépendance
`get_db` substituée pour pointer vers cette base.

Important : on utilise `TestClient(app)` SANS le context manager `with`, ce
qui évite de déclencher l'event `startup` de l'app (donc `seed()` ne tourne
jamais pendant les tests) — chaque test construit exactement les données
dont il a besoin, de façon déterministe et isolée des autres tests.

Prérequis : le conteneur Postgres de docker-compose doit tourner
(`docker compose up -d db`) et exposer le port 5432 sur localhost, ou
`TEST_DATABASE_URL` doit pointer vers un autre Postgres accessible.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Base Postgres séparée de la base de dev ("racelab"), pour ne jamais polluer
# les données de dev pendant les tests. Créée automatiquement au premier
# démarrage du conteneur Postgres via init-test-db.sql.
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL", "postgresql://racelab:racelab_secret@localhost:5432/racelab_test"
)
os.environ.setdefault("DATABASE_URL", TEST_DATABASE_URL)

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app import models  # noqa: F401 (enregistre les modèles sur Base.metadata)
from app.main import app
from app.auth import create_session

_engine = create_engine(TEST_DATABASE_URL)
_TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


@pytest.fixture()
def db_session():
    Base.metadata.create_all(bind=_engine)
    session = _TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=_engine)


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
