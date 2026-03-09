"use client";

import { use, useEffect, useState } from "react";

import LoadingState from "../../../../components/ui/LoadingState";
import { useToast } from "../../../../components/ui/Toast";

interface LocalSettings {
  retrievalMode: string;
  topK: string;
  chunkSize: string;
  chunkOverlap: string;
  parser: string;
}

const DEFAULT_SETTINGS: LocalSettings = {
  retrievalMode: "hybrid",
  topK: "5",
  chunkSize: "500",
  chunkOverlap: "100",
  parser: "auto",
};

export default function KnowledgeBaseSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<LocalSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const key = `kb-settings:${id}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    }
    setLoading(false);
  }, [id]);

  function update<K extends keyof LocalSettings>(key: K, value: LocalSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function saveMock() {
    localStorage.setItem(`kb-settings:${id}`, JSON.stringify(settings));
    showToast("配置已保存到本地 mock（localStorage）", "success");
  }

  if (loading) return <div className="section-gap"><LoadingState text="加载本地配置..." /></div>;

  return (
    <div className="section-gap">
      <h2>设置</h2>
      <p className="muted">检索与解析配置可编辑，保存仅落到浏览器本地 mock，不调用后端。</p>

      <div className="settings-grid">
        <div className="setting-item">
          <h3>检索配置</h3>
          <div className="kb-params-grid section-gap">
            <div>
              <label>Retrieval Mode</label>
              <select className="input" value={settings.retrievalMode} onChange={(e) => update("retrievalMode", e.target.value)}>
                <option value="hybrid">Hybrid</option>
                <option value="vector">Vector</option>
                <option value="keyword">Keyword</option>
              </select>
            </div>
            <div>
              <label>Top K</label>
              <input className="input" value={settings.topK} onChange={(e) => update("topK", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="setting-item">
          <h3>解析配置</h3>
          <div className="kb-params-grid section-gap">
            <div>
              <label>Chunk Size</label>
              <input className="input" value={settings.chunkSize} onChange={(e) => update("chunkSize", e.target.value)} />
            </div>
            <div>
              <label>Chunk Overlap</label>
              <input className="input" value={settings.chunkOverlap} onChange={(e) => update("chunkOverlap", e.target.value)} />
            </div>
            <div>
              <label>Parser</label>
              <select className="input" value={settings.parser} onChange={(e) => update("parser", e.target.value)}>
                <option value="auto">Auto</option>
                <option value="ocr-first">OCR First</option>
                <option value="text-first">Text First</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="actions" style={{ justifyContent: "flex-start" }}>
        <button className="btn btn-primary" onClick={saveMock}>保存配置（本地 mock）</button>
      </div>
    </div>
  );
}
