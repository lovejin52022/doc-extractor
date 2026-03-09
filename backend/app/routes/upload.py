from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter()
UPLOAD_DIR = Path(__file__).resolve().parents[3] / "storage" / "uploads"
ALLOWED_SUFFIXES = {".pdf", ".docx"}


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)) -> dict[str, str]:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(status_code=400, detail="Only .pdf/.docx files are allowed")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    doc_id = str(uuid4())
    destination = UPLOAD_DIR / f"{doc_id}{suffix}"

    with destination.open("wb") as f:
        content = await file.read()
        f.write(content)

    return {"id": doc_id, "filename": file.filename or "unknown"}
