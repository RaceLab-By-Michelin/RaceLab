"""demo rider profiles (retailer B2B dashboard)

Ajoute la table demo_rider_profiles : profils de pratique simulés du réseau
de distribution Michelin, répartis par ville, utilisés pour le dashboard B2B
revendeur (Feature 2 — profils dominants + pneus en fin de vie par zone).

Revision ID: 0012
Revises: 0011
Create Date: 2026-06-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "demo_rider_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("city", sa.String(), nullable=False),
        sa.Column("practice_type", sa.String(), nullable=False),
        sa.Column("tire_catalog_id", sa.String(), sa.ForeignKey("tire_catalog.id"), nullable=True),
        sa.Column("wear_pct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("weekly_km", sa.Float(), nullable=False, server_default="80.0"),
    )
    op.create_index("ix_demo_rider_profiles_city", "demo_rider_profiles", ["city"])


def downgrade() -> None:
    op.drop_index("ix_demo_rider_profiles_city", table_name="demo_rider_profiles")
    op.drop_table("demo_rider_profiles")
