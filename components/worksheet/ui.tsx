"use client";
/* Thành phần giao diện nhỏ dùng chung giữa màn hình worksheet và các panel */
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode, type TextareaHTMLAttributes } from "react";
import type { Theme } from "@/lib/worksheet/types";

export function Spinner({ color }: { color: string }) {
  return (
    <span style={{
      display: "inline-block", width: 14, height: 14, border: `2px solid ${color}`,
      borderTopColor: "transparent", borderRadius: "50%", animation: "wsspin 0.8s linear infinite",
    }} />
  );
}

export function ToolBtn({ onClick, children, theme, disabled, title, active }: {
  onClick: () => void; children: ReactNode; theme: Theme; disabled?: boolean; title?: string; active?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} className="ws-noprint" style={{
      border: `1.5px solid ${active ? theme.accent : theme.line}`, background: active ? theme.softBg : "#fff", color: theme.accent,
      borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700,
      cursor: disabled ? "default" : "pointer", fontFamily: theme.body, opacity: disabled ? 0.5 : 1,
      display: "inline-flex", alignItems: "center", gap: 5,
    }}>{children}</button>
  );
}

/** Nút nhỏ dạng viên thuốc (chọn phạm vi, chip...) */
export function Chip({ on, onClick, children, theme, title, style }: {
  on?: boolean; onClick: () => void; children: ReactNode; theme: Theme; title?: string; style?: CSSProperties;
}) {
  return (
    <button type="button" onClick={onClick} title={title} style={{
      border: `1.5px solid ${on ? theme.accent : theme.line}`, background: on ? theme.accent : "#fff",
      color: on ? "#fff" : theme.accent, borderRadius: 999, padding: "4px 11px", fontSize: 12.5, fontWeight: 700,
      cursor: "pointer", fontFamily: theme.body, ...style,
    }}>{children}</button>
  );
}

/** Textarea tự cao theo nội dung — luôn thấy đủ chữ, không phải kéo */
export function AutoTextarea({ value, style, minRows = 1, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + 2 + "px";
  }, [value]);
  return <textarea ref={ref} rows={minRows} value={value} {...rest} style={{ resize: "none", overflow: "hidden", ...style }} />;
}
