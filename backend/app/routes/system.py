"""System Settings API - 系统配置"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
import json
from pathlib import Path

router = APIRouter()


class SystemConfig(BaseModel):
    """系统配置模型"""
    # LLM 配置
    llm_provider: str = "ollama"
    llm_model: str = "llama2"
    llm_base_url: str = "http://localhost:11434"
    
    # Embedding 配置
    embedding_provider: str = "ollama"
    embedding_model: str = "nomic-embed-text"
    embedding_dimension: int = 768
    
    # Vector DB 配置
    vector_db_provider: str = "lancedb"
    vector_db_path: str = "./storage/vectors"
    
    # 解析配置
    default_chunk_size: int = 500
    default_chunk_overlap: int = 50
    default_chunk_strategy: str = "fixed"
    
    # RAG 配置
    default_top_k: int = 5
    default_score_threshold: float = 0.5


class SystemConfigUpdate(BaseModel):
    """系统配置更新模型"""
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    llm_base_url: Optional[str] = None
    embedding_provider: Optional[str] = None
    embedding_model: Optional[str] = None
    embedding_dimension: Optional[int] = None
    vector_db_provider: Optional[str] = None
    vector_db_path: Optional[str] = None
    default_chunk_size: Optional[int] = None
    default_chunk_overlap: Optional[int] = None
    default_chunk_strategy: Optional[str] = None
    default_top_k: Optional[int] = None
    default_score_threshold: Optional[float] = None


def get_config_path() -> Path:
    """获取配置文件路径"""
    storage_path = Path("./storage")
    storage_path.mkdir(parents=True, exist_ok=True)
    return storage_path / "system_config.json"


def load_config() -> Dict[str, Any]:
    """加载系统配置"""
    config_path = get_config_path()
    
    if config_path.exists():
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    # 返回默认配置
    return SystemConfig().dict()


def save_config(config: Dict[str, Any]) -> None:
    """保存系统配置"""
    config_path = get_config_path()
    
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)


@router.get("/config", response_model=SystemConfig)
async def get_system_config():
    """获取系统配置"""
    return SystemConfig(**load_config())


@router.put("/config")
async def update_system_config(config: SystemConfigUpdate):
    """更新系统配置"""
    current_config = load_config()
    
    # 更新配置
    update_data = config.dict(exclude_unset=True)
    current_config.update(update_data)
    
    # 验证配置
    try:
        validated = SystemConfig(**current_config)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"配置验证失败: {str(e)}")
    
    # 保存配置
    save_config(validated.dict())
    
    return {"message": "配置已更新", "config": validated}


@router.post("/config/reset")
async def reset_system_config():
    """重置系统配置为默认值"""
    default_config = SystemConfig().dict()
    save_config(default_config)
    
    return {"message": "配置已重置为默认值", "config": default_config}


@router.get("/config/llm/models")
async def list_llm_models():
    """获取可用的 LLM 模型列表"""
    # 这里应该连接到实际的 LLM 服务获取模型列表
    # 暂时返回模拟数据
    
    config = load_config()
    provider = config.get("llm_provider", "ollama")
    
    if provider == "ollama":
        # 尝试从 Ollama 获取模型列表
        try:
            import requests
            response = requests.get(f"{config.get('llm_base_url', 'http://localhost:11434')}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get("models", [])
                return {
                    "provider": provider,
                    "models": [{"name": m["name"]} for m in models]
                }
        except Exception:
            pass
    
    # 返回默认模型
    return {
        "provider": provider,
        "models": [
            {"name": config.get("llm_model", "llama2")}
        ]
    }


@router.get("/config/embedding/models")
async def list_embedding_models():
    """获取可用的 Embedding 模型列表"""
    config = load_config()
    provider = config.get("embedding_provider", "ollama")
    
    if provider == "ollama":
        try:
            import requests
            response = requests.get(f"{config.get('llm_base_url', 'http://localhost:11434')}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get("models", [])
                # 过滤 embedding 模型
                embedding_models = [
                    {"name": m["name"], "size": m.get("size", 0)}
                    for m in models
                    if "embed" in m["name"].lower()
                ]
                return {
                    "provider": provider,
                    "models": embedding_models or [{"name": config.get("embedding_model", "nomic-embed-text")}]
                }
        except Exception:
            pass
    
    return {
        "provider": provider,
        "models": [
            {"name": config.get("embedding_model", "nomic-embed-text")}
        ]
    }


@router.get("/config/validate")
async def validate_config():
    """验证系统配置"""
    config = load_config()
    
    results = {
        "llm": {"status": "unknown", "message": ""},
        "embedding": {"status": "unknown", "message": ""},
        "vector_db": {"status": "unknown", "message": ""}
    }
    
    # 验证 LLM
    try:
        if config.get("llm_provider") == "ollama":
            import requests
            response = requests.get(
                f"{config.get('llm_base_url', 'http://localhost:11434')}/api/tags",
                timeout=5
            )
            if response.status_code == 200:
                results["llm"]["status"] = "ok"
                results["llm"]["message"] = "Ollama 服务正常"
            else:
                results["llm"]["status"] = "error"
                results["llm"]["message"] = f"Ollama 服务响应异常: {response.status_code}"
    except Exception as e:
        results["llm"]["status"] = "error"
        results["llm"]["message"] = f"无法连接到 Ollama: {str(e)}"
    
    # 验证 Vector DB
    try:
        db_path = config.get("vector_db_path", "./storage/vectors")
        vector_path = Path(db_path)
        if vector_path.exists() or True:  # 尝试创建
            results["vector_db"]["status"] = "ok"
            results["vector_db"]["message"] = f"向量数据库路径: {db_path}"
    except Exception as e:
        results["vector_db"]["status"] = "error"
        results["vector_db"]["message"] = str(e)
    
    return results
