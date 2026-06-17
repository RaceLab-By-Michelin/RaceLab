"""Tests pour /lab : tirages au sort Michelin Lab."""
from datetime import datetime, timedelta

from app import models
from tests.conftest import make_user, auth_header_for


def _make_trial(db_session, *, status="open", slots=1, **overrides):
    now = datetime.utcnow()
    defaults = dict(
        tire_name="Power Cup 2 Proto",
        description="Prototype gravel",
        target_profile="gravel",
        image_tag="Prototype 2026",
        entries_open_date=now - timedelta(days=2),
        entries_close_date=now + timedelta(days=5),
        draw_date=now + timedelta(days=6),
        slots=slots,
        status=status,
        preorder_discount_pct=15,
    )
    defaults.update(overrides)
    trial = models.TireTrial(**defaults)
    db_session.add(trial)
    db_session.commit()
    db_session.refresh(trial)
    return trial


def test_list_trials_requires_auth(client):
    resp = client.get("/lab/trials")
    assert resp.status_code == 401


def test_list_trials_empty(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)
    resp = client.get("/lab/trials", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_enter_trial_success(client, db_session):
    trial = _make_trial(db_session)
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)

    resp = client.post(f"/lab/trials/{trial.id}/enter", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["entered"] is True
    assert body["entries_count"] == 1

    entry = db_session.query(models.TireTrialEntry).filter_by(trial_id=trial.id, user_id=user.id).first()
    assert entry is not None
    assert entry.won is False


def test_enter_trial_is_idempotent(client, db_session):
    trial = _make_trial(db_session)
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)

    client.post(f"/lab/trials/{trial.id}/enter", headers=headers)
    resp = client.post(f"/lab/trials/{trial.id}/enter", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["entries_count"] == 1


def test_enter_trial_not_found(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)
    resp = client.post("/lab/trials/999/enter", headers=headers)
    assert resp.status_code == 404


def test_enter_trial_closed_returns_400(client, db_session):
    trial = _make_trial(db_session, status="closed")
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)

    resp = client.post(f"/lab/trials/{trial.id}/enter", headers=headers)
    assert resp.status_code == 400


def test_draw_trial_picks_winners_within_slots(client, db_session):
    trial = _make_trial(db_session, slots=2)
    users = [make_user(db_session, email=f"entrant{i}@example.com") for i in range(5)]
    for u in users:
        headers = auth_header_for(db_session, u)
        client.post(f"/lab/trials/{trial.id}/enter", headers=headers)

    admin_headers = auth_header_for(db_session, users[0])
    resp = client.post(f"/lab/trials/{trial.id}/draw", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "drawn"

    winners = db_session.query(models.TireTrialEntry).filter_by(trial_id=trial.id, won=True).all()
    assert len(winners) == 2  # borné par `slots`, jamais plus que les inscrits


def test_draw_trial_with_fewer_entries_than_slots(client, db_session):
    trial = _make_trial(db_session, slots=5)
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)
    client.post(f"/lab/trials/{trial.id}/enter", headers=headers)

    resp = client.post(f"/lab/trials/{trial.id}/draw", headers=headers)
    assert resp.status_code == 200

    winners = db_session.query(models.TireTrialEntry).filter_by(trial_id=trial.id, won=True).all()
    assert len(winners) == 1  # un seul inscrit, ne peut pas inventer un 2e gagnant


def test_draw_trial_is_irreversible(client, db_session):
    trial = _make_trial(db_session, slots=1)
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)
    client.post(f"/lab/trials/{trial.id}/enter", headers=headers)
    client.post(f"/lab/trials/{trial.id}/draw", headers=headers)

    # Un deuxième appel à draw ne doit pas re-tirer (status déjà "drawn")
    second_user = make_user(db_session, email="late@example.com")
    second_headers = auth_header_for(db_session, second_user)
    client.post(f"/lab/trials/{trial.id}/enter", headers=second_headers)
    resp = client.post(f"/lab/trials/{trial.id}/draw", headers=second_headers)
    assert resp.status_code == 200

    winners = db_session.query(models.TireTrialEntry).filter_by(trial_id=trial.id, won=True).all()
    assert len(winners) == 1  # le 2e inscrit (après tirage) ne devient jamais gagnant


def test_draw_trial_not_found(client, db_session):
    user = make_user(db_session)
    headers = auth_header_for(db_session, user)
    resp = client.post("/lab/trials/999/draw", headers=headers)
    assert resp.status_code == 404
