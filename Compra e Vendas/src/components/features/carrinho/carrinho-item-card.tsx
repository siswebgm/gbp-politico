"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Plus, Minus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { updateQuantidadeAction, removerItemAction } from "@/lib/actions/carrinho";
import type { CarrinhoItem } from "@/lib/services/carrinho";
import { cn } from "@/lib/utils";

interface CarrinhoItemCardProps {
  item: CarrinhoItem;
}

export function CarrinhoItemCard({ item }: CarrinhoItemCardProps) {
  const [quantidade, setQuantidade] = useState(item.quantidade);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const produto = item.anuncio;
  if (!produto) return null;

  const handleUpdateQuantidade = async (novaQuantidade: number) => {
    if (novaQuantidade < 1) return;
    
    setIsUpdating(true);
    const result = await updateQuantidadeAction(item.id, novaQuantidade);
    
    if (result.success) {
      setQuantidade(novaQuantidade);
    }
    setIsUpdating(false);
  };

  const handleRemover = async () => {
    setIsRemoving(true);
    await removerItemAction(item.id);
    setIsRemoving(false);
  };

  const imagemUrl = produto.capa_url || "/placeholder.png";
  const preco = produto.preco || 0;
  const subtotal = preco * quantidade;

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-xl border bg-card p-3 shadow-sm transition-all hover:shadow-md sm:p-4",
      isRemoving && "opacity-50"
    )}>
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        {/* Imagem */}
        <Link 
          href={`/produtos/${produto.slug}`}
          className="relative h-32 w-full shrink-0 overflow-hidden rounded-lg sm:h-24 sm:w-24"
        >
          <Image
            src={imagemUrl}
            alt={produto.titulo}
            fill
            sizes="(max-width: 640px) 100vw, 96px"
            className="object-cover transition-transform group-hover:scale-105"
            priority
          />
        </Link>

        {/* Conteúdo */}
        <div className="flex flex-1 flex-col gap-3">
          {/* Info do produto */}
          <div>
            <Link 
              href={`/produtos/${produto.slug}`}
              className="mb-1 line-clamp-2 text-base font-semibold transition-colors hover:text-primary"
            >
              {produto.titulo}
            </Link>
            
            {produto.condicao && (
              <p className="mb-1 text-xs text-muted-foreground">
                Condição: {produto.condicao}
              </p>
            )}

            <p className="text-lg font-bold text-primary">
              R$ {preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Controles */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Quantidade */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => handleUpdateQuantidade(quantidade - 1)}
                disabled={isUpdating || quantidade <= 1}
              >
                <Minus className="size-4" />
              </Button>
              
              <span className="w-10 text-center font-semibold">
                {quantidade}
              </span>
              
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => handleUpdateQuantidade(quantidade + 1)}
                disabled={isUpdating}
              >
                <Plus className="size-4" />
              </Button>
            </div>

            {/* Subtotal e remover */}
            <div className="flex items-center justify-between sm:gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Subtotal</p>
                <p className="text-lg font-bold">
                  R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleRemover}
                disabled={isRemoving}
              >
                <Trash2 className="size-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
