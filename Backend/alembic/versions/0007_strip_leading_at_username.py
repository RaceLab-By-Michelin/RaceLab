"""strip leading @ from existing usernames

Le "@" était à la fois stocké en base ET ajouté à l'affichage côté frontend
(@{username}), ce qui produisait "@@..." (ex: "@@strava_204659933"). On
nettoie les lignes existantes ; les nouveaux comptes (register/strava) ne
stockent plus jamais le "@".

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE users SET username = ltrim(username, '@') WHERE username LIKE '@%'")


def downgrade() -> None:
    # Non réversible de façon fiable (on ne sait plus quelles lignes avaient
    # initialement un "@") — pas de downgrade.
    pass
