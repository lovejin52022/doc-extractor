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


# System Configuration models
class SystemConfigBase(BaseModel):
    """系统配置基础模型"""
    llm_provider: str = "ollama"
    llm_model: str = "llama2"
    llm_base_url: str = "http://localhost:11434"
    embedding_provider: str = "ollama"
    embedding_model: str = "nomic-embed-text"
    embedding_dimension: int = 768
    vector_db_provider: str = "lancedb"
    vector_db_path: str = "./storage/vectors"
    default_chunk_size: int = 500
    default_chunk_overlap: int = 50
    default_chunk_strategy: str = "fixed"
    default_top_k: int = 5
    default_score_threshold: float = 0.5


class SystemConfigResponse(SystemConfigBase):
    """系统配置响应模型"""
    pass


class SystemConfigUpdate(BaseModel):
    """系统配置更新模型"""
    llm_provider: str | None = None
    llm_model: str | None = None
    llm_base_url: str | None = None
    embedding_provider: str | None = None
    embedding_model: str | None = None
    embedding_dimension: int | None = None
    vector_db_provider: str | None = None
    vector_db_path: str | None = None
    default_chunk_size: int | None = None
    default_chunk_overlap: int | None = None
    default_chunk_strategy: str | None = None
    default_top_k: int | None = None
    default_score_threshold: float | None = None


# Stats models
class StatsSummary(BaseModel):
    """统计摘要"""
    total_documents: int = 0
    total_knowledge_bases: int = 0
    total_tags: int = 0
    total_extractions: int = 0
    storage_used_mb: float = 0.0


class DocumentStats(BaseModel):
    """文档统计"""
    by_status: dict[str, int] = {}
    by_type: dict[str, int] = {}
    recent_uploads: list[dict[str, Any]] = []


class KnowledgeBaseStats(BaseModel):
    """知识库统计"""
    by_document_count: list[dict[str, Any]] = []
    total_chunks: int = 0
    storage_info: dict[str, Any] = {}


class ExtractionStats(BaseModel):
    """抽取统计"""
    total: int = 0
    by_status: dict[str, int] = {}
    recent: list[dict[str, Any]] = []


class SystemStats(BaseModel):
    """系统级统计"""
    platform: str = ""
    python_version: str = ""
    cpu_percent: float = 0.0
    memory: dict[str, Any] = {}
    disk: dict[str, Any] = {}
