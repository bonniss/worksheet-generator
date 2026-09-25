"use client";
import { useEffect } from "react";
import { CHANGELOG_SEEN_KEY } from "@/lib/changelog";

/** Ghi nhận đã xem bản mới nhất (theo trình duyệt) để tắt chấm "mới" trên sidebar. */
export function MarkSeen({ version }: { version: string }) {
  useEffect(() => {
    try {
      localStorage.setItem(CHANGELOG_SEEN_KEY, version);
    } catch {
      /* trình duyệt chặn lưu trữ — bỏ qua */
    }
    window.dispatchEvent(new Event("changelog-seen"));
  }, [version]);
  return null;
}
