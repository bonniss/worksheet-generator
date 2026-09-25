import { LoadingSignal } from "@/components/nav/LoadingSignal";
import { Page, Skeleton } from "@/components/ui";
import { FormCardSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <Page width="form">
      <LoadingSignal />
      <Skeleton className="mb-3 h-4 w-24" />
      <div className="mb-4 flex items-center gap-4">
        <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
        <Skeleton className="h-9 w-56" />
      </div>
      <div className="mb-8 flex flex-wrap gap-2">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="space-y-6">
        <FormCardSkeleton fields={4} twoCol />
        <FormCardSkeleton fields={0} />
      </div>
    </Page>
  );
}
