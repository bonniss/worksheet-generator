"use client";
import { useFormStatus } from "react-dom";
import { Button } from ".";

export function SubmitButton({
  children, pendingText = "Đang xử lý...", variant, size, className, confirm,
}: {
  children: React.ReactNode; pendingText?: string; variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md"; className?: string; confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit" variant={variant} size={size} className={className} disabled={pending}
      onClick={confirm ? (e) => { if (!window.confirm(confirm)) e.preventDefault(); } : undefined}
    >
      {pending ? pendingText : children}
    </Button>
  );
}
