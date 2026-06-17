"""add avatar_url to users

Stocke l'URL de la photo de profil Strava (athlete.profile) pour l'utiliser
comme avatar dans l'app. Nullable : reste vide pour les comptes non liés à
Strava ou créés avant cette colonne.

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_url", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_url")
