"use client";
import { useState } from "react";
import { Alert, Button } from "@/components/ui";

/** Hiện mật khẩu vừa sinh (chỉ một lần) kèm nút copy. */
export function PasswordReveal({ username, password }: { username?: string; password: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Alert kind="info">
      <div className="mb-1">Mật khẩu {username ? <>của <b>{username}</b></> : "mới"} (chỉ hiện một lần — hãy lưu lại):</div>
      <div className="flex items-center gap-2">
        <code className="rounded bg-white px-2 py-1 font-mono text-base">{password}</code>
        <Button
          type="button" variant="secondary" size="sm"
          onClick={() => navigator.clipboard.writeText(password).then(() => setCopied(true))}
        >
          {copied ? "Đã copy" : "Copy"}
        </Button>
      </div>
    </Alert>
  );
}
