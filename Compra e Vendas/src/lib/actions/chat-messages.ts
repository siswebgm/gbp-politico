"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/services/usuarios";

export async function sendMessageAction(
  roomId: string,
  conteudo: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "unauthenticated" };

  if (!conteudo.trim()) return { success: false, error: "empty" };

  const supabase = await createClient();

  const { error } = await supabase.schema("public").from("mensagens").insert({
    conversa_id: roomId,
    remetente_id: user.id,
    conteudo: conteudo.trim(),
  });

  if (error) return { success: false, error: error.message };

  await supabase
    .schema("public")
    .from("conversas")
    .update({ ultima_mensagem_em: new Date().toISOString() })
    .eq("id", roomId);

  revalidatePath(`/mensagens/${roomId}`);
  revalidatePath("/mensagens");

  return { success: true };
}

export async function markMessagesAsReadAction(
  roomId: string
): Promise<{ success: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { success: false };

  const supabase = await createClient();

  await supabase
    .schema("public")
    .from("mensagens")
    .update({ lida_em: new Date().toISOString() })
    .eq("conversa_id", roomId)
    .neq("remetente_id", user.id)
    .is("lida_em", null);

  revalidatePath("/mensagens");
  return { success: true };
}
