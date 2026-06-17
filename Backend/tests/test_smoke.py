def test_health(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_startup_seed_not_triggered(client, db_session):
    """Le TestClient ne doit jamais exécuter l'event startup (donc jamais seed()) —
    sinon les tests deviendraient dépendants des données de démo et non isolés."""
    from app import models

    assert db_session.query(models.User).count() == 0
    assert db_session.query(models.TireCatalog).count() == 0
