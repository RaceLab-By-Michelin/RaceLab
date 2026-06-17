"""events and tire trials

Ajoute les tables pour deux nouvelles features :
  - events / event_participants    : événements créés/rejoints par les utilisateurs
                                      (défi à distance — pas de lieu/point de RDV)
  - tire_trials / tire_trial_entries : Michelin Lab — tirages au sort pour tester
                                      des pneus pas encore commercialisés

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-16
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("goal_type", sa.String(), nullable=False),
        sa.Column("goal_value", sa.Float(), nullable=False),
        sa.Column("terrain_type", sa.String(), nullable=True),
        sa.Column("start_date", sa.DateTime(), nullable=False),
        sa.Column("end_date", sa.DateTime(), nullable=False),
        sa.Column("reward", sa.String(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "event_participants",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("joined_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "tire_trials",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tire_name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("target_profile", sa.String(), nullable=True),
        sa.Column("image_tag", sa.String(), nullable=True),
        sa.Column("entries_open_date", sa.DateTime(), nullable=False),
        sa.Column("entries_close_date", sa.DateTime(), nullable=False),
        sa.Column("draw_date", sa.DateTime(), nullable=False),
        sa.Column("slots", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(), nullable=False, server_default="open"),
        sa.Column("preorder_discount_pct", sa.Integer(), nullable=True),
    )

    op.create_table(
        "tire_trial_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("trial_id", sa.Integer(), sa.ForeignKey("tire_trials.id"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("entered_at", sa.DateTime(), nullable=False),
        sa.Column("won", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_table("tire_trial_entries")
    op.drop_table("tire_trials")
    op.drop_table("event_participants")
    op.drop_table("events")
