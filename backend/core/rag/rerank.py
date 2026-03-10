"""ReRank - 检索结果重排"""
from typing import List, Dict, Any, Optional
from .base import BaseRAG


class ReRankRAG(BaseRAG):
    """
    ReRank RAG
    使用 LLM 对检索结果进行重排
    """
    
    def __init__(self, *args, initial_k: int = 20, **kwargs):
        super().__init__(*args, **kwargs)
        self.initial_k = initial_k
    
    def rerank(self, query: str, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """使用 LLM 对结果进行重排"""
        if not self.llm_provider:
            # 没有 LLM 时，返回原始顺序
            return results
        
        if not results:
            return results
        
        # 构建重排 prompt
        docs_text = "\n\n".join([
            f"[文档 {i+1}]\n{doc.get('text', '')[:500]}"
            for i, doc in enumerate(results)
        ])
        
        prompt = f"""请对以下文档按照与问题的相关性进行排序。
只输出排序后的文档编号，用逗号分隔（如：3,1,2）。

问题：{query}

文档：
{docs_text}

相关性排序（只输出编号）："""
        
        try:
            response = self.llm_provider.generate(prompt)
            
            # 解析响应
            ranks = []
            for part in response.replace(",", " ").split():
                try:
                    ranks.append(int(part.strip()))
                except ValueError:
                    continue
            
            # 根据排名重新排序
            reranked = []
            for rank in ranks:
                if 0 < rank <= len(results):
                    reranked.append(results[rank - 1])
            
            # 添加未在排名中的文档
            ranked_ids = set(ranked)
            for doc in results:
                if doc not in ranked_ids:
                    reranked.append(doc)
            
            return reranked
        
        except Exception as e:
            # 如果重排失败，返回原始结果
            print(f"ReRank failed: {e}")
            return results
    
    def retrieve(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """检索并重排"""
        # 1. 初始检索（获取更多结果）
        initial_k = kwargs.get("initial_k", self.initial_k)
        results = super().retrieve(query, top_k=initial_k, **kwargs)
        
        if not results:
            return []
        
        # 2. 重排
        reranked = self.rerank(query, results)
        
        # 3. 返回 top_k
        return reranked[:kwargs.get("top_k", self.top_k)]


class CrossEncoderReranker:
    """
    Cross-Encoder 重排器
    使用 Cross-Encoder 模型进行更准确的重排
    """
    
    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model_name = model_name
        self._model = None
    
    def _get_model(self):
        """获取模型"""
        if self._model is None:
            try:
                from sentence_transformers import CrossEncoder
                self._model = CrossEncoder(self.model_name)
            except ImportError:
                raise ImportError("sentence-transformers 库未安装，请运行: pip install sentence-transformers")
        return self._model
    
    def rerank(self, query: str, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """使用 Cross-Encoder 重排"""
        model = self._get_model()
        
        # 准备输入
        doc_texts = [doc.get("text", "") for doc in results]
        pairs = [(query, text) for text in doc_texts]
        
        # 获取分数
        scores = model.predict(pairs)
        
        # 按分数排序
        scored_results = [
            {**results[i], "rerank_score": float(scores[i])}
            for i in range(len(results))
        ]
        
        scored_results.sort(key=lambda x: x["rerank_score"], reverse=True)
        
        return scored_results


class LLMFilterReranker:
    """
    基于 LLM 的过滤重排器
    使用 LLM 判断文档是否与查询相关
    """
    
    def __init__(self, llm_provider: Any, relevance_threshold: float = 0.5):
        self.llm_provider = llm_provider
        self.relevance_threshold = relevance_threshold
    
    def is_relevant(self, query: str, text: str) -> float:
        """判断文档与查询的相关性分数"""
        prompt = f"""请判断以下文档与问题的相关程度。
只输出一个 0-1 之间的数字，1 表示完全相关，0 表示完全不相关。

问题：{query}

文档：{text[:500]}

相关性分数（只输出数字）："""
        
        try:
            response = self.llm_provider.generate(prompt)
            # 提取数字
            import re
            match = re.search(r'0?\.?\d+', response)
            if match:
                score = float(match.group())
                return min(1.0, max(0.0, score))
        except Exception:
            pass
        
        return self.relevance_threshold  # 默认返回阈值
    
    def rerank(self, query: str, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """使用 LLM 过滤并重排"""
        reranked = []
        
        for doc in results:
            relevance = self.is_relevant(query, doc.get("text", ""))
            doc["relevance_score"] = relevance
            
            # 只保留相关的结果
            if relevance >= self.relevance_threshold:
                reranked.append(doc)
        
        # 按相关性排序
        reranked.sort(key=lambda x: x["relevance_score"], reverse=True)
        
        return reranked
