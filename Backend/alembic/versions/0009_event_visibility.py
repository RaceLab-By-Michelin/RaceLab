"""add visibility and join_code to events

Permet aux utilisateurs de créer des événements publics (visibles/rejoignables
par tous) ou privés (rejoignables uniquement via un code d'invitation à 6
caractères, généré côté serveur à la création).

Revision ID: 0009
Revises: 0008
Create Date: 2026-06-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "events",
        sa.Column("visibility", sa.String(), nullable=False, server_default="public"),
    )
    op.add_column("events", sa.Column("join_code", sa.String(), nullable=True))
    op.create_unique_constraint("uq_events_join_code", "events", ["join_code"])
    op.create_index("ix_events_join_code", "events", ["join_code"])


def downgrade() -> None:
    op.drop_index("ix_events_join_code", table_name="events")
    op.drop_constraint("uq_events_join_code", "events", type_="unique")
    op.drop_column("events", "join_code")
    op.drop_column("events", "visibility")
