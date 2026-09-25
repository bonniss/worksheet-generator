"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition, type FormEvent, type ReactNode } from "react";
import { startNavigationProgress } from "@/components/nav/progress-events";
import { Button } from ".";

/**
 * Thanh lọc cho trang danh sách. Chuyển trang phía client (router.push) thay vì submit form GET thuần
 * — tránh tải lại cả trang, giữ skeleton + thanh tiến trình. Bỏ các tham số rỗng và luôn về trang 1.
 */
export function FilterBar({ children, filtered }: { children: ReactNode; filtered?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const sp = new URLSearchParams();
    new FormData(e.currentTarget).forEach((v, k) => {
      if (typeof v === "string" && v.trim()) sp.set(k, v.trim());
    });
    const qs = sp.toString();
    startNavigationProgress();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  return (
    <form onSubmit={onSubmit} role="search" className="mb-4 flex flex-wrap items-center gap-2">
      {children}
      <Button type="submit" variant="ghost" loading={pending}>Lọc</Button>
      {filtered && !pending && (
        <Link href={pathname} className="text-[13px] text-zinc-500 hover:text-primary">Xoá lọc</Link>
      )}
    </form>
  );
}
