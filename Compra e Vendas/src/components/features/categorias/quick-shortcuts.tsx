"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  LayoutGrid,
  Star,
  Car,
  Smartphone,
  Home,
  Shirt,
  Sofa,
  Bike,
  Briefcase,
  PawPrint,
  Dumbbell,
  MoreHorizontal,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryWithChildren } from "@/lib/services/categorias";

const iconMap: Record<string, React.ReactNode> = {
  veiculos: <Car className="size-5" />,
  imoveis: <Home className="size-5" />,
  celulares: <Smartphone className="size-5" />,
  eletronicos: <Smartphone className="size-5" />,
  moda: <Shirt className="size-5" />,
  "moda-e-acessorios": <Shirt className="size-5" />,
  moveis: <Sofa className="size-5" />,
  esportes: <Bike className="size-5" />,
  servicos: <Briefcase className="size-5" />,
  animais: <PawPrint className="size-5" />,
  saude: <Dumbbell className="size-5" />,
  mais: <MoreHorizontal className="size-5" />,
};

export function QuickShortcuts({ categorias }: { categorias: CategoryWithChildren[] }) {
  const searchParams = useSearchParams();
  const categoria = searchParams.get("categoria") ?? "";

  const items = [
    { slug: "", label: "Mercado", icon: <LayoutGrid className="size-5" /> },
    { slug: "mais-vendidos", label: "Mais vendidos", icon: <Star className="size-5" /> },
    ...categorias.slice(0, 5).map((c) => ({
      slug: c.slug,
      label: c.nome.length > 12 ? `${c.nome.slice(0, 11)}...` : c.nome,
      icon: iconMap[c.slug] ?? <LayoutGrid className="size-5" />,
    })),
    { slug: "doacoes", label: "Doações", icon: <Heart className="size-5" /> },
    { slug: "todos", label: "Mais", icon: <MoreHorizontal className="size-5" /> },
  ];

  return (
    <div className="relative z-20 -mt-14 sm:hidden">
      <div className="flex gap-2 overflow-x-auto px-3 pb-3 pt-10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const isActive = categoria === item.slug;
          const href =
            item.slug === "todos"
              ? "/produtos"
              : item.slug === "mais-vendidos"
                ? "/produtos?ordenar=mais-vistos"
                : item.slug === "doacoes"
                  ? "/produtos?preco_max=0"
                  : `/produtos?categoria=${item.slug}`;

          return (
            <Link
              key={item.slug}
              href={href}
              className="flex min-w-[4rem] max-w-[4rem] flex-col items-center gap-1.5 text-center"
            >
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-full border bg-white shadow-sm transition-all",
                  isActive
                    ? "border-primary text-primary ring-2 ring-primary/20"
                    : "border-slate-100 text-foreground hover:border-primary/30 hover:text-primary"
                )}
              >
                {item.icon}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-[9px] font-medium leading-tight",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
