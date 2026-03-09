"use client";

import { use, useEffect, useMemo, useState } from "react";

import EmptyState from "../../../../components/ui/EmptyState";
import LoadingState from "../../../../components/ui/LoadingState";
import { useToast } from "../../../../components/ui/Toast";
import { knowledgeBaseApi, HitTestChunk } from "../../../../lib/api/knowledgeBases";

type HitCard = HitTestChunk & { id: string };

type QueryHistoryItem = {
  id: string;
  query: string;
  topK: number;
  scoreThreshold: number;
  createdAt: string;
};

const HISTORY_KEY = "doc-extractor-hit-testing-history";

export default function HitTestingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: kbId } = use(params);
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState("5");
  const [scoreThreshold, setScoreThreshold] = useState("0.3");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<HitCard[]>([]);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        setHistory(JSON.parse(raw));
      }
    } catch {
      setHistory([]);
    }
  }, []);

  function persistHistory(nextHistory: QueryHistoryItem[]) {
    setHistory(nextHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
  }

  const parsedTopK = useMemo(() => Number(topK), [topK]);
  const parsedThreshold = useMemo(() => Number(scoreThreshold), [scoreThreshold]);

  async function handleTest() {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return;

    if (!Number.isFinite(parsedTopK) || parsedTopK < 1 || parsedTopK > 20) {
      setError("Top K 请输入 1 ~ 20 的数字");
      return;
    }
    if (!Number.isFinite(parsedThreshold) || parsedThreshold < 0 || parsedThreshold > 1) {
      setError("Score Threshold 请输入 0 ~ 1 的数字");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await knowledgeBaseApi.hitTest(kbId, {
        query: normalizedQuery,
        top_k: parsedTopK,
        threshold: parsedThreshold,
      });

      // Transform API response to local format
      const nextResults = response.results.map((item, index) => ({
        ...item,
        id: `${Date.now()}-${index}`,
      }));
      
      setResults(nextResults);
      setActiveCardId(nextResults[0]?.id ?? null);

      const newHistoryItem: QueryHistoryItem = {
        id: `${Date.now()}`,
        query: normalizedQuery,
        topK: parsedTopK,
        scoreThreshold: parsedThreshold,
        createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      };
      const nextHistory = [newHistoryItem, ...history].slice(0, 8);
      persistHistory(nextHistory);
      showToast(`召回测试完成，找到 ${nextResults.length} 条结果`, "success");
    } catch (e) {
      console.error("Hit test failed:", e);
      setError("召回测试失败，请稍后重试");
      showToast("召回测试失败", "error");
    } finally {
      setLoading(false);
    }
  }

  function applyHistory(item: QueryHistoryItem) {
    setQuery(item.query);
    setTopK(String(item.topK));
    setScoreThreshold(String(item.scoreThreshold));
    showToast("已回填历史参数，可重新测试", "info");
  }

  return (
    <div className="section-gap">
      <h2>召回测试（Hit Testing）</h2>
      <p className="muted">输入 Query 并调整参数，从知识库中检索相关内容。</p>

      <div className="form-grid section-gap">
        <div>
          <label>Query</label>
          <textarea className="input" rows={3} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="请输入测试问题，例如：违约责任如何约定？" />
        </div>

        <div className="kb-params-grid">
          <div>
            <label>Top K</label>
            <input className="input" value={topK} onChange={(e) => setTopK(e.target.value)} />
          </div>
          <div>
            <label>Score Threshold</label>
            <input className="input" value={scoreThreshold} onChange={(e) => setScoreThreshold(e.target.value)} />
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        <div>
          <button className="btn btn-primary" onClick={handleTest} disabled={!query.trim() || loading}>
            {loading ? "测试中..." : "开始测试"}
          </button>
        </div>
      </div>

      <div className="kb-result-layout section-gap">
        <div className="kb-result-block">
          {loading ? (
            <div>
              <LoadingState text="召回中..." />
              <div className="skeleton-rows">
                <div className="skeleton-row" />
                <div className="skeleton-row" />
                <div className="skeleton-row" />
              </div>
            </div>
          ) : results.length === 0 ? (
            <EmptyState icon="🧪" title="暂无测试结果" description="可调整参数后重新测试；若仍为空，说明当前阈值过滤后无结果。" />
          ) : (
            <div className="hit-card-list">
              {results.map((item) => (
                <button
                  key={item.id}
                  className={`hit-card ${activeCardId === item.id ? "hit-card-active" : ""}`}
                  onClick={() => setActiveCardId(item.id)}
                >
                  <div className="between">
                    <strong>Score: {item.score.toFixed(3)}</strong>
                    <span className="muted">{item.source}</span>
                  </div>
                  <p className="muted">{activeCardId === item.id ? item.chunk : `${item.chunk.slice(0, 70)}...`}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="kb-history-panel">
          <div className="between">
            <h3>历史查询</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => persistHistory([])} disabled={history.length === 0}>清空</button>
          </div>
          {history.length === 0 ? (
            <p className="muted section-gap">暂无历史记录。</p>
          ) : (
            <div className="history-list section-gap">
              {history.map((item) => (
                <button key={item.id} className="history-item" onClick={() => applyHistory(item)}>
                  <strong>{item.query}</strong>
                  <p className="muted">TopK: {item.topK} / Threshold: {item.scoreThreshold}</p>
                  <p className="hint">{item.createdAt}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
