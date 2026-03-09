from fastapi import APIRouter, HTTPException

from app.models.task import ExtractRequest, TaskResponse, TaskStatus
from app.store import task_store

router = APIRouter()


@router.post("/extract", response_model=TaskResponse, status_code=201)
def create_extract_task(req: ExtractRequest) -> TaskResponse:
    task = task_store.create(doc_id=req.doc_id, labels=req.labels)
    return task


@router.get("/extract/{task_id}/status", response_model=TaskResponse)
def get_extract_status(task_id: str) -> TaskResponse:
    task = task_store.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("/extract", response_model=list[TaskResponse])
def list_extract_tasks() -> list[TaskResponse]:
    return task_store.list_all()


@router.post("/extract/{task_id}/mock-complete", response_model=TaskResponse)
def mock_complete_task(task_id: str) -> TaskResponse:
    """开发阶段占位：模拟任务完成，便于前端联调。"""
    task = task_store.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    labels = (task.result or {}).get("labels", [])
    mock_extracted = {label: f"[mock] extracted value for {label}" for label in labels}
    updated = task_store.update_status(
        task_id,
        TaskStatus.COMPLETED,
        result={"labels": labels, "extracted": mock_extracted},
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated
