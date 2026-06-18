FROM python:3.12-slim

WORKDIR /app

# psycopg2-binary est autonome mais libpq peut être utile pour pg_isready health-check
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# DATABASE_URL injecté par docker-compose depuis le service postgres.
#
# La migration (`alembic upgrade head`) n'est PAS lancée ici : en Swarm, avec
# plusieurs replicas du backend démarrant en parallèle, chacun exécuterait sa
# propre migration au même instant (risque de conflit / double application).
# Elle se lance désormais comme une étape à part dans le déploiement (service
# `migrate` à exécution unique — voir docker-compose.prod.yml / deploy.sh).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
