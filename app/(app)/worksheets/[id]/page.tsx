import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import WorksheetGenerator from "@/components/WorksheetGenerator";
import { db } from "@/db";
import { worksheets } from "@/db/schema";
import { canAccessWorksheet } from "@/lib/auth/guards";
import { requireUser } from "@/lib/auth/session";
import { isUuid } from "@/lib/validators";

export default async function WorksheetPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!isUuid(params.id)) notFound();
  const [row] = await db.select().from(worksheets).where(eq(worksheets.id, params.id)).limit(1);
  if (!row || !canAccessWorksheet(user, row)) notFound();
  return <WorksheetGenerator key={row.id} initial={row.data} worksheetId={row.id} />;
}
