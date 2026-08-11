"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCarrinho } from "@/lib/hooks/use-carrinho";
import { cn } from "@/lib/utils";
import type { CategoryWithChildren } from "@/lib/services/categorias";

interface HeaderSearchProps {
  categorias: CategoryWithChildren[];
}

export function HeaderSearch({ categorias }: HeaderSearchProps) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("");
  const { carrinhoCount } = useCarrinho();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (categoria) params.set("categoria", categoria);
    const query = params.toString();
    router.push(`/produtos${query ? `?${query}` : ""}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-1 items-center justify-center gap-2 px-0 sm:px-4"
    >
      <div className="flex h-10 w-full items-center overflow-hidden rounded-full bg-white shadow-md sm:h-11 sm:max-w-2xl">
        <div className="hidden h-full shrink-0 border-r border-slate-100 sm:block">
          <label htmlFor="header-category" className="sr-only">
            Categoria
          </label>
          <select
            id="header-category"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="h-full cursor-pointer appearance-none bg-transparent pl-3 pr-6 text-xs font-medium text-slate-700 outline-none hover:bg-slate-50"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.5rem center",
            }}
          >
            <option value="">Todas</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Buscar produtos..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-10 w-full border-0 bg-transparent pl-4 pr-10 text-sm text-foreground shadow-none placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 sm:h-11 sm:pl-5"
          />
        </div>

        <Button
          type="submit"
          variant="ghost"
          className="h-10 w-11 shrink-0 rounded-none px-0 text-slate-500 hover:bg-transparent hover:text-foreground sm:h-11 sm:w-12"
        >
          <Search className="size-4 sm:size-5" />
        </Button>
      </div>

      <Link
        href="/carrinho"
        className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-opacity hover:opacity-80 sm:hidden"
        aria-label="Carrinho"
      >
        <ShoppingCart className="size-5" />
        {carrinhoCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
            {carrinhoCount > 99 ? "99+" : carrinhoCount}
          </span>
        )}
      </Link>
    </form>
  );
}
