"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "./ui/Toast";

export default function Providers({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
