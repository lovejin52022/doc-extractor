from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ExtractRequest(BaseModel):
    doc_id: str = Field(..., description="upload 接口返回的文档 ID")
    labels: list[str] = Field(default_factory=list, description="需要抽取的标签列表")


class TaskResponse(BaseModel):
    task_id: str
    doc_id: str
    status: TaskStatus
    created_at: datetime
    updated_at: datetime
    result: dict[str, Any] | None = None
    error: str | None = None
