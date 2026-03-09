"use client";

import { use, useEffect, useMemo, useState } from "react";

import ConfirmDialog from "../../../../components/ui/ConfirmDialog";
import EmptyState from "../../../../components/ui/EmptyState";
import LoadingState from "../../../../components/ui/LoadingState";
import { useToast } from "../../../../components/ui/Toast";
import { knowledgeBaseApi, KnowledgeDocumentStatus } from "../../../../lib/api/knowledgeBases";

const PAGE_SIZE = 5;

const STATUS_OPTIONS: Array<{ label: string; value: "all" | KnowledgeDocumentStatus }> = [
  { label: "全部状态", value: "all" },
  { label: "可用", value: "ready" },
  { label: "索引中", value: "indexing" },
  { label: "排队中", value: "queued" },
  { label: "失败", value: "failed" },
];

function getStatusMeta(status: KnowledgeDocumentStatus) {
  if (status === "ready") return { label: "可用", className: "badge-success" };
  if (status === "indexing") return { label: "索引中", className: "badge-warn" };
  if (status === "queued") return { label: "排队中", className: "badge-neutral" };
  return { label: "失败", className: "badge-danger" };
}

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

export default function KnowledgeBaseDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: kbId } = use(params);
  const { showToast } = useToast();
  
  const [docs, setDocs] = useState<Awaited<ReturnType<typeof knowledgeBaseApi.listDocuments>>["items"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const [openConfirmReindex, setOpenConfirmReindex] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | KnowledgeDocumentStatus>("all");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  async function loadDocuments() {
    try {
      setLoading(true);
      setError("");
      const result = await knowledgeBaseApi.listDocuments(kbId);
      setDocs(result.items);
    } catch (e) {
      console.error("Failed to load documents:", e);
      setError("加载文档失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, [kbId]);

  const filteredDocs = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return docs.filter((doc) => {
      const statusMatched = statusFilter === "all" || doc.status === statusFilter;
      const keywordMatched = !normalizedKeyword || doc.filename.toLowerCase().includes(normalizedKeyword);
      return statusMatched && keywordMatched;
    });
  }, [docs, keyword, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedDocs = filteredDocs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

  function toggleSelect(docId: string) {
    setSelectedIds((prev) => (prev.includes(docId) ? prev.filter((x) => x !== docId) : [...prev, docId]));
  }

  function toggleSelectAllInPage() {
    const pageIds = pagedDocs.map((doc) => doc.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  }

  async function handleDelete() {
    try {
      await knowledgeBaseApi.deleteDocuments(kbId, selectedIds);
      showToast(`已删除 ${selectedIds.length} 个文档`, "success");
      setSelectedIds([]);
      await loadDocuments();
    } catch (e) {
      console.error("Failed to delete documents:", e);
      showToast("删除失败", "error");
    }
    setOpenConfirmDelete(false);
  }

  async function handleRebuildIndex() {
    try {
      await knowledgeBaseApi.rebuildIndex(kbId, selectedIds);
      showToast(`已提交 ${selectedIds.length} 个文档的重建索引任务`, "success");
      setSelectedIds([]);
      await loadDocuments();
    } catch (e) {
      console.error("Failed to rebuild index:", e);
      showToast("重建索引失败", "error");
    }
    setOpenConfirmReindex(false);
  }

  function onUploadPlaceholder() {
    showToast("上传功能开发中", "info");
  }

  const allInPageSelected = pagedDocs.length > 0 && pagedDocs.every((doc) => selectedIds.includes(doc.id));

  return (
    <div className="section-gap">
      <div className="between">
        <h2>文档</h2>
        <button className="btn btn-primary btn-sm" onClick={onUploadPlaceholder}>上传文档</button>
      </div>

      <div className="kb-filter-grid section-gap">
        <div>
          <label>状态筛选</label>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | KnowledgeDocumentStatus)}>
            {STATUS_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label>关键词</label>
          <input
            className="input"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="按文件名搜索"
          />
        </div>
      </div>

      <div className="kb-toolbar">
        <span className="hint">已选 {selectedIds.length} 项</span>
        <div className="toolbar-actions">
          <button className="btn btn-ghost btn-sm" onClick={toggleSelectAllInPage} disabled={pagedDocs.length === 0}>
            {allInPageSelected ? "取消本页全选" : "本页全选"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setOpenConfirmReindex(true)} disabled={selectedIds.length === 0}>批量重建索引</button>
          <button className="btn btn-danger btn-sm" onClick={() => setOpenConfirmDelete(true)} disabled={selectedIds.length === 0}>批量删除</button>
        </div>
      </div>

      {loading ? (
        <div className="kb-result-block section-gap">
          <LoadingState text="文档列表加载中..." />
          <div className="skeleton-rows">
            <div className="skeleton-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
          </div>
        </div>
      ) : error ? (
        <EmptyState icon="❌" title="加载失败" description={error} />
      ) : filteredDocs.length === 0 ? (
        <EmptyState icon="📄" title="未找到匹配文档" description="可尝试清空筛选条件，或上传新文档。" />
      ) : (
        <>
          <table className="result-table section-gap">
            <thead>
              <tr>
                <th style={{ width: 64 }}>选择</th>
                <th>文件名</th>
                <th>分块数</th>
                <th>状态</th>
                <th>更新时间</th>
              </tr>
            </thead>
            <tbody>
              {pagedDocs.map((doc) => {
                const statusMeta = getStatusMeta(doc.status);
                return (
                  <tr key={doc.id}>
                    <td>
                      <input type="checkbox" checked={selectedIds.includes(doc.id)} onChange={() => toggleSelect(doc.id)} />
                    </td>
                    <td>{doc.filename}</td>
                    <td>{doc.chunk_count}</td>
                    <td>
                      <span className={`status-badge ${statusMeta.className}`}>{statusMeta.label}</span>
                    </td>
                    <td>{formatDate(doc.updated_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="kb-pagination">
            <span className="muted">第 {currentPage} / {totalPages} 页，共 {filteredDocs.length} 条</span>
            <div className="toolbar-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>上一页</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>下一页</button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={openConfirmDelete}
        message={`确定要删除选中的 ${selectedIds.length} 个文档吗？此操作不可恢复。`}
        confirmText="删除"
        onCancel={() => setOpenConfirmDelete(false)}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={openConfirmReindex}
        message={`确定要重建选中的 ${selectedIds.length} 个文档的索引吗？`}
        confirmText="重建"
        onCancel={() => setOpenConfirmReindex(false)}
        onConfirm={handleRebuildIndex}
      />
    </div>
  );
}
