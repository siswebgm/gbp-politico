"use client";

import { cn } from "@/lib/utils";

interface HomeShellProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  rightSidebar?: React.ReactNode;
  className?: string;
}

export function HomeShell({
  children,
  sidebar,
  rightSidebar,
  className,
}: HomeShellProps) {
  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-[1400px] gap-6 px-3 pt-4 sm:px-4 lg:px-6 xl:grid-cols-[220px_1fr_280px]",
        className
      )}
    >
      {sidebar && (
        <aside className="hidden shrink-0 xl:block">
          <div className="sticky top-20 space-y-4">{sidebar}</div>
        </aside>
      )}

      <main className="min-w-0">{children}</main>

      {rightSidebar && (
        <aside className="hidden shrink-0 lg:block">
          <div className="sticky top-20 space-y-5">{rightSidebar}</div>
        </aside>
      )}
    </div>
  );
}
