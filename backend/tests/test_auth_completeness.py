"""Test auth completeness: reset, verify, refresh tokens, sessions, export/delete."""
import pytest
from app.db.models import User, AuthToken, UserSession
from app.services.auth_service import hash_password

# Clean up before testing
@pytest.fixture(autouse=True)
def clean_db(db_session):
    db_session.query(AuthToken).delete()
    db_session.query(UserSession).delete()
    db_session.query(User).filter(User.email.startswith("auth_comp_")).delete()
    db_session.commit()

@pytest.fixture
def auth_user(db_session):
    user = User(
        email="auth_comp_test@example.com",
        name="Auth Test",
        hashed_password=hash_password("ValidPass123!"),
        role="client"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

def test_forgot_password_enumeration_resistance(anon_client, auth_user, db_session):
    resp1 = anon_client.post("/api/v1/auth/forgot-password", json={"email": "auth_comp_test@example.com"})
    assert resp1.status_code == 202
    
    resp2 = anon_client.post("/api/v1/auth/forgot-password", json={"email": "auth_comp_no_exist@example.com"})
    assert resp2.status_code == 202
    
    # But only one token was created
    count = db_session.query(AuthToken).filter(AuthToken.purpose == "password_reset").count()
    assert count == 1

def test_password_reset_flow(anon_client, auth_user, db_session):
    anon_client.post("/api/v1/auth/forgot-password", json={"email": "auth_comp_test@example.com"})
    
    token_record = db_session.query(AuthToken).filter(AuthToken.user_id == auth_user.id).first()
    assert token_record
    
    # We must generate one manually to test the reset endpoint.
    from app.services.auth_service import generate_secure_token
    raw, hashed = generate_secure_token()
    token_record.token_hash = hashed
    db_session.commit()
    
    # Invalid token
    resp = anon_client.post("/api/v1/auth/reset-password", json={"token": "invalid_raw", "new_password": "NewValidPass1!"})
    assert resp.status_code == 400
    
    # Valid token
    resp = anon_client.post("/api/v1/auth/reset-password", json={"token": raw, "new_password": "NewValidPass1!"})
    assert resp.status_code == 200
    
    # Reusing token
    resp = anon_client.post("/api/v1/auth/reset-password", json={"token": raw, "new_password": "NewValidPass1!"})
    assert resp.status_code == 400
    
    # Login with new password
    resp = anon_client.post("/api/v1/auth/login", json={"email": "auth_comp_test@example.com", "password": "NewValidPass1!"})
    assert resp.status_code == 200

def test_refresh_token_rotation(anon_client, auth_user):
    resp = anon_client.post("/api/v1/auth/login", json={"email": "auth_comp_test@example.com", "password": "ValidPass123!"})
    assert resp.status_code == 200
    refresh_token = resp.json()["refresh_token"]
    assert refresh_token
    
    resp2 = anon_client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert resp2.status_code == 200
    new_refresh = resp2.json()["refresh_token"]
    assert new_refresh != refresh_token
    
    # Old token fails
    resp3 = anon_client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert resp3.status_code == 401

def test_list_and_delete_sessions(anon_client, auth_user):
    resp1 = anon_client.post("/api/v1/auth/login", json={"email": "auth_comp_test@example.com", "password": "ValidPass123!"})
    token = resp1.json()["token"]
    
    # Second login creates second session
    anon_client.post("/api/v1/auth/login", json={"email": "auth_comp_test@example.com", "password": "ValidPass123!"})
    
    resp_sess = anon_client.get("/api/v1/auth/sessions", headers={"Authorization": f"Bearer {token}"})
    assert resp_sess.status_code == 200
    sessions = resp_sess.json()["sessions"]
    assert len(sessions) == 2
    
    sess_id = sessions[0]["id"]
    resp_del = anon_client.delete(f"/api/v1/auth/sessions/{sess_id}", headers={"Authorization": f"Bearer {token}"})
    assert resp_del.status_code == 200
    
    resp_sess2 = anon_client.get("/api/v1/auth/sessions", headers={"Authorization": f"Bearer {token}"})
    assert len(resp_sess2.json()["sessions"]) == 1

def test_delete_account_and_export(anon_client, auth_user, db_session):
    resp = anon_client.post("/api/v1/auth/login", json={"email": "auth_comp_test@example.com", "password": "ValidPass123!"})
    token = resp.json()["token"]
    
    exp = anon_client.get("/api/v1/auth/export", headers={"Authorization": f"Bearer {token}"})
    assert exp.status_code == 200
    assert exp.json()["profile"]["email"] == "auth_comp_test@example.com"
    
    # Delete requires valid password
    d_fail = anon_client.request("DELETE", "/api/v1/auth/account", json={"password": "wrong"}, headers={"Authorization": f"Bearer {token}"})
    assert d_fail.status_code == 401
    
    d_ok = anon_client.request("DELETE", "/api/v1/auth/account", json={"password": "ValidPass123!"}, headers={"Authorization": f"Bearer {token}"})
    assert d_ok.status_code == 200
    
    # Check it was soft-deleted/anonymized
    db_session.expire_all()
    user = db_session.query(User).filter(User.id == auth_user.id).first()
    assert user.email.startswith("deleted_")
