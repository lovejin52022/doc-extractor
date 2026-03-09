from fastapi.testclient import TestClient

from app.main import app
from app.store import document_store, task_store

client = TestClient(app)


def setup_function() -> None:
    task_store._tasks.clear()
    document_store._docs.clear()


def _upload_doc() -> str:
    files = {
        "file": (
            "sample.docx",
            b"fake-doc-content",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
    }
    resp = client.post("/api/upload", files=files)
    assert resp.status_code == 200
    return resp.json()["id"]


def test_create_extract_task() -> None:
    doc_id = _upload_doc()
    resp = client.post("/api/extract", json={"doc_id": doc_id, "labels": ["name", "date"]})
    assert resp.status_code == 201
    data = resp.json()
    assert data["doc_id"] == doc_id
    assert data["status"] in {"pending", "processing", "completed"}
    assert "task_id" in data


def test_create_extract_task_document_not_found() -> None:
    resp = client.post("/api/extract", json={"doc_id": "missing", "labels": ["x"]})
    assert resp.status_code == 404


def test_get_extract_status() -> None:
    doc_id = _upload_doc()
    create_resp = client.post("/api/extract", json={"doc_id": doc_id, "labels": ["title"]})
    task_id = create_resp.json()["task_id"]

    resp = client.get(f"/api/extract/{task_id}/status")
    assert resp.status_code == 200
    assert resp.json()["task_id"] == task_id


def test_get_extract_status_not_found() -> None:
    resp = client.get("/api/extract/nonexistent/status")
    assert resp.status_code == 404


def test_list_extract_tasks() -> None:
    d1 = _upload_doc()
    d2 = _upload_doc()
    client.post("/api/extract", json={"doc_id": d1, "labels": []})
    client.post("/api/extract", json={"doc_id": d2, "labels": ["x"]})
    resp = client.get("/api/extract")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_mock_complete_task() -> None:
    doc_id = _upload_doc()
    create_resp = client.post("/api/extract", json={"doc_id": doc_id, "labels": ["name", "age"]})
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
