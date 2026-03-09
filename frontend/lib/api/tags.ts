"use client";

import { getLocal, setLocal } from "./storage";
import type { Tag } from "./types";

const TAG_KEY = "doc-extractor-tags";

const seed: Tag[] = [
  { id: "tg-name", name: "name", description: "姓名", color: "#2563eb", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "tg-date", name: "date", description: "日期", color: "#7c3aed", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "tg-amount", name: "amount", description: "金额", color: "#ea580c", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

function load(): Tag[] {
  const list = getLocal<Tag[]>(TAG_KEY, []);
  if (list.length === 0) {
    setLocal(TAG_KEY, seed);
    return seed;
  }
  return list;
}

export async function listTags(): Promise<Tag[]> {
  return load();
}

export async function getTag(id: string): Promise<Tag | null> {
  return load().find((t) => t.id === id) ?? null;
}

export async function createTag(payload: Pick<Tag, "name" | "description" | "color">): Promise<Tag> {
  const now = new Date().toISOString();
  const next: Tag = {
    id: `tg-${crypto.randomUUID().slice(0, 8)}`,
    name: payload.name,
    description: payload.description,
    color: payload.color || "#2563eb",
    createdAt: now,
    updatedAt: now,
  };
  const list = [next, ...load()];
  setLocal(TAG_KEY, list);
  return next;
}

export async function updateTag(id: string, payload: Partial<Pick<Tag, "name" | "description" | "color">>): Promise<Tag> {
  const list = load();
  const index = list.findIndex((t) => t.id === id);
  if (index < 0) throw new Error("标签不存在");
  const updated = { ...list[index], ...payload, updatedAt: new Date().toISOString() };
  list[index] = updated;
  setLocal(TAG_KEY, list);
  return updated;
}

export async function deleteTag(id: string): Promise<void> {
  setLocal(TAG_KEY, load().filter((t) => t.id !== id));
}
