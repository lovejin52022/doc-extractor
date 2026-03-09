"use client";

import { getLocal, setLocal } from "./storage";
import type { DocumentItem } from "./types";

const DOC_KEY = "doc-extractor-documents";

function load(): DocumentItem[] {
  return getLocal<DocumentItem[]>(DOC_KEY, []);
}

export async function listDocuments(): Promise<DocumentItem[]> {
  return load();
}

export async function upsertDocument(doc: { id: string; filename: string }): Promise<DocumentItem> {
  const now = new Date().toISOString();
  const list = load();
  const i = list.findIndex((d) => d.id === doc.id);
  const next: DocumentItem = {
    id: doc.id,
    filename: doc.filename,
    status: "uploaded",
    createdAt: i >= 0 ? list[i].createdAt : now,
    updatedAt: now,
  };
  if (i >= 0) list[i] = next;
  else list.unshift(next);
  setLocal(DOC_KEY, list);
  return next;
}

export async function deleteDocument(id: string): Promise<void> {
  setLocal(DOC_KEY, load().filter((d) => d.id !== id));
}

export async function markDocumentStatus(id: string, status: DocumentItem["status"]) {
  const list = load();
  const i = list.findIndex((d) => d.id === id);
  if (i < 0) return;
  list[i] = { ...list[i], status, updatedAt: new Date().toISOString() };
  setLocal(DOC_KEY, list);
}
