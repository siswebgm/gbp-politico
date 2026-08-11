import type { Metadata } from "next";

import { searchProducts } from "@/lib/services/anuncios";
import { getCategories } from "@/lib/services/categorias";
import { getAtributosPorCategoriaSlug } from "@/lib/services/atributos";

import { ProductGrid } from "@/components/features/anuncios/anuncio-grid";
import { ProductFiltersPanel } from "@/components/features/anuncios/anuncio-filters";
import { CategoryNav } from "@/components/features/categorias/category-nav";
import { SortSelect } from "@/components/features/anuncios/sort-select";
import { Pagination } from "@/components/ui/pagination";

export const metadata: Metadata = {
  title: "Produtos",
  description: "Encontre produtos à venda por categoria, cidade e condomínio.",
};

const sortMap = {
  recentes: "recent",
  preco_menor: "price_asc",
  preco_maior: "price_desc",
  "mais-vistos": "most_viewed",
} as const;

interface ProdutosPageProps {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
    cidade?: string;
    condominio?: string;
    preco_min?: string;
    preco_max?: string;
    condicao?: string;
    negociavel?: string;
    troca?: string;
    ordenar?: string;
    pagina?: string;
    [key: string]: string | undefined;
  }>;
}

export default async function ProdutosPage({ searchParams }: ProdutosPageProps) {
  const params = await searchParams;

  const page = Number(params.pagina ?? "1") || 1;
  const sortKey = (params.ordenar as keyof typeof sortMap) ?? "recentes";

  // Extrai filtros de atributos dinâmicos da URL
  const atributosFilter: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (key.startsWith("attr_") && value) {
      atributosFilter[key.replace("attr_", "")] = value;
    }
  });

  const [result, categorias, atributos] = await Promise.all([
    searchProducts({
      q: params.q,
      categorySlug: params.categoria,
      cidade: params.cidade,
      condominio: params.condominio,
      minPrice: params.preco_min ? Number(params.preco_min) : undefined,
      maxPrice: params.preco_max ? Number(params.preco_max) : undefined,
      condicao: params.condicao as "novo" | "usado" | undefined,
      negotiable: params.negociavel === "true",
      acceptsTrade: params.troca === "true",
      sort: sortMap[sortKey] ?? "recent",
      page,
      atributos: Object.keys(atributosFilter).length > 0 ? atributosFilter : undefined,
    }),
    getCategories(),
    params.categoria ? getAtributosPorCategoriaSlug(params.categoria) : Promise.resolve([]),
  ]);

  function buildHref(targetPage: number) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
    );
    query.set("pagina", String(targetPage));
    return `/produtos?${query.toString()}`;
  }

  const categoriaAtual = params.categoria 
    ? categorias.find((c) => c.slug === params.categoria)
    : null;

  return (
    <>
      <CategoryNav categorias={categorias} />
      <div className="container flex flex-col gap-6 px-4 py-6 md:px-6 lg:flex-row">
        <ProductFiltersPanel categorias={categorias} atributos={atributos} />

      <div className="flex-1">
        {categoriaAtual && (
          <div className="mb-4">
            <h1 className="text-2xl font-bold">{categoriaAtual.nome}</h1>
          </div>
        )}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {result.total} produto{result.total !== 1 ? "s" : ""} encontrado
            {result.total !== 1 ? "s" : ""}
            {params.q && (
              <>
                {" "}
                para <span className="font-medium text-foreground">&quot;{params.q}&quot;</span>
              </>
            )}
          </p>
          <SortSelect />
        </div>

        <ProductGrid anuncios={result.items} />

        <Pagination page={result.page} totalPages={result.totalPages} buildHref={buildHref} />
      </div>
    </div>
    </>
  );
}
