import { LoadingSignal } from "@/components/nav/LoadingSignal";
import { Card, Page, Skeleton } from "@/components/ui";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <Page>
      <LoadingSignal />
      <PageHeaderSkeleton actions={1} />
      <Skeleton className="mb-4 h-9 w-64 rounded-lg" />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[92px] rounded-lg" />)}
      </div>
      <Card className="mb-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-2 h-3.5 w-56" />
        <Skeleton className="mt-5 h-[220px] rounded-lg" />
      </Card>
      <TableSkeleton columns={7} rows={5} />
    </Page>
  );
}
