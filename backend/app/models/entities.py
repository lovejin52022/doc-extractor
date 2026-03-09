from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class TagBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    description: str | None = None
    color: str | None = "#2563eb"


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=64)
    description: str | None = None
    color: str | None = None


class TagResponse(TagBase):
    id: str
    created_at: datetime
    updated_at: datetime


DocumentStatus = Literal["uploaded", "processing", "extracted", "failed"]


class DocumentResponse(BaseModel):
    id: str
    filename: str
    path: str
    status: DocumentStatus
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    items: list[DocumentResponse]
    total: int
    page: int
    page_size: int


# Knowledge Base models
class KnowledgeBaseCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: str | None = None


class KnowledgeBaseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    description: str | None = None


class KnowledgeBaseResponse(BaseModel):
    id: str
    name: str
    description: str | None
    document_count: int = 0
    created_at: datetime
    updated_at: datetime


class KnowledgeBaseListResponse(BaseModel):
    items: list[KnowledgeBaseResponse]
    total: int


# Knowledge Base Document models
class KnowledgeBaseDocumentCreate(BaseModel):
    filename: str
    file_path: str | None = None  # Optional file path
    content: str | None = None  # For text content


class KnowledgeBaseDocumentResponse(BaseModel):
    id: str
    kb_id: str
    filename: str
    chunk_count: int = 0
    status: Literal["ready", "indexing", "failed", "queued"] = "queued"
    created_at: datetime
    updated_at: datetime


class KnowledgeBaseDocumentListResponse(BaseModel):
    items: list[KnowledgeBaseDocumentResponse]
    total: int


# Hit Testing models
class HitTestRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(default=5, ge=1, le=100)
    threshold: float = Field(default=0.5, ge=0.0, le=1.0)


class HitTestChunk(BaseModel):
    chunk: str
    score: float
    source: str  # filename


class HitTestResponse(BaseModel):
    query: str
    results: list[HitTestChunk]


# Index rebuild task
class IndexTaskCreate(BaseModel):
    document_ids: list[str] | None = None  # None means rebuild all


class IndexTaskResponse(BaseModel):
    task_id: str
    status: Literal["pending", "running", "completed", "failed"]
    message: str | None = None
