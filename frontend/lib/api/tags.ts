"use client";

import { API_BASE, ApiError, requestJson } from "./core";
import { getLocal, setLocal } from "./storage";
import type { Tag } from "./types";

const TAG_KEY = "doc-extractor-tags-fallback";

function mapTag(raw: any): Tag {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? "",
    color: raw.color ?? "#2563eb",
    createdAt: raw.created_at ?? raw.createdAt,
    updatedAt: raw.updated_at ?? raw.updatedAt,
  };
}

function loadFallback() {
  return getLocal<Tag[]>(TAG_KEY, []);
}

export async function listTags(): Promise<Tag[]> {
  try {
    const data = await requestJson<any[]>(`${API_BASE}/api/tags`);
    const tags = data.map(mapTag);
    setLocal(TAG_KEY, tags);
    return tags;
  } catch {
    return loadFallback();
  }
}

export async function getTag(id: string): Promise<Tag | null> {
  const list = await listTags();
  return list.find((t) => t.id === id) ?? null;
}

export async function createTag(payload: Pick<Tag, "name" | "description" | "color">): Promise<Tag> {
  const created = await requestJson<any>(`${API_BASE}/api/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return mapTag(created);
}

export async function updateTag(id: string, payload: Partial<Pick<Tag, "name" | "description" | "color">>): Promise<Tag> {
  const updated = await requestJson<any>(`${API_BASE}/api/tags/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return mapTag(updated);
}

export async function deleteTag(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/tags/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const msg = res.status >= 500 ? "后端不可用，删除失败" : "删除失败";
    throw new ApiError(msg, res.status);
  }
}
