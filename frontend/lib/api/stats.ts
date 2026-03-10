// Stats API
import { API_BASE, requestJson } from "./core";

const STATS_API_BASE = `${API_BASE}/api`;

export interface StatsSummary {
  total_documents: number;
  total_knowledge_bases: number;
  total_tags: number;
  total_extractions: number;
  storage_used_mb: number;
}

export interface DocumentStats {
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  recent_uploads: Array<{
    filename: string;
    path: string;
    size: number;
    modified: number;
  }>;
}

export interface KnowledgeBaseStats {
  by_document_count: Array<{
    name: string;
    chunk_count: number;
  }>;
  total_chunks: number;
  storage_info: {
    path: string;
    exists: boolean;
  };
}

export interface ExtractionStats {
  total: number;
  by_status: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  recent: Array<{
    task_id: string;
    status: string;
    created_at?: string;
    doc_id?: string;
  }>;
}

export interface SystemStats {
  platform: string;
  python_version: string;
  cpu_percent: number;
  memory: {
    total_mb: number;
    available_mb: number;
    percent: number;
  };
  disk: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    percent: number;
  };
}

export interface HealthStatus {
  status: string;
  timestamp: string;
}

export const statsApi = {
  // 获取统计摘要
  getSummary: () => requestJson<StatsSummary>(`${STATS_API_BASE}/stats/summary`),

  // 获取文档统计
  getDocumentStats: () =>
    requestJson<DocumentStats>(`${STATS_API_BASE}/stats/documents`),

  // 获取知识库统计
  getKnowledgeBaseStats: () =>
    requestJson<KnowledgeBaseStats>(`${STATS_API_BASE}/stats/knowledge-bases`),

  // 获取抽取统计
  getExtractionStats: () =>
    requestJson<ExtractionStats>(`${STATS_API_BASE}/stats/extractions`),

  // 获取系统统计
  getSystemStats: () => requestJson<SystemStats>(`${STATS_API_BASE}/stats/system`),

  // 健康检查
  healthCheck: () => requestJson<HealthStatus>(`${STATS_API_BASE}/stats/health`),
};
