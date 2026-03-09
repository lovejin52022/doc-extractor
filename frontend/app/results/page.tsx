"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getTaskStatus, listLocalTaskMeta, type TaskResult } from "../../lib/api";
import StatusBadge from "../../components/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import LoadingState from "../../components/ui/LoadingState";

function ResultsContent() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get("task_id");
  const docId = searchParams.get("doc_id");

  const [task, setTask] = useState<TaskResult | null>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!taskId) return setLoading(false);
    try {
      const nextTask = await getTaskStatus(taskId);
      setTask(nextTask);
      const meta = await listLocalTaskMeta(nextTask.doc_id);
      const current = meta.find((m) => m.taskId === taskId);
      setLabels(nextTask.result?.labels?.length ? nextTask.result.labels : (current?.labels || []));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "查询失败");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 2000);
    return () => clearInterval(timer);
  }, [fetchStatus]);

  const grouped = useMemo(() => {
    const extracted = task?.result?.extracted || {};
    return labels.map((label) => ({ label, value: extracted[label] || "-" }));
  }, [labels, task?.result?.extracted]);

  if (!taskId) {
    return (
      <main className="page-wrap-center"><section className="panel"><EmptyState icon="📋" title="未指定任务" description={`请从提取页面创建任务${docId ? `（doc_id: ${docId}）` : ""}。`} ctaHref="/upload" ctaText="前往提取" /></section></main>
    );
  }

  if (loading) return <main className="page-wrap-center"><section className="panel"><LoadingState /></section></main>;

  if (error) {
    return <main className="page-wrap"><section className="panel"><p className="error">{error}</p></section></main>;
  }

  return (
    <main className="page-wrap">
      <section className="panel">
        <div className="between">
          <h1>抽取结果</h1>
          <Link href="/upload" className="btn btn-ghost btn-sm">新建任务</Link>
        </div>

        <div className="status-box">
          <p><strong>任务 ID：</strong><code>{task?.task_id}</code></p>
          <p><strong>文档 ID：</strong><code>{task?.doc_id}</code></p>
          <p><strong>状态：</strong><StatusBadge status={task?.status ?? ""} /></p>
          <p><strong>摘要：</strong>{task?.result?.summary ?? "-"}</p>
        </div>

        <h2 className="section-gap">按标签分组</h2>
        <table className="result-table">
          <thead><tr><th>标签</th><th>抽取值</th></tr></thead>
          <tbody>
            {grouped.map((row) => <tr key={row.label}><td>{row.label}</td><td>{row.value}</td></tr>)}
            {grouped.length === 0 && <tr><td colSpan={2}>暂无标签数据</td></tr>}
          </tbody>
        </table>

        {(task?.status === "pending" || task?.status === "processing") && <p className="hint" style={{ marginTop: 16 }}>状态每 2 秒自动刷新…</p>}
        {task?.error && <p className="error">错误信息：{task.error}</p>}
      </section>
    </main>
  );
}

export default function ResultsPage() {
  return <Suspense fallback={<main className="page-wrap-center"><section className="panel"><LoadingState /></section></main>}><ResultsContent /></Suspense>;
}
