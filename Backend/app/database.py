import os
from sqlalchemy import Integer, create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

# PostgreSQL uniquement. En Docker, DATABASE_URL est injecté par docker-compose.yml
# (service "db"). En local hors conteneur, ce défaut pointe vers le Postgres exposé
# par `docker compose up -d db` sur localhost:5432.
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://racelab:racelab_secret@localhost:5432/racelab")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def sync_sequences(db: Session) -> None:
    """Réaligne les séquences Postgres des PK auto-incrémentées (colonne `id`)
    sur le MAX(id) réellement présent dans chaque table.

    Nécessaire car `seed.py` insère certaines lignes avec un `id` explicite
    (ex: User(id=1, ...), NotificationSettings(id=1, ...)) pour avoir des
    données de démo déterministes. Contrairement à SQLite, Postgres ne met
    pas à jour sa séquence `<table>_id_seq` quand on fournit l'id à la main :
    elle reste bloquée à sa valeur de départ (1) alors qu'une ligne id=1
    existe déjà, et le prochain INSERT auto (ex: `nextval()` = 1) entre en
    collision avec elle ("duplicate key value violates unique constraint").
    """
    for table in Base.metadata.tables.values():
        if "id" not in table.columns:
            continue
        id_col = table.columns["id"]
        # Seules les PK entières (SERIAL/IDENTITY) ont une séquence associée —
        # ex: tire_catalog.id est une String, pas concerné.
        if not isinstance(id_col.type, Integer) or not id_col.autoincrement:
            continue
        db.execute(text(
            f'SELECT setval(pg_get_serial_sequence(\'"{table.name}"\', \'id\'), '
            f'COALESCE((SELECT MAX(id) FROM "{table.name}"), 1))'
        ))
    db.commit()
