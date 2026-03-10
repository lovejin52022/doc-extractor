"""HyDE - Hypothesis Dense Extraction"""
from typing import List, Dict, Any
from .base import BaseRAG


class HyDERAG(BaseRAG):
    """
    HyDE (Hypothetical Document Embeddings)
    通过让 LLM 生成假设文档来改善检索
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    def generate_hypothetical_document(self, query: str) -> str:
        """生成假设文档"""
        if not self.llm_provider:
            raise ValueError("HyDE 需要 LLM provider")
        
        prompt = f"""请生成一个能够回答以下问题的理想文档。
这个文档应该是详细、完整、正确的答案。

问题：{query}

理想文档："""
        
        try:
            response = self.llm_provider.generate(prompt)
            return response
        except Exception as e:
            raise RuntimeError(f"生成假设文档失败: {str(e)}")
    
    def retrieve(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """使用 HyDE 检索"""
        # 1. 生成假设文档
        hypothetical_doc = self.generate_hypothetical_document(query)
        
        # 2. 获取假设文档的 embedding
        hypothetical_vector = self.embedding_provider.embed_text(hypothetical_doc)
        
        # 3. 检索时使用混合策略：原始查询 + 假设文档
        # 获取原始查询的向量
        query_vector = self.embedding_provider.embed_text(query)
        
        # 4. 执行两次检索
        collection_name = kwargs.get("collection_name", "default")
        
        results_from_hypothetical = self.vector_db.search(
            collection_name=collection_name,
            query_vector=hypothetical_vector,
            top_k=kwargs.get("top_k", self.top_k) * 2,
            filter=kwargs.get("filter")
        )
        
        results_from_query = self.vector_db.search(
            collection_name=collection_name,
            query_vector=query_vector,
            top_k=kwargs.get("top_k", self.top_k) * 2,
            filter=kwargs.get("filter")
        )
        
        # 5. 合并结果，使用 RRF (Reciprocal Rank Fusion)
        combined_scores = {}
        
        # 处理假设文档的结果
        for rank, (text, score, metadata) in enumerate(results_from_hypothetical, 1):
            rrf_score = 1.0 / (60 + rank)
            if text not in combined_scores:
                combined_scores[text] = {"text": text, "score": 0, "metadata": metadata}
            combined_scores[text]["score"] += rrf_score * (1 - score)  # 分数越高越好
        
        # 处理原始查询的结果
        for rank, (text, score, metadata) in enumerate(results_from_query, 1):
            rrf_score = 1.0 / (60 + rank)
            if text not in combined_scores:
                combined_scores[text] = {"text": text, "score": 0, "metadata": metadata}
            combined_scores[text]["score"] += rrf_score * (1 - score)
        
        # 6. 排序并返回
        sorted_results = sorted(
            combined_scores.values(),
            key=lambda x: x["score"],
            reverse=True
        )
        
        # 格式化输出
        final_results = []
        for r in sorted_results[:kwargs.get("top_k", self.top_k)]:
            final_results.append({
                "text": r["text"],
                "score": r["score"],
                "metadata": r["metadata"]
            })
        
        # 添加假设文档到结果中（用于调试）
        if kwargs.get("include_hypothetical", False):
            final_results.insert(0, {
                "text": hypothetical_doc,
                "score": 1.0,
                "metadata": {"type": "hypothetical"},
                "is_hypothetical": True
            })
        
        return final_results
