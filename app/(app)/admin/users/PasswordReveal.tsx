"use client";
import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui";

/** Hiện mật khẩu vừa sinh (chỉ một lần) kèm nút copy. */
export function PasswordReveal({ username, password }: { username?: string; password: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl bg-success-soft p-4">
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-green-800">
        <KeyRound size={16} className="text-success" />
        {username ? <span>Mật khẩu của <span className="font-mono">@{username}</span></span> : "Mật khẩu mới"}
        <span className="font-normal text-green-700">— chỉ hiện một lần, hãy lưu lại</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-white py-1.5 pl-3.5 pr-1.5 shadow-[inset_0_0_0_1px_#E4E4E7]">
        <code className="flex-1 truncate text-[15px] tracking-wide text-zinc-900">{password}</code>
        <Button
          type="button" variant="ghost" size="sm"
          onClick={() => navigator.clipboard.writeText(password).then(() => setCopied(true))}
        >
          {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
          {copied ? "Đã copy" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
