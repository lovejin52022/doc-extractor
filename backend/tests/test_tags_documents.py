from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _upload_doc(name: str = "sample.docx") -> str:
    files = {"file": (name, b"fake", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    resp = client.post("/api/upload", files=files)
    assert resp.status_code == 200
    return resp.json()["id"]


def test_tags_crud():
    created = client.post("/api/tags", json={"name": "invoice_no", "description": "发票号", "color": "#111111"})
    assert created.status_code == 201
    tag_id = created.json()["id"]

    lst = client.get("/api/tags")
    assert lst.status_code == 200
    assert len(lst.json()) == 1

    updated = client.put(f"/api/tags/{tag_id}", json={"description": "发票号码"})
    assert updated.status_code == 200
    assert updated.json()["description"] == "发票号码"

    deleted = client.delete(f"/api/tags/{tag_id}")
    assert deleted.status_code == 204


def test_documents_list_and_delete():
    doc_id = _upload_doc("contract.docx")
    lst = client.get("/api/documents?page=1&page_size=10&keyword=contract")
    assert lst.status_code == 200
    body = lst.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == doc_id

    deleted = client.delete(f"/api/documents/{doc_id}")
    assert deleted.status_code == 204
