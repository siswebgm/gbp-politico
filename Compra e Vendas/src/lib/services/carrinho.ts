import { createClient } from "@/lib/supabase/server";
import type { ProductPublic } from "./anuncios";

export interface CarrinhoItem {
  id: string;
  usuario_id: string;
  anuncio_id: string;
  quantidade: number;
  criado_em: string;
  atualizado_em: string;
  anuncio?: ProductPublic;
}

export async function getCarrinhoItems(userId: string): Promise<CarrinhoItem[]> {
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from("carrinho_itens")
    .select(`
      *,
      anuncio:anuncios(*)
    `)
    .eq("usuario_id", userId)
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro ao buscar itens do carrinho:", error);
    return [];
  }

  return (data || []) as CarrinhoItem[];
}

export async function addToCarrinho(userId: string, anuncioId: string, quantidade: number = 1): Promise<boolean> {
  const supabase = await createClient();

  console.log("[addToCarrinho] Iniciando:", { userId, anuncioId, quantidade });

  try {
    // Primeiro, tenta buscar se já existe
    const { data: existing, error: selectError } = await (supabase as any)
      .from("carrinho_itens")
      .select("id, quantidade")
      .eq("usuario_id", userId)
      .eq("anuncio_id", anuncioId)
      .maybeSingle();

    console.log("[addToCarrinho] Item existente:", { existing, selectError });

    if (existing) {
      // Atualiza a quantidade
      const { error: updateError } = await (supabase as any)
        .from("carrinho_itens")
        .update({ 
          quantidade: (existing.quantidade as number) + quantidade,
          atualizado_em: new Date().toISOString()
        })
        .eq("id", existing.id);

      console.log("[addToCarrinho] Atualização:", { updateError });
      
      if (updateError) {
        console.error("[addToCarrinho] Erro ao atualizar:", updateError);
        return false;
      }
      
      return true;
    }

    // Insere novo item
    const { data: insertData, error: insertError } = await (supabase as any)
      .from("carrinho_itens")
      .insert({
        usuario_id: userId,
        anuncio_id: anuncioId,
        quantidade: quantidade
      })
      .select()
      .single();

    console.log("[addToCarrinho] Inserção:", { insertData, insertError });
    
    if (insertError) {
      console.error("[addToCarrinho] Erro ao inserir:", insertError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[addToCarrinho] Exceção capturada:", error);
    return false;
  }
}

export async function updateCarrinhoQuantidade(itemId: string, quantidade: number): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("carrinho_itens")
    .update({ quantidade })
    .eq("id", itemId);

  return !error;
}

export async function removeFromCarrinho(itemId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("carrinho_itens")
    .delete()
    .eq("id", itemId);

  return !error;
}

export async function clearCarrinho(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("carrinho_itens")
    .delete()
    .eq("usuario_id", userId);

  return !error;
}

export async function getCarrinhoCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await (supabase as any)
    .from("carrinho_itens")
    .select("*", { count: "exact", head: true })
    .eq("usuario_id", userId);

  if (error) {
    console.error("Erro ao contar itens do carrinho:", error);
    return 0;
  }

  return count || 0;
}
