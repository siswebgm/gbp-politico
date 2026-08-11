"use client";

import Image from "next/image";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { BannerAd } from "@/lib/services/banners";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useBannerColor } from "./banner-color-context";
import { extractDominantColor, isLightColor, rgbToRgba } from "@/lib/utils/color";

export function BannerCarousel({
  banners,
  className,
}: {
  banners: BannerAd[];
  className?: string;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 6000, stopOnInteraction: false }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [colorMap, setColorMap] = useState<
    Record<number, { top: string; bottom: string }>
  >({});
  const { setTopColor, setBottomColor, setBannerInView } = useBannerColor();
  const containerRef = useRef<HTMLDivElement>(null);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
  }, [emblaApi, onSelect]);

  // Extrai as cores do topo e da base de cada banner conforme o viewport
  useEffect(() => {
    let cancelled = false;

    async function extract() {
      const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
      const map: Record<number, { top: string; bottom: string }> = {};

      for (let i = 0; i < banners.length; i++) {
        try {
          const url = isMobile
            ? banners[i].imagem_mobile_url ?? banners[i].imagem_desktop_url
            : banners[i].imagem_desktop_url;

          const [top, bottom] = await Promise.all([
            extractDominantColor(url, "top"),
            extractDominantColor(url, "bottom"),
          ]);

          if (top && bottom) {
            map[i] = { top, bottom };
          } else if (top) {
            map[i] = { top, bottom: top };
          } else if (bottom) {
            map[i] = { top: bottom, bottom };
          }
        } catch {
          // ignore
        }
      }

      if (!cancelled) setColorMap(map);
    }

    extract();
    return () => {
      cancelled = true;
    };
  }, [banners]);

  useEffect(() => {
    const colors = colorMap[selectedIndex];
    if (colors?.top) {
      setTopColor(colors.top);
      setBottomColor(colors.bottom);
    }
  }, [colorMap, selectedIndex, setTopColor, setBottomColor]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setBannerInView(entry.isIntersecting),
      {
        threshold: 0,
        rootMargin: "-108px 0px 0px 0px",
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [setBannerInView]);

  if (banners.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={cn("relative -mt-6 overflow-hidden border-0 outline-none sm:mt-0", className)}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {banners.map((banner) => (
            <BannerSlide key={banner.id} banner={banner} />
          ))}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={() => emblaApi?.scrollPrev()}
            className="absolute left-4 top-1/2 z-30 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-all hover:bg-black/50 sm:flex sm:left-6 sm:size-11"
            aria-label="Anterior"
          >
            <ChevronLeft className="size-5 sm:size-6" />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            className="absolute right-4 top-1/2 z-30 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-all hover:bg-black/50 sm:flex sm:right-6 sm:size-11"
            aria-label="Próximo"
          >
            <ChevronRight className="size-5 sm:size-6" />
          </button>

          <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 gap-2 sm:bottom-8">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => emblaApi?.scrollTo(index)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 sm:h-2",
                  selectedIndex === index
                    ? "w-8 bg-white shadow-lg sm:w-10"
                    : "w-1.5 bg-white/50 hover:bg-white/70 sm:w-2"
                )}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SaibaMaisButton({ link }: { link: string }) {
  const { topColor } = useBannerColor();
  const isLight = topColor ? isLightColor(topColor) : false;

  return (
    <Button
      asChild
      style={{ backgroundColor: topColor || undefined }}
      className={cn(
        "rounded-full px-6 py-4 text-sm font-semibold shadow-xl transition-all hover:scale-105 sm:px-8 sm:py-5 sm:text-base",
        isLight
          ? "text-foreground hover:brightness-95"
          : "text-white hover:brightness-110"
      )}
    >
      <Link href={link} target="_blank" rel="noopener noreferrer">
        Saiba mais
      </Link>
    </Button>
  );
}

function BannerSlide({ banner }: { banner: BannerAd }) {
  const { topColor, bottomColor } = useBannerColor();

  const bgStyle =
    topColor && bottomColor
      ? { background: `linear-gradient(to bottom, ${topColor}, ${bottomColor})` }
      : { backgroundColor: topColor || "#0f172a" };

  return (
    <div
      className="relative min-w-0 flex-[0_0_100%] overflow-hidden"
      style={bgStyle}
    >
      <div className="relative h-[220px] sm:h-[300px] md:h-[380px] lg:h-[460px]">
        <Image
          src={banner.imagem_desktop_url}
          alt={banner.titulo ?? "Banner"}
          fill
          priority
          sizes="100vw"
          className="hidden object-contain sm:block"
        />
        <Image
          src={banner.imagem_mobile_url ?? banner.imagem_desktop_url}
          alt={banner.titulo ?? "Banner"}
          fill
          priority
          sizes="100vw"
          className="object-contain sm:hidden"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
      </div>

      {banner.link && (
        <div className="absolute bottom-6 right-6 z-20 sm:bottom-8 sm:right-8 md:bottom-10 md:right-10">
          <SaibaMaisButton link={banner.link} />
        </div>
      )}

      <div className="absolute -bottom-1 left-0 right-0 z-10 h-[70px] sm:h-[80px]">
        <svg
          viewBox="0 0 1440 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <path
            d="M0 0C360 50 720 50 1080 30C1260 20 1380 10 1440 20V100H0V0Z"
            fill="#f8fafc"
          />
        </svg>
      </div>
    </div>
  );
}
