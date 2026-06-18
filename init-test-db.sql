-- Exécuté automatiquement par l'image postgres au premier démarrage du volume
-- (docker-entrypoint-initdb.d) : crée une base séparée pour la suite de tests
-- backend, qui tourne désormais contre un vrai Postgres (cf. tests/conftest.py).
CREATE DATABASE racelab_test OWNER racelab;
