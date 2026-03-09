export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Doc Extractor</h1>
      <p className="mt-3">最小可运行前端骨架已就绪。下一步可接入上传与抽取流程。</p>
      <ul className="mt-4 list-disc pl-6">
        <li>上传入口预留：/upload</li>
        <li>结果页预留：/results</li>
        <li>后端健康检查：GET /api/health</li>
      </ul>
    </main>
  );
}
