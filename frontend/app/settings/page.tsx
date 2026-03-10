"use client";

import { useCallback, useEffect, useState } from "react";

import {
  systemApi,
  statsApi,
  type SystemConfig,
  type ConfigValidationResult,
  type StatsSummary,
  type SystemStats,
} from "../lib/api";
import { useToast } from "../components/ui/Toast";
import LoadingState from "../components/ui/LoadingState";

export default function SettingsPage() {
  const { showToast } = useToast();

  // 配置状态
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [validation, setValidation] = useState<ConfigValidationResult | null>(null);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);

  // 表单状态
  const [llmProvider, setLlmProvider] = useState("ollama");
  const [llmModel, setLlmModel] = useState("llama2");
  const [llmBaseUrl, setLlmBaseUrl] = useState("http://localhost:11434");
  const [embeddingProvider, setEmbeddingProvider] = useState("ollama");
  const [embeddingModel, setEmbeddingModel] = useState("nomic-embed-text");
  const [vectorDbProvider, setVectorDbProvider] = useState("lancedb");
  const [vectorDbPath, setVectorDbPath] = useState("./storage/vectors");
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const [chunkStrategy, setChunkStrategy] = useState("fixed");
  const [topK, setTopK] = useState(5);
  const [scoreThreshold, setScoreThreshold] = useState(0.5);

  const loadData = useCallback(async () => {
    try {
      const [configData, validationData, statsData, sysStatsData] = await Promise.all([
        systemApi.getConfig(),
        systemApi.validateConfig(),
        statsApi.getSummary(),
        statsApi.getSystemStats(),
      ]);

      setConfig(configData);
      setValidation(validationData);
      setStats(statsData);
      setSystemStats(sysStatsData);

      // 设置表单值
      setLlmProvider(configData.llm_provider);
      setLlmModel(configData.llm_model);
      setLlmBaseUrl(configData.llm_base_url);
      setEmbeddingProvider(configData.embedding_provider);
      setEmbeddingModel(configData.embedding_model);
      setVectorDbProvider(configData.vector_db_provider);
      setVectorDbPath(configData.vector_db_path);
      setChunkSize(configData.default_chunk_size);
      setChunkOverlap(configData.default_chunk_overlap);
      setChunkStrategy(configData.default_chunk_strategy);
      setTopK(configData.default_top_k);
      setScoreThreshold(configData.default_score_threshold);
    } catch (error) {
      showToast("加载配置失败", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSave() {
    setSaving(true);
    try {
      await systemApi.updateConfig({
        llm_provider: llmProvider,
        llm_model: llmModel,
        llm_base_url: llmBaseUrl,
        embedding_provider: embeddingProvider,
        embedding_model: embeddingModel,
        vector_db_provider: vectorDbProvider,
        vector_db_path: vectorDbPath,
        default_chunk_size: chunkSize,
        default_chunk_overlap: chunkOverlap,
        default_chunk_strategy: chunkStrategy,
        default_top_k: topK,
        default_score_threshold: scoreThreshold,
      });

      showToast("配置已保存", "success");
      loadData(); // 重新加载验证状态
    } catch (error) {
      showToast("保存失败", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm("确定要重置所有配置为默认值吗？")) return;

    try {
      await systemApi.resetConfig();
      showToast("配置已重置", "success");
      loadData();
    } catch (error) {
      showToast("重置失败", "error");
    }
  }

  async function handleValidate() {
    setValidating(true);
    try {
      const result = await systemApi.validateConfig();
      setValidation(result);
      showToast("验证完成", "success");
    } catch (error) {
      showToast("验证失败", "error");
    } finally {
      setValidating(false);
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

  return (
    <main className="page-wrap">
      <section className="panel">
        <h1>系统设置</h1>
        <p className="muted">配置 LLM、Embedding、向量数据库等核心服务</p>

        {/* 服务状态 */}
        {validation && (
          <div className="status-box" style={{ marginBottom: 24 }}>
            <h3>服务状态</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              <div>
                <span
                  className={`status-badge ${
                    validation.llm.status === "ok" ? "status-success" : "status-error"
                  }`}
                >
                  {validation.llm.status === "ok" ? "✓" : "✗"} LLM
                </span>
                <p className="hint">{validation.llm.message}</p>
              </div>
              <div>
                <span
                  className={`status-badge ${
                    validation.embedding.status === "ok" ? "status-success" : "status-error"
                  }`}
                >
                  {validation.embedding.status === "ok" ? "✓" : "✗"} Embedding
                </span>
                <p className="hint">{validation.embedding.message}</p>
              </div>
              <div>
                <span
                  className={`status-badge ${
                    validation.vector_db.status === "ok" ? "status-success" : "status-error"
                  }`}
                >
                  {validation.vector_db.status === "ok" ? "✓" : "✗"} Vector DB
                </span>
                <p className="hint">{validation.vector_db.message}</p>
              </div>
            </div>
          </div>
        )}

        <div className="form-grid">
          <h2 className="section-gap">LLM 配置</h2>

          <div>
            <label>LLM 提供商</label>
            <select
              className="input"
              value={llmProvider}
              onChange={(e) => setLlmProvider(e.target.value)}
            >
              <option value="ollama">Ollama (本地)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>

          <div>
            <label>模型名称</label>
            <input
              type="text"
              className="input"
              value={llmModel}
              onChange={(e) => setLlmModel(e.target.value)}
              placeholder="llama2, gpt-3.5-turbo, claude-3-haiku"
            />
          </div>

          <div>
            <label>API 地址</label>
            <input
              type="text"
              className="input"
              value={llmBaseUrl}
              onChange={(e) => setLlmBaseUrl(e.target.value)}
              placeholder="http://localhost:11434"
            />
          </div>

          <h2 className="section-gap">Embedding 配置</h2>

          <div>
            <label>Embedding 提供商</label>
            <select
              className="input"
              value={embeddingProvider}
              onChange={(e) => setEmbeddingProvider(e.target.value)}
            >
              <option value="ollama">Ollama (本地)</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>

          <div>
            <label>Embedding 模型</label>
            <input
              type="text"
              className="input"
              value={embeddingModel}
              onChange={(e) => setEmbeddingModel(e.target.value)}
              placeholder="nomic-embed-text, text-embedding-3-small"
            />
          </div>

          <h2 className="section-gap">向量数据库配置</h2>

          <div>
            <label>向量数据库类型</label>
            <select
              className="input"
              value={vectorDbProvider}
              onChange={(e) => setVectorDbProvider(e.target.value)}
            >
              <option value="lancedb">LanceDB (本地)</option>
            </select>
          </div>

          <div>
            <label>数据库路径</label>
            <input
              type="text"
              className="input"
              value={vectorDbPath}
              onChange={(e) => setVectorDbPath(e.target.value)}
              placeholder="./storage/vectors"
            />
          </div>

          <h2 className="section-gap">文档解析配置</h2>

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

          <h2 className="section-gap">RAG 检索配置</h2>

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
          </div>

          <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? "保存中..." : "保存配置"}
            </button>
            <button
              type="button"
              onClick={handleValidate}
              disabled={validating}
              className="btn btn-secondary"
              style={{ marginLeft: 8 }}
            >
              {validating ? "验证中..." : "验证服务"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-ghost"
              style={{ marginLeft: 8 }}
            >
              重置为默认
            </button>
          </div>
        </div>
      </section>

      {/* 系统统计 */}
      {stats && systemStats && (
        <section className="panel" style={{ marginTop: 24 }}>
          <h2>系统统计</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            <div className="stat-card">
              <div className="stat-value">{stats.total_documents}</div>
              <div className="stat-label">文档总数</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.total_knowledge_bases}</div>
              <div className="stat-label">知识库</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.total_tags}</div>
              <div className="stat-label">标签</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.storage_used_mb} MB</div>
              <div className="stat-label">存储使用</div>
            </div>
          </div>

          <h3 style={{ marginTop: 24 }}>系统资源</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            <div>
              <p>
                <strong>CPU:</strong> {systemStats.cpu_percent}%
              </p>
              <p>
                <strong>内存:</strong> {systemStats.memory.available_mb} MB 可用 /{" "}
                {systemStats.memory.total_mb} MB 总计 (
                {systemStats.memory.percent}%)
              </p>
            </div>
            <div>
              <p>
                <strong>磁盘:</strong> {systemStats.disk.free_gb} GB 可用 /{" "}
                {systemStats.disk.total_gb} GB 总计 ({systemStats.disk.percent}%)
              </p>
              <p>
                <strong>Python:</strong> {systemStats.python_version}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="panel" style={{ marginTop: 24 }}>
        <h2>帮助</h2>
        <div className="settings-grid">
          <div className="setting-item">
            <h3>工作流程</h3>
            <p className="muted">
              1. 在「抽取工作台」上传文档并指定标签
              <br />
              2. 系统异步处理文档
              <br />
              3. 在「结果查询」页面查看抽取结果
            </p>
          </div>
          <div className="setting-item">
            <h3>支持格式</h3>
            <p className="muted">
              PDF、DOCX、TXT、Markdown
            </p>
          </div>
          <div className="setting-item">
            <h3>技术栈</h3>
            <p className="muted">
              Next.js 前端 + FastAPI 后端 + LanceDB 向量库
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
