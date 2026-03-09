import Link from "next/link";
import FeatureCard from "../components/FeatureCard";

export default function HomePage() {
  return (
    <main className="page-wrap">
      <section className="hero-card">
        <p className="eyebrow">Document Intelligence</p>
        <h1>Doc Extractor</h1>
        <p className="muted">
          对齐 Anything-Extract 的流程化思路：上传文档 → 创建任务 → 异步抽取 → 结果展示。
          <br />
          支持 PDF / DOCX，灵活指定抽取标签，实时追踪任务状态。
        </p>
        <div className="actions">
          <Link className="btn btn-primary" href="/upload">
            开始上传
          </Link>
          <Link className="btn btn-ghost" href="/results">
            查看结果
          </Link>
        </div>
      </section>

      <div className="features-grid">
        <FeatureCard
          icon="📄"
          title="文档上传"
          description="拖放或选择 PDF / DOCX 文件，自动存储到后端。"
        />
        <FeatureCard
          icon="🏷️"
          title="标签化抽取"
          description="自定义抽取标签（如姓名、日期、金额），按需精准提取。"
        />
        <FeatureCard
          icon="⚡"
          title="异步任务处理"
          description="任务提交后异步执行，实时轮询状态直至完成。"
        />
        <FeatureCard
          icon="🔍"
          title="OCR / 向量检索"
          description="后续集成 OCR 识别与向量语义检索能力。"
          disabled
        />
        <FeatureCard
          icon="📊"
          title="批量处理"
          description="一次上传多文档批量创建抽取任务。"
          disabled
        />
        <FeatureCard
          icon="🔗"
          title="Webhook 回调"
          description="任务完成后主动推送结果到外部系统。"
          disabled
        />
      </div>
    </main>
  );
}
