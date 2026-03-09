"use client";

import type { ReactNode } from "react";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EmptyState from "../../../components/ui/EmptyState";
import KnowledgeBaseTabs from "../../../components/KnowledgeBaseTabs";
import { knowledgeBaseApi, KnowledgeBaseItem } from "../../../lib/api/knowledgeBases";

export default function KnowledgeBaseDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: kbId } = use(params);
  const router = useRouter();
  const [kb, setKb] = useState<KnowledgeBaseItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await knowledgeBaseApi.get(kbId);
        setKb(data);
      } catch (e) {
        console.error("Failed to load knowledge base:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [kbId]);

  if (loading) {
    return (
      <main className="page-wrap">
        <section className="panel">
          <div className="loading-placeholder">加载中...</div>
        </section>
      </main>
    );
  }

  if (!kb) {
    return (
      <main className="page-wrap">
        <section className="panel">
          <EmptyState
            icon="📚"
            title="知识库不存在"
            description={`未找到 ID 为 ${kbId} 的知识库`}
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
            <p className="muted">{kb.description || "暂无描述"}</p>
          </div>
        </div>

        <KnowledgeBaseTabs id={kbId} />

        {children}
      </section>
    </main>
  );
}
