"use client";
import { useFormStatus } from "react-dom";
import { startNavigationProgress } from "@/components/nav/progress-events";
import { Button } from ".";

export function SubmitButton({
  children, pendingText = "Đang xử lý...", variant, size, className, confirm, icon, title, navigates,
}: {
  children: React.ReactNode; pendingText?: string; variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg"; className?: string; confirm?: string; icon?: React.ReactNode; title?: string;
  /** Action xong sẽ chuyển trang (redirect) → chạy thanh tiến trình điều hướng */
  navigates?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit" title={title} aria-label={title} variant={variant} size={size} className={className}
      loading={pending} icon={icon}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) { e.preventDefault(); return; }
        // Chỉ chạy khi form hợp lệ (trình duyệt sẽ chặn submit nếu thiếu ô bắt buộc)
        if (navigates && (e.currentTarget.form?.checkValidity() ?? true)) startNavigationProgress();
      }}
    >
      {pending ? pendingText : children}
    </Button>
  );
}
