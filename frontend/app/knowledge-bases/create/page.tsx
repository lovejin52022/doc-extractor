"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { useToast } from "../../../components/ui/Toast";

export default function CreateKnowledgeBasePage() {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    showToast("当前仅本地占位：后端创建接口尚未接入", "info");
  }

  return (
    <main className="page-wrap">
      <section className="panel">
        <div className="between">
          <div>
            <h1>新建知识库</h1>
            <p className="muted">表单可填写，提交仅作占位提示，不会创建真实知识库。</p>
          </div>
          <Link href="/knowledge-bases" className="btn btn-ghost btn-sm">返回列表</Link>
        </div>

        <form className="form-grid section-gap" onSubmit={handleSubmit}>
          <div>
            <label>知识库名称</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：合同知识库" />
          </div>
          <div>
            <label>描述</label>
            <textarea className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="用于什么业务场景、文档类型等" rows={4} />
          </div>
          <p className="hint">后端未接入：当前页面只提供信息架构与交互骨架。</p>
          <button className="btn btn-primary" type="submit">保存（占位）</button>
        </form>
      </section>
    </main>
  );
}
