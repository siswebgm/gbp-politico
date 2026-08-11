"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/services/usuarios";

export async function toggleFavoriteAction(
  productId: string,
  productSlug: string
): Promise<{ favorited: boolean } | { error: string }> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "unauthenticated" };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .schema("public")
    .from("favoritos")
    .select("id")
    .eq("usuario_id", user.id)
    .eq("anuncio_id", productId)
    .maybeSingle();

  if (existing) {
    await supabase
      .schema("public")
      .from("favoritos")
      .delete()
      .eq("id", existing.id);
    revalidatePath(`/produtos/${productSlug}`);
    revalidatePath("/favoritos");
    return { favorited: false };
  }

  await supabase.schema("public").from("favoritos").insert({
    usuario_id: user.id,
    anuncio_id: productId,
  });

  revalidatePath(`/produtos/${productSlug}`);
  revalidatePath("/favoritos");
  return { favorited: true };
}
