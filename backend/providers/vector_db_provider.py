"""Vector DB Provider - 支持 LanceDB"""
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Optional, Tuple, Any, Dict
import os
import json


class VectorDBProvider(ABC):
    """向量数据库抽象基类"""
    
    @abstractmethod
    def create_collection(self, name: str, dimension: int) -> None:
        """创建向量集合"""
        pass
    
    @abstractmethod
    def get_collection(self, name: str) -> Any:
        """获取向量集合"""
        pass
    
    @abstractmethod
    def delete_collection(self, name: str) -> None:
        """删除向量集合"""
        pass
    
    @abstractmethod
    def add_vectors(
        self,
        collection_name: str,
        vectors: List[List[float]],
        texts: List[str],
        metadatas: Optional[List[Dict[str, Any]]] = None,
        ids: Optional[List[str]] = None
    ) -> List[str]:
        """添加向量"""
        pass
    
    @abstractmethod
    def search(
        self,
        collection_name: str,
        query_vector: List[float],
        top_k: int = 5,
        filter: Optional[str] = None
    ) -> List[Tuple[str, float, Dict[str, Any]]]:
        """搜索向量 - 返回 (text, score, metadata)"""
        pass
    
    @abstractmethod
    def delete_vectors(self, collection_name: str, ids: List[str]) -> None:
        """删除向量"""
        pass
    
    @abstractmethod
    def list_collections(self) -> List[str]:
        """列出所有集合"""
        pass


class LanceDBProvider(VectorDBProvider):
    """LanceDB 向量数据库提供商"""
    
    def __init__(self, db_path: str = "./storage/lancedb"):
        self.db_path = Path(db_path)
        self.db_path.mkdir(parents=True, exist_ok=True)
        self._client = None
        self._collections = {}
    
    def _get_client(self):
        """获取 LanceDB 客户端"""
        if self._client is None:
            try:
                import lancedb
                self._client = lancedb.connect(str(self.db_path))
            except ImportError:
                raise ImportError("lancedb 库未安装，请运行: pip install lancedb")
        return self._client
    
    def create_collection(self, name: str, dimension: int) -> None:
        """创建向量集合"""
        client = self._get_client()
        
        # 检查是否已存在
        if name in client.table_names():
            return
        
        # 创建表
        client.create_table(name, schema=self._create_schema(dimension))
    
    def _create_schema(self, dimension: int):
        """创建 LanceDB schema"""
        import lancedb
        from lancedb.schema import Vector
        
        return lancedb.schema(
            [
                lancedb.field("id", lancedb.data_types.Utf8, nullable=False),
                lancedb.field("text", lancedb.data_types.Utf8, nullable=False),
                lancedb.field("vector", lancedb.data_types.FixedSizeList(lancedb.data_types.Float32(), dimension)),
                lancedb.field("metadata", lancedb.data_types.Utf8),  # JSON 存储 metadata
            ]
        )
    
    def get_collection(self, name: str) -> Any:
        """获取向量集合"""
        if name not in self._collections:
            client = self._get_client()
            if name not in client.table_names():
                raise ValueError(f"集合 {name} 不存在")
            self._collections[name] = client.open_table(name)
        return self._collections[name]
    
    def delete_collection(self, name: str) -> None:
        """删除向量集合"""
        client = self._get_client()
        if name in client.table_names():
            client.drop_table(name)
        if name in self._collections:
            del self._collections[name]
    
    def add_vectors(
        self,
        collection_name: str,
        vectors: List[List[float]],
        texts: List[str],
        metadatas: Optional[List[Dict[str, Any]]] = None,
        ids: Optional[List[str]] = None
    ) -> List[str]:
        """添加向量"""
        # 获取或创建集合
        client = self._get_client()
        
        if collection_name not in client.table_names():
            # 自动推断维度
            dimension = len(vectors[0]) if vectors else 768
            self.create_collection(collection_name, dimension)
        
        table = self.get_collection(collection_name)
        
        # 准备数据
        import uuid
        data = []
        for i, (vector, text) in enumerate(zip(vectors, texts)):
            record_id = ids[i] if ids and i < len(ids) else str(uuid.uuid4())
            metadata = metadatas[i] if metadatas and i < len(metadatas) else {}
            
            data.append({
                "id": record_id,
                "text": text,
                "vector": vector,
                "metadata": json.dumps(metadata, ensure_ascii=False)
            })
        
        # 批量添加
        table.add(data)
        
        return [d["id"] for d in data]
    
    def search(
        self,
        collection_name: str,
        query_vector: List[float],
        top_k: int = 5,
        filter: Optional[str] = None
    ) -> List[Tuple[str, float, Dict[str, Any]]]:
        """搜索向量"""
        table = self.get_collection(collection_name)
        
        # 构建搜索参数
        search_args = {
            "vector": query_vector,
            "k": top_k,
            "columns": ["id", "text", "metadata"]
        }
        
        if filter:
            search_args["where"] = filter
        
        # 执行搜索
        results = table.search(**search_args).to_list()
        
        # 格式化结果
        formatted_results = []
        for row in results:
            metadata = {}
            if row.get("metadata"):
                try:
                    metadata = json.loads(row["metadata"])
                except json.JSONDecodeError:
                    pass
            
            formatted_results.append((
                row["text"],
                row.get("_distance", 0.0),
                metadata
            ))
        
        return formatted_results
    
    def delete_vectors(self, collection_name: str, ids: List[str]) -> None:
        """删除向量"""
        table = self.get_collection(collection_name)
        
        # LanceDB 不支持直接按 ID 删除，需要使用过滤条件
        # 这里使用简化实现：重建表
        # 注意：这在大数据量时不是最优方案
        all_data = table.to_list()
        ids_set = set(ids)
        remaining = [d for d in all_data if d["id"] not in ids_set]
        
        # 删除并重建
        self.delete_collection(collection_name)
        if remaining:
            dimension = len(remaining[0]["vector"])
            self.create_collection(collection_name, dimension)
            table = self.get_collection(collection_name)
            table.add(remaining)
    
    def list_collections(self) -> List[str]:
        """列出所有集合"""
        client = self._get_client()
        return list(client.table_names())
    
    def get_collection_info(self, collection_name: str) -> Dict[str, Any]:
        """获取集合信息"""
        table = self.get_collection(collection_name)
        count = table.count_rows()
        
        return {
            "name": collection_name,
            "count": count,
            "path": str(self.db_path / f"{collection_name}.lance")
        }


def create_vector_db_provider(
    provider_type: str = "lancedb",
    **kwargs
) -> VectorDBProvider:
    """工厂函数：创建向量数据库提供商"""
    providers = {
        "lancedb": LanceDBProvider,
    }
    
    if provider_type not in providers:
        raise ValueError(f"不支持的向量数据库: {provider_type}")
    
    return providers[provider_type](**kwargs)
