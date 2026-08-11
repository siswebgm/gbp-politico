import Link from "next/link";
import {
  Home,
  LayoutGrid,
  MessageCircle,
  ShoppingCart,
  Heart,
  Package,
  PlusCircle,
  HelpCircle,
  Info,
  Megaphone,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { categoryIcons } from "@/components/features/categorias/category-icons";
import type { CategoryWithChildren } from "@/lib/services/categorias";

interface HomeSidebarProps {
  categorias: CategoryWithChildren[];
}

const menuLinks = [
  { href: "/home", label: "Início", icon: Home },
  { href: "/produtos", label: "Explorar", icon: LayoutGrid },
  { href: "/mensagens", label: "Mensagens", icon: MessageCircle },
  { href: "/carrinho", label: "Carrinho", icon: ShoppingCart },
  { href: "/favoritos", label: "Favoritos", icon: Heart },
  { href: "/meus-anuncios", label: "Meus anúncios", icon: Package },
];

const footerLinks = [
  { href: "/como-funciona", label: "Como funciona", icon: HelpCircle },
  { href: "/sobre", label: "Sobre o CompraJá", icon: Info },
];

export function HomeSidebar({ categorias }: HomeSidebarProps) {
  return (
    <div className="space-y-5">
      <Link
        href="/anuncios/novo"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg active:scale-[0.98]"
      >
        <Megaphone className="size-5" />
        Anunciar grátis
      </Link>

      <nav aria-label="Menu principal" className="space-y-1">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Menu
        </p>
        {menuLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-primary"
            >
              <Icon className="size-4 text-muted-foreground" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <nav aria-label="Categorias" className="space-y-1">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Categorias
        </p>
        <div className="max-h-[360px] overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categorias.map((cat) => (
            <Link
              key={cat.id}
              href={`/produtos?categoria=${cat.slug}`}
              className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-primary"
            >
              <span className="text-muted-foreground">
                {categoryIcons[cat.slug] ?? (
                  <LayoutGrid className="size-4" />
                )}
              </span>
              <span className="line-clamp-1">{cat.nome}</span>
            </Link>
          ))}
        </div>
      </nav>

      <nav aria-label="Links úteis" className="space-y-1 border-t pt-4">
        {footerLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Icon className="size-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
