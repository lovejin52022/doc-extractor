"""RAG Base Class - 基础 RAG 类"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple


class BaseRAG(ABC):
    """RAG 基础抽象类"""
    
    def __init__(
        self,
        vector_db: Any,
        embedding_provider: Any,
        llm_provider: Optional[Any] = None,
        top_k: int = 5,
        score_threshold: float = 0.5
    ):
        self.vector_db = vector_db
        self.embedding_provider = embedding_provider
        self.llm_provider = llm_provider
        self.top_k = top_k
        self.score_threshold = score_threshold
    
    @abstractmethod
    def retrieve(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """
        检索相关文档
        返回格式: [{"text": str, "score": float, "metadata": dict}]
        """
        pass
    
    def get_context_from_results(self, results: List[Dict[str, Any]]) -> str:
        """从检索结果构建上下文"""
        context_parts = []
        for i, result in enumerate(results, 1):
            context_parts.append(
                f"--- 文档 {i} ---\n{result.get('text', '')}"
            )
        return "\n\n".join(context_parts)
    
    def generate_with_rag(
        self,
        query: str,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        使用 RAG 生成答案
        返回: (生成的文本, 检索结果)
        """
        if not self.llm_provider:
            raise ValueError("LLM provider 未配置")
        
        # 1. 检索相关文档
        results = self.retrieve(query, **kwargs)
        
        # 2. 过滤低分结果
        filtered_results = [
            r for r in results 
            if r.get("score", 0) >= self.score_threshold
        ]
        
        # 3. 构建上下文
        context = self.get_context_from_results(filtered_results)
        
        # 4. 构建 prompt
        user_prompt = f"""请根据以下上下文回答问题。如果上下文中没有相关信息，请如实说明。

上下文：
{context}

问题：{query}

回答："""
        
        # 5. 调用 LLM 生成
        answer = self.llm_provider.generate(
            user_prompt,
            system_prompt=system_prompt or "你是一个有帮助的助手，擅长根据给定的上下文回答问题。"
        )
        
        return answer, filtered_results
    
    def retrieve_and_rerank(
        self,
        query: str,
        initial_k: int = 20,
        final_k: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        检索并重排 - 子类可以重写此方法实现重排
        """
        return self.retrieve(query, top_k=initial_k)[:final_k or self.top_k]
