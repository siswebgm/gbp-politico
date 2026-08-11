import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface HomeSectionProps {
  title: string;
  href: string;
  children: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
}

export function HomeSection({
  title,
  href,
  children,
  className,
  badge,
}: HomeSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-foreground sm:text-xl">
            {title}
          </h2>
          {badge}
        </div>
        <Link
          href={href}
          className="flex items-center gap-0.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
        >
          Ver todos
          <ChevronRight className="size-4" />
        </Link>
      </div>
      {children}
    </section>
  );
}
