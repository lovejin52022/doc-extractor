"""LLM Provider - 支持 Ollama, OpenAI, Anthropic"""
from abc import ABC, abstractmethod
from typing import Any, Generator, Optional
import os


class LLMProvider(ABC):
    """LLM 提供商抽象基类"""
    
    @abstractmethod
    def generate(self, prompt: str, **kwargs) -> str:
        """同步生成文本"""
        pass
    
    @abstractmethod
    def generate_stream(self, prompt: str, **kwargs) -> Generator[str, None, None]:
        """流式生成文本"""
        pass
    
    @abstractmethod
    def get_model_name(self) -> str:
        """获取模型名称"""
        pass
    
    @abstractmethod
    def get_provider_type(self) -> str:
        """获取提供商类型"""
        pass


class OllamaProvider(LLMProvider):
    """Ollama 本地 LLM 提供商"""
    
    def __init__(
        self,
        model: str = "llama2",
        base_url: str = "http://localhost:11434",
        timeout: int = 120
    ):
        self.model = model
        self.base_url = base_url
        self.timeout = timeout
        self._client = None
    
    def _get_client(self):
        """获取 Ollama 客户端"""
        if self._client is None:
            try:
                import requests
                self._client = requests
            except ImportError:
                raise ImportError("requests 库未安装，请运行: pip install requests")
        return self._client
    
    def generate(self, prompt: str, **kwargs) -> str:
        """同步生成文本"""
        client = self._get_client()
        url = f"{self.base_url}/api/generate"
        
        payload = {
            "model": kwargs.get("model", self.model),
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": kwargs.get("temperature", 0.7),
                "top_p": kwargs.get("top_p", 0.9),
                "num_predict": kwargs.get("max_tokens", 2048),
            }
        }
        
        try:
            response = client.post(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            result = response.json()
            return result.get("response", "")
        except Exception as e:
            raise RuntimeError(f"Ollama 生成失败: {str(e)}")
    
    def generate_stream(self, prompt: str, **kwargs) -> Generator[str, None, None]:
        """流式生成文本"""
        client = self._get_client()
        url = f"{self.base_url}/api/generate"
        
        payload = {
            "model": kwargs.get("model", self.model),
            "prompt": prompt,
            "stream": True,
            "options": {
                "temperature": kwargs.get("temperature", 0.7),
                "top_p": kwargs.get("top_p", 0.9),
                "num_predict": kwargs.get("max_tokens", 2048),
            }
        }
        
        try:
            response = client.post(url, json=payload, timeout=self.timeout, stream=True)
            response.raise_for_status()
            for line in response.iter_lines():
                if line:
                    data = line.decode('utf-8')
                    if data.startswith('data:'):
                        data = data[5:].strip()
                    if data:
                        import json
                        try:
                            chunk = json.loads(data)
                            if "response" in chunk:
                                yield chunk["response"]
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            raise RuntimeError(f"Ollama 流式生成失败: {str(e)}")
    
    def get_model_name(self) -> str:
        return self.model
    
    def get_provider_type(self) -> str:
        return "ollama"


class OpenAIProvider(LLMProvider):
    """OpenAI LLM 提供商"""
    
    def __init__(
        self,
        model: str = "gpt-3.5-turbo",
        api_key: Optional[str] = None,
        base_url: str = "https://api.openai.com/v1",
        timeout: int = 120
    ):
        self.model = model
        self.api_key = api_key or os.getenv("OPENAI_API_KEY", "")
        self.base_url = base_url
        self.timeout = timeout
        self._client = None
    
    def _get_client(self):
        """获取 OpenAI 客户端"""
        if self._client is None:
            try:
                from openai import OpenAI
                self._client = OpenAI(api_key=self.api_key, base_url=self.base_url)
            except ImportError:
                raise ImportError("openai 库未安装，请运行: pip install openai")
        return self._client
    
    def generate(self, prompt: str, **kwargs) -> str:
        """同步生成文本"""
        client = self._get_client()
        
        messages = [{"role": "user", "content": prompt}]
        if "system_prompt" in kwargs:
            messages.insert(0, {"role": "system", "content": kwargs["system_prompt"]})
        
        response = client.chat.completions.create(
            model=kwargs.get("model", self.model),
            messages=messages,
            temperature=kwargs.get("temperature", 0.7),
            max_tokens=kwargs.get("max_tokens", 2048),
            top_p=kwargs.get("top_p", 0.9),
        )
        
        return response.choices[0].message.content or ""
    
    def generate_stream(self, prompt: str, **kwargs) -> Generator[str, None, None]:
        """流式生成文本"""
        client = self._get_client()
        
        messages = [{"role": "user", "content": prompt}]
        if "system_prompt" in kwargs:
            messages.insert(0, {"role": "system", "content": kwargs["system_prompt"]})
        
        response = client.chat.completions.create(
            model=kwargs.get("model", self.model),
            messages=messages,
            temperature=kwargs.get("temperature", 0.7),
            max_tokens=kwargs.get("max_tokens", 2048),
            top_p=kwargs.get("top_p", 0.9),
            stream=True,
        )
        
        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    
    def get_model_name(self) -> str:
        return self.model
    
    def get_provider_type(self) -> str:
        return "openai"


class AnthropicProvider(LLMProvider):
    """Anthropic Claude LLM 提供商"""
    
    def __init__(
        self,
        model: str = "claude-3-haiku-20240307",
        api_key: Optional[str] = None,
        timeout: int = 120
    ):
        self.model = model
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
        self.timeout = timeout
        self._client = None
    
    def _get_client(self):
        """获取 Anthropic 客户端"""
        if self._client is None:
            try:
                from anthropic import Anthropic
                self._client = Anthropic(api_key=self.api_key)
            except ImportError:
                raise ImportError("anthropic 库未安装，请运行: pip install anthropic")
        return self._client
    
    def generate(self, prompt: str, **kwargs) -> str:
        """同步生成文本"""
        client = self._get_client()
        
        message = client.messages.create(
            model=kwargs.get("model", self.model),
            max_tokens=kwargs.get("max_tokens", 2048),
            temperature=kwargs.get("temperature", 0.7),
            messages=[{"role": "user", "content": prompt}]
        )
        
        return message.content[0].text
    
    def generate_stream(self, prompt: str, **kwargs) -> Generator[str, None, None]:
        """流式生成文本 - Anthropic 不支持流式 API"""
        # 回退到同步生成
        result = self.generate(prompt, **kwargs)
        yield result
    
    def get_model_name(self) -> str:
        return self.model
    
    def get_provider_type(self) -> str:
        return "anthropic"


def create_llm_provider(provider_type: str = "ollama", **kwargs) -> LLMProvider:
    """工厂函数：创建 LLM 提供商"""
    providers = {
        "ollama": OllamaProvider,
        "openai": OpenAIProvider,
        "anthropic": AnthropicProvider,
    }
    
    if provider_type not in providers:
        raise ValueError(f"不支持的 LLM 提供商: {provider_type}")
    
    return providers[provider_type](**kwargs)
