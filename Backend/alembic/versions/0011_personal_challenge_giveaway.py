"""personal challenge giveaway

Ajoute la possibilité de récompenser un défi personnel par un pneu offert
(giveaway mérité — palier de fidélité + dépassement de l'objectif du défi)
plutôt que systématiquement par une réduction.

Revision ID: 0011
Revises: 0010
Create Date: 2026-06-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "personal_challenges",
        sa.Column("reward_type", sa.String(), nullable=False, server_default="discount"),
    )
    op.add_column(
        "personal_challenges",
        sa.Column(
            "reward_giveaway_tire_catalog_id",
            sa.String(),
            sa.ForeignKey("tire_catalog.id"),
            nullable=True,
        ),
    )
    op.add_column(
        "personal_challenges",
        sa.Column("reward_giveaway_tire_name", sa.String(), nullable=True),
    )
    op.add_column(
        "personal_challenges",
        sa.Column("reward_giveaway_status", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("personal_challenges", "reward_giveaway_status")
    op.drop_column("personal_challenges", "reward_giveaway_tire_name")
    op.drop_column("personal_challenges", "reward_giveaway_tire_catalog_id")
    op.drop_column("personal_challenges", "reward_type")
