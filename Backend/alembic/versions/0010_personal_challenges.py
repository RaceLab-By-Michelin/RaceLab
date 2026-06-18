"""personal challenges

Ajoute la table personal_challenges — défi unique généré pour un utilisateur
précis ("Pneu pour toi"), avec questionnaire de feedback post-défi (ciblé
pneus) et récompense (réduction) calculée par palier selon le nombre de
défis personnels déjà complétés.

Revision ID: 0010
Revises: 0009
Create Date: 2026-06-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "personal_challenges",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("discipline", sa.String(), nullable=False),
        sa.Column("target_km", sa.Float(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("adherence_rating", sa.Integer(), nullable=True),
        sa.Column("comfort_rating", sa.Integer(), nullable=True),
        sa.Column("speed_rating", sa.Integer(), nullable=True),
        sa.Column("feedback_comment", sa.Text(), nullable=True),
        sa.Column("reward_discount_pct", sa.Integer(), nullable=True),
        sa.Column("reward_discount_code", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("personal_challenges")
