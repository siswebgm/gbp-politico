"use client";

import { MessageCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { CarrinhoItem } from "@/lib/services/carrinho";
import { formatPrice } from "@/lib/format";

interface CarrinhoResumoProps {
  items: CarrinhoItem[];
}

export function CarrinhoResumo({ items }: CarrinhoResumoProps) {
  const subtotal = items.reduce((acc, item) => {
    const preco = item.anuncio?.preco || 0;
    return acc + (preco * item.quantidade);
  }, 0);

  const total = subtotal;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="mb-6 text-xl font-bold">Resumo de Interesses</h2>

      <div className="space-y-4 border-b pb-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "itens"} no carrinho
          </span>
          <span className="font-semibold">
            {formatPrice(subtotal)}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Retirada / entrega</span>
          <span className="font-semibold text-green-600">A combinar</span>
        </div>
      </div>

      <div className="mt-4 flex justify-between border-b pb-4">
        <span className="text-lg font-bold">Valor estimado</span>
        <span className="text-2xl font-bold text-primary">
          {formatPrice(total)}
        </span>
      </div>

      <div className="mt-6 space-y-3">
        <Button asChild size="lg" className="w-full gap-2 text-base font-semibold shadow-md">
          <Link href="/mensagens">
            <MessageCircle className="size-5" />
            Conversar com vendedores
            <ArrowRight className="size-5" />
          </Link>
        </Button>

        <Button variant="outline" size="lg" className="w-full" asChild>
          <Link href="/produtos">Continuar explorando</Link>
        </Button>
      </div>

      <div className="mt-6 rounded-lg bg-muted/50 p-4">
        <h3 className="mb-2 text-sm font-semibold">Informações importantes</h3>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>• O aplicativo não realiza pagamentos</li>
          <li>• Você negocia diretamente com o vendedor</li>
          <li>• Combine retirada, troca ou entrega no chat</li>
          <li>• Avalie o vendedor após a negociação</li>
        </ul>
      </div>
    </div>
  );
}
