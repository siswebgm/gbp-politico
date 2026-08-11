"use server";

import { revalidatePath } from "next/cache";
import { addAvaliacao } from "@/lib/services/avaliacoes";
import { getCurrentUser } from "@/lib/services/usuarios";

export async function adicionarAvaliacaoAction(
  avaliadoId: string,
  anuncioId: string | undefined,
  nota: number,
  comentario?: string
) {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Usuário não autenticado" };
  }

  if (user.id === avaliadoId) {
    return { success: false, error: "Você não pode avaliar a si mesmo" };
  }

  if (nota < 1 || nota > 5) {
    return { success: false, error: "A nota deve ser entre 1 e 5" };
  }

  const result = await addAvaliacao({
    avaliador_id: user.id,
    avaliado_id: avaliadoId,
    anuncio_id: anuncioId,
    nota,
    comentario,
  });

  if (result.success) {
    revalidatePath(`/produtos`);
    revalidatePath(`/usuario/${avaliadoId}`);
    return { success: true };
  }

  return { success: false, error: result.error };
}
