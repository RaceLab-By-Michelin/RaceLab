"""wear calculation fields

Adds the columns needed to compute tire wear from ride data:
  - rides.weather       : conditions météo de la sortie ("dry" | "wet" | "mixed")
  - rides.surface_type  : type de revêtement ("road" | "gravel" | "mixed" | "mtb_trail")
  - tire_catalog.life_km: durée de vie nominale du pneu (km), sert à calibrer le taux d'usure de base

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-16
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("rides", sa.Column("weather", sa.String(), nullable=True))
    op.add_column("rides", sa.Column("surface_type", sa.String(), nullable=True))
    op.add_column("tire_catalog", sa.Column("life_km", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("tire_catalog", "life_km")
    op.drop_column("rides", "surface_type")
    op.drop_column("rides", "weather")
