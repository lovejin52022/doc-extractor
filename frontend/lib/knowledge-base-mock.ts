export interface KnowledgeBaseItem {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  updatedAt: string;
}

export type KnowledgeDocumentStatus = "ready" | "indexing" | "failed" | "queued";

export interface KnowledgeDocument {
  id: string;
  filename: string;
  chunkCount: number;
  status: KnowledgeDocumentStatus;
  updatedAt: string;
}

export const MOCK_KNOWLEDGE_BASES: KnowledgeBaseItem[] = [
  {
    id: "kb-contracts",
    name: "合同知识库",
    description: "用于合同条款抽取与召回测试（前端骨架，未接后端）",
    documentCount: 12,
    updatedAt: "2026-03-09 11:40",
  },
  {
    id: "kb-finance",
    name: "财务知识库",
    description: "用于发票与报销单据解析（前端骨架，未接后端）",
    documentCount: 5,
    updatedAt: "2026-03-09 10:12",
  },
];

export const MOCK_KB_DOCUMENTS: Record<string, KnowledgeDocument[]> = {
  "kb-contracts": [
    { id: "doc-001", filename: "采购合同-A.pdf", chunkCount: 126, status: "ready", updatedAt: "2026-03-09 09:00" },
    { id: "doc-002", filename: "供应协议-B.docx", chunkCount: 88, status: "indexing", updatedAt: "2026-03-09 09:30" },
    { id: "doc-003", filename: "框架合同-2026版.pdf", chunkCount: 142, status: "ready", updatedAt: "2026-03-09 10:05" },
    { id: "doc-004", filename: "保密协议模板.docx", chunkCount: 45, status: "queued", updatedAt: "2026-03-09 10:21" },
    { id: "doc-005", filename: "质保条款补充协议.pdf", chunkCount: 61, status: "failed", updatedAt: "2026-03-09 10:48" },
    { id: "doc-006", filename: "设备租赁合同V3.pdf", chunkCount: 97, status: "ready", updatedAt: "2026-03-09 11:03" },
    { id: "doc-007", filename: "服务外包协议-华东区.docx", chunkCount: 74, status: "indexing", updatedAt: "2026-03-09 11:18" },
    { id: "doc-008", filename: "采购补充条款-紧急版.pdf", chunkCount: 39, status: "ready", updatedAt: "2026-03-09 11:26" },
  ],
  "kb-finance": [
    { id: "doc-101", filename: "报销制度-2026.pdf", chunkCount: 63, status: "ready", updatedAt: "2026-03-08 17:20" },
    { id: "doc-102", filename: "差旅规范-季度更新.docx", chunkCount: 52, status: "indexing", updatedAt: "2026-03-09 08:11" },
    { id: "doc-103", filename: "发票核验流程.pdf", chunkCount: 27, status: "queued", updatedAt: "2026-03-09 09:02" },
  ],
};

export function getKnowledgeBaseById(id: string) {
  return MOCK_KNOWLEDGE_BASES.find((kb) => kb.id === id);
}

export function getKnowledgeBaseDocuments(id: string) {
  return MOCK_KB_DOCUMENTS[id] ?? [];
}
