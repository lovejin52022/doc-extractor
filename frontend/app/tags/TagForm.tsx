"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createTag, toErrorMessage, type Tag, updateTag } from "../../lib/api";
import { useToast } from "../../components/ui/Toast";

export default function TagForm({ initial }: { initial?: Tag }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [color, setColor] = useState(initial?.color || "#2563eb");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("标签名不能为空");
    setSaving(true);
    setError(null);
    try {
      if (initial) {
        await updateTag(initial.id, { name: name.trim(), description: description.trim(), color });
        showToast("标签已更新", "success");
      } else {
        await createTag({ name: name.trim(), description: description.trim(), color });
        showToast("标签已创建", "success");
      }
      router.push("/tags");
      router.refresh();
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <div>
        <label>标签名称</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：invoice_no" />
      </div>
      <div>
        <label>描述</label>
        <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="可选" />
      </div>
      <div>
        <label>颜色</label>
        <input className="input" type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 80, padding: 4 }} />
      </div>
      {error && <p className="error">{error}</p>}
      <button disabled={saving} className="btn btn-primary" type="submit">{saving ? "保存中..." : "保存"}</button>
    </form>
  );
}
