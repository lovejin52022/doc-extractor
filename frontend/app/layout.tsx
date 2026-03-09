import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import Header from "../components/Header";
import Providers from "../components/Providers";

export const metadata: Metadata = {
  title: "Doc Extractor",
  description: "文档智能抽取平台",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
