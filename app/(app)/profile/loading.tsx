import { LoadingSignal } from "@/components/nav/LoadingSignal";
import { Card, Page, Skeleton } from "@/components/ui";
import { FieldSkeleton, FormCardSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <Page width="form">
      <LoadingSignal />
      <PageHeaderSkeleton sub={false} />
      <div className="space-y-6">
        <Card>
          <div className="mb-6 flex items-center gap-4">
            <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-2 h-4 w-56" />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <div className="mt-5"><FieldSkeleton /></div>
        </Card>
        <FormCardSkeleton fields={3} />
      </div>
    </Page>
  );
}
