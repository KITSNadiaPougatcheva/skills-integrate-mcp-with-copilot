from fastapi.testclient import TestClient

from src.app import app

client = TestClient(app)


def test_login_with_valid_teacher_credentials():
    response = client.post(
        "/auth/login",
        json={"username": "teacher", "password": "password123"},
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Logged in as teacher"
    assert response.cookies.get("teacher_session") == "teacher"


def test_signup_requires_teacher_login():
    unauthenticated_client = TestClient(app)

    response = unauthenticated_client.post(
        "/activities/Chess Club/signup",
        params={"email": "student@mergington.edu"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Teacher authentication required"
