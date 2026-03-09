from fastapi import APIRouter, HTTPException, Query

from app.models.entities import DocumentListResponse
from app.store import store

router = APIRouter()


@router.get('/documents', response_model=DocumentListResponse)
def list_documents(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None),
    keyword: str | None = Query(default=None),
) -> DocumentListResponse:
    items, total = store.list_documents(page=page, page_size=page_size, status=status, keyword=keyword)
    return DocumentListResponse(items=items, total=total, page=page, page_size=page_size)


@router.delete('/documents/{doc_id}', status_code=204)
def delete_document(doc_id: str) -> None:
    ok = store.delete_document(doc_id)
    if not ok:
        raise HTTPException(status_code=404, detail='Document not found')
