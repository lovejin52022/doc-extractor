from __future__ import annotations

import time

from app.models.task import TaskStatus
from app.store import document_store, task_store


class ExtractionService:
    """对齐参考项目的 service 思路：路由仅负责编排，核心流程在 service。"""

    @staticmethod
    def process_task(task_id: str) -> None:
        task = task_store.get(task_id)
        if task is None:
            return

        labels = (task.result or {}).get("labels", [])
        task_store.update_status(
            task_id,
            TaskStatus.PROCESSING,
            result={"labels": labels, "extracted": {}, "summary": "Parsing document..."},
        )

        # 开发阶段占位：模拟耗时解析
        time.sleep(1.2)

        doc = document_store.get(task.doc_id)
        filename = doc.filename if doc else "unknown"
        extracted = {
            label: f"{label}: extracted from {filename}"
            for label in labels
        }
        task_store.update_status(
            task_id,
            TaskStatus.COMPLETED,
            result={
                "labels": labels,
                "extracted": extracted,
                "summary": f"Successfully extracted {len(extracted)} fields",
            },
        )


extraction_service = ExtractionService()
