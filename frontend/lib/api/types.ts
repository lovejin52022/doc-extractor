export type TaskStatus = "pending" | "processing" | "completed" | "failed";

export interface Tag {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentItem {
  id: string;
  filename: string;
  status: "uploaded" | "processing" | "extracted" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface TaskResult {
  task_id: string;
  doc_id: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  result: { labels?: string[]; extracted?: Record<string, string>; summary?: string } | null;
  error: string | null;
}

export interface ExtractTaskMeta {
  taskId: string;
  docId: string;
  labels: string[];
  createdAt: string;
}
