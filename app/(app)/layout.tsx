import { AppHeader } from "@/components/nav/AppHeader";
import { requireUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <AppHeader user={user} />
      {children}
    </>
  );
}
