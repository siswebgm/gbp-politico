"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BannerCarousel } from "@/components/features/banners/banner-carousel";
import { useBannerColor } from "@/components/features/banners/banner-color-context";
import type { BannerAd } from "@/lib/services/banners";
import type { ProductPublic } from "@/lib/services/anuncios";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export function HeroSection({
  banners,
  produtos = [],
}: {
  banners: BannerAd[];
  produtos?: ProductPublic[];
}) {
  const { topColor } = useBannerColor();

  if (banners.length > 0) {
    return (
      <section className="bg-primary" style={{ backgroundColor: topColor || undefined }}>
        <BannerCarousel banners={banners} className="rounded-none" />
      </section>
    );
  }

  const destaques = produtos.slice(0, 2);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary to-background">
      <div className="container relative z-10 mx-auto max-w-7xl px-4 py-3 md:px-6 md:py-8">
        <div className="flex flex-col items-start justify-start gap-4 md:min-h-[220px] md:flex-row md:items-center md:justify-between">
          <div className="text-center md:text-left">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary-foreground">
              Ofertas exclusivas para você
            </p>
            <h1 className="mb-1 text-4xl font-extrabold tracking-tight text-primary-foreground sm:text-5xl md:text-6xl">
              OFERTAÇO
            </h1>
            <p className="mb-3 text-[10px] text-primary-foreground/80">
              Válido para produtos selecionados.
            </p>
            <Button
              asChild
              size="sm"
              className="bg-primary-foreground font-semibold text-primary shadow-md transition-all hover:bg-primary-foreground/90"
            >
              <Link href="/produtos">
                Ver ofertas
                <ArrowRight className="ml-2 size-3" />
              </Link>
            </Button>
          </div>

          {destaques.length > 0 && (
            <div className="flex items-end justify-center gap-3 sm:gap-4 md:justify-end">
              {destaques.map((produto, index) => (
                <Link
                  key={produto.slug}
                  href={`/produtos/${produto.slug}`}
                  className="group relative"
                >
                  <div
                    className={cn(
                      "relative overflow-hidden rounded-lg border-2 border-white bg-white shadow-xl",
                      index === 0 ? "h-28 w-20 sm:h-36 sm:w-28" : "h-36 w-28 sm:h-44 sm:w-36"
                    )}
                  >
                    {produto.capa_url ? (
                      <Image
                        src={produto.capa_url}
                        alt={produto.titulo}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Package className="size-6" />
                      </div>
                    )}
                  </div>
                  <div className="absolute -right-1 -top-2 rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-primary shadow">
                    {formatPrice(produto.preco)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
