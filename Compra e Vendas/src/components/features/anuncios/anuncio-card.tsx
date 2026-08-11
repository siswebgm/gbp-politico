"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, MapPin, Star, ArrowLeftRight } from "lucide-react";

import type { ProductPublic } from "@/lib/services/anuncios";
import { useCarrinho } from "@/lib/hooks/use-carrinho";
import { FavoriteButton } from "@/components/features/anuncios/favorite-button";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: ProductPublic;
  className?: string;
  isUserLoggedIn?: boolean;
  isFavorited?: boolean;
}

export function ProductCard({
  product,
  className,
  isUserLoggedIn = false,
  isFavorited = false,
}: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const { adicionarAoCarrinho } = useCarrinho();

  const handleAddToCart = async (e: React.MouseEvent) => {
    console.log("[ProductCard] Botão clicado!");
    e.preventDefault();
    e.stopPropagation();
    
    setIsAdding(true);
    console.log("[ProductCard] Adicionando produto:", product.id, "Usuário logado:", isUserLoggedIn);
    
    const result = await adicionarAoCarrinho(product.id, isUserLoggedIn);
    console.log("[ProductCard] Resultado:", result);
    
    if (result.success) {
      // Feedback visual de sucesso
      setTimeout(() => setIsAdding(false), 1000);
    } else {
      setIsAdding(false);
    }
  };

  return (
    <div
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        className
      )}
    >
      <Link
        href={`/produtos/${product.slug}`}
        className="relative aspect-square w-full overflow-hidden bg-slate-100"
      >
        {product.capa_url ? (
          <Image
            src={product.capa_url}
            alt={product.titulo}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
            Sem imagem
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {product.condicao === "novo" && (
            <span className="inline-flex items-center rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm sm:px-2.5 sm:py-1">
              Novo
            </span>
          )}
          {product.destaque && (
            <span className="inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm sm:px-2.5 sm:py-1">
              Destaque
            </span>
          )}
          {product.aceita_troca && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm sm:px-2.5 sm:py-1">
              <ArrowLeftRight className="size-3" />
              Troca
            </span>
          )}
        </div>

        <div className="absolute right-3 top-3 z-10">
          <FavoriteButton
            productId={product.id}
            productSlug={product.slug}
            isAuthenticated={isUserLoggedIn}
            initialFavorited={isFavorited}
            variant="icon"
          />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:gap-2 sm:p-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <p
            className={cn(
              "text-base font-extrabold sm:text-lg md:text-xl",
              product.preco === 0 ? "text-green-600" : "text-foreground"
            )}
          >
            {formatPrice(product.preco)}
          </p>
          {(() => {
            if (product.preco === 0) {
              return (
                <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 sm:px-2">
                  Doação
                </span>
              );
            }
            if (product.negociavel && product.aceita_troca) {
              return (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary sm:px-2">
                  Neg. / Troca
                </span>
              );
            }
            if (product.negociavel) {
              return (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary sm:px-2">
                  Negocia
                </span>
              );
            }
            if (product.aceita_troca) {
              return (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 sm:px-2">
                  <ArrowLeftRight className="size-3" />
                  Troca
                </span>
              );
            }
            return null;
          })()}
        </div>

        <Link
          href={`/produtos/${product.slug}`}
          className="line-clamp-2 h-9 text-sm font-medium leading-snug text-foreground/80 group-hover:text-primary sm:h-10 sm:text-sm"
        >
          {product.titulo}
        </Link>

        <div className="mt-auto flex items-center justify-between gap-2">
          <span
            className="flex items-center gap-1.5 truncate text-xs text-muted-foreground"
            title={product.condominio || product.cidade || undefined}
          >
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">
              {product.condominio || product.cidade || "Não informado"}
            </span>
          </span>

          {typeof product.vendedor_avaliacao === "number" &&
            product.vendedor_avaliacao > 0 && (
              <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-amber-500">
                <Star className="size-3 fill-amber-400 text-amber-400" />
                {product.vendedor_avaliacao.toFixed(1)}
              </span>
            )}

          <button
            onClick={handleAddToCart}
            disabled={isAdding}
            type="button"
            className={cn(
              "flex size-8 items-center justify-center rounded-full border border-slate-100 bg-white shadow-sm transition-all sm:size-9",
              isAdding
                ? "bg-green-500 text-white scale-110 border-green-500"
                : "text-slate-600 hover:bg-primary hover:text-white hover:scale-110"
            )}
            aria-label="Adicionar ao carrinho"
          >
            <ShoppingCart className="size-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
