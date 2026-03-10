"""BM25 Retrieval - 基于 Elasticsearch 的 BM25 检索"""
from typing import List, Dict, Any, Optional
from .base import BaseRAG


class BM25RAG(BaseRAG):
    """
    BM25 Retrieval
    使用 Elasticsearch 的 BM25 算法进行检索
    """
    
    def __init__(
        self,
        *args,
        es_client: Optional[Any] = None,
        index_name: str = "default",
        **kwargs
    ):
        super().__init__(*args, **kwargs)
        self.es_client = es_client
        self.index_name = index_name
        self._initialized = False
    
    def _ensure_initialized(self):
        """确保 ES 客户端已初始化"""
        if not self._initialized:
            if self.es_client is None:
                try:
                    from elasticsearch import Elasticsearch
                    # 默认连接本地 ES
                    self.es_client = Elasticsearch(["http://localhost:9200"])
                except ImportError:
                    raise ImportError("elasticsearch 库未安装，请运行: pip install elasticsearch")
            self._initialized = True
    
    def create_index(
        self,
        index_name: Optional[str] = None,
        analyzer: str = "standard"
    ) -> None:
        """创建 BM25 索引"""
        self._ensure_initialized()
        
        index = index_name or self.index_name
        
        # 检查索引是否存在
        if self.es_client.indices.exists(index=index):
            return
        
        # 创建索引配置
        settings = {
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": 0,
                "analysis": {
                    "analyzer": {
                        "default": {
                            "type": analyzer
                        }
                    }
                }
            },
            "mappings": {
                "properties": {
                    "text": {
                        "type": "text",
                        "analyzer": analyzer,
                        "term_vector": "with_positions_offsets_payloads"
                    },
                    "metadata": {
                        "type": "object",
                        "enabled": True
                    }
                }
            }
        }
        
        self.es_client.indices.create(index=index, body=settings)
    
    def index_documents(
        self,
        texts: List[str],
        metadatas: Optional[List[Dict[str, Any]]] = None,
        ids: Optional[List[str]] = None,
        index_name: Optional[str] = None
    ) -> List[str]:
        """索引文档"""
        self._ensure_initialized()
        
        index = index_name or self.index_name
        metadatas = metadatas or [{}] * len(texts)
        
        # 确保索引存在
        self.create_index(index)
        
        # 批量索引
        import uuid
        from elasticsearch.helpers import bulk
        
        actions = []
        for i, text in enumerate(texts):
            doc_id = ids[i] if ids and i < len(ids) else str(uuid.uuid4())
            action = {
                "_index": index,
                "_id": doc_id,
                "_source": {
                    "text": text,
                    "metadata": metadatas[i] if i < len(metadatas) else {}
                }
            }
            actions.append(action)
        
        success, failed = bulk(self.es_client, actions, raise_on_error=False)
        
        # 刷新索引
        self.es_client.indices.refresh(index=index)
        
        return [action["_id"] for action in actions]
    
    def retrieve(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """使用 BM25 检索"""
        self._ensure_initialized()
        
        index = kwargs.get("collection_name", self.index_name)
        top_k = kwargs.get("top_k", self.top_k)
        
        # 构建查询
        es_query = {
            "query": {
                "match": {
                    "text": query
                }
            },
            "size": top_k
        }
        
        # 添加过滤条件
        if "filter" in kwargs and kwargs["filter"]:
            # 简单实现：假设 filter 是 JSON 格式的 ES 查询
            import json
            try:
                filter_query = json.loads(kwargs["filter"])
                es_query["query"] = {
                    "bool": {
                        "must": es_query["query"],
                        "filter": filter_query
                    }
                }
            except json.JSONDecodeError:
                pass
        
        # 执行查询
        response = self.es_client.search(index=index, body=es_query)
        
        # 解析结果
        results = []
        for hit in response["hits"]["hits"]:
            results.append({
                "text": hit["_source"].get("text", ""),
                "score": hit["_score"],
                "metadata": hit["_source"].get("metadata", {}),
                "id": hit["_id"]
            })
        
        return results
    
    def delete_documents(self, ids: List[str], index_name: Optional[str] = None) -> None:
        """删除文档"""
        self._ensure_initialized()
        
        index = index_name or self.index_name
        
        for doc_id in ids:
            try:
                self.es_client.delete(index=index, id=doc_id)
            except Exception:
                pass
        
        self.es_client.indices.refresh(index=index)


class InMemoryBM25:
    """
    内存版 BM25 实现（无需 Elasticsearch）
    适用于小规模数据
    """
    
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.documents = []
        self.doc_ids = []
        self.doc_count = 0
        self.avgdl = 0
        self.doc_lengths = []
        self.doc_freqs = {}  # term -> doc frequency
        self.idf = {}  # term -> idf score
        self.term_freqs = []  # list of {term: freq}
    
    def add_documents(
        self,
        texts: List[str],
        ids: Optional[List[str]] = None,
        metadatas: Optional[List[Dict]] = None
    ) -> List[str]:
        """添加文档"""
        import uuid
        import re
        from collections import Counter
        
        ids = ids or [str(uuid.uuid4()) for _ in texts]
        metadatas = metadatas or [{}] * len(texts)
        
        for i, text in enumerate(texts):
            # 分词
            terms = re.findall(r'\w+', text.lower())
            tf = Counter(terms)
            self.term_freqs.append(tf)
            
            self.doc_lengths.append(len(terms))
            self.doc_ids.append(ids[i])
            self.documents.append({
                "id": ids[i],
                "text": text,
                "metadata": metadatas[i]
            })
            
            # 更新文档频率
            for term in set(terms):
                self.doc_freqs[term] = self.doc_freqs.get(term, 0) + 1
        
        self.doc_count = len(self.documents)
        self.avgdl = sum(self.doc_lengths) / self.doc_count if self.doc_count > 0 else 0
        
        # 计算 IDF
        for term, df in self.doc_freqs.items():
            self.idf[term] = max(0, (self.doc_count - df + 0.5) / (df + 0.5))
        
        return ids
    
    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """搜索"""
        import re
        from math import log
        
        # 分词
        query_terms = re.findall(r'\w+', query.lower())
        
        if not query_terms:
            return []
        
        scores = []
        
        for i, doc in enumerate(self.documents):
            score = 0.0
            dl = self.doc_lengths[i]
            
            for term in query_terms:
                tf = self.term_freqs[i].get(term, 0)
                
                if tf > 0:
                    # BM25 公式
                    idf = self.idf.get(term, 0)
                    numerator = tf * (self.k1 + 1)
                    denominator = tf + self.k1 * (1 - self.b + self.b * dl / self.avgdl)
                    score += idf * numerator / denominator
            
            scores.append({
                "id": doc["id"],
                "text": doc["text"],
                "score": score,
                "metadata": doc["metadata"]
            })
        
        # 排序
        scores.sort(key=lambda x: x["score"], reverse=True)
        
        return scores[:top_k]
    
    def delete_documents(self, ids: List[str]) -> None:
        """删除文档"""
        ids_set = set(ids)
        indices_to_remove = []
        
        for i, doc_id in enumerate(self.doc_ids):
            if doc_id in ids_set:
                indices_to_remove.append(i)
        
        # 逆序删除（保持索引正确）
        for i in reversed(indices_to_remove):
            self.doc_ids.pop(i)
            self.documents.pop(i)
            self.doc_lengths.pop(i)
            self.term_freqs.pop(i)
        
        self.doc_count = len(self.documents)
        
        # 重新计算 IDF（简化处理）
        self.doc_freqs.clear()
        for tf in self.term_freqs:
            for term in set(tf.keys()):
                self.doc_freqs[term] = self.doc_freqs.get(term, 0) + 1
        
        for term, df in self.doc_freqs.items():
            self.idf[term] = max(0, (self.doc_count - df + 0.5) / (df + 0.5))
