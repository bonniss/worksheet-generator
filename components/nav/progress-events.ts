// Kênh sự kiện cho thanh tiến trình điều hướng.
// - start/done: chuyển trang không qua thẻ <a> (server action redirect, router.push...)
// - hold/release: skeleton (loading.tsx) đang hiển thị → thanh chưa được hoàn tất dù URL đã đổi
export const PROGRESS_START = "nav-progress:start";
export const PROGRESS_DONE = "nav-progress:done";
export const PROGRESS_RELEASE = "nav-progress:release";

let holds = 0;

export function activeHolds() {
  return holds;
}

export function startNavigationProgress() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PROGRESS_START));
}

export function doneNavigationProgress() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PROGRESS_DONE));
}

/** Gọi khi skeleton mount; trả về hàm gọi khi unmount. */
export function holdNavigationProgress() {
  holds++;
  startNavigationProgress();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds = Math.max(0, holds - 1);
    window.dispatchEvent(new Event(PROGRESS_RELEASE));
  };
}
