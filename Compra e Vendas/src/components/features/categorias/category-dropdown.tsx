"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Grid3x3 } from "lucide-react";
import * as Icons from "lucide-react";

import type { CategoryWithChildren } from "@/lib/services/categorias";
import { cn } from "@/lib/utils";

function CategoryIcon({ name }: { name: string | null }) {
  const IconComponent =
    (name &&
      (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
        toPascalCase(name)
      ]) ||
    Icons.Package;

  return <IconComponent className="size-4" />;
}

function toPascalCase(kebab: string): string {
  return kebab
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function CategoryDropdown({
  categorias,
}: {
  categorias: CategoryWithChildren[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
      >
        <Grid3x3 className="size-4" />
        <span>Todas as Categorias</span>
        <ChevronDown
          className={cn(
            "size-4 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute left-0 top-full z-50 mt-2 w-[600px] rounded-xl border bg-white shadow-2xl">
            <div className="grid grid-cols-3 gap-1 p-4">
              {categorias.map((category) => (
                <Link
                  key={category.id}
                  href={`/produtos?categoria=${category.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-primary/5"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                    <CategoryIcon name={category.icone} />
                  </div>
                  <span className="text-sm font-medium text-foreground group-hover:text-primary">
                    {category.nome}
                  </span>
                </Link>
              ))}
            </div>

            <div className="border-t bg-muted/30 px-4 py-3">
              <Link
                href="/produtos"
                onClick={() => setIsOpen(false)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Ver todos os produtos →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
