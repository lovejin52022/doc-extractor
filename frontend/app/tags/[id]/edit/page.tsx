"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import LoadingState from "../../../../components/ui/LoadingState";
import TagForm from "../../TagForm";
import { getTag, type Tag } from "../../../../lib/api";

export default function EditTagPage() {
  const params = useParams<{ id: string }>();
  const [tag, setTag] = useState<Tag | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTag(params.id).then(setTag).finally(() => setLoading(false));
  }, [params.id]);

  return (
    <main className="page-wrap">
      <section className="panel">
        <div className="between">
          <h1>编辑标签</h1>
          <Link href="/tags" className="btn btn-ghost btn-sm">返回</Link>
        </div>
        {loading ? <LoadingState /> : tag ? <TagForm initial={tag} /> : <p className="error">标签不存在</p>}
      </section>
    </main>
  );
}
