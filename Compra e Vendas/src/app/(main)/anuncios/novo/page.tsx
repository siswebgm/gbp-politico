import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/services/usuarios";
import { getCategories } from "@/lib/services/categorias";
import { createProductAction } from "@/lib/actions/anuncios";
import { ProductForm } from "@/components/features/anuncios/anuncio-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Criar Anúncio",
  description: "Crie um anúncio para vender, trocar ou doar",
};

export default async function NovoAnuncioPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/anuncios/novo");
  }

  const categorias = await getCategories();

  return (
    <div className="container max-w-4xl px-4 py-8 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Criar Anúncio</h1>
        <p className="mt-2 text-muted-foreground">
          Preencha as informações do item que você deseja vender, trocar ou doar
        </p>
      </div>

      <ProductForm
        action={createProductAction}
        categorias={categorias}
        userId={user.id}
        submitLabel="Publicar anúncio"
      />
    </div>
  );
}
