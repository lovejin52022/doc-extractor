from __future__ import annotations

import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.models.entities import (
    DocumentResponse,
    KnowledgeBaseCreate,
    KnowledgeBaseDocumentCreate,
    KnowledgeBaseDocumentResponse,
    KnowledgeBaseResponse,
    KnowledgeBaseUpdate,
    TagCreate,
    TagResponse,
    TagUpdate,
)
from app.models.task import TaskResponse, TaskStatus

ROOT_DIR = Path(__file__).resolve().parents[2]
DB_PATH = ROOT_DIR / "storage" / "doc_extractor.db"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class SQLiteStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._conn() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS tags (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    color TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    path TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS tasks (
                    task_id TEXT PRIMARY KEY,
                    doc_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    labels_json TEXT NOT NULL,
                    result_json TEXT,
                    error TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (doc_id) REFERENCES documents(id)
                );
                CREATE TABLE IF NOT EXISTS knowledge_bases (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS kb_documents (
                    id TEXT PRIMARY KEY,
                    kb_id TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    content TEXT,
                    chunk_count INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'queued',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (kb_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE
                );
                """
            )

    # tags
    def list_tags(self) -> list[TagResponse]:
        with self._conn() as conn:
            rows = conn.execute("SELECT * FROM tags ORDER BY created_at DESC").fetchall()
        return [TagResponse(**dict(r)) for r in rows]

    def create_tag(self, payload: TagCreate) -> TagResponse:
        now = _utc_now()
        tag = TagResponse(id=str(uuid4()), created_at=now, updated_at=now, **payload.model_dump())
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO tags(id,name,description,color,created_at,updated_at) VALUES(?,?,?,?,?,?)",
                (tag.id, tag.name, tag.description, tag.color, tag.created_at, tag.updated_at),
            )
        return tag

    def get_tag(self, tag_id: str) -> TagResponse | None:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM tags WHERE id=?", (tag_id,)).fetchone()
        return TagResponse(**dict(row)) if row else None

    def update_tag(self, tag_id: str, payload: TagUpdate) -> TagResponse | None:
        current = self.get_tag(tag_id)
        if not current:
            return None
        merged = current.model_copy(update={**payload.model_dump(exclude_unset=True), "updated_at": _utc_now()})
        with self._conn() as conn:
            conn.execute(
                "UPDATE tags SET name=?,description=?,color=?,updated_at=? WHERE id=?",
                (merged.name, merged.description, merged.color, merged.updated_at, tag_id),
            )
        return merged

    def delete_tag(self, tag_id: str) -> bool:
        with self._conn() as conn:
            cur = conn.execute("DELETE FROM tags WHERE id=?", (tag_id,))
        return cur.rowcount > 0

    # documents
    def create_document(self, *, filename: str, path: str) -> DocumentResponse:
        now = _utc_now()
        doc = DocumentResponse(
            id=str(uuid4()), filename=filename, path=path, status="uploaded", created_at=now, updated_at=now
        )
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO documents(id,filename,path,status,created_at,updated_at) VALUES(?,?,?,?,?,?)",
                (doc.id, doc.filename, doc.path, doc.status, doc.created_at, doc.updated_at),
            )
        return doc

    def update_document(self, doc_id: str, *, path: str | None = None, status: str | None = None) -> DocumentResponse | None:
        doc = self.get_document(doc_id)
        if not doc:
            return None
        merged = doc.model_copy(update={"updated_at": _utc_now(), **({"path": path} if path is not None else {}), **({"status": status} if status else {})})
        with self._conn() as conn:
            conn.execute(
                "UPDATE documents SET path=?,status=?,updated_at=? WHERE id=?",
                (merged.path, merged.status, merged.updated_at, doc_id),
            )
        return merged

    def get_document(self, doc_id: str) -> DocumentResponse | None:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM documents WHERE id=?", (doc_id,)).fetchone()
        return DocumentResponse(**dict(row)) if row else None

    def list_documents(self, *, page: int, page_size: int, status: str | None, keyword: str | None) -> tuple[list[DocumentResponse], int]:
        where = []
        args: list[Any] = []
        if status:
            where.append("status=?")
            args.append(status)
        if keyword:
            where.append("filename LIKE ?")
            args.append(f"%{keyword}%")
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        offset = (page - 1) * page_size
        with self._conn() as conn:
            total = conn.execute(f"SELECT COUNT(*) FROM documents {where_sql}", args).fetchone()[0]
            rows = conn.execute(
                f"SELECT * FROM documents {where_sql} ORDER BY created_at DESC LIMIT ? OFFSET ?",
                [*args, page_size, offset],
            ).fetchall()
        return [DocumentResponse(**dict(r)) for r in rows], total

    def delete_document(self, doc_id: str) -> bool:
        with self._conn() as conn:
            conn.execute("DELETE FROM tasks WHERE doc_id=?", (doc_id,))
            cur = conn.execute("DELETE FROM documents WHERE id=?", (doc_id,))
        return cur.rowcount > 0

    # Knowledge Base operations
    def create_knowledge_base(self, payload: KnowledgeBaseCreate) -> KnowledgeBaseResponse:
        now = _utc_now()
        kb = KnowledgeBaseResponse(
            id=str(uuid4()),
            name=payload.name,
            description=payload.description,
            document_count=0,
            created_at=now,
            updated_at=now,
        )
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO knowledge_bases(id,name,description,created_at,updated_at) VALUES(?,?,?,?,?)",
                (kb.id, kb.name, kb.description, kb.created_at, kb.updated_at),
            )
        return kb

    def list_knowledge_bases(self) -> list[KnowledgeBaseResponse]:
        with self._conn() as conn:
            rows = conn.execute("SELECT * FROM knowledge_bases ORDER BY created_at DESC").fetchall()
        results = []
        for row in rows:
            kb = KnowledgeBaseResponse(**dict(row))
            # Get document count
            count_row = conn.execute("SELECT COUNT(*) as cnt FROM kb_documents WHERE kb_id=?", (kb.id,)).fetchone()
            kb.document_count = count_row["cnt"] if count_row else 0
            results.append(kb)
        return results

    def get_knowledge_base(self, kb_id: str) -> KnowledgeBaseResponse | None:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM knowledge_bases WHERE id=?", (kb_id,)).fetchone()
        if not row:
            return None
        kb = KnowledgeBaseResponse(**dict(row))
        count_row = conn.execute("SELECT COUNT(*) as cnt FROM kb_documents WHERE kb_id=?", (kb_id,)).fetchone()
        kb.document_count = count_row["cnt"] if count_row else 0
        return kb

    def update_knowledge_base(self, kb_id: str, payload: KnowledgeBaseUpdate) -> KnowledgeBaseResponse | None:
        current = self.get_knowledge_base(kb_id)
        if not current:
            return None
        merged = current.model_copy(update={**payload.model_dump(exclude_unset=True), "updated_at": _utc_now()})
        with self._conn() as conn:
            conn.execute(
                "UPDATE knowledge_bases SET name=?,description=?,updated_at=? WHERE id=?",
                (merged.name, merged.description, merged.updated_at, kb_id),
            )
        return merged

    def delete_knowledge_base(self, kb_id: str) -> bool:
        with self._conn() as conn:
            conn.execute("DELETE FROM kb_documents WHERE kb_id=?", (kb_id,))
            cur = conn.execute("DELETE FROM knowledge_bases WHERE id=?", (kb_id,))
        return cur.rowcount > 0

    # KB Document operations
    def create_kb_document(self, kb_id: str, payload: KnowledgeBaseDocumentCreate) -> KnowledgeBaseDocumentResponse:
        now = _utc_now()
        doc = KnowledgeBaseDocumentResponse(
            id=str(uuid4()),
            kb_id=kb_id,
            filename=payload.filename,
            chunk_count=0,
            status="queued",
            created_at=now,
            updated_at=now,
        )
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO kb_documents(id,kb_id,filename,content,chunk_count,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
                (doc.id, doc.kb_id, doc.filename, payload.content, doc.chunk_count, doc.status, doc.created_at, doc.updated_at),
            )
        return doc

    def list_kb_documents(self, kb_id: str) -> tuple[list[KnowledgeBaseDocumentResponse], int]:
        with self._conn() as conn:
            total = conn.execute("SELECT COUNT(*) FROM kb_documents WHERE kb_id=?", (kb_id,)).fetchone()[0]
            rows = conn.execute("SELECT * FROM kb_documents WHERE kb_id=? ORDER BY created_at DESC", (kb_id,)).fetchall()
        return [KnowledgeBaseDocumentResponse(**dict(r)) for r in rows], total

    def get_kb_document(self, kb_id: str, doc_id: str) -> KnowledgeBaseDocumentResponse | None:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM kb_documents WHERE id=? AND kb_id=?", (doc_id, kb_id)).fetchone()
        return KnowledgeBaseDocumentResponse(**dict(row)) if row else None

    def update_kb_document(self, kb_id: str, doc_id: str, *, chunk_count: int | None = None, status: str | None = None) -> KnowledgeBaseDocumentResponse | None:
        doc = self.get_kb_document(kb_id, doc_id)
        if not doc:
            return None
        update_data = {"updated_at": _utc_now()}
        if chunk_count is not None:
            update_data["chunk_count"] = chunk_count
        if status is not None:
            update_data["status"] = status
        merged = doc.model_copy(update=update_data)
        with self._conn() as conn:
            conn.execute(
                "UPDATE kb_documents SET chunk_count=?,status=?,updated_at=? WHERE id=? AND kb_id=?",
                (merged.chunk_count, merged.status, merged.updated_at, doc_id, kb_id),
            )
        return merged

    def delete_kb_documents(self, kb_id: str, doc_ids: list[str]) -> int:
        if not doc_ids:
            return 0
        placeholders = ",".join("?" * len(doc_ids))
        with self._conn() as conn:
            cur = conn.execute(f"DELETE FROM kb_documents WHERE kb_id=? AND id IN ({placeholders})", [kb_id, *doc_ids])
        return cur.rowcount

    def get_kb_document_content(self, kb_id: str, doc_id: str) -> str | None:
        with self._conn() as conn:
            row = conn.execute("SELECT content FROM kb_documents WHERE id=? AND kb_id=?", (doc_id, kb_id)).fetchone()
        return row["content"] if row else None


import json


class TaskStore:
    def create(self, doc_id: str, labels: list[str]) -> TaskResponse:
        now = _utc_now()
        task = TaskResponse(
            task_id=str(uuid4()),
            doc_id=doc_id,
            status=TaskStatus.PENDING,
            created_at=now,
            updated_at=now,
            result={"labels": labels, "extracted": {}, "summary": "Task created"},
        )
        with store._conn() as conn:
            conn.execute(
                "INSERT INTO tasks(task_id,doc_id,status,labels_json,result_json,error,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
                (
                    task.task_id,
                    task.doc_id,
                    task.status,
                    json.dumps(labels, ensure_ascii=False),
                    json.dumps(task.result, ensure_ascii=False),
                    None,
                    task.created_at,
                    task.updated_at,
                ),
            )
        return task

    def get(self, task_id: str) -> TaskResponse | None:
        with store._conn() as conn:
            row = conn.execute("SELECT * FROM tasks WHERE task_id=?", (task_id,)).fetchone()
        if not row:
            return None
        data = dict(row)
        data["result"] = json.loads(data["result_json"]) if data.get("result_json") else None
        return TaskResponse(
            task_id=data["task_id"],
            doc_id=data["doc_id"],
            status=data["status"],
            created_at=data["created_at"],
            updated_at=data["updated_at"],
            result=data["result"],
            error=data.get("error"),
        )

    def update_status(self, task_id: str, status: TaskStatus, *, result: dict[str, Any] | None = None, error: str | None = None) -> TaskResponse | None:
        task = self.get(task_id)
        if not task:
            return None
        merged = task.model_copy(update={"status": status, "updated_at": _utc_now(), "result": result if result is not None else task.result, "error": error})
        with store._conn() as conn:
            conn.execute(
                "UPDATE tasks SET status=?,result_json=?,error=?,updated_at=? WHERE task_id=?",
                (merged.status, json.dumps(merged.result, ensure_ascii=False) if merged.result is not None else None, merged.error, merged.updated_at, task_id),
            )
        return merged

    def list_all(self) -> list[TaskResponse]:
        with store._conn() as conn:
            rows = conn.execute("SELECT task_id FROM tasks ORDER BY created_at DESC").fetchall()
        return [self.get(r["task_id"]) for r in rows if self.get(r["task_id"]) is not None]


store = SQLiteStore()
document_store = store
task_store = TaskStore()
