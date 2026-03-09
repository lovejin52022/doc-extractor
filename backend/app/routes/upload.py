from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.store import document_store

router = APIRouter()
UPLOAD_DIR = Path(__file__).resolve().parents[3] / "storage" / "uploads"
ALLOWED_SUFFIXES = {".pdf", ".docx"}


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)) -> dict[str, str]:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(status_code=400, detail="Only .pdf/.docx files are allowed")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    doc = document_store.create(filename=file.filename or "unknown", path="")
    destination = UPLOAD_DIR / f"{doc.doc_id}{suffix}"

    with destination.open("wb") as f:
        content = await file.read()
        f.write(content)

    doc.path = str(destination)
    return {"id": doc.doc_id, "filename": doc.filename}
