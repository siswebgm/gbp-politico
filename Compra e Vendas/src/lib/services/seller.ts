import { createClient } from "@/lib/supabase/server";
import type { Views } from "@/lib/supabase/database.types";

export type SellerProfile = Views<"perfis_vendedores">;

export async function getSellerBySlug(slug: string): Promise<SellerProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("perfis_vendedores")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data;
}
