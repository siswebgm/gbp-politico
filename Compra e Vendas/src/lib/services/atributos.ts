import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type AtributoCategoria = Tables<"atributos_categoria">;
export type AnuncioAtributo = Tables<"anuncio_atributos">;

export interface AtributoComValor extends AtributoCategoria {
  valor?: string;
}

/**
 * Busca todos os atributos ativos de uma categoria
 */
export async function getAtributosPorCategoria(
  categoriaId: string
): Promise<AtributoCategoria[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("atributos_categoria")
    .select("*")
    .eq("categoria_id", categoriaId)
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  return data ?? [];
}

/**
 * Busca atributos de uma categoria pelo slug
 */
export async function getAtributosPorCategoriaSlug(
  categoriaSlug: string
): Promise<AtributoCategoria[]> {
  const supabase = await createClient();
  
  // Primeiro busca o ID da categoria
  const { data: categoria } = await supabase
    .from("categorias")
    .select("id")
    .eq("slug", categoriaSlug)
    .single();

  if (!categoria) return [];

  return getAtributosPorCategoria(categoria.id);
}

/**
 * Busca os valores dos atributos de um anúncio específico
 */
export async function getAtributosAnuncio(
  anuncioId: string
): Promise<AnuncioAtributo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("anuncio_atributos")
    .select("*")
    .eq("anuncio_id", anuncioId);

  return data ?? [];
}

/**
 * Busca atributos de um anúncio com suas definições
 */
export async function getAtributosComDefinicoes(
  anuncioId: string
): Promise<AtributoComValor[]> {
  const supabase = await createClient();
  
  const { data: anuncio } = await supabase
    .from("anuncios")
    .select("categoria_id")
    .eq("id", anuncioId)
    .single();

  if (!anuncio?.categoria_id) return [];

  const [atributos, valores] = await Promise.all([
    getAtributosPorCategoria(anuncio.categoria_id),
    getAtributosAnuncio(anuncioId),
  ]);

  return atributos.map((atributo) => ({
    ...atributo,
    valor: valores.find((v) => v.atributo_id === atributo.id)?.valor,
  }));
}

/**
 * Salva ou atualiza atributos de um anúncio
 */
export async function salvarAtributosAnuncio(
  anuncioId: string,
  atributos: Record<string, string>
): Promise<void> {
  const supabase = await createClient();

  // Busca todos os atributos existentes do anúncio
  const { data: existentes } = await supabase
    .from("anuncio_atributos")
    .select("*")
    .eq("anuncio_id", anuncioId);

  const existentesMap = new Map(
    (existentes ?? []).map((a) => [a.atributo_id, a])
  );

  // Prepara operações de insert/update
  const operations = Object.entries(atributos).map(
    async ([atributoId, valor]) => {
      const existente = existentesMap.get(atributoId);

      if (existente) {
        // Atualiza se já existe
        return supabase
          .from("anuncio_atributos")
          .update({ valor })
          .eq("id", existente.id);
      } else {
        // Insere se não existe
        return supabase.from("anuncio_atributos").insert({
          anuncio_id: anuncioId,
          atributo_id: atributoId,
          valor,
        });
      }
    }
  );

  await Promise.all(operations);
}

/**
 * Remove atributos de um anúncio
 */
export async function removerAtributosAnuncio(
  anuncioId: string
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("anuncio_atributos").delete().eq("anuncio_id", anuncioId);
}
