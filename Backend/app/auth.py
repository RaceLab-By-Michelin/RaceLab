"""
Auth minimal sans dépendance externe : hash de mot de passe (PBKDF2-SHA256
via hashlib, std-lib) + jeton de session opaque stocké en base (table
`sessions`), envoyé par le front en `Authorization: Bearer <token>`.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app import models

SESSION_TTL_DAYS = 30
_PBKDF2_ITERATIONS = 260_000

# Schéma de sécurité Bearer : fait apparaître le bouton "Authorize" dans
# Swagger UI (/docs). Une fois le token (récupéré via /auth/login ou
# /auth/register) collé dans la popup, il est automatiquement ajouté à
# l'en-tête `Authorization` de toutes les requêtes "Try it out" suivantes.
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), _PBKDF2_ITERATIONS)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt, digest_hex = password_hash.split("$", 1)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), _PBKDF2_ITERATIONS)
    return hmac.compare_digest(digest.hex(), digest_hex)


def create_session(db: DBSession, user_id: int) -> models.Session:
    token = secrets.token_urlsafe(32)
    now = datetime.utcnow()
    session = models.Session(
        token=token,
        user_id=user_id,
        created_at=now,
        expires_at=now + timedelta(days=SESSION_TTL_DAYS),
    )
    db.add(session)
    db.commit()
    return session


def delete_session(db: DBSession, token: str) -> None:
    db.query(models.Session).filter(models.Session.token == token).delete()
    db.commit()


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: DBSession = Depends(get_db),
) -> models.User:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Non authentifié")
    token = credentials.credentials.strip()

    session = db.query(models.Session).filter(models.Session.token == token).first()
    if not session:
        raise HTTPException(status_code=401, detail="Session invalide")
    if session.expires_at < datetime.utcnow():
        db.query(models.Session).filter(models.Session.token == token).delete()
        db.commit()
        raise HTTPException(status_code=401, detail="Session expirée")

    user = db.query(models.User).filter(models.User.id == session.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    return user
