import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import {
  getProductBySlug,
  getProductImages,
  getRelatedProducts,
} from "@/lib/services/anuncios";
import { getCurrentUser } from "@/lib/services/usuarios";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, formatRelativeDate } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

import { ImageGallery } from "@/components/features/anuncios/image-gallery";
import { ChatButton } from "@/components/features/anuncios/chat-button";
import { ReportDialog } from "@/components/features/anuncios/report-dialog";
import { SellerCard } from "@/components/features/anuncios/seller-card";
import { AvaliarVendedor } from "@/components/features/anuncios/avaliar-vendedor";
import { ProductGrid } from "@/components/features/anuncios/anuncio-grid";
import { SectionTitle } from "@/components/ui/section-titulo";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return { title: "Produto não encontrado" };

  return {
    title: product.titulo,
    description: product.descricao?.slice(0, 160) ?? product.titulo,
    openGraph: {
      title: product.titulo,
      description: product.descricao?.slice(0, 160) ?? product.titulo,
      images: product.capa_url ? [product.capa_url] : [],
      url: `${siteConfig.url}/produtos/${product.slug}`,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [imagesData, user] = await Promise.all([
    getProductImages(product.id),
    getCurrentUser(),
  ]);

  const images = imagesData.map((img) => img.url);

  const relatedProducts = await getRelatedProducts(product.categoria_id, product.id);

  await supabase.rpc("incrementar_visualizacoes_anuncio", {
    p_anuncio_id: product.id,
  });

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 md:px-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <ImageGallery
            images={images}
            titulo={product.titulo}
            product={product}
            isUserLoggedIn={!!user}
          />

          <div className="mt-6">
            <div className="mb-4">
              <h1 className="text-2xl font-bold md:text-3xl">{product.titulo}</h1>
              {product.categoria_nome && (
                <Link
                  href={`/produtos?categoria=${product.categoria_slug}`}
                  className="mt-1 text-sm text-muted-foreground hover:underline"
                >
                  {product.categoria_nome}
                </Link>
              )}
            </div>

            <div className="mb-6 lg:hidden">
              <p className={cn("text-3xl font-bold", product.preco === 0 ? "text-green-600" : "text-slate-900")}>
                {formatPrice(product.preco)}
              </p>
              {product.preco === 0 && (
                <p className="text-sm font-medium text-green-600">Doação</p>
              )}
              {product.negociavel && product.preco > 0 && (
                <p className="text-sm text-muted-foreground">Preço negociável</p>
              )}
              {product.preco === 0 && (
                <p className="text-sm text-muted-foreground">O vendedor está doando este item.</p>
              )}
            </div>

            {product.descricao && (
              <div className="mb-6">
                <h2 className="mb-2 text-lg font-semibold">Descrição</h2>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {product.descricao}
                </p>
              </div>
            )}

            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 font-semibold">Detalhes</h3>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Condição:</dt>
                    <dd className="font-medium capitalize">{product.condicao}</dd>
                  </div>
                  {product.aceita_troca && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Aceita troca:</dt>
                      <dd className="font-medium">Sim</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Publicado:</dt>
                    <dd className="font-medium">
                      {formatRelativeDate(product.criado_em)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Visualizações:</dt>
                    <dd className="font-medium">{product.visualizacoes}</dd>
                  </div>
                </dl>
              </div>

              {(product.cidade || product.condominio) && (
                <div>
                  <h3 className="mb-2 font-semibold">Localização</h3>
                  <dl className="space-y-1 text-sm">
                    {product.cidade && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Cidade:</dt>
                        <dd className="font-medium">{product.cidade}</dd>
                      </div>
                    )}
                    {product.condominio && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Condomínio:</dt>
                        <dd className="font-medium">{product.condominio}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="hidden lg:block">
              <p className={cn("text-3xl font-bold", product.preco === 0 ? "text-green-600" : "text-slate-900")}>
                {formatPrice(product.preco)}
              </p>
              {product.preco === 0 && (
                <p className="text-sm font-medium text-green-600">Doação</p>
              )}
              {product.negociavel && product.preco > 0 && (
                <p className="text-sm text-muted-foreground">Preço negociável</p>
              )}
              {product.preco === 0 && (
                <p className="text-sm text-muted-foreground">O vendedor está doando este item.</p>
              )}
            </div>

            {product.vendedor_id && (
              <SellerCard
                slug={product.vendedor_slug ?? ""}
                nome={product.vendedor_nome ?? "Vendedor"}
                photoUrl={product.vendedor_foto_url}
                city={product.vendedor_cidade}
                rating={product.vendedor_avaliacao}
                createdAt={product.criado_em}
                className="border-0 bg-transparent shadow-none"
              />
            )}

            <div className="flex flex-col gap-2">
              <ChatButton
                productId={product.id}
                sellerId={product.vendedor_id ?? ""}
                isAuthenticated={!!user}
                isOwnProduct={user?.id === product.vendedor_id}
              />
              <ReportDialog productId={product.id} isAuthenticated={!!user} />
              <AvaliarVendedor
                vendedorId={product.vendedor_id ?? ""}
                vendedorNome={product.vendedor_nome ?? "vendedor"}
                anuncioId={product.id}
                isAuthenticated={!!user}
                isOwnProduct={user?.id === product.vendedor_id}
                className="border-0 bg-transparent p-0 shadow-none"
              />
            </div>
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-12">
          <SectionTitle titulo="Produtos Relacionados" />
          <ProductGrid anuncios={relatedProducts} />
        </section>
      )}
    </div>
  );
}
