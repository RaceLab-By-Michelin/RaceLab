"""
Configuration centralisée — variables d'environnement.

Charge un fichier .env (s'il existe, en local) via python-dotenv, puis lit
les variables avec os.getenv. En production (docker-compose / déploiement),
les variables sont injectées directement dans l'environnement du conteneur,
.env n'est alors pas nécessaire.

Le client_secret Strava ne doit JAMAIS être exposé au frontend ni committé en
clair dans un fichier suivi par git — il ne vit que côté serveur, ici.
"""
import os

from dotenv import load_dotenv

load_dotenv()

STRAVA_CLIENT_ID = os.getenv("STRAVA_CLIENT_ID", "")
STRAVA_CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET", "")
STRAVA_REDIRECT_URI = os.getenv("STRAVA_REDIRECT_URI", "http://localhost:3000/strava/callback")
