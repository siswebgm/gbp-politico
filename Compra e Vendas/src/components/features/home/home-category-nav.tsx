"use client";

import Link from "next/link";
import { LayoutGrid, MoreHorizontal } from "lucide-react";

import { categoryIcons } from "@/components/features/categorias/category-icons";
import { cn } from "@/lib/utils";
import type { CategoryWithChildren } from "@/lib/services/categorias";

interface HomeCategoryNavProps {
  categorias: CategoryWithChildren[];
}

export function HomeCategoryNav({ categorias }: HomeCategoryNavProps) {
  return (
    <div className="relative">
      <div className="flex gap-2 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link
          href="/produtos"
          className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-accent hover:text-primary"
        >
          <LayoutGrid className="size-4" />
          <span>Todas</span>
        </Link>

        {categorias.slice(0, 10).map((cat) => (
          <Link
            key={cat.id}
            href={`/produtos?categoria=${cat.slug}`}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-accent hover:text-primary"
            )}
          >
            <span className="text-muted-foreground">
              {categoryIcons[cat.slug] ?? <LayoutGrid className="size-4" />}
            </span>
            <span className="whitespace-nowrap">{cat.nome}</span>
          </Link>
        ))}

        {categorias.length > 10 && (
          <Link
            href="/produtos"
            className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-accent hover:text-primary"
          >
            <MoreHorizontal className="size-4" />
            <span>Mais</span>
          </Link>
        )}
      </div>
    </div>
  );
}
