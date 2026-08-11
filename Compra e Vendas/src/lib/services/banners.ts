import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type BannerAd = Tables<"banners">;

export async function getActiveBanners(
  posicao: BannerAd["posicao"] = "home_topo"
): Promise<BannerAd[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("ativo", true)
    .eq("posicao", posicao)
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("[getActiveBanners] erro:", {
      name: error.constructor?.name,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  }

  return data ?? [];
}
