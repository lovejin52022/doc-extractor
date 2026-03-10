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
  const [viewMode, setViewMode] = useState<"table" | "json">("table");
  const [showMetadata, setShowMetadata] = useState(false);

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

  function handleExport() {
    if (!task) return;

    const data = {
      task_id: task.task_id,
      doc_id: task.doc_id,
      status: task.status,
      created_at: task.created_at,
      summary: task.result?.summary,
      extracted: task.result?.extracted,
      labels: labels,
    };

    // 导出为 JSON
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extraction_${task.task_id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleCopyToClipboard() {
    if (!task) return;

    const data = {
      task_id: task.task_id,
      doc_id: task.doc_id,
      status: task.status,
      summary: task.result?.summary,
      extracted: task.result?.extracted,
    };

    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  }

  if (!taskId) {
    return (
      <main className="page-wrap-center">
        <section className="panel">
          <EmptyState
            icon="📋"
            title="未指定任务"
            description={`请从提取页面创建任务${docId ? `（doc_id: ${docId}）` : ""}.`}
            ctaHref="/upload"
            ctaText="前往提取"
          />
        </section>
      </main>
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
          <div className="actions">
            <Link href="/upload" className="btn btn-ghost btn-sm">
              新建任务
            </Link>
          </div>
        </div>

        {/* 任务状态 */}
        <div className="status-box">
          <div className="status-row">
            <span className="status-label">任务 ID:</span>
            <code className="status-value">{task?.task_id}</code>
          </div>
          <div className="status-row">
            <span className="status-label">文档 ID:</span>
            <code className="status-value">{task?.doc_id}</code>
          </div>
          <div className="status-row">
            <span className="status-label">状态:</span>
            <StatusBadge status={task?.status ?? ""} />
          </div>
          <div className="status-row">
            <span className="status-label">摘要:</span>
            <span className="status-value">{task?.result?.summary ?? "-"}</span>
          </div>
        </div>

        {/* 视图控制 */}
        <div className="view-controls">
          <div className="tabs">
            <button
              type="button"
              className={`tab ${viewMode === "table" ? "tab-active" : ""}`}
              onClick={() => setViewMode("table")}
            >
              表格视图
            </button>
            <button
              type="button"
              className={`tab ${viewMode === "json" ? "tab-active" : ""}`}
              onClick={() => setViewMode("json")}
            >
              JSON 视图
            </button>
          </div>

          <div className="action-buttons">
            <button
              type="button"
              onClick={() => setShowMetadata(!showMetadata)}
              className="btn btn-ghost btn-sm"
            >
              {showMetadata ? "隐藏元数据" : "显示元数据"}
            </button>
            <button
              type="button"
              onClick={handleCopyToClipboard}
              className="btn btn-ghost btn-sm"
            >
              复制到剪贴板
            </button>
            <button type="button" onClick={handleExport} className="btn btn-secondary btn-sm">
              导出 JSON
            </button>
          </div>
        </div>

        {/* 元数据 */}
        {showMetadata && task && (
          <div className="metadata-box">
            <h3>任务元数据</h3>
            <pre>{JSON.stringify(task, null, 2)}</pre>
          </div>
        )}

        {/* 结果展示 */}
        {viewMode === "table" ? (
          <>
            <h2 className="section-gap">按标签分组</h2>
            <table className="result-table">
              <thead>
                <tr>
                  <th>标签</th>
                  <th>抽取值</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((row) => (
                  <tr key={row.label}>
                    <td className="label-cell">{row.label}</td>
                    <td className="value-cell">{row.value}</td>
                  </tr>
                ))}
                {grouped.length === 0 && (
                  <tr>
                    <td colSpan={2}>暂无标签数据</td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        ) : (
          <div className="json-viewer">
            <pre>{JSON.stringify(task?.result?.extracted || {}, null, 2)}</pre>
          </div>
        )}

        {(task?.status === "pending" || task?.status === "processing") && (
          <p className="hint" style={{ marginTop: 16 }}>
            状态每 2 秒自动刷新…
          </p>
        )}
        {task?.error && <p className="error">错误信息：{task.error}</p>}
      </section>

      <style jsx>{`
        .status-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .status-label {
          font-weight: 600;
          min-width: 80px;
        }
        .status-value {
          flex: 1;
        }
        .view-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .action-buttons {
          display: flex;
          gap: 8px;
        }
        .metadata-box {
          background: #f5f5f5;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .metadata-box pre {
          font-size: 12px;
          overflow-x: auto;
        }
        .json-viewer {
          background: #1e1e1e;
          color: #d4d4d4;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
        }
        .json-viewer pre {
          font-size: 13px;
          margin: 0;
        }
        .label-cell {
          font-weight: 600;
          width: 30%;
        }
        .value-cell {
          word-break: break-word;
        }
      `}</style>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="page-wrap-center">
          <section className="panel">
            <LoadingState />
          </section>
        </main>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
