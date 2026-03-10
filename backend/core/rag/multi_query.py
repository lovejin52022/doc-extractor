"""Multi-Query Retrieval - 多查询检索"""
from typing import List, Dict, Any
from .base import BaseRAG


class MultiQueryRAG(BaseRAG):
    """
    Multi-Query Retrieval
    通过生成多个查询变体来提高检索召回率
    """
    
    def __init__(self, *args, num_queries: int = 3, **kwargs):
        super().__init__(*args, **kwargs)
        self.num_queries = num_queries
    
    def generate_query_variants(self, query: str) -> List[str]:
        """生成查询变体"""
        if not self.llm_provider:
            # 没有 LLM 时，返回原始查询
            return [query]
        
        prompt = f"""请为以下查询生成 {self.num_queries} 个不同的表述方式（可以是同义词、不同的问法等）。
要求：每个表述都要保持原意，但用不同的词语表达。

原始查询：{query}

请只输出表述列表，每行一个，不要有其他内容："""
        
        try:
            response = self.llm_provider.generate(prompt)
            variants = [line.strip() for line in response.strip().split("\n") if line.strip()]
            # 加上原始查询
            variants = [query] + variants[:self.num_queries]
            return variants
        except Exception:
            # 如果失败，返回原始查询
            return [query]
    
    def retrieve(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """使用多查询检索"""
        # 1. 生成查询变体
        query_variants = self.generate_query_variants(query)
        
        # 2. 对每个变体进行检索
        all_results = {}
        for q in query_variants:
            query_vector = self.embedding_provider.embed_text(q)
            results = self.vector_db.search(
                collection_name=kwargs.get("collection_name", "default"),
                query_vector=query_vector,
                top_k=kwargs.get("top_k", self.top_k),
                filter=kwargs.get("filter")
            )
            
            # 合并结果（去重并累加分数）
            for text, score, metadata in results:
                if text in all_results:
                    all_results[text]["score"] += score
                    all_results[text]["count"] += 1
                else:
                    all_results[text] = {
                        "text": text,
                        "score": score,
                        "metadata": metadata,
                        "count": 1
                    }
        
        # 3. 按分数排序并返回
        sorted_results = sorted(
            all_results.values(),
            key=lambda x: x["score"] / x.get("count", 1),
            reverse=True
        )
        
        # 4. 格式化输出
        final_results = []
        for r in sorted_results[:kwargs.get("top_k", self.top_k)]:
            final_results.append({
                "text": r["text"],
                "score": r["score"] / r.get("count", 1),
                "metadata": r["metadata"]
            })
        
        return final_results
