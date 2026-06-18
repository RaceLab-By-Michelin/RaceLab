"""add goal_km to users

Objectif personnel de kilométrage total, fixé par l'utilisateur dans son
profil et affiché sur la page d'accueil ("X / objectif km"). Nullable : pas
d'objectif tant que l'utilisateur n'en a pas défini un.

Revision ID: 0014
Revises: 0013
Create Date: 2026-06-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0014"
down_revision: Union[str, None] = "0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("goal_km", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "goal_km")
