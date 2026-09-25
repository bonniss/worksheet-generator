import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import WorksheetGenerator from "@/components/WorksheetGenerator";
import { db } from "@/db";
import { users, worksheets } from "@/db/schema";
import { canEditWorksheet, canViewWorksheet } from "@/lib/auth/guards";
import { requireUser } from "@/lib/auth/session";
import { isUuid } from "@/lib/validators";

export default async function WorksheetPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!isUuid(params.id)) notFound();
  const [row] = await db
    .select({ ws: worksheets, ownerName: users.name, ownerUsername: users.username })
    .from(worksheets)
    .innerJoin(users, eq(worksheets.ownerId, users.id))
    .where(eq(worksheets.id, params.id))
    .limit(1);
  if (!row || !canViewWorksheet(user, row.ws)) notFound();
  const editable = canEditWorksheet(user, row.ws);
  return (
    <WorksheetGenerator
      key={row.ws.id}
      initial={row.ws.data}
      worksheetId={row.ws.id}
      access={{
        readOnly: !editable,
        visibility: row.ws.visibility,
        owner: { name: row.ownerName, username: row.ownerUsername, isMe: row.ws.ownerId === user.id },
      }}
    />
  );
}
