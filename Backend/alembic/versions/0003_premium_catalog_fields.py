"""premium catalog fields

Ajoute les métadonnées enrichies issues de la recherche sur la gamme
Premium Michelin, pour affiner le matching de recommend.py et l'affichage
catalogue côté frontend :
  - tire_catalog.discipline         : list[str]  ex: ["Road"], ["Road","Gravel"]
  - tire_catalog.sub_family         : list[str]  ex: ["Racing"], ["Endurance","All Road"]
  - tire_catalog.tubeless           : bool       compatible TLR
  - tire_catalog.casing             : str        construction (TPI, renforts)
  - tire_catalog.compound           : str        gomme (Gum-X, Magi-X, X-Miles, ...)
  - tire_catalog.protection_level   : str        "low" | "medium" | "high"
  - tire_catalog.riding_priority    : str        "racing" | "endurance" | "protection" | ...
  - tire_catalog.terrain_tags       : list[str]  ex: ["dry","wet","mud"]
  - tire_catalog.e_bike_compatible  : bool

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-16
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tire_catalog", sa.Column("discipline", sa.JSON(), nullable=True))
    op.add_column("tire_catalog", sa.Column("sub_family", sa.JSON(), nullable=True))
    op.add_column("tire_catalog", sa.Column("tubeless", sa.Boolean(), nullable=True))
    op.add_column("tire_catalog", sa.Column("casing", sa.String(), nullable=True))
    op.add_column("tire_catalog", sa.Column("compound", sa.String(), nullable=True))
    op.add_column("tire_catalog", sa.Column("protection_level", sa.String(), nullable=True))
    op.add_column("tire_catalog", sa.Column("riding_priority", sa.String(), nullable=True))
    op.add_column("tire_catalog", sa.Column("terrain_tags", sa.JSON(), nullable=True))
    op.add_column("tire_catalog", sa.Column("e_bike_compatible", sa.Boolean(), nullable=True))


def downgrade() -> None:
    op.drop_column("tire_catalog", "e_bike_compatible")
    op.drop_column("tire_catalog", "terrain_tags")
    op.drop_column("tire_catalog", "riding_priority")
    op.drop_column("tire_catalog", "protection_level")
    op.drop_column("tire_catalog", "compound")
    op.drop_column("tire_catalog", "casing")
    op.drop_column("tire_catalog", "tubeless")
    op.drop_column("tire_catalog", "sub_family")
    op.drop_column("tire_catalog", "discipline")
