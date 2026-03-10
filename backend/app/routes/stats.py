"""Stats API - 统计信息"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json
from pathlib import Path

router = APIRouter()


class StatsSummary(BaseModel):
    """统计摘要"""
    total_documents: int = 0
    total_knowledge_bases: int = 0
    total_tags: int = 0
    total_extractions: int = 0
    storage_used_mb: float = 0.0


class DocumentStats(BaseModel):
    """文档统计"""
    by_status: Dict[str, int] = {}
    by_type: Dict[str, int] = {}
    recent_uploads: List[Dict[str, Any]] = []


class KnowledgeBaseStats(BaseModel):
    """知识库统计"""
    by_document_count: List[Dict[str, Any]] = []
    total_chunks: int = 0
    storage_info: Dict[str, Any] = {}


def get_storage_path() -> Path:
    """获取存储路径"""
    return Path("./storage")


def get_documents_path() -> Path:
    """获取文档存储路径"""
    return get_storage_path() / "documents"


def get_vectors_path() -> Path:
    """获取向量存储路径"""
    return get_storage_path() / "vectors"


@router.get("/summary", response_model=StatsSummary)
async def get_stats_summary():
    """获取统计摘要"""
    storage_path = get_storage_path()
    
    # 统计文档
    docs_path = get_documents_path()
    total_documents = 0
    if docs_path.exists():
        total_documents = len(list(docs_path.rglob("*.*")))
    
    # 统计知识库
    vectors_path = get_vectors_path()
    total_knowledge_bases = 0
    if vectors_path.exists():
        total_knowledge_bases = len([d for d in vectors_path.iterdir() if d.is_dir()])
    
    # 统计标签
    tags_path = storage_path / "tags.json"
    total_tags = 0
    if tags_path.exists():
        with open(tags_path, 'r', encoding='utf-8') as f:
            tags = json.load(f)
            total_tags = len(tags)
    
    # 统计抽取任务
    tasks_path = storage_path / "tasks"
    total_extractions = 0
    if tasks_path.exists():
        total_extractions = len(list(tasks_path.glob("*.json")))
    
    # 计算存储使用
    storage_used = 0.0
    for path in [docs_path, vectors_path]:
        if path.exists():
            for item in path.rglob("*"):
                if item.is_file():
                    storage_used += item.stat().st_size
    
    return StatsSummary(
        total_documents=total_documents,
        total_knowledge_bases=total_knowledge_bases,
        total_tags=total_tags,
        total_extractions=total_extractions,
        storage_used_mb=round(storage_used / (1024 * 1024), 2)
    )


@router.get("/documents", response_model=DocumentStats)
async def get_document_stats():
    """获取文档统计"""
    docs_path = get_documents_path()
    
    by_status = {
        "uploaded": 0,
        "processing": 0,
        "extracted": 0,
        "failed": 0
    }
    
    by_type = {}
    recent_uploads = []
    
    if docs_path.exists():
        files = list(docs_path.rglob("*.*"))
        
        for file in files:
            # 按类型统计
            ext = file.suffix.lower()
            by_type[ext] = by_type.get(ext, 0) + 1
            
            # 尝试读取状态
            meta_file = file.with_suffix(".meta.json")
            if meta_file.exists():
                try:
                    with open(meta_file, 'r', encoding='utf-8') as f:
                        meta = json.load(f)
                        status = meta.get("status", "uploaded")
                        by_status[status] = by_status.get(status, 0) + 1
                except Exception:
                    pass
            
            # 记录最近上传
            if len(recent_uploads) < 10:
                recent_uploads.append({
                    "filename": file.name,
                    "path": str(file),
                    "size": file.stat().st_size,
                    "modified": file.stat().st_mtime
                })
    
    # 按修改时间排序
    recent_uploads.sort(key=lambda x: x.get("modified", 0), reverse=True)
    recent_uploads = recent_uploads[:10]
    
    return DocumentStats(
        by_status=by_status,
        by_type=by_type,
        recent_uploads=recent_uploads
    )


@router.get("/knowledge-bases", response_model=KnowledgeBaseStats)
async def get_knowledge_base_stats():
    """获取知识库统计"""
    vectors_path = get_vectors_path()
    
    by_document_count = []
    total_chunks = 0
    
    if vectors_path.exists():
        for kb_dir in vectors_path.iterdir():
            if kb_dir.is_dir():
                # 统计 chunks
                chunk_count = 0
                for file in kb_dir.rglob("*.parquet"):
                    chunk_count += 1
                
                total_chunks += chunk_count
                
                by_document_count.append({
                    "name": kb_dir.name,
                    "chunk_count": chunk_count
                })
    
    # 按 chunk 数量排序
    by_document_count.sort(key=lambda x: x["chunk_count"], reverse=True)
    
    return KnowledgeBaseStats(
        by_document_count=by_document_count,
        total_chunks=total_chunks,
        storage_info={
            "path": str(vectors_path),
            "exists": vectors_path.exists()
        }
    )


@router.get("/extractions")
async def get_extraction_stats():
    """获取抽取统计"""
    storage_path = get_storage_path()
    tasks_path = storage_path / "tasks"
    
    stats = {
        "total": 0,
        "by_status": {
            "pending": 0,
            "processing": 0,
            "completed": 0,
            "failed": 0
        },
        "recent": []
    }
    
    if tasks_path.exists():
        task_files = list(tasks_path.glob("*.json"))
        stats["total"] = len(task_files)
        
        for task_file in task_files[:20]:
            try:
                with open(task_file, 'r', encoding='utf-8') as f:
                    task = json.load(f)
                    status = task.get("status", "pending")
                    stats["by_status"][status] = stats["by_status"].get(status, 0) + 1
                    
                    if len(stats["recent"]) < 10:
                        stats["recent"].append({
                            "task_id": task_file.stem,
                            "status": status,
                            "created_at": task.get("created_at"),
                            "doc_id": task.get("doc_id")
                        })
            except Exception:
                pass
    
    return stats


@router.get("/system")
async def get_system_stats():
    """获取系统级统计"""
    import platform
    import psutil
    
    return {
        "platform": platform.platform(),
        "python_version": platform.python_version(),
        "cpu_percent": psutil.cpu_percent(interval=0.1),
        "memory": {
            "total_mb": round(psutil.virtual_memory().total / (1024 * 1024), 2),
            "available_mb": round(psutil.virtual_memory().available / (1024 * 1024), 2),
            "percent": psutil.virtual_memory().percent
        },
        "disk": {
            "total_gb": round(psutil.disk_usage('/').total / (1024 ** 3), 2),
            "used_gb": round(psutil.disk_usage('/').used / (1024 ** 3), 2),
            "free_gb": round(psutil.disk_usage('/').free / (1024 ** 3), 2),
            "percent": psutil.disk_usage('/').percent
        }
    }


@router.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }
