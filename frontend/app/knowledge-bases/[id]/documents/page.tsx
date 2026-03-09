"use client";

import { use, useEffect, useMemo, useState } from "react";

import ConfirmDialog from "../../../../components/ui/ConfirmDialog";
import EmptyState from "../../../../components/ui/EmptyState";
import LoadingState from "../../../../components/ui/LoadingState";
import { useToast } from "../../../../components/ui/Toast";
import { KnowledgeDocumentStatus, getKnowledgeBaseDocuments } from "../../../../lib/knowledge-base-mock";

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

export default function KnowledgeBaseDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { showToast } = useToast();
  const docs = useMemo(() => getKnowledgeBaseDocuments(id), [id]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const [openConfirmReindex, setOpenConfirmReindex] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | KnowledgeDocumentStatus>("all");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(timer);
  }, [statusFilter, keyword, id]);

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

  function onUploadPlaceholder() {
    showToast("上传入口为占位：后端文件上传与索引任务尚未接入", "info");
  }

  const allInPageSelected = pagedDocs.length > 0 && pagedDocs.every((doc) => selectedIds.includes(doc.id));

  return (
    <div className="section-gap">
      <div className="between">
        <h2>文档</h2>
        <button className="btn btn-primary btn-sm" onClick={onUploadPlaceholder}>上传文档（占位）</button>
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
          <button className="btn btn-ghost btn-sm" onClick={() => setOpenConfirmReindex(true)} disabled={selectedIds.length === 0}>批量重建索引（占位）</button>
          <button className="btn btn-danger btn-sm" onClick={() => setOpenConfirmDelete(true)} disabled={selectedIds.length === 0}>批量删除（占位）</button>
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
      ) : filteredDocs.length === 0 ? (
        <EmptyState icon="📄" title="未找到匹配文档" description="可尝试清空筛选条件，或等待后端文档列表接入。" />
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
                    <td>{doc.chunkCount}</td>
                    <td>
                      <span className={`status-badge ${statusMeta.className}`}>{statusMeta.label}</span>
                    </td>
                    <td>{doc.updatedAt}</td>
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
        message="当前仅前端骨架，批量删除不会真正调用后端。是否继续占位流程？"
        confirmText="继续"
        onCancel={() => setOpenConfirmDelete(false)}
        onConfirm={() => {
          setOpenConfirmDelete(false);
          showToast("批量删除占位完成（未调用后端）", "success");
        }}
      />

      <ConfirmDialog
        open={openConfirmReindex}
        message="当前仅前端骨架，重建索引不会真正触发后台任务。是否继续占位流程？"
        confirmText="继续"
        onCancel={() => setOpenConfirmReindex(false)}
        onConfirm={() => {
          setOpenConfirmReindex(false);
          showToast("批量重建索引占位完成（未调用后端）", "success");
        }}
      />
    </div>
  );
}
