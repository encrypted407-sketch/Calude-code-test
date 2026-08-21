import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { xp: true, streakCount: true },
      })
    : null;

  return (
    <AppShell xp={user?.xp} streakCount={user?.streakCount}>
      {children}
    </AppShell>
  );
}
