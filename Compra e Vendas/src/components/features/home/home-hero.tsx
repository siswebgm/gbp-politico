"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BannerAd } from "@/lib/services/banners";

interface HomeHeroProps {
  banners: BannerAd[];
}

export function HomeHero({ banners }: HomeHeroProps) {
  const banner = banners[0];
  const hasImage = Boolean(banner?.imagem_desktop_url);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-primary shadow-lg">
      {hasImage && (
        <Image
          src={banner.imagem_desktop_url}
          alt={banner.titulo ?? "Banner principal"}
          fill
          priority
          sizes="(max-width: 1200px) 100vw, 1200px"
          className="absolute inset-0 object-cover"
        />
      )}

      <div
        className={cn(
          "relative z-10 flex min-h-[260px] flex-col justify-center px-6 py-10 sm:min-h-[300px] sm:px-10 md:min-h-[360px] md:px-12",
          hasImage
            ? "bg-gradient-to-r from-slate-900/85 via-slate-900/70 to-slate-900/40"
            : "bg-gradient-to-r from-primary to-primary/80"
        )}
      >
        <div className="max-w-2xl">
          {banner?.titulo ? (
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-white/80">
              {banner.titulo}
            </p>
          ) : (
            <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
              Negociação direta
            </p>
          )}

          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
            Compre, venda e troque
            <span className="block text-primary-foreground/90">perto de você</span>
          </h1>

          <p className="mb-6 max-w-lg text-sm leading-relaxed text-white/85 sm:text-base">
            {banner?.descricao ??
              "Sua comunidade local de negociações. Sem frete, sem intermediários e com a vantagem do Troca-Troca."}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="default"
              className="h-11 rounded-full bg-white px-6 font-semibold text-primary shadow-lg transition-all hover:bg-white/90 hover:shadow-xl"
            >
              <Link href={banner?.link ?? "/produtos"}>
                Ver ofertas
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>

            <Button
              asChild
              size="default"
              variant="outline"
              className="h-11 rounded-full border-white/30 bg-white/10 px-6 font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white"
            >
              <Link href="/anuncios/novo">
                <Megaphone className="mr-2 size-4" />
                Anunciar grátis
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
