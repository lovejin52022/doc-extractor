"use client";

import { requestJson } from "./core";
import { markDocumentStatus } from "./documents";
import { getLocal, setLocal } from "./storage";
import type { ExtractTaskMeta, TaskResult } from "./types";

const TASK_META_KEY = "doc-extractor-task-meta";

function loadMeta() {
  return getLocal<ExtractTaskMeta[]>(TASK_META_KEY, []);
}

function saveMeta(value: ExtractTaskMeta[]) {
  setLocal(TASK_META_KEY, value);
}

export async function uploadDocument(file: File): Promise<{ id: string; filename: string }> {
  const form = new FormData();
  form.append("file", file);
  return requestJson(`/api/upload`, { method: "POST", body: form });
}

export async function createExtractTask(docId: string, labels: string[]): Promise<TaskResult> {
  const res = await requestJson<TaskResult>(`/api/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ doc_id: docId, labels }),
  });
  const list = loadMeta();
  list.unshift({ taskId: res.task_id, docId, labels, createdAt: new Date().toISOString() });
  saveMeta(list.slice(0, 100));
  await markDocumentStatus(docId, "processing");
  return res;
}

export async function getTaskStatus(taskId: string): Promise<TaskResult> {
  const task = await requestJson<TaskResult>(`/api/extract/${taskId}`);
  if (task.status === "completed") await markDocumentStatus(task.doc_id, "extracted");
  if (task.status === "failed") await markDocumentStatus(task.doc_id, "failed");
  return task;
}

export async function listLocalTaskMeta(docId?: string): Promise<ExtractTaskMeta[]> {
  const list = loadMeta();
  return docId ? list.filter((item) => item.docId === docId) : list;
}
