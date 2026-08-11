import { redirect } from "next/navigation";
import { Metadata } from "next";

import { getCurrentUser } from "@/lib/services/usuarios";
import { getMyProducts } from "@/lib/services/anuncios";
import { MeusAnunciosList } from "@/components/features/anuncios/meus-anuncios-list";

export const metadata: Metadata = {
  title: "Meus Anúncios",
  description: "Gerencie seus anúncios",
};

export default async function MeusAnunciosPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/meus-anuncios");
  }

  const produtos = await getMyProducts(user.id);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">Meus Anúncios</h1>
        <p className="text-sm text-muted-foreground">
          {produtos.length === 0
            ? "Você ainda não tem anúncios ativos."
            : `Você tem ${produtos.length} ${produtos.length === 1 ? "anúncio" : "anúncios"}.`}
        </p>
      </div>

      <MeusAnunciosList produtos={produtos} />
    </div>
  );
}
