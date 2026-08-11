"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Package, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-titulo";
import { useBannerColor } from "@/components/features/banners/banner-color-context";
import { isLightColor } from "@/lib/utils/color";
import type { ProductPublic } from "@/lib/services/anuncios";
import { formatPrice } from "@/lib/format";

interface QuickCardsProps {
  products: ProductPublic[];
}

function ProductCard({ product }: { product: ProductPublic }) {
  return (
    <div className="flex w-[170px] shrink-0 snap-start flex-col justify-between rounded-xl border bg-background p-4 shadow-md ring-1 ring-black/5 sm:w-[200px]">
      <div>
        <div className="relative mb-3 h-24 w-full overflow-hidden rounded-lg bg-muted">
          {product.capa_url ? (
            <Image
              src={product.capa_url}
              alt={product.titulo}
              fill
              sizes="(max-width: 640px) 170px, 200px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Package className="size-8" />
            </div>
          )}
        </div>
        <h3 className="text-sm font-semibold text-foreground line-clamp-2">
          {product.titulo}
        </h3>
        <p className="mt-1 text-base font-bold text-primary">
          {formatPrice(product.preco)}
        </p>
      </div>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="mt-4 w-full border-primary text-primary hover:bg-primary/5"
      >
        <Link href={`/produtos/${product.slug}`}>Ver produto</Link>
      </Button>
    </div>
  );
}

export function QuickCards({ products }: QuickCardsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { bottomColor } = useBannerColor();

  function scroll(dir: "left" | "right") {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -220 : 220,
      behavior: "smooth",
    });
  }

  if (products.length === 0) return null;

  const isLight = bottomColor ? isLightColor(bottomColor) : false;

  return (
    <section
      className="bg-gradient-to-b from-primary to-background pb-8 pt-6"
      style={
        bottomColor
          ? {
              backgroundImage: `linear-gradient(to bottom, ${bottomColor}, hsl(var(--background)))`,
            }
          : undefined
      }
    >
      <div className="container relative mx-auto max-w-7xl px-4 md:px-6">
        <SectionTitle
          titulo="⭐ Produtos em Destaque"
          href="/produtos?destaque=true"
          className={isLight ? "text-foreground" : "text-primary-foreground"}
          linkClassName={isLight ? "text-primary" : "text-primary-foreground"}
        />

        <div className="relative">
          <div
            ref={scrollRef}
            className="flex snap-x gap-4 overflow-x-auto scrollbar-hide"
          >
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Anterior"
            className="hidden sm:flex absolute left-1 top-1/2 z-10 size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg ring-1 ring-black/10 transition-colors hover:bg-background"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Próximo"
            className="hidden sm:flex absolute right-1 top-1/2 z-10 size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg ring-1 ring-black/10 transition-colors hover:bg-background"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
