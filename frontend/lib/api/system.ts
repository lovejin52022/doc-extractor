// System Configuration API
import { API_BASE, requestJson } from "./core";

const SYSTEM_API_BASE = `${API_BASE}/api`;

export interface SystemConfig {
  // LLM 配置
  llm_provider: string;
  llm_model: string;
  llm_base_url: string;
  
  // Embedding 配置
  embedding_provider: string;
  embedding_model: string;
  embedding_dimension: number;
  
  // Vector DB 配置
  vector_db_provider: string;
  vector_db_path: string;
  
  // 解析配置
  default_chunk_size: number;
  default_chunk_overlap: number;
  default_chunk_strategy: string;
  
  // RAG 配置
  default_top_k: number;
  default_score_threshold: number;
}

export interface SystemConfigUpdate {
  llm_provider?: string;
  llm_model?: string;
  llm_base_url?: string;
  embedding_provider?: string;
  embedding_model?: string;
  embedding_dimension?: number;
  vector_db_provider?: string;
  vector_db_path?: string;
  default_chunk_size?: number;
  default_chunk_overlap?: number;
  default_chunk_strategy?: string;
  default_top_k?: number;
  default_score_threshold?: number;
}

export interface LLMModel {
  name: string;
}

export interface LLMModelsResponse {
  provider: string;
  models: LLMModel[];
}

export interface EmbeddingModel {
  name: string;
  size?: number;
}

export interface EmbeddingModelsResponse {
  provider: string;
  models: EmbeddingModel[];
}

export interface ConfigValidationResult {
  llm: { status: string; message: string };
  embedding: { status: string; message: string };
  vector_db: { status: string; message: string };
}

export const systemApi = {
  // 获取系统配置
  getConfig: () => requestJson<SystemConfig>(`${SYSTEM_API_BASE}/config`),

  // 更新系统配置
  updateConfig: (config: SystemConfigUpdate) =>
    requestJson<{ message: string; config: SystemConfig }>(
      `${SYSTEM_API_BASE}/config`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      }
    ),

  // 重置系统配置
  resetConfig: () =>
    requestJson<{ message: string; config: SystemConfig }>(
      `${SYSTEM_API_BASE}/config/reset`,
      {
        method: "POST",
      }
    ),

  // 获取可用 LLM 模型
  listLLMModels: () =>
    requestJson<LLMModelsResponse>(`${SYSTEM_API_BASE}/config/llm/models`),

  // 获取可用 Embedding 模型
  listEmbeddingModels: () =>
    requestJson<EmbeddingModelsResponse>(
      `${SYSTEM_API_BASE}/config/embedding/models`
    ),

  // 验证配置
  validateConfig: () =>
    requestJson<ConfigValidationResult>(`${SYSTEM_API_BASE}/config/validate`),
};
