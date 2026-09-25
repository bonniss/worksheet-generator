import { ListPageSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return <ListPageSkeleton actions={0} selects={3} columns={6} />;
}
