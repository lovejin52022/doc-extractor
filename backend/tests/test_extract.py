from fastapi.testclient import TestClient

from app.main import app
from app.store import task_store


client = TestClient(app)


def setup_function() -> None:
    """每个测试前清空任务存储。"""
    task_store._tasks.clear()


def test_create_extract_task() -> None:
    resp = client.post("/api/extract", json={"doc_id": "abc-123", "labels": ["name", "date"]})
    assert resp.status_code == 201
    data = resp.json()
    assert data["doc_id"] == "abc-123"
    assert data["status"] == "pending"
    assert "task_id" in data


def test_get_extract_status() -> None:
    create_resp = client.post("/api/extract", json={"doc_id": "abc-123", "labels": ["title"]})
    task_id = create_resp.json()["task_id"]

    resp = client.get(f"/api/extract/{task_id}/status")
    assert resp.status_code == 200
    assert resp.json()["task_id"] == task_id
    assert resp.json()["status"] == "pending"


def test_get_extract_status_not_found() -> None:
    resp = client.get("/api/extract/nonexistent/status")
    assert resp.status_code == 404


def test_list_extract_tasks() -> None:
    client.post("/api/extract", json={"doc_id": "d1", "labels": []})
    client.post("/api/extract", json={"doc_id": "d2", "labels": ["x"]})
    resp = client.get("/api/extract")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_mock_complete_task() -> None:
    create_resp = client.post("/api/extract", json={"doc_id": "abc", "labels": ["name", "age"]})
    task_id = create_resp.json()["task_id"]

    resp = client.post(f"/api/extract/{task_id}/mock-complete")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert "name" in data["result"]["extracted"]
    assert "age" in data["result"]["extracted"]


def test_health_still_works() -> None:
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
