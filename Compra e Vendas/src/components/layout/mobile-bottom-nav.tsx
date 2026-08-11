"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Home,
  LayoutGrid,
  Plus,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCarrinho } from "@/lib/hooks/use-carrinho";
import type { CategoryWithChildren } from "@/lib/services/categorias";
import type { Tables } from "@/lib/supabase/database.types";

interface MobileBottomNavProps {
  categorias: CategoryWithChildren[];
  user: Tables<"usuarios"> | null;
}

const navItems = [
  { key: "inicio", label: "Início", icon: Home, href: "/" },
  { key: "categorias", label: "Categorias", icon: LayoutGrid },
  { key: "adicionar", label: "Adicionar", icon: Plus, href: "/anuncios/novo" },
  { key: "carrinho", label: "Carrinho", icon: ShoppingCart, href: "/carrinho" },
  { key: "usuario", label: "Usuário", icon: User, href: "/painel" },
];

export function MobileBottomNav({ categorias, user }: MobileBottomNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { carrinhoCount } = useCarrinho();

  const fullPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
  const hasCategory = pathname === "/produtos" && searchParams?.has("categoria");

  function isActive(href?: string, key?: string) {
    if (key === "categorias") return pathname === "/produtos" || open;
    if (key === "filtros") return filterOpen;
    if (!href) return false;
    return fullPath === href;
  }

  // Modifica navItems dinamicamente baseado na presença de categoria
  const displayItems = hasCategory
    ? navItems.map((item) =>
        item.key === "mais-vistos"
          ? { key: "filtros", label: "Filtros", icon: SlidersHorizontal }
          : item
      )
    : navItems;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 transform bg-background px-4 pb-4 pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-out sm:hidden",
          open ? "-translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex items-center justify-between border-b px-1 py-3">
          <span className="text-base font-semibold">Categorias</span>
          <button
            onClick={() => setOpen(false)}
            className="rounded-full p-1.5 hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                router.push("/produtos");
                setOpen(false);
              }}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-95"
            >
              Todas as categorias
            </button>
            {categorias.map((categoria) => (
              <button
                key={categoria.id}
                onClick={() => {
                  router.push(`/produtos?categoria=${categoria.slug}`);
                  setOpen(false);
                }}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-primary hover:bg-primary/5 hover:text-primary hover:shadow-md active:scale-95"
              >
                {categoria.nome}
              </button>
            ))}
          </div>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-[100] border-t bg-background/95 px-4 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:hidden">
        <div className="flex h-16 items-center justify-between">
          {displayItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.key);
            const disabled = (item.key === "usuario" || item.key === "carrinho") && !user;
            const href = disabled ? "/login" : item.href;

            if (item.key === "categorias") {
              return (
                <button
                  key={item.key}
                  onClick={() => setOpen((v) => !v)}
                  type="button"
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 p-1 text-[10px] font-medium transition-colors touch-manipulation",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <Icon className="size-5" />
                  <span>{item.label}</span>
                </button>
              );
            }

            if (item.key === "filtros") {
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    const filterBtn = document.querySelector('[data-filter-button]') as HTMLButtonElement;
                    if (filterBtn) filterBtn.click();
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 p-1 text-[10px] font-medium transition-colors",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <Icon className="size-5" />
                  <span>{item.label}</span>
                </button>
              );
            }

            // Botão especial para Adicionar
            if (item.key === "adicionar") {
              return (
                <Link
                  key={item.key}
                  href={href || "#"}
                  className="flex flex-col items-center justify-center p-1"
                >
                  <div className="flex size-12 items-center justify-center rounded-full bg-[#1e40af] shadow-lg transition-transform hover:scale-105 active:scale-95">
                    <Icon className="size-6 text-white" />
                  </div>
                </Link>
              );
            }

            // Botão especial para Usuário
            if (item.key === "usuario") {
              if (!user) {
                // Não logado: redireciona para login
                return (
                  <Link
                    key={item.key}
                    href="/login"
                    className="flex flex-col items-center justify-center gap-0.5 p-1 text-[10px] font-medium transition-colors text-muted-foreground"
                  >
                    <Icon className="size-5" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </Link>
                );
              }

              // Logado: abre modal com opções
              return (
                <button
                  key={item.key}
                  onClick={() => setUserMenuOpen(true)}
                  type="button"
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 p-1 text-[10px] font-medium transition-colors",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {user.foto_url ? (
                    <img
                      src={user.foto_url}
                      alt={user.nome}
                      className="size-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {user.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.key}
                href={href || "#"}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 p-1 text-[10px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <span className="relative">
                  <Icon className="size-5" />
                  {item.key === "carrinho" && carrinhoCount > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white shadow-sm">
                      {carrinhoCount > 99 ? "99+" : carrinhoCount}
                    </span>
                  )}
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Modal do menu do usuário */}
      {userMenuOpen && user && (
        <div
          className="fixed inset-0 z-[200] bg-black/50 sm:hidden"
          onClick={() => setUserMenuOpen(false)}
        >
          <div
            className="fixed bottom-0 left-0 right-0 rounded-t-2xl bg-background p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do modal */}
            <div className="mb-6 flex items-center gap-3 border-b pb-4">
              {user.foto_url ? (
                <img
                  src={user.foto_url}
                  alt={user.nome}
                  className="size-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  {user.nome.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <p className="font-semibold">{user.nome}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            {/* Opções do menu */}
            <div className="space-y-2">
              <Link
                href="/painel"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted"
              >
                <LayoutGrid className="size-5" />
                <span className="font-medium">Painel</span>
              </Link>

              <Link
                href="/meus-anuncios"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted"
              >
                <ShoppingBag className="size-5" />
                <span className="font-medium">Meus anúncios</span>
              </Link>

              <Link
                href={`/usuario/${user.slug || user.id}`}
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted"
              >
                <User className="size-5" />
                <span className="font-medium">Meu perfil público</span>
              </Link>

              <Link
                href="/configuracoes"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted"
              >
                <SlidersHorizontal className="size-5" />
                <span className="font-medium">Configurações</span>
              </Link>

              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  router.push("/logout");
                }}
                className="flex w-full items-center gap-3 rounded-lg p-3 text-destructive transition-colors hover:bg-destructive/10"
              >
                <X className="size-5" />
                <span className="font-medium">Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
