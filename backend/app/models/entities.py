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
