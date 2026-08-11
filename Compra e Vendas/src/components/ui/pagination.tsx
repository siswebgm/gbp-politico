import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages);

  return (
    <nav className="flex items-center justify-center gap-1 py-8">
      <PaginationLink
        href={buildHref(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft className="size-4" />
      </PaginationLink>

      {pages.map((p, index) =>
        p === "..." ? (
          <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
            …
          </span>
        ) : (
          <PaginationLink key={p} href={buildHref(p)} active={p === page}>
            {p}
          </PaginationLink>
        )
      )}

      <PaginationLink
        href={buildHref(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        aria-label="Próxima página"
      >
        <ChevronRight className="size-4" />
      </PaginationLink>
    </nav>
  );
}

function PaginationLink({
  href,
  active,
  disabled,
  children,
  ...props
}: {
  href: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (disabled) {
    return (
      <span className="flex size-9 items-center justify-center rounded-md text-sm text-muted-foreground opacity-40">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex size-9 items-center justify-center rounded-md text-sm hover:bg-accent",
        active && "bg-foreground text-background hover:bg-foreground"
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  const delta = 1;
  const range: (number | "...")[] = [];
  const rangeStart = Math.max(2, current - delta);
  const rangeEnd = Math.min(total - 1, current + delta);

  range.push(1);
  if (rangeStart > 2) range.push("...");
  for (let i = rangeStart; i <= rangeEnd; i++) range.push(i);
  if (rangeEnd < total - 1) range.push("...");
  if (total > 1) range.push(total);

  return range;
}
