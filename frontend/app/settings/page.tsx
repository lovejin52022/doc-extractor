import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "设置 - Doc Extractor",
};

export default function SettingsPage() {
  return (
    <main className="page-wrap">
      <section className="panel">
        <h1>设置与帮助</h1>
        <p className="muted">
          此页面用于后续集成配置项和帮助文档。当前功能为占位展示。
        </p>

        <div className="settings-grid">
          <div className="setting-item">
            <h3>
              API 端点配置
              <span className="placeholder-tag">Placeholder</span>
            </h3>
            <p className="muted">
              配置后端 API 地址。当前通过 Next.js rewrites 代理到
              localhost:8000。
            </p>
          </div>

          <div className="setting-item">
            <h3>
              抽取引擎选择
              <span className="placeholder-tag">Placeholder</span>
            </h3>
            <p className="muted">
              在模拟引擎、OCR 引擎、LLM 引擎之间切换。当前后端使用模拟占位逻辑。
            </p>
          </div>

          <div className="setting-item">
            <h3>
              通知与 Webhook
              <span className="placeholder-tag">Placeholder</span>
            </h3>
            <p className="muted">
              配置任务完成后的 Webhook 回调 URL 和通知方式。
            </p>
          </div>

          <div className="setting-item">
            <h3>帮助</h3>
            <p className="muted">
              <strong>工作流程：</strong>在「抽取工作台」上传文档并指定标签 →
              系统异步处理 → 在「结果查询」页面查看抽取结果。
              <br />
              <strong>支持格式：</strong>PDF、DOCX。
              <br />
              <strong>技术栈：</strong>Next.js 前端 + FastAPI 后端，任务异步流转。
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
