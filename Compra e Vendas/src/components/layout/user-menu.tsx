"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { LayoutDashboard, LogOut, Package, Settings, User } from "lucide-react";

import { signOutAction } from "@/lib/actions/auth";
import type { Tables } from "@/lib/supabase/database.types";

export function UserMenu({ user }: { user: Tables<"usuarios"> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center overflow-hidden rounded-full border bg-muted"
        aria-label="Menu do usuário"
      >
        {user.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.foto_url} alt={user.nome} className="size-full object-cover" />
        ) : (
          <User className="size-4" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-md border bg-popover p-1 shadow-md">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{user.nome}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <MenuLink href="/painel" icon={<LayoutDashboard className="size-4" />}>
            Painel
          </MenuLink>
          <MenuLink href="/meus-anuncios" icon={<Package className="size-4" />}>
            Meus anúncios
          </MenuLink>
          <MenuLink href={`/usuario/${user.slug}`} icon={<User className="size-4" />}>
            Meu perfil público
          </MenuLink>
          <MenuLink href="/painel/configuracoes" icon={<Settings className="size-4" />}>
            Configurações
          </MenuLink>
          <div className="my-1 h-px bg-border" />
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-destructive hover:bg-accent"
            >
              <LogOut className="size-4" />
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
    >
      {icon}
      {children}
    </Link>
  );
}
