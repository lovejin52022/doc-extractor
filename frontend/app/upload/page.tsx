"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  createExtractTask,
  listDocuments,
  listTags,
  listKnowledgeBases,
  toErrorMessage,
  uploadDocument,
  upsertDocument,
  knowledgeBaseApi,
  type DocumentItem,
  type Tag,
  type KnowledgeBaseItem,
} from "../../lib/api";
import { useToast } from "../../components/ui/Toast";

export default function UploadPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tags, setTags] = useState<Tag[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseItem[]>([]);
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [manualDocId, setManualDocId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 新增：解析进度和知识库选项
  const [selectedKbId, setSelectedKbId] = useState("");
  const [uploadMode, setUploadMode] = useState<"extract" | "knowledge">("extract");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  useEffect(() => {
    listTags().then((v) => {
      setTags(v);
      setSelectedTagNames(v.slice(0, 3).map((x) => x.name));
    });
    listDocuments().then(setDocuments);
    listKnowledgeBases().then((kb) => {
      setKnowledgeBases(kb.items);
    });
  }, []);

  const finalDocId = useMemo(() => manualDocId.trim() || selectedDocId, [manualDocId, selectedDocId]);

  function toggleTag(name: string) {
    setSelectedTagNames((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const file = fileRef.current?.files?.[0];

    if (uploadMode === "knowledge") {
      // 上传到知识库模式
      if (!file) {
        setError("请选择要上传的文件");
        return;
      }
      if (!selectedKbId) {
        setError("请选择目标知识库");
        return;
      }

      setUploading(true);
      setUploadProgress(10);
      setUploadStatus("正在上传文件...");

      try {
        // 1. 上传文件
        setUploadProgress(20);
        setUploadStatus("上传文件...");
        const upload = await uploadDocument(file);

        // 2. 解析文档（这里简化处理）
        setUploadProgress(40);
        setUploadStatus("解析文档...");
        
        // 3. 添加到知识库
        setUploadProgress(60);
        setUploadStatus("添加到知识库...");
        
        // 注意：这里需要调用知识库 API 添加文档
        // 暂时使用简化实现
        await knowledgeBaseApi.createDocument(selectedKbId, {
          filename: upload.filename,
          file_path: upload.path,
        });

        setUploadProgress(100);
        setUploadStatus("上传完成！");

        showToast("已添加到知识库", "success");
        
        // 重置表单
        if (fileRef.current) {
          fileRef.current.value = "";
        }
        setSelectedKbId("");
      } catch (err: unknown) {
        setError(toErrorMessage(err));
        setUploadProgress(0);
        setUploadStatus("");
      } finally {
        setUploading(false);
      }
    } else {
      // 抽取模式（原有逻辑）
      let docId = finalDocId;

      setUploading(true);
      setUploadProgress(10);
      setUploadStatus("处理中...");

      try {
        if (!docId && file) {
          setUploadProgress(30);
          setUploadStatus("上传文件...");
          const upload = await uploadDocument(file);
          
          setUploadProgress(50);
          setUploadStatus("保存文档...");
          await upsertDocument(upload);
          setDocuments(await listDocuments());
          docId = upload.id;
          showToast("文件上传成功", "success");
        }

        if (!docId) throw new Error("请先选择已有文档、填写文档ID，或上传新文件");
        if (selectedTagNames.length === 0) throw new Error("至少选择一个标签");

        setUploadProgress(70);
        setUploadStatus("创建任务...");

        const task = await createExtractTask(docId, selectedTagNames);
        
        setUploadProgress(100);
        setUploadStatus("任务已创建");

        showToast("任务已创建", "success");
        router.push(`/results?task_id=${task.task_id}&doc_id=${docId}`);
      } catch (err: unknown) {
        setError(toErrorMessage(err));
        setUploadProgress(0);
        setUploadStatus("");
      } finally {
        setUploading(false);
      }
    }
  }

  return (
    <main className="page-wrap">
      <section className="panel">
        <div className="between">
          <div>
            <h1>提取工作台</h1>
            <p className="muted">
              支持多标签 + 文档选择（已有文档 / 手动 doc_id / 上传新文档）
            </p>
          </div>
          <Link href="/documents" className="btn btn-ghost btn-sm">
            文档总览
          </Link>
        </div>

        {/* 上传模式选择 */}
        <div className="tabs" style={{ marginBottom: 24 }}>
          <button
            type="button"
            className={`tab ${uploadMode === "extract" ? "tab-active" : ""}`}
            onClick={() => setUploadMode("extract")}
          >
            文档抽取
          </button>
          <button
            type="button"
            className={`tab ${uploadMode === "knowledge" ? "tab-active" : ""}`}
            onClick={() => setUploadMode("knowledge")}
          >
            上传到知识库
          </button>
        </div>

        {/* 解析进度显示 */}
        {uploading && (
          <div className="progress-box">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="progress-text">
              {uploadProgress}% - {uploadStatus}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-grid">
          {uploadMode === "knowledge" && (
            <>
              <div>
                <label>目标知识库</label>
                <select
                  className="input"
                  value={selectedKbId}
                  onChange={(e) => setSelectedKbId(e.target.value)}
                >
                  <option value="">-- 选择知识库 --</option>
                  {knowledgeBases.map((kb) => (
                    <option key={kb.id} value={kb.id}>
                      {kb.name} ({kb.document_count} 文档)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>选择文件</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  className="input file-input"
                />
                <p className="hint">支持 PDF、DOCX、TXT、Markdown</p>
              </div>
            </>
          )}

          {uploadMode === "extract" && (
            <>
              <div>
                <label>选择标签（多选）</label>
                <div className="chip-group">
                  {tags.map((tag) => (
                    <button
                      type="button"
                      key={tag.id}
                      onClick={() => toggleTag(tag.name)}
                      className={`chip ${
                        selectedTagNames.includes(tag.name) ? "chip-active" : ""
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
                <p className="hint">已选 {selectedTagNames.length} 个标签</p>
              </div>

              <div>
                <label>选择已有文档</label>
                <select
                  className="input"
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                >
                  <option value="">-- 不选择 --</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.filename} ({doc.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>或输入 doc_id（task/doc 关联）</label>
                <input
                  className="input"
                  value={manualDocId}
                  onChange={(e) => setManualDocId(e.target.value)}
                  placeholder="手动输入文档ID"
                />
              </div>

              <div>
                <label>或上传新文档</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx"
                  className="input file-input"
                />
              </div>
            </>
          )}

          {error && <p className="error">{error}</p>}

          <button
            type="submit"
            disabled={uploading}
            className="btn btn-primary"
          >
            {uploading
              ? "处理中..."
              : uploadMode === "knowledge"
              ? "上传到知识库"
              : "创建抽取任务"}
          </button>
        </form>
      </section>

      {/* 知识库快捷入口 */}
      {uploadMode === "knowledge" && knowledgeBases.length > 0 && (
        <section className="panel" style={{ marginTop: 24 }}>
          <h2>知识库列表</h2>
          <div className="kb-list">
            {knowledgeBases.map((kb) => (
              <div key={kb.id} className="kb-item">
                <Link href={`/knowledge-bases/${kb.id}`} className="kb-name">
                  {kb.name}
                </Link>
                <span className="kb-count">{kb.document_count} 文档</span>
              </div>
            ))}
          </div>
          <Link href="/knowledge-bases/create" className="btn btn-secondary" style={{ marginTop: 16 }}>
            创建新知识库
          </Link>
        </section>
      )}
    </main>
  );
}
