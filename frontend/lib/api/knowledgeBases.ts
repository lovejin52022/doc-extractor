// Knowledge Base API
import { requestJson } from "./core";

export interface KnowledgeBaseItem {
  id: string;
  name: string;
  description: string | null;
  document_count: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBaseListResponse {
  items: KnowledgeBaseItem[];
  total: number;
}

export interface KnowledgeBaseCreate {
  name: string;
  description?: string;
}

export interface KnowledgeBaseUpdate {
  name?: string;
  description?: string;
}

export type KnowledgeDocumentStatus = "ready" | "indexing" | "failed" | "queued";

export interface KnowledgeDocument {
  id: string;
  kb_id: string;
  filename: string;
  chunk_count: number;
  status: KnowledgeDocumentStatus;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeDocumentListResponse {
  items: KnowledgeDocument[];
  total: number;
}

export interface KnowledgeDocumentCreate {
  filename: string;
  file_path?: string;
  content?: string;
}

export interface HitTestRequest {
  query: string;
  top_k: number;
  threshold: number;
}

export interface HitTestChunk {
  chunk: string;
  score: number;
  source: string;
}

export interface HitTestResponse {
  query: string;
  results: HitTestChunk[];
}

export interface IndexTaskResponse {
  task_id: string;
  status: "pending" | "running" | "completed" | "failed";
  message?: string;
}

const API_BASE = "/api";

export const knowledgeBaseApi = {
  // List all knowledge bases
  list: () => requestJson<KnowledgeBaseListResponse>(`${API_BASE}/knowledge-bases`),

  // Create a new knowledge base
  create: (data: KnowledgeBaseCreate) =>
    requestJson<KnowledgeBaseItem>(`${API_BASE}/knowledge-bases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  // Get a knowledge base by ID
  get: (id: string) =>
    requestJson<KnowledgeBaseItem>(`${API_BASE}/knowledge-bases/${id}`),

  // Update a knowledge base
  update: (id: string, data: KnowledgeBaseUpdate) =>
    requestJson<KnowledgeBaseItem>(`${API_BASE}/knowledge-bases/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  // Delete a knowledge base
  delete: (id: string) =>
    requestJson<void>(`${API_BASE}/knowledge-bases/${id}`, {
      method: "DELETE",
    }),

  // List documents in a knowledge base
  listDocuments: (kbId: string) =>
    requestJson<KnowledgeDocumentListResponse>(
      `${API_BASE}/knowledge-bases/${kbId}/documents`
    ),

  // Create a document in a knowledge base
  createDocument: (kbId: string, data: KnowledgeDocumentCreate) =>
    requestJson<KnowledgeDocument>(
      `${API_BASE}/knowledge-bases/${kbId}/documents`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    ),

  // Delete documents from a knowledge base
  deleteDocuments: (kbId: string, documentIds: string[]) =>
    requestJson<{ deleted: number }>(
      `${API_BASE}/knowledge-bases/${kbId}/documents/delete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_ids: documentIds }),
      }
    ),

  // Rebuild index for a knowledge base
  rebuildIndex: (kbId: string, documentIds?: string[]) =>
    requestJson<IndexTaskResponse>(
      `${API_BASE}/knowledge-bases/${kbId}/rebuild-index`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_ids: documentIds }),
      }
    ),

  // Hit testing - search within a knowledge base
  hitTest: (kbId: string, data: HitTestRequest) =>
    requestJson<HitTestResponse>(
      `${API_BASE}/knowledge-bases/${kbId}/hit-testing`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    ),
};
