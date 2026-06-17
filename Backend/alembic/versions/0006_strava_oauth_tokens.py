"""strava oauth tokens

Ajoute les colonnes nécessaires à une vraie connexion OAuth Strava (au lieu
de la simulation précédente) : identifiant athlète Strava, access/refresh
token, et expiration. Toutes nullable — un compte non connecté garde ces
colonnes à NULL, donc compatible avec les lignes existantes.

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("strava_connection", sa.Column("strava_athlete_id", sa.Integer(), nullable=True))
    op.add_column("strava_connection", sa.Column("access_token", sa.String(), nullable=True))
    op.add_column("strava_connection", sa.Column("refresh_token", sa.String(), nullable=True))
    op.add_column("strava_connection", sa.Column("expires_at", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("strava_connection", "expires_at")
    op.drop_column("strava_connection", "refresh_token")
    op.drop_column("strava_connection", "access_token")
    op.drop_column("strava_connection", "strava_athlete_id")
