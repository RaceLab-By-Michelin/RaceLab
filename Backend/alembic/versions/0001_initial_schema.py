"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-15
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("city", sa.String(), nullable=False),
        sa.Column("member_since", sa.String(), nullable=False),
        sa.Column("level", sa.String(), nullable=False, server_default="Expert"),
        sa.Column("level_progress", sa.Integer(), nullable=False, server_default="78"),
        sa.Column("bike_brand", sa.String(), nullable=False),
        sa.Column("bike_model", sa.String(), nullable=False),
        sa.Column("bike_year", sa.Integer(), nullable=False),
        sa.Column("bike_color", sa.String(), nullable=False, server_default="#1A3A6B"),
    )

    op.create_table(
        "tire_catalog",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("sizes", sa.JSON(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("max_pressure", sa.String(), nullable=False),
        sa.Column("weight", sa.String(), nullable=False),
        sa.Column("tag", sa.String(), nullable=True),
    )

    op.create_table(
        "tires",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("wheel", sa.String(), nullable=False),
        sa.Column("brand", sa.String(), nullable=False),
        sa.Column("catalog_id", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("size", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("wear_pct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("installed_date", sa.String(), nullable=False),
        sa.Column("installed_km", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "wear_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("date", sa.DateTime(), nullable=False, index=True),
        sa.Column("front_wear", sa.Float(), nullable=False),
        sa.Column("rear_wear", sa.Float(), nullable=False),
    )

    op.create_table(
        "rides",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("date", sa.DateTime(), nullable=False, index=True),
        sa.Column("distance_km", sa.Float(), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("avg_speed", sa.Float(), nullable=False),
        sa.Column("elevation_gain", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("strava_id", sa.String(), nullable=True),
    )

    op.create_table(
        "challenges",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("start_date", sa.DateTime(), nullable=False),
        sa.Column("end_date", sa.DateTime(), nullable=False),
        sa.Column("target_km", sa.Float(), nullable=True),
        sa.Column("target_elevation", sa.Integer(), nullable=True),
        sa.Column("target_rides", sa.Integer(), nullable=True),
        sa.Column("progress_km", sa.Float(), nullable=False, server_default="0"),
        sa.Column("progress_elevation", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("progress_rides", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("participants", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rank", sa.Integer(), nullable=True),
        sa.Column("badge_emoji", sa.String(), nullable=True),
        sa.Column("badge_label", sa.String(), nullable=True),
        sa.Column("reward", sa.String(), nullable=True),
    )

    op.create_table(
        "notification_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("pre_ride_enabled", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("delay_hours", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("critical_only", sa.Boolean(), nullable=False, server_default="0"),
    )

    op.create_table(
        "strava_connection",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("connected", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("athlete_name", sa.String(), nullable=True),
        sa.Column("last_sync", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("strava_connection")
    op.drop_table("notification_settings")
    op.drop_table("challenges")
    op.drop_table("rides")
    op.drop_table("wear_records")
    op.drop_table("tires")
    op.drop_table("tire_catalog")
    op.drop_table("users")
