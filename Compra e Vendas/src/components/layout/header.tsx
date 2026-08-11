"use client";

import Link from "next/link";
import {
  MessageCircle,
  ShoppingBag,
  ShoppingCart,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/layout/user-menu";
import { HeaderSearch } from "@/components/layout/header-search";
import { useCarrinho } from "@/lib/hooks/use-carrinho";
import type { Tables } from "@/lib/supabase/database.types";
import type { CategoryWithChildren } from "@/lib/services/categorias";

interface HeaderProps {
  user: Tables<"usuarios"> | null;
  categorias: CategoryWithChildren[];
}

export function Header({ user, categorias }: HeaderProps) {
  const { carrinhoCount } = useCarrinho();

  return (
    <header className="sticky top-0 z-50 border-0 bg-primary shadow-sm">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-2 px-3 sm:h-16 sm:grid sm:grid-cols-[auto_1fr_auto] sm:gap-4 sm:px-4 lg:px-8">
        <Link
          href="/home"
          className="hidden shrink-0 items-center gap-2 transition-opacity hover:opacity-90 sm:flex"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-white/10">
            <ShoppingBag className="size-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">CompraJá</span>
        </Link>

        <HeaderSearch categorias={categorias} />

        <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
          {user ? (
            <>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="relative hidden h-10 w-10 text-white hover:bg-white/10 sm:inline-flex"
              >
                <Link href="/carrinho" aria-label="Carrinho" className="relative">
                  <ShoppingCart className="size-5" />
                  {carrinhoCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
                      {carrinhoCount > 99 ? "99+" : carrinhoCount}
                    </span>
                  )}
                </Link>
              </Button>

              <Button
                asChild
                variant="ghost"
                size="icon"
                className="hidden h-10 w-10 text-white hover:bg-white/10 sm:inline-flex"
              >
                <Link href="/mensagens" aria-label="Mensagens">
                  <MessageCircle className="size-5" />
                </Link>
              </Button>

              <div className="hidden sm:block">
                <UserMenu user={user} />
              </div>
            </>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="default"
                className="hidden h-10 font-medium text-white hover:bg-white/10 sm:inline-flex"
              >
                <Link href="/login">Entrar</Link>
              </Button>
              <Button
                asChild
                size="default"
                className="hidden h-10 bg-white font-semibold text-primary shadow-md hover:bg-white/90 sm:inline-flex transition-all"
              >
                <Link href="/cadastro">
                  <User className="size-4 mr-1" />
                  Cadastrar
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
