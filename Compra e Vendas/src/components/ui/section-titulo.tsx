import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionTitle({
  titulo,
  href,
  className,
  linkClassName,
}: {
  titulo: string;
  href?: string;
  className?: string;
  linkClassName?: string;
}) {
  return (
    <div className="mb-6 flex items-center justify-between border-b pb-4">
      <h2 className={cn("text-3xl font-bold tracking-tight", className)}>{titulo}</h2>
      {href && (
        <Link
          href={href}
          className={cn(
            "group flex items-center gap-1 text-sm font-semibold text-primary transition-all hover:gap-2",
            linkClassName
          )}
        >
          Ver todos
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </Link>
      )}
    </div>
  );
}
