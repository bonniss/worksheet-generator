"use client";
import { useEffect } from "react";
import { holdNavigationProgress } from "./progress-events";

/** Đặt trong skeleton của loading.tsx: giữ thanh tiến trình chạy cho tới khi nội dung thật thay thế skeleton. */
export function LoadingSignal() {
  useEffect(() => holdNavigationProgress(), []);
  return <span className="sr-only" role="status">Đang tải...</span>;
}
