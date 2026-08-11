import { redirect } from "next/navigation";
import { ShoppingCart, ArrowRight } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/session";
import { getCarrinhoItems } from "@/lib/services/carrinho";
import { Button } from "@/components/ui/button";
import { CarrinhoItemCard } from "@/components/features/carrinho/carrinho-item-card";
import { CarrinhoResumo } from "@/components/features/carrinho/carrinho-resumo";

export default async function CarrinhoPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const items = await getCarrinhoItems(user.id);

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-8 text-2xl font-bold sm:text-3xl">Meu Carrinho</h1>
          
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/20 p-8 text-center">
            <ShoppingCart className="mb-4 size-16 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">Seu carrinho está vazio</h2>
            <p className="mb-6 text-muted-foreground">
              Adicione produtos ao carrinho para continuar comprando
            </p>
            <Button asChild size="lg" className="gap-2">
              <a href="/produtos">
                Explorar produtos
                <ArrowRight className="size-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-2xl font-bold sm:text-3xl">Meu Carrinho</h1>
        
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            {items.map((item) => (
              <CarrinhoItemCard key={item.id} item={item} />
            ))}
          </div>

          <div className="lg:sticky lg:top-20 lg:self-start">
            <CarrinhoResumo items={items} />
          </div>
        </div>
      </div>
    </div>
  );
}
