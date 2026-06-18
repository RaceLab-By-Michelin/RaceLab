# RaceLab by Michelin 

RaceLab est une application de suivi prédictif de l'usure des pneus vélo, pensée pour les cyclistes Michelin. Elle relie l'activité réelle du cycliste (via Strava) à l'état de ses pneus, et transforme cette donnée en recommandations, défis et offres personnalisées — dans une interface respectant la Charte Digitale Michelin (Mars 2024), disponible en thème sombre et en thème clair.

## Sommaire

- [Aperçu](#aperçu)
- [Fonctionnalités](#fonctionnalités)
- [Architecture technique](#architecture-technique)
- [Prérequis](#prérequis)
- [Lancement avec Docker (recommandé)](#lancement-avec-docker-recommandé)
- [Lancement manuel (sans Docker)](#lancement-manuel-sans-docker)
- [Configuration Strava](#configuration-strava)
- [Tests](#tests)
- [Structure du projet](#structure-du-projet)

## Aperçu

RaceLab calcule l'usure des pneus avant/arrière à partir des kilomètres parcourus, alerte le cycliste avant qu'il ne soit en rupture d'adhérence, et l'accompagne avec des défis, un coach virtuel et un programme de fidélité Michelin (Passeport, Légendes, Michelin Lab).

## Fonctionnalités

### Authentification & onboarding
- Inscription / connexion par e-mail et mot de passe.
- Connexion et inscription via Strava (OAuth).
- Parcours d'onboarding (profil cycliste, vélo, premiers pneus).
- Session persistante et déconnexion.

### Suivi des pneus (Telemetry / Tires)
- Tableau de bord d'usure en temps réel pour le pneu avant et le pneu arrière.
- Historique de l'usure (Wear history) sous forme de courbe.
- Calcul de la perte d'adhérence estimée en fonction du kilométrage et du type de pneu.
- Alertes contextuelles selon l'usure : message d'incitation au premier roulage, état "bon", avertissement avant changement, ou objectif "pneus bien utilisés" avec offre associée.
- Catalogue complet des pneus Michelin (route, gravel, VTT, piste) avec caractéristiques (pression max, poids, tailles disponibles).
- Changement de pneu installé (avant / arrière) avec mise à jour de la date d'installation.
- Recommandations personnalisées de pneus de remplacement, avec réduction associée.
- Passeport pneu exportable (carte visuelle générée en canvas, façon "carte de collection").

### Sorties (Rides) & intégration Strava
- Synchronisation automatique des sorties vélo depuis Strava.
- Import manuel d'une sortie.
- Historique des sorties avec récit/narration généré automatiquement (Ride Narrative).
- Connexion / déconnexion du compte Strava depuis les Réglages.
- Consultation des clubs Strava et de leurs membres, invitation d'amis.

### Défis & gamification (Challenges)
- Défis communautaires Michelin (en cours et passés).
- Défis personnels avec suivi de progression, complétion et feedback.
- Événements (courses, sorties de groupe) : consultation, création, inscription.
- Michelin Lab : tirages au sort et essais de nouveaux pneus en avant-première.
- Écran "Légendes" : temps forts et contenus inspirants liés au cyclisme Michelin (ex. Team Picnic PostNL, 24h du Mans).

### Coach virtuel
- Conseils personnalisés ("Coach tips") basés sur les habitudes de roulage et l'état des pneus.

### Profil cycliste
- Informations personnelles (nom, ville, photo), modifiables.
- Statistiques globales (kilométrage total, sorties, progression).
- Gestion du vélo (modèle, caractéristiques).

### Espace revendeur Michelin (B2B, démonstration)
- Tableau de bord de prévision de la demande par zone géographique, à destination des revendeurs du réseau Michelin.

### Réglages
- **Bascule thème clair / thème sombre**, conforme à la Charte Digitale Michelin (palette Bleu Michelin / Jaune Michelin en mode clair).
- Gestion des notifications.
- Gestion de la connexion Strava (connecter, synchroniser, déconnecter).
- Accès à l'espace revendeur, aux mentions légales/CGU, à la version de l'app.
- Déconnexion du compte.

### Design & accessibilité
- Interface responsive (mobile avec navigation basse, desktop avec sidebar).
- Thème sombre "satin glass" et thème clair Michelin, tous deux pilotés par variables CSS — aucun composant à modifier pour changer de thème.
- Typographie Michelin (titres + corps de texte) et composants standards (boutons, switch, cartes) cohérents avec la charte.

## Architecture technique

| Composant   | Technologie |
|---|---|
| Frontend    | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Backend     | FastAPI (Python 3.12), SQLAlchemy 2, Alembic (migrations) |
| Base de données | PostgreSQL 16 |
| Intégration externe | API Strava (OAuth + activités) |
| Tests       | Vitest + Testing Library (frontend), Playwright (e2e), Pytest (backend) |

## Prérequis

- [Docker](https://www.docker.com/) et Docker Compose (méthode recommandée), **ou** :
  - Node.js 20+ et npm
  - Python 3.12+
  - PostgreSQL 16 (local ou distant)

## Lancement avec Docker (recommandé)

Cette méthode démarre la base de données PostgreSQL et le backend FastAPI (les migrations Alembic sont appliquées automatiquement au démarrage).

1. À la racine du projet, créez un fichier `.env` à partir de l'exemple fourni :

   ```bash
   cp .env.example .env
   ```

   Renseignez-y vos identifiants Strava si vous souhaitez utiliser cette intégration (voir [Configuration Strava](#configuration-strava)). Le fichier peut rester vide pour démarrer l'app sans Strava.

2. Démarrez la base de données et le backend :

   ```bash
   docker compose up --build
   ```

   - L'API FastAPI est alors disponible sur **http://localhost:8000** (documentation interactive sur `http://localhost:8000/docs`).
   - PostgreSQL est exposé sur le port `5432` (utile pour s'y connecter avec un client type DBeaver/psql).

3. Dans un second terminal, lancez le frontend (non inclus dans `docker-compose.yml`, à lancer en local) :

   ```bash
   cd Frontend
   npm install
   npm run dev
   ```

   L'application est alors disponible sur **http://localhost:3000**.

4. Pour arrêter les services Docker :

   ```bash
   docker compose down
   ```

   Ajoutez `-v` pour supprimer également les données PostgreSQL (`docker compose down -v`).

## Lancement manuel (sans Docker)

### Backend

```bash
cd Backend
python3 -m venv venv
source venv/bin/activate          # Windows : venv\Scripts\activate
pip install -r requirements.txt

# Configurez DATABASE_URL vers votre instance PostgreSQL, par exemple :
export DATABASE_URL=postgresql://racelab:racelab_secret@localhost:5432/racelab

alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

Le frontend lit l'URL du backend via la variable d'environnement `NEXT_PUBLIC_API_URL` (fichier `Frontend/.env.local`, par défaut `http://localhost:8000`).

### Build de production

```bash
# Backend : servir avec uvicorn/gunicorn derrière un reverse proxy (voir Backend/Dockerfile)
# Frontend :
cd Frontend
npm run build
npm run start
```

## Configuration Strava

Pour activer la connexion Strava (synchronisation des sorties, clubs…), créez une application sur [Strava API Settings](https://www.strava.com/settings/api) puis renseignez, dans le fichier `.env` à la racine :

```bash
STRAVA_CLIENT_ID=votre_client_id
STRAVA_CLIENT_SECRET=votre_client_secret
STRAVA_REDIRECT_URI=http://localhost:3000/strava/callback
```

## Tests

```bash
# Frontend — tests unitaires
cd Frontend && npm run test

# Frontend — tests end-to-end (Playwright)
cd Frontend && npm run e2e

# Frontend — vérification des types et du lint
cd Frontend && npm run typecheck && npm run lint

# Backend — tests Pytest
cd Backend && pytest
```

## Structure du projet

```
hackaton/
├── Backend/                  # API FastAPI
│   ├── app/
│   │   ├── routers/          # auth, user, tires, rides, challenges, settings,
│   │   │                     # events, lab, coach, personal_challenges, retailer
│   │   ├── models.py         # Modèles SQLAlchemy
│   │   ├── schemas.py        # Schémas Pydantic
│   │   ├── wear.py           # Calcul d'usure / adhérence des pneus
│   │   ├── recommend.py      # Moteur de recommandation de pneus
│   │   ├── strava_client.py  # Intégration Strava
│   │   └── seed.py           # Données de démonstration
│   └── alembic/               # Migrations de base de données
├── Frontend/                  # Application Next.js
│   └── app/
│       ├── (app)/             # Écrans authentifiés (telemetry, tires, challenges,
│       │                      # coach, profile, settings, retailer, strava-clubs…)
│       ├── components/        # Composants UI (écrans + ui/)
│       ├── lib/                # constants (design tokens), api, contexts (auth, thème)
│       ├── login/, signup/, onboarding/, strava/
│       └── globals.css         # Variables de thème (clair/sombre) — Charte Michelin
├── docker-compose.yml         # PostgreSQL + Backend
└── init-test-db.sql
```
