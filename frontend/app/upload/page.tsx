"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createExtractTask, listDocuments, listTags, toErrorMessage, uploadDocument, upsertDocument, type DocumentItem, type Tag } from "../../lib/api";
import { useToast } from "../../components/ui/Toast";

export default function UploadPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tags, setTags] = useState<Tag[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [manualDocId, setManualDocId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTags().then((v) => {
      setTags(v);
      setSelectedTagNames(v.slice(0, 3).map((x) => x.name));
    });
    listDocuments().then(setDocuments);
  }, []);

  const finalDocId = useMemo(() => manualDocId.trim() || selectedDocId, [manualDocId, selectedDocId]);

  function toggleTag(name: string) {
    setSelectedTagNames((prev) => prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    let docId = finalDocId;
    const file = fileRef.current?.files?.[0];

    setUploading(true);
    try {
      if (!docId && file) {
        const upload = await uploadDocument(file);
        await upsertDocument(upload);
        setDocuments(await listDocuments());
        docId = upload.id;
        showToast("文件上传成功", "success");
      }

      if (!docId) throw new Error("请先选择已有文档、填写文档ID，或上传新文件");
      if (selectedTagNames.length === 0) throw new Error("至少选择一个标签");

      const task = await createExtractTask(docId, selectedTagNames);
      showToast("任务已创建", "success");
      router.push(`/results?task_id=${task.task_id}&doc_id=${docId}`);
    } catch (err: unknown) {
      setError(toErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="page-wrap">
      <section className="panel">
        <div className="between">
          <div>
            <h1>提取工作台</h1>
            <p className="muted">支持多标签 + 文档选择（已有文档 / 手动 doc_id / 上传新文档）。</p>
          </div>
          <Link href="/documents" className="btn btn-ghost btn-sm">文档总览</Link>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <div>
            <label>选择标签（多选）</label>
            <div className="chip-group">
              {tags.map((tag) => (
                <button type="button" key={tag.id} onClick={() => toggleTag(tag.name)} className={`chip ${selectedTagNames.includes(tag.name) ? "chip-active" : ""}`}>
                  {tag.name}
                </button>
              ))}
            </div>
            <p className="hint">已选 {selectedTagNames.length} 个标签</p>
          </div>

          <div>
            <label>选择已有文档</label>
            <select className="input" value={selectedDocId} onChange={(e) => setSelectedDocId(e.target.value)}>
              <option value="">-- 不选择 --</option>
              {documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.filename} ({doc.id})</option>)}
            </select>
          </div>

          <div>
            <label>或输入 doc_id（task/doc 关联）</label>
            <input className="input" value={manualDocId} onChange={(e) => setManualDocId(e.target.value)} placeholder="手动输入文档ID" />
          </div>

          <div>
            <label>或上传新文档</label>
            <input ref={fileRef} type="file" accept=".pdf,.docx" className="input file-input" />
          </div>

          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={uploading} className="btn btn-primary">{uploading ? "处理中..." : "创建抽取任务"}</button>
        </form>
      </section>
    </main>
  );
}
