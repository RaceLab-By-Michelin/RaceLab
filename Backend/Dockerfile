FROM python:3.12-slim

WORKDIR /app

# psycopg2-binary est autonome mais libpq peut être utile pour pg_isready health-check
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# DATABASE_URL injecté par docker-compose depuis le service postgres
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
