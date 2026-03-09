"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "首页" },
  { href: "/upload", label: "提取" },
  { href: "/documents", label: "文档" },
  { href: "/tags", label: "标签" },
  { href: "/results", label: "结果" },
  { href: "/knowledge-bases", label: "Knowledge Bases" },
  { href: "/settings", label: "设置" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="logo">
          <span className="logo-icon">⬡</span>
          <span className="logo-text">Doc Extractor</span>
        </Link>

        <nav className="main-nav">
          {NAV_ITEMS.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`nav-link${active ? " nav-active" : ""}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
