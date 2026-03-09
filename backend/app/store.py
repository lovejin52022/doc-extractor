"""线程安全的内存态存储（任务 + 文档元信息）。后续可替换为数据库。"""

from __future__ import annotations

import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.models.task import TaskResponse, TaskStatus


@dataclass
class DocumentMeta:
    doc_id: str
    filename: str
    path: str
    uploaded_at: datetime


class DocumentStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._docs: dict[str, DocumentMeta] = {}

    def create(self, *, filename: str, path: str) -> DocumentMeta:
        doc = DocumentMeta(
            doc_id=str(uuid4()),
            filename=filename,
            path=path,
            uploaded_at=datetime.now(timezone.utc),
        )
        with self._lock:
            self._docs[doc.doc_id] = doc
        return doc

    def get(self, doc_id: str) -> DocumentMeta | None:
        with self._lock:
            return self._docs.get(doc_id)


class TaskStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._tasks: dict[str, TaskResponse] = {}

    def create(self, doc_id: str, labels: list[str]) -> TaskResponse:
        now = datetime.now(timezone.utc)
        task = TaskResponse(
            task_id=str(uuid4()),
            doc_id=doc_id,
            status=TaskStatus.PENDING,
            created_at=now,
            updated_at=now,
            result={"labels": labels, "extracted": {}, "summary": "Task created"},
        )
        with self._lock:
            self._tasks[task.task_id] = task
        return task

    def get(self, task_id: str) -> TaskResponse | None:
        with self._lock:
            return self._tasks.get(task_id)

    def update_status(
        self,
        task_id: str,
        status: TaskStatus,
        *,
        result: dict[str, Any] | None = None,
        error: str | None = None,
    ) -> TaskResponse | None:
        with self._lock:
            task = self._tasks.get(task_id)
            if task is None:
                return None
            task = task.model_copy(
                update={
                    "status": status,
                    "updated_at": datetime.now(timezone.utc),
                    **({"result": result} if result is not None else {}),
                    "error": error,
                }
            )
            self._tasks[task_id] = task
            return task

    def list_all(self) -> list[TaskResponse]:
        with self._lock:
            return list(self._tasks.values())


document_store = DocumentStore()
task_store = TaskStore()
