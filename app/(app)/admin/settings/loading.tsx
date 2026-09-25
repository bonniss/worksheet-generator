import { LoadingSignal } from "@/components/nav/LoadingSignal";
import { Page } from "@/components/ui";
import { FormCardSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <Page>
      <LoadingSignal />
      <PageHeaderSkeleton titleWidth="w-44" />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <FormCardSkeleton fields={2} icon />
        <FormCardSkeleton fields={2} icon />
      </div>
    </Page>
  );
}
