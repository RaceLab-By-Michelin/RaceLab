"""auth and user scoping

Ajoute l'authentification multi-utilisateurs :
  - users.password_hash         : str   (PBKDF2-SHA256 salted hash)
  - users.onboarding_completed  : bool  (False par défaut pour les nouveaux comptes)
  - users.email                 : index unique
  - table sessions              : jetons Bearer opaques (token, user_id, created_at, expires_at)

Et le scoping par utilisateur des données existantes (auparavant mono-utilisateur,
toujours liées implicitement à l'id=1) :
  - tires.user_id, rides.user_id, wear_records.user_id                (FK -> users.id)
  - notification_settings.user_id, strava_connection.user_id          (FK -> users.id, unique)

Les lignes déjà présentes (compte de démo seedé en id=1) sont rattachées à
l'utilisateur 1, et reçoivent un mot de passe de démo + onboarding_completed=True
afin de continuer à fonctionner une fois l'auth obligatoire.

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-16
"""
import hashlib
import secrets
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_PBKDF2_ITERATIONS = 260_000
_DEMO_PASSWORD = "michelin2026"


def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), _PBKDF2_ITERATIONS)
    return f"{salt}${digest.hex()}"


def upgrade() -> None:
    # ── users : auth fields ────────────────────────────────────────────────
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("password_hash", sa.String(), nullable=False, server_default=""))
        batch_op.add_column(sa.Column("onboarding_completed", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.create_unique_constraint("uq_users_email", ["email"])

    # Compte de démo existant (id=1, seedé avant l'auth) : on lui donne un mot
    # de passe utilisable et on le marque comme déjà onboardé.
    op.execute(
        sa.text("UPDATE users SET password_hash = :hash, onboarding_completed = true WHERE id = 1")
        .bindparams(hash=_hash_password(_DEMO_PASSWORD))
    )

    # ── sessions ────────────────────────────────────────────────────────────
    op.create_table(
        "sessions",
        sa.Column("token", sa.String(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
    )

    # ── scoping par utilisateur des données existantes ─────────────────────
    for table in ("tires", "rides", "wear_records"):
        with op.batch_alter_table(table) as batch_op:
            batch_op.add_column(sa.Column("user_id", sa.Integer(), nullable=False, server_default="1"))
            batch_op.create_index(f"ix_{table}_user_id", ["user_id"])
            batch_op.create_foreign_key(f"fk_{table}_user_id", "users", ["user_id"], ["id"])

    for table in ("notification_settings", "strava_connection"):
        with op.batch_alter_table(table) as batch_op:
            batch_op.add_column(sa.Column("user_id", sa.Integer(), nullable=False, server_default="1"))
            batch_op.create_unique_constraint(f"uq_{table}_user_id", ["user_id"])
            batch_op.create_foreign_key(f"fk_{table}_user_id", "users", ["user_id"], ["id"])


def downgrade() -> None:
    for table in ("notification_settings", "strava_connection"):
        with op.batch_alter_table(table) as batch_op:
            batch_op.drop_constraint(f"fk_{table}_user_id", type_="foreignkey")
            batch_op.drop_constraint(f"uq_{table}_user_id", type_="unique")
            batch_op.drop_column("user_id")

    for table in ("tires", "rides", "wear_records"):
        with op.batch_alter_table(table) as batch_op:
            batch_op.drop_constraint(f"fk_{table}_user_id", type_="foreignkey")
            batch_op.drop_index(f"ix_{table}_user_id")
            batch_op.drop_column("user_id")

    op.drop_table("sessions")

    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_constraint("uq_users_email", type_="unique")
        batch_op.drop_column("onboarding_completed")
        batch_op.drop_column("password_hash")
