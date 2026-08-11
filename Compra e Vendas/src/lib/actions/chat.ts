"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/services/usuarios";

export async function startChatAction(
  productId: string,
  sellerId: string
): Promise<{ error: string } | never> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "unauthenticated" };
  }

  if (user.id === sellerId) {
    return { error: "cannot_chat_own_product" };
  }

  const supabase = await createClient();

  const { data: existingRoom } = await supabase
    .schema("public")
    .from("conversas")
    .select("id")
    .eq("anuncio_id", productId)
    .eq("comprador_id", user.id)
    .eq("vendedor_id", sellerId)
    .maybeSingle();

  if (existingRoom) {
    redirect(`/mensagens/${existingRoom.id}`);
  }

  const { data: newRoom, error } = await supabase
    .schema("public")
    .from("conversas")
    .insert({
      anuncio_id: productId,
      comprador_id: user.id,
      vendedor_id: sellerId,
    })
    .select("id")
    .single();

  if (error || !newRoom) {
    return { error: "failed_to_create_chat" };
  }

  redirect(`/mensagens/${newRoom.id}`);
}

export async function reportProductAction(
  _prevState: { success: boolean; message?: string },
  formData: FormData
): Promise<{ success: boolean; message?: string }> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, message: "Você precisa entrar para denunciar." };
  }

  const productId = formData.get("productId") as string;
  const reason = formData.get("motivo") as string;
  const details = formData.get("detalhes") as string;

  if (!productId || !reason) {
    return { success: false, message: "Preencha o motivo da denúncia." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .schema("public")
    .from("denuncias")
    .insert({
      anuncio_id: productId,
      denunciante_id: user.id,
      motivo: reason,
      detalhes: details || null,
    });

  if (error) {
    return { success: false, message: "Não foi possível enviar a denúncia." };
  }

  return { success: true, message: "Denúncia enviada. Obrigado por ajudar!" };
}
