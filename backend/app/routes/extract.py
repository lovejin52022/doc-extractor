from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.models.task import ExtractRequest, TaskResponse, TaskStatus
from app.services.extraction_service import extraction_service
from app.store import document_store, task_store

router = APIRouter()


@router.post("/extract", response_model=TaskResponse, status_code=201)
def create_extract_task(req: ExtractRequest, background_tasks: BackgroundTasks) -> TaskResponse:
    doc = document_store.get_document(req.doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    task = task_store.create(doc_id=req.doc_id, labels=req.labels)
    background_tasks.add_task(extraction_service.process_task, task.task_id)
    return task


@router.get("/extract/{task_id}", response_model=TaskResponse)
def get_extract_status(task_id: str) -> TaskResponse:
    task = task_store.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("/extract/{task_id}/status", response_model=TaskResponse)
def get_extract_status_compat(task_id: str) -> TaskResponse:
    return get_extract_status(task_id)


@router.get("/extract", response_model=list[TaskResponse])
def list_extract_tasks() -> list[TaskResponse]:
    return task_store.list_all()


@router.post("/extract/{task_id}/mock-complete", response_model=TaskResponse)
def mock_complete_task(task_id: str) -> TaskResponse:
    task = task_store.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    labels = (task.result or {}).get("labels", [])
    updated = task_store.update_status(
        task_id,
        TaskStatus.COMPLETED,
        result={
            "labels": labels,
            "extracted": {label: f"[mock] extracted value for {label}" for label in labels},
            "summary": "Mock completed",
        },
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated
