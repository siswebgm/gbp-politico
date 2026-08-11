import { createClient } from "@/lib/supabase/server";
import { getUnreadMessagesCount } from "@/lib/services/chat";

export interface DashboardStats {
  totalAds: number;
  activeAds: number;
  pausedAds: number;
  soldAds: number;
  totalViews: number;
  totalFavorites: number;
  unreadMessages: number;
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const supabase = await createClient();

  const [{ data: anuncios }, { count: favoritesCount }, unreadMessages] =
    await Promise.all([
      supabase
        .schema("public")
        .from("anuncios")
        .select("situacao, visualizacoes")
        .eq("usuario_id", userId)
        .neq("situacao", "removido"),
      supabase
        .schema("public")
        .from("favoritos")
        .select("id", { count: "exact", head: true })
        .eq("usuario_id", userId),
      getUnreadMessagesCount(userId),
    ]);

  const list = anuncios ?? [];

  return {
    totalAds: list.length,
    activeAds: list.filter((p) => p.situacao === "ativo").length,
    pausedAds: list.filter((p) => p.situacao === "pausado").length,
    soldAds: list.filter((p) => p.situacao === "vendido").length,
    totalViews: list.reduce((sum, p) => sum + (p.visualizacoes ?? 0), 0),
    totalFavorites: favoritesCount ?? 0,
    unreadMessages,
  };
}
