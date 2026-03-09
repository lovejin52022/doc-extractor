from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


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


def test_extract_flow() -> None:
    doc_id = _upload_doc()
    resp = client.post("/api/extract", json={"doc_id": doc_id, "labels": ["name", "date"]})
    assert resp.status_code == 201
    task_id = resp.json()["task_id"]

    task_resp = client.get(f"/api/extract/{task_id}")
    assert task_resp.status_code == 200
    assert task_resp.json()["task_id"] == task_id


def test_extract_document_not_found() -> None:
    resp = client.post("/api/extract", json={"doc_id": "missing", "labels": ["x"]})
    assert resp.status_code == 404
