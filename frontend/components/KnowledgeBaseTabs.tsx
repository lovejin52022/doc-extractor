"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { key: "documents", label: "文档", path: "documents" },
  { key: "hit-testing", label: "召回测试", path: "hit-testing" },
  { key: "settings", label: "设置", path: "settings" },
];

export default function KnowledgeBaseTabs({ id }: { id: string }) {
  const pathname = usePathname();

  return (
    <div className="kb-subnav" role="tablist" aria-label="知识库二级导航">
      {TABS.map((tab) => {
        const href = `/knowledge-bases/${id}/${tab.path}`;
        const active = pathname === href;
        return (
          <Link key={tab.key} href={href} className={`kb-subnav-link${active ? " kb-subnav-link-active" : ""}`}>
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
