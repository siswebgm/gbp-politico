import { createClient } from "@/lib/supabase/server";
import type { ProductPublic } from "@/lib/services/anuncios";

export async function getFavoriteProducts(_userId: string): Promise<ProductPublic[]> {
  return [];
}

export async function isProductFavorited(
  userId: string | undefined,
  productId: string
): Promise<boolean> {
  if (!userId) return false;

  const supabase = await createClient();
  const { data } = await supabase
    .from("favoritos")
    .select("id")
    .eq("usuario_id", userId)
    .eq("anuncio_id", productId)
    .maybeSingle();

  return !!data;
}
