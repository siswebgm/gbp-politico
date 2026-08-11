import { createClient } from "@/lib/supabase/server";
import type { Views, Tables } from "@/lib/supabase/database.types";

export type ChatRoomWithLastMessage = Views<"conversas_com_ultima_message">;
export type ChatMessage = Tables<"mensagens">;

export async function getChatRooms(
  userId: string
): Promise<ChatRoomWithLastMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversas_com_ultima_message")
    .select("*")
    .or(`comprador_id.eq.${userId},vendedor_id.eq.${userId}`)
    .order("ultima_mensagem_em", { ascending: false, nullsFirst: false });

  return data ?? [];
}

export interface ChatRoomDetail {
  id: string;
  anuncio_id: string;
  comprador_id: string;
  vendedor_id: string;
  anuncio_titulo: string;
  anuncio_slug: string;
  anuncio_imagem_url: string | null;
  other_usuario_id: string;
  other_user_nome: string;
  other_user_foto_url: string | null;
}

export async function getChatRoomDetail(
  roomId: string,
  currentUserId: string
): Promise<ChatRoomDetail | null> {
  const supabase = await createClient();

  const { data: room, error } = await supabase
    .schema("public")
    .from("conversas")
    .select("id, anuncio_id, comprador_id, vendedor_id")
    .eq("id", roomId)
    .single();

  if (error || !room) return null;

  const isBuyer = room.comprador_id === currentUserId;
  const otherUserId = isBuyer ? room.vendedor_id : room.comprador_id;

  const [{ data: product }, { data: otherUser }, { data: image }] = await Promise.all([
    supabase
      .schema("public")
      .from("anuncios")
      .select("titulo, slug")
      .eq("id", room.anuncio_id)
      .single(),
    supabase
      .schema("public")
      .from("usuarios")
      .select("id, nome, foto_url")
      .eq("id", otherUserId)
      .single(),
    supabase
      .schema("public")
      .from("anuncio_imagens")
      .select("url")
      .eq("anuncio_id", room.anuncio_id)
      .order("ordem", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    id: room.id,
    anuncio_id: room.anuncio_id,
    comprador_id: room.comprador_id,
    vendedor_id: room.vendedor_id,
    anuncio_titulo: product?.titulo ?? "",
    anuncio_slug: product?.slug ?? "",
    anuncio_imagem_url: image?.url ?? null,
    other_usuario_id: otherUser?.id ?? "",
    other_user_nome: otherUser?.nome ?? "Usuário",
    other_user_foto_url: otherUser?.foto_url ?? null,
  };
}

export async function getChatMessages(roomId: string): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .schema("public")
    .from("mensagens")
    .select("*")
    .eq("conversa_id", roomId)
    .order("criado_em", { ascending: true });

  return data ?? [];
}

export async function getUnreadMessagesCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { data: rooms } = await supabase
    .schema("public")
    .from("conversas")
    .select("id")
    .or(`comprador_id.eq.${userId},vendedor_id.eq.${userId}`);

  if (!rooms || rooms.length === 0) return 0;

  const { count } = await supabase
    .schema("public")
    .from("mensagens")
    .select("id", { count: "exact", head: true })
    .in(
      "conversa_id",
      rooms.map((r) => r.id)
    )
    .is("lida_em", null)
    .neq("remetente_id", userId);

  return count ?? 0;
}
