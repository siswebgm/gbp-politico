import type { ProductPublic } from "@/lib/services/anuncios";
import { ProductCard } from "@/components/features/anuncios/anuncio-card";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface ProductGridProps {
  anuncios: ProductPublic[];
  emptyMessage?: string;
  carousel?: boolean;
  isUserLoggedIn?: boolean;
  favoritedIds?: Set<string>;
}

export function ProductGrid({
  anuncios,
  emptyMessage,
  carousel = false,
  isUserLoggedIn = false,
  favoritedIds,
}: ProductGridProps) {
  if (anuncios.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border-2 border-dashed bg-muted/20">
        <div className="text-center">
          <p className="text-base font-medium text-muted-foreground">
            {emptyMessage ?? "Nenhum produto encontrado"}
          </p>
        </div>
      </div>
    );
  }

  if (carousel) {
    return (
      <div className="-mx-4 sm:mx-0">
        <div className="relative sm:hidden">
          <div className="flex gap-2 overflow-x-auto px-4 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden]">
            {anuncios.map((product) => (
              <div key={product.id} className="min-w-[170px] max-w-[170px] snap-start">
                <ProductCard
                  product={product}
                  isUserLoggedIn={isUserLoggedIn}
                  isFavorited={favoritedIds?.has(product.id) ?? false}
                />
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute right-2 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 shadow-md backdrop-blur-sm">
            <ChevronRight className="size-5 text-slate-600" />
          </div>
        </div>
        <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 xl:gap-4">
          {anuncios.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isUserLoggedIn={isUserLoggedIn}
              isFavorited={favoritedIds?.has(product.id) ?? false}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 justify-items-center px-2 sm:gap-3 sm:px-0 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] md:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] xl:gap-4">
      {anuncios.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          className="w-full max-w-xs sm:max-w-sm"
          isUserLoggedIn={isUserLoggedIn}
          isFavorited={favoritedIds?.has(product.id) ?? false}
        />
      ))}
    </div>
  );
}
