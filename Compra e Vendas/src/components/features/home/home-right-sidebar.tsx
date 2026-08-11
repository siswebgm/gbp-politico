import Link from "next/link";
import Image from "next/image";
import {
  Search,
  MessageCircle,
  Handshake,
  Star,
  MapPin,
  ArrowRight,
  BadgeCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import type { ProductPublic } from "@/lib/services/anuncios";

interface HomeRightSidebarProps {
  destaques: ProductPublic[];
}

const steps = [
  {
    icon: Search,
    title: "Busque",
    description: "Encontre produtos e serviços perto de você.",
  },
  {
    icon: MessageCircle,
    title: "Negocie",
    description: "Converse diretamente com o vendedor.",
  },
  {
    icon: Handshake,
    title: "Combine",
    description: "Aceite troca, desconto ou pagamento local.",
  },
  {
    icon: Star,
    title: "Avalie",
    description: "Deixe sua avaliação e fortaleça a comunidade.",
  },
];

export function HomeRightSidebar({ destaques }: HomeRightSidebarProps) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-base font-bold text-foreground">Destaques</h3>
        <div className="space-y-3">
          {destaques.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum destaque no momento.
            </p>
          )}
          {destaques.slice(0, 4).map((product) => (
            <Link
              key={product.id}
              href={`/produtos/${product.slug}`}
              className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-accent"
            >
              <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {product.capa_url ? (
                  <Image
                    src={product.capa_url}
                    alt={product.titulo}
                    fill
                    sizes="56px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                    Sem imagem
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary">
                  {product.titulo}
                </p>
                <p className="mt-0.5 text-sm font-bold text-primary">
                  {formatPrice(product.preco)}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" />
                  <span className="truncate">
                    {product.cidade ?? "Local não informado"}
                  </span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-base font-bold text-foreground">
          Como funciona?
        </h3>
        <ol className="space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Icon className="size-3.5 text-primary" />
                    {step.title}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="relative overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground shadow-md">
        <div className="relative z-10">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            <BadgeCheck className="size-3" />
            Sem intermediários
          </div>
          <h3 className="mb-1 text-lg font-bold">Negociação direta</h3>
          <p className="mb-4 text-sm leading-relaxed text-white/85">
            Combine perto de você, sem frete e sem taxas. Troque, venda ou doe
            com quem mora na região.
          </p>
          <Button
            asChild
            size="sm"
            className="w-full rounded-full bg-white font-semibold text-primary hover:bg-white/90"
          >
            <Link href="/produtos?troca=true">
              Ver Troca-Troca
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
