"use client";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from ".";

export function SubmitButton({
  children, pendingText = "Đang xử lý...", variant, size, className, confirm, icon, title,
}: {
  children: React.ReactNode; pendingText?: string; variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg"; className?: string; confirm?: string; icon?: React.ReactNode; title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit" title={title} aria-label={title} variant={variant} size={size} className={className} disabled={pending}
      onClick={confirm ? (e) => { if (!window.confirm(confirm)) e.preventDefault(); } : undefined}
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : icon}
      {pending ? pendingText : children}
    </Button>
  );
}
