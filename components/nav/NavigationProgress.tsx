"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { activeHolds, PROGRESS_DONE, PROGRESS_RELEASE, PROGRESS_START } from "./progress-events";

const SHOW_DELAY = 120; // điều hướng nhanh hơn mức này thì không hiện (tránh nháy)
const SAFETY_TIMEOUT = 10_000;

function isModified(e: MouseEvent) {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

/** Thanh 2px ở mép trên khi chuyển trang. App Router không có router events nên tự bắt click/submit/popstate. */
function Progress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [value, setValue] = useState(0); // 0..100
  const [visible, setVisible] = useState(false);
  const active = useRef(false);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const done = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    clearTimers();
    setValue(100);
    timers.current.push(window.setTimeout(() => setVisible(false), 250), window.setTimeout(() => setValue(0), 450));
  }, []);

  const start = useCallback(() => {
    if (active.current) return;
    active.current = true;
    clearTimers();
    setValue(0);
    timers.current.push(
      window.setTimeout(() => {
        if (!active.current) return;
        setVisible(true);
        setValue(12);
        // Nhích dần về ~85% cho tới khi trang mới render xong
        const trickle = () => {
          setValue((v) => (v < 85 ? v + (85 - v) * 0.12 : v));
          if (active.current) timers.current.push(window.setTimeout(trickle, 300));
        };
        timers.current.push(window.setTimeout(trickle, 200));
      }, SHOW_DELAY),
      window.setTimeout(done, SAFETY_TIMEOUT),
    );
  }, [done]);

  // URL đổi = trang mới đã render — trừ khi đang hiện skeleton (loading.tsx): khi đó chờ skeleton gỡ ra.
  // Hoãn một nhịp vì effect của skeleton (hold) chạy sau effect này trong cùng lần commit.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (activeHolds() === 0) done();
    }, 0);
    return () => window.clearTimeout(t);
  }, [pathname, search, done]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || isModified(e)) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download") || !a.href) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      // Cùng trang (hoặc chỉ khác #hash) thì không điều hướng
      if (url.pathname === location.pathname && url.search === location.search) return;
      start();
    };
    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement | null;
      // Form GET (bộ lọc, tìm kiếm) = điều hướng; form server action tự xử lý qua SubmitButton navigates
      if (!e.defaultPrevented && form && form.method.toLowerCase() === "get" && !form.getAttribute("action")?.startsWith("javascript")) start();
    };
    window.addEventListener("click", onClick, true);
    window.addEventListener("submit", onSubmit, true);
    window.addEventListener("popstate", start);
    window.addEventListener(PROGRESS_START, start);
    window.addEventListener(PROGRESS_DONE, done);
    const onRelease = () => { if (activeHolds() === 0) done(); };
    window.addEventListener(PROGRESS_RELEASE, onRelease);
    return () => {
      window.removeEventListener(PROGRESS_RELEASE, onRelease);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("popstate", start);
      window.removeEventListener(PROGRESS_START, start);
      window.removeEventListener(PROGRESS_DONE, done);
      clearTimers();
    };
  }, [start, done]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 print:hidden"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms ease" }}
    >
      <div
        className="h-full bg-primary shadow-[0_0_8px_rgba(37,99,235,0.6)]"
        style={{ width: `${value}%`, transition: value === 0 ? "none" : "width 250ms ease-out" }}
      />
    </div>
  );
}

export function NavigationProgress() {
  // useSearchParams cần Suspense để không ép cả cây sang render phía client
  return (
    <Suspense fallback={null}>
      <Progress />
    </Suspense>
  );
}
