"use client";

import Link from "next/link";
import {
  Megaphone,
  Star,
  Clock,
  LayoutGrid,
  LogIn,
  Heart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef } from "react";

const services = [
  {
    id: "anunciar",
    title: "Anunciar grátis",
    description: "Venda o que não usa",
    icon: <Megaphone className="size-7 text-primary" />,
    href: "/anuncios/novo",
    highlight: "Grátis",
  },
  {
    id: "mais-vistos",
    title: "Mais vendidos",
    description: "Produtos em alta",
    icon: <Star className="size-7 text-amber-500" />,
    href: "/produtos?ordenar=mais-vistos",
  },
  {
    id: "recentes",
    title: "Visto recentemente",
    description: "Novidades para você",
    icon: <Clock className="size-7 text-blue-500" />,
    href: "/produtos?ordenar=recentes",
  },
  {
    id: "categorias",
    title: "Categorias",
    description: "Explore por setor",
    icon: <LayoutGrid className="size-7 text-emerald-500" />,
    href: "/produtos",
  },
  {
    id: "entrar",
    title: "Entre na sua conta",
    description: "Acesse seus anúncios",
    icon: <LogIn className="size-7 text-violet-500" />,
    href: "/login",
  },
  {
    id: "favoritos",
    title: "Favoritos",
    description: "Itens salvos",
    icon: <Heart className="size-7 text-rose-500" />,
    href: "/favoritos",
  },
];

export function ServiceCards() {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(dir: "left" | "right") {
    if (scrollRef.current) {
      const amount = 320;
      scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
    }
  }

  return (
    <div className="relative z-20 -mt-16 hidden px-4 sm:block md:-mt-24">
      <div className="mx-auto max-w-[1200px]">
        <div className="relative">
          <button
            onClick={() => scroll("left")}
            className="absolute -left-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-foreground shadow-md transition-all hover:bg-muted"
            aria-label="Rolar para esquerda"
          >
            <ChevronLeft className="size-5" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto pb-4 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {services.map((service) => (
              <Link
                key={service.id}
                href={service.href}
                className={cn(
                  "group relative flex min-w-[180px] max-w-[180px] flex-col rounded-xl border border-border/50 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg md:min-w-[200px] md:max-w-[200px]"
                )}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-50">
                    {service.icon}
                  </div>
                  {service.highlight && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {service.highlight}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-foreground">{service.title}</h3>
                <p className="text-xs text-muted-foreground">{service.description}</p>
              </Link>
            ))}
          </div>

          <button
            onClick={() => scroll("right")}
            className="absolute -right-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white text-foreground shadow-md transition-all hover:bg-muted"
            aria-label="Rolar para direita"
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-slate-50 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-50 to-transparent" />
        </div>
      </div>
    </div>
  );
}
