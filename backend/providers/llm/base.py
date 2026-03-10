"""LLM Provider 接口定义"""
from abc import ABC, abstractmethod
from typing import Any, Generator


class BaseLLM(ABC):
    """LLM 基类"""
    
    @abstractmethod
    def generate(self, prompt: str, **kwargs) -> str:
        """同步生成"""
        pass
    
    @abstractmethod
    def generate_stream(self, prompt: str, **kwargs) -> Generator[str, None, None]:
        """流式生成"""
        pass
    
    @abstractmethod
    def get_model_name(self) -> str:
        """获取模型名称"""
        pass
