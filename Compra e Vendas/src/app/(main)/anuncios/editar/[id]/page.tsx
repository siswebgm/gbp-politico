import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { getCurrentUser } from "@/lib/services/usuarios";
import { getProductById, getProductImages } from "@/lib/services/anuncios";
import { getCategories } from "@/lib/services/categorias";
import { updateProductAction } from "@/lib/actions/anuncios";
import { ProductForm } from "@/components/features/anuncios/anuncio-form";

interface EditarAnuncioPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: EditarAnuncioPageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  const product = user ? await getProductById(id, user.id) : null;

  return {
    title: product ? `Editar: ${product.titulo}` : "Editar anúncio",
    description: "Edite seu anúncio",
  };
}

export default async function EditarAnuncioPage({ params }: EditarAnuncioPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=/anuncios/editar/${id}`);
  }

  const [product, categorias, images] = await Promise.all([
    getProductById(id, user.id),
    getCategories(),
    getProductImages(id),
  ]);

  if (!product) notFound();

  const existingImages = images.map((img) => ({
    id: img.id,
    url: img.url,
  }));

  const editAction = updateProductAction.bind(null, id);

  return (
    <div className="container max-w-4xl px-4 py-8 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Editar Anúncio</h1>
        <p className="mt-2 text-muted-foreground">
          Atualize as informações do seu anúncio
        </p>
      </div>

      <ProductForm
        action={editAction}
        categorias={categorias}
        userId={user.id}
        product={product}
        existingImages={existingImages}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
