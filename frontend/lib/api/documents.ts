"use client";

import { ApiError, requestJson } from "./core";
import { getLocal, setLocal } from "./storage";
import type { DocumentItem } from "./types";

const DOC_KEY = "doc-extractor-documents-fallback";

function mapDoc(raw: any): DocumentItem {
  return {
    id: raw.id,
    filename: raw.filename,
    status: raw.status,
    createdAt: raw.created_at ?? raw.createdAt,
    updatedAt: raw.updated_at ?? raw.updatedAt,
  };
}

function loadFallback() {
  return getLocal<DocumentItem[]>(DOC_KEY, []);
}

export async function listDocuments(params?: { page?: number; pageSize?: number; status?: string; keyword?: string }): Promise<DocumentItem[]> {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.pageSize) q.set("page_size", String(params.pageSize));
  if (params?.status) q.set("status", params.status);
  if (params?.keyword) q.set("keyword", params.keyword);
  const suffix = q.toString() ? `?${q}` : "";

  try {
    const data = await requestJson<{ items: any[] }>(`/api/documents${suffix}`);
    const docs = data.items.map(mapDoc);
    setLocal(DOC_KEY, docs);
    return docs;
  } catch {
    return loadFallback();
  }
}

export async function upsertDocument(doc: { id: string; filename: string }): Promise<DocumentItem> {
  const now = new Date().toISOString();
  const list = loadFallback();
  const i = list.findIndex((d) => d.id === doc.id);
  const next: DocumentItem = { id: doc.id, filename: doc.filename, status: "uploaded", createdAt: i >= 0 ? list[i].createdAt : now, updatedAt: now };
  if (i >= 0) list[i] = next; else list.unshift(next);
  setLocal(DOC_KEY, list);
  return next;
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new ApiError("删除文档失败", res.status);
}

export async function markDocumentStatus(id: string, status: DocumentItem["status"]) {
  const list = loadFallback();
  const i = list.findIndex((d) => d.id === id);
  if (i < 0) return;
  list[i] = { ...list[i], status, updatedAt: new Date().toISOString() };
  setLocal(DOC_KEY, list);
}
