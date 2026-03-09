from fastapi import APIRouter, HTTPException

from app.models.entities import TagCreate, TagResponse, TagUpdate
from app.store import store

router = APIRouter()


@router.get('/tags', response_model=list[TagResponse])
def list_tags() -> list[TagResponse]:
    return store.list_tags()


@router.post('/tags', response_model=TagResponse, status_code=201)
def create_tag(payload: TagCreate) -> TagResponse:
    return store.create_tag(payload)


@router.put('/tags/{tag_id}', response_model=TagResponse)
def update_tag(tag_id: str, payload: TagUpdate) -> TagResponse:
    tag = store.update_tag(tag_id, payload)
    if not tag:
        raise HTTPException(status_code=404, detail='Tag not found')
    return tag


@router.delete('/tags/{tag_id}', status_code=204)
def delete_tag(tag_id: str) -> None:
    ok = store.delete_tag(tag_id)
    if not ok:
        raise HTTPException(status_code=404, detail='Tag not found')
