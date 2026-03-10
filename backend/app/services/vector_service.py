"""Vector Service - 向量存储服务"""
from typing import List, Dict, Any, Optional, Tuple
import uuid
import json
from pathlib import Path

from providers.embedding_provider import create_embedding_provider, EmbeddingProvider
from providers.vector_db_provider import create_vector_db_provider, VectorDBProvider
from app.services.document_parser import ChunkStrategy, parse_document, extract_document_metadata


class VectorService:
    """向量存储服务"""
    
    def __init__(
        self,
        embedding_provider_type: str = "ollama",
        vector_db_type: str = "lancedb",
        embedding_model: str = "nomic-embed-text",
        vector_db_path: str = "./storage/vectors",
        **provider_kwargs
    ):
        # 初始化 embedding provider
        self.embedding_provider = create_embedding_provider(
            provider_type=embedding_provider_type,
            model=embedding_model,
            **provider_kwargs
        )
        
        # 初始化 vector db
        self.vector_db = create_vector_db_provider(
            provider_type=vector_db_type,
            db_path=vector_db_path
        )
    
    def create_knowledge_base(
        self,
        kb_id: str,
        name: Optional[str] = None
    ) -> None:
        """创建知识库（向量集合）"""
        collection_name = self._get_collection_name(kb_id)
        dimension = self.embedding_provider.get_embedding_dim()
        self.vector_db.create_collection(collection_name, dimension)
    
    def delete_knowledge_base(self, kb_id: str) -> None:
        """删除知识库"""
        collection_name = self._get_collection_name(kb_id)
        self.vector_db.delete_collection(collection_name)
    
    def index_document(
        self,
        kb_id: str,
        file_path: str,
        chunk_size: int = 500,
        chunk_overlap: int = 50,
        chunk_strategy: str = "fixed"
    ) -> Dict[str, Any]:
        """索引文档"""
        # 解析文档
        text = parse_document(file_path)
        metadata = extract_document_metadata(file_path)
        
        # 分块
        if chunk_strategy == "fixed":
            chunks = ChunkStrategy.fixed_size(text, chunk_size, chunk_overlap)
        elif chunk_strategy == "paragraph":
            chunks = ChunkStrategy.by_paragraph(text, chunk_size)
        elif chunk_strategy == "recursive":
            chunks = ChunkStrategy.recursive(text, min_chunk_size=chunk_size)
        else:
            chunks = ChunkStrategy.fixed_size(text, chunk_size, chunk_overlap)
        
        # 获取 embeddings
        embeddings = self.embedding_provider.embed_texts(chunks)
        
        # 构建元数据
        doc_id = str(uuid.uuid4())
        metadatas = []
        for i in range(len(chunks)):
            metadatas.append({
                "doc_id": doc_id,
                "chunk_index": i,
                "file_name": metadata.get("file_name", ""),
                "file_path": file_path,
                "kb_id": kb_id
            })
        
        # 添加到向量数据库
        collection_name = self._get_collection_name(kb_id)
        
        # 创建集合（如果不存在）
        try:
            self.vector_db.create_collection(
                collection_name,
                self.embedding_provider.get_embedding_dim()
            )
        except Exception:
            # 集合可能已存在
            pass
        
        # 添加向量
        ids = self.vector_db.add_vectors(
            collection_name,
            embeddings,
            chunks,
            metadatas
        )
        
        return {
            "doc_id": doc_id,
            "file_name": metadata.get("file_name", ""),
            "chunk_count": len(chunks),
            "status": "indexed"
        }
    
    def index_text(
        self,
        kb_id: str,
        text: str,
        metadata: Optional[Dict[str, Any]] = None,
        chunk_size: int = 500,
        chunk_overlap: int = 50
    ) -> Dict[str, Any]:
        """索引文本内容"""
        # 分块
        chunks = ChunkStrategy.fixed_size(text, chunk_size, chunk_overlap)
        
        # 获取 embeddings
        embeddings = self.embedding_provider.embed_texts(chunks)
        
        # 构建元数据
        doc_id = str(uuid.uuid4())
        metadatas = []
        for i in range(len(chunks)):
            meta = {
                "doc_id": doc_id,
                "chunk_index": i,
                "kb_id": kb_id
            }
            if metadata:
                meta.update(metadata)
            metadatas.append(meta)
        
        # 添加到向量数据库
        collection_name = self._get_collection_name(kb_id)
        
        try:
            self.vector_db.create_collection(
                collection_name,
                self.embedding_provider.get_embedding_dim()
            )
        except Exception:
            pass
        
        ids = self.vector_db.add_vectors(
            collection_name,
            embeddings,
            chunks,
            metadatas
        )
        
        return {
            "doc_id": doc_id,
            "chunk_count": len(chunks),
            "status": "indexed"
        }
    
    def search(
        self,
        kb_id: str,
        query: str,
        top_k: int = 5,
        filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """搜索"""
        collection_name = self._get_collection_name(kb_id)
        
        # 获取查询向量
        query_vector = self.embedding_provider.embed_text(query)
        
        # 搜索
        results = self.vector_db.search(
            collection_name,
            query_vector,
            top_k,
            filter
        )
        
        # 格式化结果
        formatted_results = []
        for text, score, metadata in results:
            formatted_results.append({
                "text": text,
                "score": score,
                "metadata": metadata
            })
        
        return formatted_results
    
    def delete_document(self, kb_id: str, doc_id: str) -> None:
        """删除文档"""
        collection_name = self._get_collection_name(kb_id)
        
        # 查找该文档的所有 chunk IDs
        # 注意：这里需要根据实际实现来获取 IDs
        # 简化实现：重建集合
        try:
            collection = self.vector_db.get_collection(collection_name)
            all_data = collection.to_list()
            
            # 过滤掉要删除的文档
            remaining = [
                d for d in all_data 
                if d.get("metadata") and json.loads(d.get("metadata", "{}")).get("doc_id") != doc_id
            ]
            
            # 重建集合
            self.vector_db.delete_collection(collection_name)
            if remaining:
                self.vector_db.create_collection(
                    collection_name,
                    self.embedding_provider.get_embedding_dim()
                )
                collection = self.vector_db.get_collection(collection_name)
                collection.add(remaining)
        except Exception as e:
            print(f"Delete document error: {e}")
    
    def get_document_count(self, kb_id: str) -> int:
        """获取知识库中的文档数量"""
        collection_name = self._get_collection_name(kb_id)
        
        try:
            collection = self.vector_db.get_collection(collection_name)
            return collection.count_rows()
        except Exception:
            return 0
    
    def list_documents(self, kb_id: str) -> List[Dict[str, Any]]:
        """列出知识库中的所有文档"""
        collection_name = self._get_collection_name(kb_id)
        
        try:
            collection = self.vector_db.get_collection(collection_name)
            all_data = collection.to_list()
            
            # 按 doc_id 分组
            docs = {}
            for item in all_data:
                meta_str = item.get("metadata", "{}")
                try:
                    metadata = json.loads(meta_str) if isinstance(meta_str, str) else meta_str
                except:
                    metadata = {}
                
                doc_id = metadata.get("doc_id", "unknown")
                
                if doc_id not in docs:
                    docs[doc_id] = {
                        "doc_id": doc_id,
                        "file_name": metadata.get("file_name", "unknown"),
                        "chunk_count": 0,
                        "file_path": metadata.get("file_path", "")
                    }
                
                docs[doc_id]["chunk_count"] += 1
            
            return list(docs.values())
        except Exception:
            return []
    
    def _get_collection_name(self, kb_id: str) -> str:
        """获取集合名称"""
        return f"kb_{kb_id}"
    
    def get_stats(self, kb_id: str) -> Dict[str, Any]:
        """获取知识库统计信息"""
        collection_name = self._get_collection_name(kb_id)
        
        try:
            info = self.vector_db.get_collection_info(collection_name)
            return {
                "kb_id": kb_id,
                "total_chunks": info.get("count", 0),
                "collection_path": info.get("path", ""),
                "embedding_model": self.embedding_provider.get_model_name(),
                "embedding_dimension": self.embedding_provider.get_embedding_dim()
            }
        except Exception as e:
            return {
                "kb_id": kb_id,
                "error": str(e)
            }


# 全局实例（可选）
_global_vector_service: Optional[VectorService] = None


def get_vector_service() -> VectorService:
    """获取全局向量服务实例"""
    global _global_vector_service
    
    if _global_vector_service is None:
        _global_vector_service = VectorService()
    
    return _global_vector_service


def init_vector_service(
    embedding_provider_type: str = "ollama",
    vector_db_type: str = "lancedb",
    embedding_model: str = "nomic-embed-text",
    vector_db_path: str = "./storage/vectors",
    **kwargs
) -> VectorService:
    """初始化全局向量服务"""
    global _global_vector_service
    
    _global_vector_service = VectorService(
        embedding_provider_type=embedding_provider_type,
        vector_db_type=vector_db_type,
        embedding_model=embedding_model,
        vector_db_path=vector_db_path,
        **kwargs
    )
    
    return _global_vector_service
