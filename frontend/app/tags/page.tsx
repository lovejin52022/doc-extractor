"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EmptyState from "../../components/ui/EmptyState";
import LoadingState from "../../components/ui/LoadingState";
import { deleteTag, listTags, toErrorMessage, type Tag } from "../../lib/api";
import { useToast } from "../../components/ui/Toast";

export default function TagsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Tag[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Tag | null>(null);

  useEffect(() => {
    listTags().then(setItems).catch((e) => setError(toErrorMessage(e))).finally(() => setLoading(false));
  }, []);

  async function confirmDelete() {
    if (!pendingDelete) return;
    await deleteTag(pendingDelete.id);
    setItems((prev) => prev.filter((x) => x.id !== pendingDelete.id));
    setPendingDelete(null);
    showToast("标签已删除", "success");
  }

  return (
    <main className="page-wrap">
      <section className="panel">
        <div className="between">
          <div>
            <h1>标签管理</h1>
            <p className="muted">当前为本地 mock 数据流，后续可切换后端接口。</p>
          </div>
          <Link href="/tags/new" className="btn btn-primary btn-sm">新建标签</Link>
        </div>

        {loading && <LoadingState />}
        {error && <p className="error">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <EmptyState title="暂无标签" description="先创建用于抽取的标签。" ctaHref="/tags/new" ctaText="创建标签" />
        )}

        {items.length > 0 && (
          <table className="result-table section-gap">
            <thead><tr><th>标签</th><th>描述</th><th>操作</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, background: item.color, marginRight: 8 }} />{item.name}</td>
                  <td>{item.description || "-"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Link href={`/tags/${item.id}/edit`} className="btn btn-ghost btn-sm">编辑</Link>
                      <button className="btn btn-danger btn-sm" onClick={() => setPendingDelete(item)}>删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <ConfirmDialog
          open={!!pendingDelete}
          message={`删除标签 “${pendingDelete?.name || ""}” 后不可恢复。`}
          confirmText="删除"
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      </section>
    </main>
  );
}
