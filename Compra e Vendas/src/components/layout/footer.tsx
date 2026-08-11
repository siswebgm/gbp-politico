import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

const footerLinks = [
  { label: "Sobre", href: "/sobre" },
  { label: "Como funciona", href: "/como-funciona" },
  { label: "Termos", href: "/termos" },
  { label: "Privacidade", href: "/privacidade" },
  { label: "Contato", href: "/contato" },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="container px-4 py-6 md:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-lg font-bold text-foreground"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
                <ShoppingBag className="size-4 text-primary-foreground" />
              </div>
              {siteConfig.nome}
            </Link>
            <p className="text-xs text-muted-foreground">
              © {currentYear} {siteConfig.nome}. Todos os direitos reservados.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
