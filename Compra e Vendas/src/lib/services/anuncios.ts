import { createClient } from "@/lib/supabase/server";
import type { Tables, Views } from "@/lib/supabase/database.types";

export type ProductPublic = Views<"anuncios_publicos">;

export interface ProductFilters {
  q?: string;
  categorySlug?: string;
  cidade?: string;
  condominio?: string;
  minPrice?: number;
  maxPrice?: number;
  condicao?: "novo" | "usado";
  negotiable?: boolean;
  acceptsTrade?: boolean;
  sort?: "recent" | "price_asc" | "price_desc" | "most_viewed";
  page?: number;
  perPage?: number;
  atributos?: Record<string, string>; // Filtros dinâmicos por atributo
}

export interface ProductListResult {
  items: ProductPublic[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export async function getFeaturedProducts(limit = 8): Promise<ProductPublic[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("anuncios_publicos")
    .select("*")
    .eq("destaque", true)
    .order("criado_em", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function getRecentProducts(limit = 12): Promise<ProductPublic[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("anuncios_publicos")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function getMostViewedProducts(limit = 8): Promise<ProductPublic[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("anuncios_publicos")
    .select("*")
    .order("visualizacoes", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function getProductsByCity(cidade: string, limit = 12): Promise<ProductPublic[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("anuncios_publicos")
    .select("*")
    .eq("cidade", cidade)
    .order("criado_em", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function searchProducts(
  filters: ProductFilters
): Promise<ProductListResult> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? 24;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("anuncios_publicos")
    .select("*", { count: "exact" });

  if (filters.q) {
    query = query.textSearch("vetor_busca" as never, filters.q, {
      type: "websearch",
      config: "portuguese",
    });
  }

  if (filters.categorySlug) {
    query = query.eq("categoria_slug", filters.categorySlug);
  }

  if (filters.cidade) {
    query = query.ilike("cidade", `%${filters.cidade}%`);
  }

  if (filters.condominio) {
    query = query.ilike("condominio", `%${filters.condominio}%`);
  }

  if (typeof filters.minPrice === "number") {
    query = query.gte("preco", filters.minPrice);
  }

  if (typeof filters.maxPrice === "number") {
    query = query.lte("preco", filters.maxPrice);
  }

  if (filters.condicao) {
    query = query.eq("condicao", filters.condicao);
  }

  if (filters.negotiable) {
    query = query.eq("negociavel", true);
  }

  if (filters.acceptsTrade) {
    query = query.eq("aceita_troca", true);
  }

  // Filtros dinâmicos por atributos
  if (filters.atributos && Object.keys(filters.atributos).length > 0) {
    // Para cada atributo, precisamos verificar se o anúncio tem esse valor
    // Isso requer uma subconsulta ou JOIN
    const atributoIds = Object.keys(filters.atributos);
    
    for (const atributoId of atributoIds) {
      const valor = filters.atributos[atributoId];
      if (!valor) continue;
      
      // Busca anúncios que têm esse atributo com esse valor
      const { data: anunciosComAtributo } = await supabase
        .from("anuncio_atributos")
        .select("anuncio_id")
        .eq("atributo_id", atributoId)
        .ilike("valor", `%${valor}%`);
      
      if (anunciosComAtributo && anunciosComAtributo.length > 0) {
        const anuncioIds = anunciosComAtributo.map((a) => a.anuncio_id);
        query = query.in("id", anuncioIds);
      } else {
        // Se não encontrou nenhum anúncio com esse atributo, retorna vazio
        return {
          items: [],
          total: 0,
          page,
          perPage,
          totalPages: 0,
        };
      }
    }
  }

  switch (filters.sort) {
    case "price_asc":
      query = query.order("preco", { ascending: true });
      break;
    case "price_desc":
      query = query.order("preco", { ascending: false });
      break;
    case "most_viewed":
      query = query.order("visualizacoes", { ascending: false });
      break;
    default:
      query = query.order("criado_em", { ascending: false });
  }

  const { data, count } = await query.range(from, to);

  const total = count ?? 0;

  return {
    items: data ?? [],
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getProductBySlug(slug: string): Promise<(ProductPublic & { vendedor_telefone: string | null }) | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anuncios_publicos")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;

  // Busca telefone do vendedor para contato direto
  if (data.vendedor_id) {
    const { data: vendedor } = await (supabase as any)
      .from("usuarios")
      .select("telefone")
      .eq("id", data.vendedor_id)
      .single();

    return { ...data, vendedor_telefone: vendedor?.telefone ?? null };
  }

  return { ...data, vendedor_telefone: null };
}

export async function getRelatedProducts(
  categoryId: string | null,
  excludeProductId: string,
  limit = 8
): Promise<ProductPublic[]> {
  if (!categoryId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("anuncios_publicos")
    .select("*")
    .eq("categoria_id", categoryId)
    .neq("id", excludeProductId)
    .limit(limit);

  return data ?? [];
}

export interface MyProduct {
  id: string;
  titulo: string;
  slug: string;
  preco: number;
  situacao: "ativo" | "pausado" | "vendido" | "removido";
  visualizacoes: number;
  criado_em: string;
  capa_url: string | null;
}

export async function getProductById(
  id: string,
  userId: string
): Promise<Tables<"anuncios"> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anuncios")
    .select("*")
    .eq("id", id)
    .eq("usuario_id", userId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function getMyProducts(userId: string): Promise<MyProduct[]> {
  const supabase = await createClient();
  const { data: anuncios } = await supabase
    .from("anuncios")
    .select("id, titulo, slug, preco, situacao, visualizacoes, criado_em")
    .eq("usuario_id", userId)
    .neq("situacao", "removido")
    .order("criado_em", { ascending: false });

  if (!anuncios || anuncios.length === 0) return [];

  const { data: images } = await supabase
    .from("anuncio_imagens")
    .select("anuncio_id, url, ordem")
    .in(
      "anuncio_id",
      anuncios.map((p) => p.id)
    )
    .order("ordem", { ascending: true });

  return anuncios.map((product) => ({
    ...product,
    capa_url:
      images?.find((img) => img.anuncio_id === product.id)?.url ?? null,
  }));
}

export async function getFavoriteProducts(userId: string): Promise<ProductPublic[]> {
  const supabase = await createClient();
  const { data: favoritos } = await supabase
    .schema("public")
    .from("favoritos")
    .select("anuncio_id")
    .eq("usuario_id", userId)
    .order("criado_em", { ascending: false });

  if (!favoritos || favoritos.length === 0) return [];

  const { data } = await supabase
    .schema("public")
    .from("anuncios_publicos")
    .select("*")
    .in(
      "id",
      favoritos.map((f) => f.anuncio_id)
    );

  const orderMap = new Map(favoritos.map((f, i) => [f.anuncio_id, i]));
  return (data ?? []).sort(
    (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
  );
}

export async function getProductByIdForOwner(productId: string, userId: string): Promise<Tables<"anuncios"> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anuncios")
    .select("*")
    .eq("id", productId)
    .eq("usuario_id", userId)
    .single();

  if (error) return null;
  return data;
}

export async function getProductImages(productId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("anuncio_imagens")
    .select("*")
    .eq("anuncio_id", productId)
    .order("ordem", { ascending: true });

  return data ?? [];
}

export async function getSellerActiveProducts(
  sellerId: string,
  excludeProductId?: string,
  limit = 12
): Promise<ProductPublic[]> {
  const supabase = await createClient();
  let query = supabase
    .from("anuncios_publicos")
    .select("*")
    .eq("vendedor_id", sellerId)
    .order("criado_em", { ascending: false })
    .limit(limit);

  if (excludeProductId) {
    query = query.neq("id", excludeProductId);
  }

  const { data } = await query;
  return data ?? [];
}
