"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { knowledgeBaseApi, type KnowledgeBaseItem, systemApi, type SystemConfig } from "../../../../lib/api";
import { useToast } from "../../../../components/ui/Toast";
import LoadingState from "../../../../components/ui/LoadingState";
import EmptyState from "../../../../components/ui/EmptyState";

export default function KnowledgeBaseSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const kbId = params.id as string;

  const [kb, setKb] = useState<KnowledgeBaseItem | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 本地配置状态
  const [embeddingModel, setEmbeddingModel] = useState("");
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const [chunkStrategy, setChunkStrategy] = useState("fixed");
  const [topK, setTopK] = useState(5);
  const [scoreThreshold, setScoreThreshold] = useState(0.5);

  const loadData = useCallback(async () => {
    try {
      const [kbData, configData] = await Promise.all([
        knowledgeBaseApi.get(kbId),
        systemApi.getConfig(),
      ]);

      setKb(kbData);
      setConfig(configData);

      // 设置本地状态
      setEmbeddingModel(configData.embedding_model);
      setChunkSize(configData.default_chunk_size);
      setChunkOverlap(configData.default_chunk_overlap);
      setChunkStrategy(configData.default_chunk_strategy);
      setTopK(configData.default_top_k);
      setScoreThreshold(configData.default_score_threshold);
    } catch (error) {
      showToast("加载失败", "error");
    } finally {
      setLoading(false);
    }
  }, [kbId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSave() {
    setSaving(true);
    try {
      await systemApi.updateConfig({
        embedding_model: embeddingModel,
        default_chunk_size: chunkSize,
        default_chunk_overlap: chunkOverlap,
        default_chunk_strategy: chunkStrategy,
        default_top_k: topK,
        default_score_threshold: scoreThreshold,
      });

      showToast("配置已保存", "success");
    } catch (error) {
      showToast("保存失败", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page-wrap-center">
        <section className="panel">
          <LoadingState />
        </section>
      </main>
    );
  }

  if (!kb) {
    return (
      <main className="page-wrap-center">
        <section className="panel">
          <EmptyState
            icon="❌"
            title="知识库不存在"
            description="无法找到指定的知识库"
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
        <div className="between">
          <div>
            <h1>知识库设置</h1>
            <p className="muted">{kb.name}</p>
          </div>
          <Link href={`/knowledge-bases/${kbId}`} className="btn btn-ghost btn-sm">
            返回知识库
          </Link>
        </div>

        <div className="form-grid">
          <h2 className="section-gap">向量模型配置</h2>

          <div>
            <label>Embedding 模型</label>
            <select
              className="input"
              value={embeddingModel}
              onChange={(e) => setEmbeddingModel(e.target.value)}
            >
              <option value="nomic-embed-text">nomic-embed-text (推荐)</option>
              <option value="mxbai-embed-large">mxbai-embed-large</option>
              <option value="bge-m3">bge-m3</option>
            </select>
            <p className="hint">用于将文本转换为向量</p>
          </div>

          <h2 className="section-gap">文档分块配置</h2>

          <div>
            <label>分块大小</label>
            <input
              type="number"
              className="input"
              value={chunkSize}
              onChange={(e) => setChunkSize(Number(e.target.value))}
              min={100}
              max={2000}
            />
            <p className="hint">每个文本块的大小（字符数）</p>
          </div>

          <div>
            <label>重叠大小</label>
            <input
              type="number"
              className="input"
              value={chunkOverlap}
              onChange={(e) => setChunkOverlap(Number(e.target.value))}
              min={0}
              max={500}
            />
            <p className="hint">相邻块之间的重叠字符数</p>
          </div>

          <div>
            <label>分块策略</label>
            <select
              className="input"
              value={chunkStrategy}
              onChange={(e) => setChunkStrategy(e.target.value)}
            >
              <option value="fixed">固定大小</option>
              <option value="paragraph">按段落</option>
              <option value="recursive">递归分块</option>
            </select>
          </div>

          <h2 className="section-gap">检索配置</h2>

          <div>
            <label>返回结果数量 (Top K)</label>
            <input
              type="number"
              className="input"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              min={1}
              max={20}
            />
          </div>

          <div>
            <label>相似度阈值</label>
            <input
              type="number"
              className="input"
              value={scoreThreshold}
              onChange={(e) => setScoreThreshold(Number(e.target.value))}
              min={0}
              max={1}
              step={0.1}
            />
            <p className="hint">低于此分数的结果将被过滤</p>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? "保存中..." : "保存配置"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
