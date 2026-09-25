import { LoadingSignal } from "@/components/nav/LoadingSignal";
import { Skeleton } from "@/components/ui";

// Chưa biết level nên dùng nền trung tính; khung giống màn hình worksheet (toolbar + tờ giấy 640px)
export default function Loading() {
  return (
    <div className="app-ui min-h-[calc(100vh-var(--app-top,0px))] bg-zinc-200/60 px-2.5 pb-16 pt-[18px]">
      <LoadingSignal />
      <div className="mx-auto mb-3.5 flex max-w-[640px] items-center gap-2 rounded-2xl bg-white/90 px-3.5 py-2.5">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
        <div className="flex-1" />
        {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-7 w-16 rounded-full" />)}
      </div>
      <div className="mx-auto max-w-[640px] rounded-3xl bg-white p-6 shadow-large">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="mx-auto mt-6 h-7 w-2/3" />
        <Skeleton className="mx-auto mt-3 h-4 w-1/2" />
        {[0, 1, 2].map((s) => (
          <div key={s} className="mt-8">
            <div className="mb-4 flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-5 w-48" />
            </div>
            <div className="space-y-3 pl-11">
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
