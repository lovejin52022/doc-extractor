import Link from "next/link";
import TagForm from "../TagForm";

export default function NewTagPage() {
  return (
    <main className="page-wrap">
      <section className="panel">
        <div className="between">
          <h1>新建标签</h1>
          <Link href="/tags" className="btn btn-ghost btn-sm">返回</Link>
        </div>
        <TagForm />
      </section>
    </main>
  );
}
