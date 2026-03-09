"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { knowledgeBaseApi, KnowledgeBaseItem } from "../../lib/api/knowledgeBases";

export default function KnowledgeBasesPage() {
  const [kbs, setKbs] = useState<KnowledgeBaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await knowledgeBaseApi.list();
        setKbs(result.items);
      } catch (e) {
        console.error("Failed to load knowledge bases:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <main className="page-wrap">
      <section className="panel">
        <div className="between">
          <div>
            <h1>Knowledge Bases</h1>
            <p className="muted">知识库管理</p>
          </div>
          <Link href="/knowledge-bases/create" className="btn btn-primary btn-sm">新建知识库</Link>
        </div>

        {loading ? (
          <div className="loading-placeholder">加载中...</div>
        ) : kbs.length === 0 ? (
          <div className="empty-placeholder">
            <p className="muted">暂无知识库，创建第一个知识库并开始导入文档。</p>
          </div>
        ) : (
          <div className="kb-grid">
            {kbs.map((kb) => (
              <article key={kb.id} className="kb-card">
                <h3>{kb.name}</h3>
                <p className="muted">{kb.description || "暂无描述"}</p>
                <p className="hint">文档数：{kb.document_count} · 最近更新：{formatDate(kb.updated_at)}</p>
                <div className="actions" style={{ justifyContent: "flex-start", marginTop: 12 }}>
                  <Link href={`/knowledge-bases/${kb.id}/documents`} className="btn btn-ghost btn-sm">进入知识库</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
