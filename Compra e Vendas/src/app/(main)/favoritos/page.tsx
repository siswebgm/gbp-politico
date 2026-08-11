import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/services/usuarios";
import { getFavoriteProducts } from "@/lib/services/favoritos";
import { ProductGrid } from "@/components/features/anuncios/anuncio-grid";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Favoritos",
  description: "Seus produtos favoritos",
};

export default async function FavoritosPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/favoritos");
  }

  const favoritos = await getFavoriteProducts(user.id);

  return (
    <div className="container px-4 py-8 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Meus Favoritos</h1>
        <p className="mt-2 text-muted-foreground">
          {favoritos.length} produto{favoritos.length !== 1 ? "s" : ""} favoritado
          {favoritos.length !== 1 ? "s" : ""}
        </p>
      </div>

      {favoritos.length > 0 ? (
        <ProductGrid anuncios={favoritos} />
      ) : (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">
              Você ainda não tem produtos favoritos
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Explore nossos produtos e adicione seus favoritos
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
