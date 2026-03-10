"""ParentDocumentRetriever - 父子文档检索"""
from typing import List, Dict, Any, Optional
from .base import BaseRAG


class ParentDocumentRAG(BaseRAG):
    """
    Parent Document Retriever
    先检索小片段，再检索对应的父文档
    """
    
    def __init__(
        self,
        *args,
        child_top_k: int = 10,
        parent_top_k: int = 3,
        **kwargs
    ):
        super().__init__(*args, **kwargs)
        self.child_top_k = child_top_k
        self.parent_top_k = parent_top_k
    
    def retrieve(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """使用父子文档检索"""
        collection_name = kwargs.get("collection_name", "default")
        child_collection = kwargs.get("child_collection", collection_name)
        parent_collection = kwargs.get("parent_collection", f"{collection_name}_parent")
        
        # 1. 检索子文档（片段）
        query_vector = self.embedding_provider.embed_text(query)
        
        child_results = self.vector_db.search(
            collection_name=child_collection,
            query_vector=query_vector,
            top_k=kwargs.get("child_top_k", self.child_top_k),
            filter=kwargs.get("filter")
        )
        
        if not child_results:
            return []
        
        # 2. 收集父文档的 ID
        parent_ids = set()
        for text, score, metadata in child_results:
            parent_id = metadata.get("parent_id") or metadata.get("doc_id")
            if parent_id:
                parent_ids.add(parent_id)
        
        # 3. 检索父文档
        # 注意：这里简化实现，实际应该从父文档表中检索
        parent_results = []
        
        # 尝试获取父文档（如果存在单独的父文档集合）
        try:
            if parent_collection != child_collection:
                parent_results = self.vector_db.search(
                    collection_name=parent_collection,
                    query_vector=query_vector,
                    top_k=kwargs.get("parent_top_k", self.parent_top_k),
                    filter=kwargs.get("filter")
                )
        except Exception:
            # 如果父文档集合不存在，使用子文档的元数据
            parent_results = child_results[:self.parent_top_k]
        
        # 4. 合并结果
        # 优先返回父文档内容
        seen_texts = set()
        final_results = []
        
        # 首先添加父文档
        for text, score, metadata in parent_results:
            if text not in seen_texts:
                seen_texts.add(text)
                final_results.append({
                    "text": text,
                    "score": score,
                    "metadata": {**metadata, "type": "parent"},
                    "is_parent": True
                })
        
        # 然后添加子文档（用于补充）
        for text, score, metadata in child_results:
            if text not in seen_texts and len(final_results) < kwargs.get("top_k", self.top_k):
                seen_texts.add(text)
                final_results.append({
                    "text": text,
                    "score": score,
                    "metadata": {**metadata, "type": "child"},
                    "is_parent": False
                })
        
        return final_results[:kwargs.get("top_k", self.top_k)]


class ParentDocumentStore:
    """
    父子文档存储管理器
    用于管理片段和父文档的对应关系
    """
    
    def __init__(self, vector_db: Any):
        self.vector_db = vector_db
    
    def add_documents(
        self,
        collection_name: str,
        parent_texts: List[str],
        child_texts: List[str],
        parent_metadatas: Optional[List[Dict]] = None,
        child_metadatas: Optional[List[Dict]] = None,
        parent_ids: Optional[List[str]] = None,
        vectors: Optional[List[List[float]]] = None,
        embedding_provider: Optional[Any] = None
    ) -> None:
        """添加文档（同时创建父子文档）"""
        import uuid
        
        parent_col = f"{collection_name}_parent"
        child_col = collection_name
        
        parent_metadatas = parent_metadatas or [{}] * len(parent_texts)
        child_metadatas = child_metadatas or [{}] * len(child_texts)
        
        # 1. 创建父文档集合并添加
        if parent_texts:
            # 获取维度
            if vectors and vectors.get("parent"):
                dim = len(vectors["parent"][0])
            else:
                dim = 768  # 默认
            
            self.vector_db.create_collection(parent_col, dim)
            
            parent_vectors = []
            if vectors and vectors.get("parent"):
                parent_vectors = vectors["parent"]
            elif embedding_provider:
                parent_vectors = embedding_provider.embed_texts(parent_texts)
            
            parent_ids_final = parent_ids or [str(uuid.uuid4()) for _ in parent_texts]
            
            self.vector_db.add_vectors(
                parent_col,
                parent_vectors,
                parent_texts,
                parent_metadatas,
                parent_ids_final
            )
        
        # 2. 创建子文档集合并添加
        if child_texts:
            if vectors and vectors.get("child"):
                dim = len(vectors["child"][0])
            else:
                dim = 768
            
            self.vector_db.create_collection(child_col, dim)
            
            child_vectors = []
            if vectors and vectors.get("child"):
                child_vectors = vectors["child"]
            elif embedding_provider:
                child_vectors = embedding_provider.embed_texts(child_texts)
            
            # 关联子文档和父文档
            child_ids = []
            for i, metadata in enumerate(child_metadatas):
                parent_idx = metadata.get("parent_index", 0)
                parent_id = parent_ids_final[parent_idx] if parent_idx < len(parent_ids_final) else None
                child_metadata = {**metadata, "parent_id": parent_id}
                child_ids.append(str(uuid.uuid4()))
            
            self.vector_db.add_vectors(
                child_col,
                child_vectors,
                child_texts,
                child_metadatas,
                child_ids
            )
