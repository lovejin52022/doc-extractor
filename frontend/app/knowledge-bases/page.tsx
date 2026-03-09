import Link from "next/link";

import EmptyState from "../../components/ui/EmptyState";
import { MOCK_KNOWLEDGE_BASES } from "../../lib/knowledge-base-mock";

export default function KnowledgeBasesPage() {
  return (
    <main className="page-wrap">
      <section className="panel">
        <div className="between">
          <div>
            <h1>Knowledge Bases</h1>
            <p className="muted">知识库管理骨架页（前端已就位，后端接口待接入）。</p>
          </div>
          <Link href="/knowledge-bases/create" className="btn btn-primary btn-sm">新建知识库</Link>
        </div>

        {MOCK_KNOWLEDGE_BASES.length === 0 ? (
          <EmptyState
            icon="📚"
            title="暂无知识库"
            description="创建第一个知识库并开始导入文档。"
            ctaHref="/knowledge-bases/create"
            ctaText="创建知识库"
          />
        ) : (
          <div className="kb-grid">
            {MOCK_KNOWLEDGE_BASES.map((kb) => (
              <article key={kb.id} className="kb-card">
                <h3>{kb.name}</h3>
                <p className="muted">{kb.description}</p>
                <p className="hint">文档数：{kb.documentCount} · 最近更新：{kb.updatedAt}</p>
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
