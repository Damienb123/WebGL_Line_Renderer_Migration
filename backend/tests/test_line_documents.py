import sqlite3
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import create_app


@pytest.fixture()
def client():
    test_db_dir = Path(".test_dbs")
    test_db_dir.mkdir(exist_ok=True)
    database_path = test_db_dir / f"{uuid4().hex}.db"
    settings = Settings(
        api_key="test-api-key-123",
        database_path=database_path,
        cors_origins=["http://localhost:5173"],
    )

    app = create_app(settings)
    app.dependency_overrides[get_settings] = lambda: settings

    with TestClient(app) as test_client:
        yield test_client, settings

    for suffix in ("", "-wal", "-shm"):
        database_file = database_path.with_name(f"{database_path.name}{suffix}")
        database_file.unlink(missing_ok=True)


def headers(user_id="user-1", api_key="test-api-key-123"):
    return {"X-API-Key": api_key, "X-User-Id": user_id}


def sample_payload(name="Sketch A"):
    return {
        "name": name,
        "vertices": [-0.5, -0.5, 0.5, 0.5],
        "style": {"color": "#3366ff", "width": 3, "smooth": True},
    }


def test_health_check(client):
    test_client, _ = client

    response = test_client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_save_and_load_line_document(client):
    test_client, _ = client

    create_response = test_client.post(
        "/api/v1/line-documents",
        headers=headers(),
        json=sample_payload(),
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["id"]
    assert created["vertices"] == [-0.5, -0.5, 0.5, 0.5]
    assert created["style"]["color"] == "#3366ff"
    assert "owner" not in created

    load_response = test_client.get(
        f"/api/v1/line-documents/{created['id']}",
        headers=headers(),
    )

    assert load_response.status_code == 200
    assert load_response.json() == created


def test_list_is_scoped_to_authenticated_user(client):
    test_client, _ = client

    user_one = test_client.post(
        "/api/v1/line-documents",
        headers=headers("user-1"),
        json=sample_payload("User One Drawing"),
    ).json()
    test_client.post(
        "/api/v1/line-documents",
        headers=headers("user-2"),
        json=sample_payload("User Two Drawing"),
    )

    response = test_client.get("/api/v1/line-documents", headers=headers("user-1"))

    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == user_one["id"]
    assert items[0]["vertex_count"] == 2


def test_cross_user_load_returns_not_found(client):
    test_client, _ = client

    created = test_client.post(
        "/api/v1/line-documents",
        headers=headers("owner"),
        json=sample_payload(),
    ).json()

    response = test_client.get(
        f"/api/v1/line-documents/{created['id']}",
        headers=headers("different-user"),
    )

    assert response.status_code == 404


def test_update_line_document(client):
    test_client, _ = client

    created = test_client.post(
        "/api/v1/line-documents",
        headers=headers(),
        json=sample_payload(),
    ).json()

    response = test_client.put(
        f"/api/v1/line-documents/{created['id']}",
        headers=headers(),
        json={
            "name": "Updated",
            "vertices": [0, 0, 0.25, 0.25, 0.5, 0.5],
            "style": {"color": "#ff0000", "width": 5, "smooth": False},
        },
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["name"] == "Updated"
    assert updated["vertices"] == [0, 0, 0.25, 0.25, 0.5, 0.5]
    assert updated["style"]["width"] == 5


def test_delete_line_document(client):
    test_client, _ = client

    created = test_client.post(
        "/api/v1/line-documents",
        headers=headers(),
        json=sample_payload(),
    ).json()

    delete_response = test_client.delete(
        f"/api/v1/line-documents/{created['id']}",
        headers=headers(),
    )
    load_response = test_client.get(
        f"/api/v1/line-documents/{created['id']}",
        headers=headers(),
    )

    assert delete_response.status_code == 204
    assert load_response.status_code == 404


def test_rejects_missing_or_invalid_api_key(client):
    test_client, _ = client

    missing_response = test_client.post("/api/v1/line-documents", json=sample_payload())
    invalid_response = test_client.post(
        "/api/v1/line-documents",
        headers=headers(api_key="wrong-key"),
        json=sample_payload(),
    )

    assert missing_response.status_code == 401
    assert invalid_response.status_code == 401


def test_rejects_invalid_vertices(client):
    test_client, _ = client

    response = test_client.post(
        "/api/v1/line-documents",
        headers=headers(),
        json={"name": "Invalid", "vertices": [0, 0, 1], "style": {"color": "#ff0000"}},
    )

    assert response.status_code == 422


def test_database_does_not_store_raw_user_id(client):
    test_client, settings = client

    test_client.post(
        "/api/v1/line-documents",
        headers=headers("SensitiveUser@example.com"),
        json=sample_payload(),
    )

    conn = sqlite3.connect(settings.database_path)
    stored_owner = conn.execute("SELECT owner_hash FROM line_documents").fetchone()[0]
    conn.close()

    assert stored_owner != "SensitiveUser@example.com"
    assert len(stored_owner) == 64
