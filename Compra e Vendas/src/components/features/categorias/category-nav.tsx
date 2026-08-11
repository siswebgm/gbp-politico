"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { categoryIcons } from "@/components/features/categorias/category-icons";
import { useBannerColor } from "@/components/features/banners/banner-color-context";
import { isLightColor } from "@/lib/utils/color";
import type { CategoryWithChildren } from "@/lib/services/categorias";

export function CategoryNav({
  categorias,
}: {
  categorias: CategoryWithChildren[];
}) {
  const pathname = usePathname();
  const isHome = pathname === "/home";

  const { topColor, bannerInView } = useBannerColor();
  const activeColor = isHome && bannerInView ? topColor : null;
  const isLight = activeColor ? isLightColor(activeColor) : false;
  const textColor = isLight ? "text-foreground/90" : "text-primary-foreground/90";
  const hoverBg = isLight ? "hover:bg-foreground/10" : "hover:bg-primary-foreground/10";

  const items = [
    { slug: "", nome: "Mercado" },
    { slug: "mais-vistos", nome: "Mais vendidos" },
    ...categorias.slice(0, 4),
    { slug: "todos", nome: "Mais" },
  ];

  return (
    <nav
      className={cn(
        "sticky z-40 hidden border-t border-white/10 sm:block",
        isHome ? "top-14" : "top-0 bg-slate-900"
      )}
      style={{ backgroundColor: activeColor || undefined }}
    >
      <div className="mx-auto flex h-12 max-w-[1200px] items-center justify-between gap-2 px-4 md:px-6">
        <div className="flex items-center gap-1 overflow-hidden">
          {items.map((category) => {
            const href =
              category.slug === "todos"
                ? "/produtos"
                : category.slug === "mais-vistos"
                  ? "/produtos?ordenar=mais-vistos"
                  : `/produtos?categoria=${category.slug}`;
            const icon = categoryIcons[category.slug] ?? categoryIcons.mais;

            return (
              <Link
                key={category.slug}
                href={href}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  textColor,
                  hoverBg
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
                  {icon}
                </span>
                <span className="hidden truncate lg:inline">{category.nome}</span>
              </Link>
            );
          })}
        </div>

        <Button
          asChild
          size="sm"
          className="h-9 shrink-0 gap-1.5 rounded-full bg-white px-4 text-sm font-bold text-primary shadow-md transition-all hover:shadow-lg hover:brightness-110"
        >
          <Link href="/anuncios/novo">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Anunciar grátis</span>
          </Link>
        </Button>
      </div>
    </nav>
  );
}
