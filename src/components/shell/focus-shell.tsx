"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ProgressBar } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function FocusShell({
  children,
  current,
  total,
  exitHref = "/dashboard",
  wide = false,
}: {
  children: React.ReactNode;
  current?: number;
  total?: number;
  exitHref?: string;
  /** Widen the content column so a question + workspace can sit side by side on iPad/desktop widths. */
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-4 px-4 md:px-8">
        <Link
          href={exitHref}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
          aria-label="Exit focus mode"
        >
          <X className="h-4 w-4" />
        </Link>
        {typeof current === "number" && typeof total === "number" && total > 0 && (
          <div className="flex flex-1 items-center gap-3">
            <ProgressBar value={current} max={total} className="max-w-md" />
            <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
              {current} / {total}
            </span>
          </div>
        )}
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center px-4 pb-16 md:px-8">
        <div className={cn("w-full", wide ? "max-w-5xl" : "max-w-3xl")}>{children}</div>
      </main>
    </div>
  );
}
