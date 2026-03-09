"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EmptyState from "../../components/ui/EmptyState";
import LoadingState from "../../components/ui/LoadingState";
import { deleteDocument, listDocuments, toErrorMessage, type DocumentItem } from "../../lib/api";
import { useToast } from "../../components/ui/Toast";

export default function DocumentsPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<DocumentItem | null>(null);

  useEffect(() => {
    listDocuments().then(setItems).catch((e) => setError(toErrorMessage(e))).finally(() => setLoading(false));
  }, []);

  async function onDelete() {
    if (!pending) return;
    await deleteDocument(pending.id);
    setItems((prev) => prev.filter((x) => x.id !== pending.id));
    setPending(null);
    showToast("文档已删除", "success");
  }

  return (
    <main className="page-wrap">
      <section className="panel">
        <div className="between">
          <div>
            <h1>文档总览</h1>
            <p className="muted">文档列表与删除已对接后端 API。</p>
          </div>
          <Link href="/upload" className="btn btn-primary btn-sm">上传新文档</Link>
        </div>

        {loading && <LoadingState />}
        {error && <p className="error">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <EmptyState title="暂无文档" description="先上传文档再创建提取任务。" ctaHref="/upload" ctaText="前往上传" />
        )}

        {items.length > 0 && (
          <table className="result-table section-gap">
            <thead><tr><th>文件名</th><th>状态</th><th>ID</th><th>操作</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.filename}</td>
                  <td>{item.status}</td>
                  <td><code>{item.id}</code></td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => setPending(item)}>删除</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <ConfirmDialog
          open={!!pending}
          message={`确认删除文档记录 “${pending?.filename || ""}”？`}
          confirmText="删除"
          onCancel={() => setPending(null)}
          onConfirm={onDelete}
        />
      </section>
    </main>
  );
}
