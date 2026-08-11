import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getUserBySlug, getUserProducts } from "@/lib/services/usuarios";
import { ProductGrid } from "@/components/features/anuncios/anuncio-grid";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Star } from "lucide-react";

interface UserPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  const { slug } = await params;
  const user = await getUserBySlug(slug);

  if (!user) return { title: "Usuário não encontrado" };

  return {
    title: user.nome,
    description: user.biografia ?? `Perfil de ${user.nome}`,
  };
}

export default async function UserPage({ params }: UserPageProps) {
  const { slug } = await params;
  const [user, products] = await Promise.all([
    getUserBySlug(slug),
    getUserProducts(slug),
  ]);

  if (!user) notFound();

  return (
    <div className="container px-4 py-8 md:px-6">
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
        <Avatar className="size-24 sm:size-32">
          <AvatarImage src={user.foto_url ?? undefined} alt={user.nome} />
          <AvatarFallback className="text-2xl">
            {user.nome.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <h1 className="text-3xl font-bold">{user.nome}</h1>
          
          {user.cidade && (
            <div className="mt-2 flex items-center gap-1 text-muted-foreground">
              <MapPin className="size-4" />
              <span>{user.cidade}</span>
            </div>
          )}

          {user.avaliacao > 0 && (
            <div className="mt-2 flex items-center gap-1">
              <Star className="size-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{user.avaliacao.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">
                ({user.total_avaliacoes} avaliações)
              </span>
            </div>
          )}

          {user.biografia && (
            <p className="mt-4 text-muted-foreground">{user.biografia}</p>
          )}

          <div className="mt-4 flex gap-6 text-sm">
            <div>
              <span className="font-semibold">{user.total_anuncios}</span>
              <span className="ml-1 text-muted-foreground">anúncios</span>
            </div>
            <div>
              <span className="font-semibold">{user.total_vendidos}</span>
              <span className="ml-1 text-muted-foreground">vendidos</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-2xl font-bold">Anúncios</h2>
        {products.length > 0 ? (
          <ProductGrid anuncios={products} />
        ) : (
          <div className="flex min-h-[300px] items-center justify-center">
            <p className="text-muted-foreground">Nenhum anúncio ativo</p>
          </div>
        )}
      </div>
    </div>
  );
}
