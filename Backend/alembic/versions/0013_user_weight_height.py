"""add weight_kg / height_cm to users

Demandés à la première inscription : permettent d'affiner le calcul d'usure
des pneus (charge portée par les pneus = poids du cycliste + vélo). Pour les
comptes déjà créés, on applique un gabarit moyen par défaut (1m80 / 75kg).

Revision ID: 0013
Revises: 0012
Create Date: 2026-06-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("weight_kg", sa.Float(), nullable=False, server_default="75.0"),
    )
    op.add_column(
        "users",
        sa.Column("height_cm", sa.Float(), nullable=False, server_default="180.0"),
    )


def downgrade() -> None:
    op.drop_column("users", "height_cm")
    op.drop_column("users", "weight_kg")
