"use client";

import { useState, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const API_BASE = "/api";

export default function UploadPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [labels, setLabels] = useState("name,date,amount");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("请先选择文件");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: form,
      });
      if (!uploadRes.ok) {
        const detail = await uploadRes.json().catch(() => ({}));
        throw new Error(detail.detail || "上传失败");
      }
      const { id: docId } = await uploadRes.json();

      const labelList = labels
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);
      const extractRes = await fetch(`${API_BASE}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId, labels: labelList }),
      });
      if (!extractRes.ok) throw new Error("创建抽取任务失败");
      const { task_id } = await extractRes.json();

      router.push(`/results?task_id=${task_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-bold">上传文档</h1>
      <p className="mt-2 text-sm text-gray-500">
        上传 PDF / DOCX 文件，指定需要抽取的标签后提交。
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">文件</label>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx"
            className="mt-1 block w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">抽取标签（逗号分隔）</label>
          <input
            type="text"
            value={labels}
            onChange={(e) => setLabels(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="name,date,amount"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={uploading}
          className="rounded bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? "处理中…" : "上传并抽取"}
        </button>
      </form>
    </main>
  );
}
