import WorksheetGenerator from "@/components/WorksheetGenerator";
import { getGenSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function Page() {
  return <WorksheetGenerator gen={await getGenSettings()} />;
}
