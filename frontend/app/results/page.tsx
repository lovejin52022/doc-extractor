"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const API_BASE = "/api";

interface TaskResult {
  task_id: string;
  doc_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  result: { labels?: string[]; extracted?: Record<string, string> } | null;
  error: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "等待处理",
  processing: "处理中",
  completed: "已完成",
  failed: "失败",
};

function ResultsContent() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get("task_id");

  const [task, setTask] = useState<TaskResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!taskId) return;
    try {
      const res = await fetch(`${API_BASE}/extract/${taskId}/status`);
      if (!res.ok) throw new Error("任务不存在");
      setTask(await res.json());
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "查询失败");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 3000);
    return () => clearInterval(timer);
  }, [fetchStatus]);

  if (!taskId) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-bold">抽取结果</h1>
        <p className="mt-3 text-gray-500">缺少 task_id 参数，请从上传页面进入。</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <p>加载中…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-bold">抽取结果</h1>
        <p className="mt-3 text-red-600">{error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-bold">抽取结果</h1>

      <div className="mt-6 rounded border border-gray-200 p-4 text-sm">
        <p>
          <span className="font-medium">任务 ID：</span>
          {task?.task_id}
        </p>
        <p>
          <span className="font-medium">文档 ID：</span>
          {task?.doc_id}
        </p>
        <p>
          <span className="font-medium">状态：</span>
          <span
            className={
              task?.status === "completed"
                ? "text-green-600"
                : task?.status === "failed"
                  ? "text-red-600"
                  : "text-yellow-600"
            }
          >
            {STATUS_LABEL[task?.status ?? ""] ?? task?.status}
          </span>
        </p>
        <p>
          <span className="font-medium">创建时间：</span>
          {task?.created_at}
        </p>
      </div>

      {task?.status === "completed" && task.result?.extracted && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">抽取字段</h2>
          <table className="mt-2 w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="py-1 text-left">标签</th>
                <th className="py-1 text-left">值</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(task.result.extracted).map(([key, val]) => (
                <tr key={key} className="border-b">
                  <td className="py-1 font-medium">{key}</td>
                  <td className="py-1">{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {task?.error && (
        <p className="mt-4 text-sm text-red-600">错误信息：{task.error}</p>
      )}

      {(task?.status === "pending" || task?.status === "processing") && (
        <p className="mt-4 text-sm text-gray-400">每 3 秒自动刷新状态…</p>
      )}
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-xl p-8">
          <p>加载中…</p>
        </main>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
