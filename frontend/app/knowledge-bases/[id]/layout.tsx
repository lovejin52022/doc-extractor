import type { ReactNode } from "react";
import EmptyState from "../../../components/ui/EmptyState";
import KnowledgeBaseTabs from "../../../components/KnowledgeBaseTabs";
import { getKnowledgeBaseById } from "../../../lib/knowledge-base-mock";

export default async function KnowledgeBaseDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const kb = getKnowledgeBaseById(id);

  if (!kb) {
    return (
      <main className="page-wrap">
        <section className="panel">
          <EmptyState
            icon="📚"
            title="知识库不存在"
            description={`未找到 ID 为 ${id} 的知识库（当前为前端骨架数据）。`}
            ctaHref="/knowledge-bases"
            ctaText="返回知识库列表"
          />
        </section>
      </main>
    );
  }

  return (
    <main className="page-wrap">
      <section className="panel">
        <p className="eyebrow">Knowledge Base</p>
        <div className="between">
          <div>
            <h1>{kb.name}</h1>
            <p className="muted">{kb.description}</p>
          </div>
          <span className="placeholder-tag">后端未接入</span>
        </div>

        <KnowledgeBaseTabs id={id} />

        {children}
      </section>
    </main>
  );
}
