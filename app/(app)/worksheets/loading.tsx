import { ListPageSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <ListPageSkeleton actions={1} selects={2} columns={6} />;
}
