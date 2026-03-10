"""Embedding Provider - 支持 Ollama, OpenAI"""
from abc import ABC, abstractmethod
from typing import List, Optional, Union
import os
import numpy as np


class EmbeddingProvider(ABC):
    """Embedding 提供商抽象基类"""
    
    @abstractmethod
    def embed_text(self, text: str) -> List[float]:
        """获取单文本的 embedding"""
        pass
    
    @abstractmethod
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """批量获取文本的 embeddings"""
        pass
    
    @abstractmethod
    def get_model_name(self) -> str:
        """获取模型名称"""
        pass
    
    @abstractmethod
    def get_embedding_dim(self) -> int:
        """获取 embedding 维度"""
        pass
    
    @abstractmethod
    def get_provider_type(self) -> str:
        """获取提供商类型"""
        pass


class OllamaEmbeddingProvider(EmbeddingProvider):
    """Ollama Embedding 提供商"""
    
    def __init__(
        self,
        model: str = "nomic-embed-text",
        base_url: str = "http://localhost:11434",
        timeout: int = 60
    ):
        self.model = model
        self.base_url = base_url
        self.timeout = timeout
        self._embedding_dim = None
        self._client = None
    
    def _get_client(self):
        if self._client is None:
            try:
                import requests
                self._client = requests
            except ImportError:
                raise ImportError("requests 库未安装，请运行: pip install requests")
        return self._client
    
    def embed_text(self, text: str) -> List[float]:
        """获取单文本的 embedding"""
        return self.embed_texts([text])[0]
    
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """批量获取文本的 embeddings"""
        client = self._get_client()
        url = f"{self.base_url}/api/embeddings"
        
        embeddings = []
        for text in texts:
            try:
                response = client.post(
                    url,
                    json={"model": self.model, "prompt": text},
                    timeout=self.timeout
                )
                response.raise_for_status()
                result = response.json()
                embeddings.append(result.get("embedding", []))
            except Exception as e:
                raise RuntimeError(f"Ollama Embedding 失败: {str(e)}")
        
        return embeddings
    
    def get_model_name(self) -> str:
        return self.model
    
    def get_embedding_dim(self) -> int:
        """获取 embedding 维度 - 需要实际调用一次来确认"""
        if self._embedding_dim is None:
            try:
                embedding = self.embed_text("test")
                self._embedding_dim = len(embedding)
            except Exception:
                # 默认值
                self._embedding_dim = 768
        return self._embedding_dim
    
    def get_provider_type(self) -> str:
        return "ollama"


class OpenAIEmbeddingProvider(EmbeddingProvider):
    """OpenAI Embedding 提供商"""
    
    def __init__(
        self,
        model: str = "text-embedding-3-small",
        api_key: Optional[str] = None,
        base_url: str = "https://api.openai.com/v1",
        timeout: int = 60
    ):
        self.model = model
        self.api_key = api_key or os.getenv("OPENAI_API_KEY", "")
        self.base_url = base_url
        self.timeout = timeout
        self._client = None
        # 根据模型设置默认维度
        self._embedding_dim = 1536 if "3-small" in model else 3072
    
    def _get_client(self):
        if self._client is None:
            try:
                from openai import OpenAI
                self._client = OpenAI(api_key=self.api_key, base_url=self.base_url)
            except ImportError:
                raise ImportError("openai 库未安装，请运行: pip install openai")
        return self._client
    
    def embed_text(self, text: str) -> List[float]:
        """获取单文本的 embedding"""
        return self.embed_texts([text])[0]
    
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """批量获取文本的 embeddings"""
        client = self._get_client()
        
        # OpenAI API 限制每次最多 100 条
        all_embeddings = []
        for i in range(0, len(texts), 100):
            batch = texts[i:i + 100]
            try:
                response = client.embeddings.create(
                    model=self.model,
                    input=batch
                )
                for item in response.data:
                    all_embeddings.append(item.embedding)
            except Exception as e:
                raise RuntimeError(f"OpenAI Embedding 失败: {str(e)}")
        
        return all_embeddings
    
    def get_model_name(self) -> str:
        return self.model
    
    def get_embedding_dim(self) -> int:
        return self._embedding_dim
    
    def get_provider_type(self) -> str:
        return "openai"


def create_embedding_provider(provider_type: str = "ollama", **kwargs) -> EmbeddingProvider:
    """工厂函数：创建 Embedding 提供商"""
    providers = {
        "ollama": OllamaEmbeddingProvider,
        "openai": OpenAIEmbeddingProvider,
    }
    
    if provider_type not in providers:
        raise ValueError(f"不支持的 Embedding 提供商: {provider_type}")
    
    return providers[provider_type](**kwargs)
