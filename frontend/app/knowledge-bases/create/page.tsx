"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useToast } from "../../../components/ui/Toast";
import { knowledgeBaseApi } from "../../../lib/api/knowledgeBases";

export default function CreateKnowledgeBasePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    
    if (!name.trim()) {
      showToast("请输入知识库名称", "error");
      return;
    }

    setLoading(true);
    try {
      const kb = await knowledgeBaseApi.create({
        name: name.trim(),
        description: desc.trim() || undefined,
      });
      showToast("知识库创建成功", "success");
      router.push(`/knowledge-bases/${kb.id}/documents`);
    } catch (e) {
      console.error("Failed to create knowledge base:", e);
      showToast("创建失败，请稍后重试", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-wrap">
      <section className="panel">
        <div className="between">
          <div>
            <h1>新建知识库</h1>
            <p className="muted">创建一个新的知识库用于管理文档。</p>
          </div>
          <Link href="/knowledge-bases" className="btn btn-ghost btn-sm">返回列表</Link>
        </div>

        <form className="form-grid section-gap" onSubmit={handleSubmit}>
          <div>
            <label>知识库名称</label>
            <input 
              className="input" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="例如：合同知识库"
              disabled={loading}
            />
          </div>
          <div>
            <label>描述（可选）</label>
            <textarea 
              className="input" 
              value={desc} 
              onChange={(e) => setDesc(e.target.value)} 
              placeholder="用于什么业务场景、文档类型等" 
              rows={4}
              disabled={loading}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "创建中..." : "创建知识库"}
          </button>
        </form>
      </section>
    </main>
  );
}
