"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FileText,
  Layers,
  Timer,
  ListChecks,
  LogOut,
  Flame,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/papers", label: "Papers", icon: FileText },
  { href: "/revise", label: "Revise", icon: RotateCcw },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
  { href: "/mock", label: "Mock Exams", icon: Timer },
  { href: "/checklist", label: "Checklist", icon: ListChecks },
];

export function AppShell({
  children,
  xp,
  streakCount,
}: {
  children: React.ReactNode;
  xp?: number;
  streakCount?: number;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex">
        <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold">Ascend</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 md:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">Ascend</span>
          </Link>
          <div className="hidden md:block" />
          <div className="flex items-center gap-4">
            {typeof streakCount === "number" && (
              <div className="flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 text-sm font-medium text-warning">
                <Flame className="h-4 w-4" />
                {streakCount}
              </div>
            )}
            {typeof xp === "number" && (
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                {xp} XP
              </div>
            )}
            <ThemeToggle />
          </div>
        </header>

        <nav className="flex items-center gap-1 overflow-x-auto border-b border-border bg-surface px-2 py-1.5 md:hidden">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
