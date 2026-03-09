from fastapi import APIRouter, HTTPException

from app.models.entities import (
    HitTestRequest,
    HitTestResponse,
    IndexTaskCreate,
    IndexTaskResponse,
    KnowledgeBaseCreate,
    KnowledgeBaseDocumentCreate,
    KnowledgeBaseDocumentListResponse,
    KnowledgeBaseDocumentResponse,
    KnowledgeBaseListResponse,
    KnowledgeBaseResponse,
    KnowledgeBaseUpdate,
)
from app.store import store

router = APIRouter()


# Knowledge Base APIs
@router.get("/knowledge-bases", response_model=KnowledgeBaseListResponse)
def list_knowledge_bases() -> KnowledgeBaseListResponse:
    items = store.list_knowledge_bases()
    return KnowledgeBaseListResponse(items=items, total=len(items))


@router.post("/knowledge-bases", response_model=KnowledgeBaseResponse, status_code=201)
def create_knowledge_base(payload: KnowledgeBaseCreate) -> KnowledgeBaseResponse:
    return store.create_knowledge_base(payload)


@router.get("/knowledge-bases/{kb_id}", response_model=KnowledgeBaseResponse)
def get_knowledge_base(kb_id: str) -> KnowledgeBaseResponse:
    kb = store.get_knowledge_base(kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    return kb


@router.put("/knowledge-bases/{kb_id}", response_model=KnowledgeBaseResponse)
def update_knowledge_base(kb_id: str, payload: KnowledgeBaseUpdate) -> KnowledgeBaseResponse:
    kb = store.update_knowledge_base(kb_id, payload)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    return kb


@router.delete("/knowledge-bases/{kb_id}", status_code=204)
def delete_knowledge_base(kb_id: str) -> None:
    ok = store.delete_knowledge_base(kb_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Knowledge base not found")


# Knowledge Base Document APIs
@router.get("/knowledge-bases/{kb_id}/documents", response_model=KnowledgeBaseDocumentListResponse)
def list_kb_documents(kb_id: str) -> KnowledgeBaseDocumentListResponse:
    # Verify KB exists
    kb = store.get_knowledge_base(kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    items, total = store.list_kb_documents(kb_id)
    return KnowledgeBaseDocumentListResponse(items=items, total=total)


@router.post("/knowledge-bases/{kb_id}/documents", response_model=KnowledgeBaseDocumentResponse, status_code=201)
def create_kb_document(kb_id: str, payload: KnowledgeBaseDocumentCreate) -> KnowledgeBaseDocumentResponse:
    # Verify KB exists
    kb = store.get_knowledge_base(kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    return store.create_kb_document(kb_id, payload)


@router.post("/knowledge-bases/{kb_id}/documents/delete", response_model=dict)
def delete_kb_documents(kb_id: str, payload: dict) -> dict:
    # Verify KB exists
    kb = store.get_knowledge_base(kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    doc_ids = payload.get("document_ids", [])
    deleted = store.delete_kb_documents(kb_id, doc_ids)
    return {"deleted": deleted}


# Rebuild index task
@router.post("/knowledge-bases/{kb_id}/rebuild-index", response_model=IndexTaskResponse)
def rebuild_kb_index(kb_id: str, payload: IndexTaskCreate) -> IndexTaskResponse:
    # Verify KB exists
    kb = store.get_knowledge_base(kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    
    # For P1, we just return a pending task
    # In real implementation, this would trigger async indexing
    import uuid
    task_id = str(uuid.uuid4())
    return IndexTaskResponse(
        task_id=task_id,
        status="pending",
        message=f"Index rebuild task created for knowledge base {kb_id}"
    )


# Hit Testing API
@router.post("/knowledge-bases/{kb_id}/hit-testing", response_model=HitTestResponse)
def hit_test_knowledge_base(kb_id: str, payload: HitTestRequest) -> HitTestResponse:
    # Verify KB exists
    kb = store.get_knowledge_base(kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    
    # For P1, we do a simple text-based search
    # Get all documents
    items, _ = store.list_kb_documents(kb_id)
    
    results = []
    query_lower = payload.query.lower()
    
    for doc in items:
        content = store.get_kb_document_content(kb_id, doc.id)
        if content:
            # Simple relevance scoring based on keyword matching
            content_lower = content.lower()
            query_words = payload.query.split()
            score = sum(1 for word in query_words if word.lower() in content_lower) / len(query_words)
            
            if score >= payload.threshold:
                # Extract relevant chunk (first 500 chars for now)
                chunk = content[:500] if len(content) > 500 else content
                results.append({
                    "chunk": chunk,
                    "score": score,
                    "source": doc.filename
                })
    
    # Sort by score descending and take top_k
    results.sort(key=lambda x: x["score"], reverse=True)
    results = results[:payload.top_k]
    
    return HitTestResponse(
        query=payload.query,
        results=results
    )
