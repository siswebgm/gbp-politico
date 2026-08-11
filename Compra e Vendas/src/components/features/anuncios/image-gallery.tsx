"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ZoomIn, X, ShoppingCart, Share2 } from "lucide-react";

import type { ProductPublic } from "@/lib/services/anuncios";
import { useCarrinho } from "@/lib/hooks/use-carrinho";
import { cn } from "@/lib/utils";

type ProductWithPhone = ProductPublic & { vendedor_telefone: string | null };

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26 9.856 9.856 0 0116.437-7.305 9.86 9.86 0 011.51 5.26 9.873 9.873 0 01-9.865 9.864m8.413-18.297A11.873 11.873 0 0012.05 0C5.468 0 .104 5.364.104 11.946c0 2.103.551 4.153 1.598 5.965L0 24l6.28-1.65a11.88 11.88 0 005.77 1.48h.004c6.582 0 11.946-5.364 11.946-11.946 0-3.19-1.242-6.188-3.491-8.44" />
    </svg>
  );
}

export function ImageGallery({
  images,
  titulo,
  product,
  isUserLoggedIn,
}: {
  images: string[];
  titulo: string;
  product?: ProductWithPhone;
  isUserLoggedIn?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { adicionarAoCarrinho } = useCarrinho();

  const list = images.length > 0 ? images : [""];

  function handleWhatsApp() {
    if (!product?.vendedor_telefone) return;
    const onlyNumbers = product.vendedor_telefone.replace(/\D/g, "");
    const number = onlyNumbers.startsWith("55") ? onlyNumbers : `55${onlyNumbers}`;
    window.open(`https://wa.me/${number}`, "_blank", "noopener,noreferrer");
  }

  async function handleAddToCart() {
    if (!product) return;
    setIsAdding(true);
    const result = await adicionarAoCarrinho(product.id, isUserLoggedIn ?? false);
    if (result.success) {
      setTimeout(() => setIsAdding(false), 1000);
    } else {
      setIsAdding(false);
    }
  }

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, url });
      } catch {
        // usuário cancelou
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
    }
  }

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {list.length > 1 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto sm:w-20 sm:max-h-[480px] sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden">
          {list.map((image, i) => (
            <button
              key={image ? `${image}-${i}` : `thumb-${i}`}
              onClick={() => setIndex(i)}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2",
                i === index ? "border-foreground" : "border-transparent"
              )}
              aria-label={`Ver imagem ${i + 1}`}
            >
              {image && <Image src={image} alt="" fill className="object-cover" sizes="80px" />}
            </button>
          ))}
        </div>
      )}

      <div className="relative w-full overflow-hidden rounded-lg border bg-muted flex items-center justify-center" style={{ maxHeight: '480px', aspectRatio: '1' }}>
        {product && (
          <>
            <Link
              href="/produtos"
              className="absolute left-3 top-3 z-20 flex size-10 items-center justify-center rounded-full border border-slate-100 bg-white/95 text-slate-600 shadow-sm backdrop-blur-sm transition-all hover:bg-slate-100 active:scale-95"
              aria-label="Voltar"
              title="Voltar"
            >
              <ChevronLeft className="size-5" />
            </Link>

            <div className="absolute right-3 top-3 z-20 flex gap-2">
              {product.vendedor_telefone && (
                <button
                  onClick={handleWhatsApp}
                  type="button"
                  className="flex size-10 items-center justify-center rounded-full bg-green-500 text-white shadow-sm transition-all hover:bg-green-600 active:scale-95"
                  aria-label="Conversar no WhatsApp"
                  title="Conversar no WhatsApp"
                >
                  <WhatsAppIcon className="size-5" />
                </button>
              )}

              <button
                onClick={handleAddToCart}
                disabled={isAdding}
                type="button"
                className={cn(
                  "flex size-10 items-center justify-center rounded-full shadow-sm transition-all active:scale-95",
                  isAdding
                    ? "bg-green-500 text-white scale-110"
                    : "border border-slate-100 bg-white/95 text-slate-600 hover:bg-primary hover:text-white"
                )}
                aria-label="Adicionar ao carrinho"
                title="Adicionar ao carrinho"
              >
                <ShoppingCart className="size-5" strokeWidth={1.5} />
              </button>

              <button
                onClick={handleShare}
                type="button"
                className="flex size-10 items-center justify-center rounded-full border border-slate-100 bg-white/95 text-slate-600 shadow-sm transition-all hover:bg-primary hover:text-white active:scale-95"
                aria-label="Compartilhar"
                title="Compartilhar"
              >
                <Share2 className="size-5" strokeWidth={1.5} />
              </button>
            </div>
          </>
        )}

        {list[index] ? (
          <button
            onClick={() => setZoomOpen(true)}
            className="group relative flex size-full items-center justify-center"
            aria-label="Ampliar imagem"
          >
            <Image
              src={list[index]}
              alt={`${titulo} - imagem ${index + 1}`}
              fill
              priority
              sizes="(max-width: 640px) 100vw, 480px"
              className="object-contain"
              style={{ objectPosition: 'center' }}
            />
            <span className="absolute bottom-3 right-3 flex size-8 items-center justify-center rounded-full bg-background/90 opacity-0 shadow transition-opacity group-hover:opacity-100">
              <ZoomIn className="size-4" />
            </span>
          </button>
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
            Sem imagem
          </div>
        )}

      </div>

      {zoomOpen && list[index] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomOpen(false)}
        >
          <button
            className="absolute right-4 top-4 text-white"
            aria-label="Fechar"
            onClick={() => setZoomOpen(false)}
          >
            <X className="size-6" />
          </button>
          <div className="relative h-full w-full max-w-4xl">
            <Image
              src={list[index]}
              alt={titulo}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      )}
    </div>
  );
}
