import { createClient } from "@/lib/supabase/server";

export interface NovaAvaliacao {
  avaliador_id: string;
  avaliado_id: string;
  anuncio_id?: string;
  nota: number;
  comentario?: string;
}

export async function addAvaliacao(data: NovaAvaliacao): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("avaliacoes")
    .insert({
      avaliador_id: data.avaliador_id,
      avaliado_id: data.avaliado_id,
      anuncio_id: data.anuncio_id,
      nota: data.nota,
      comentario: data.comentario,
    });

  if (error) {
    console.error("[addAvaliacao] Erro:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function canRate(
  avaliadorId: string,
  avaliadoId: string,
  anuncioId?: string
): Promise<boolean> {
  if (avaliadorId === avaliadoId) return false;

  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from("avaliacoes")
    .select("id")
    .eq("avaliador_id", avaliadorId)
    .eq("avaliado_id", avaliadoId)
    .maybeSingle();

  if (error) {
    console.error("[canRate] Erro:", error);
    return false;
  }

  return !data;
}
