import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Category = Tables<"categorias">;
export type Subcategory = Tables<"subcategorias">;

export interface CategoryWithChildren extends Category {
  subcategorias: Subcategory[];
}

export async function getCategories(): Promise<CategoryWithChildren[]> {
  const supabase = await createClient();

  const { data: categorias } = await supabase
    .from("categorias")
    .select("*")
    .filter("categoria_pai_id", "is", null)
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  const { data: subcategorias } = await supabase
    .from("subcategorias")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  return (categorias ?? []).map((category) => ({
    ...category,
    subcategorias: (subcategorias ?? []).filter(
      (sub) => sub.categoria_id === category.id
    ),
  }));
}

export async function getCategoryBySlug(
  slug: string
): Promise<CategoryWithChildren | null> {
  const categorias = await getCategories();
  return categorias.find((c) => c.slug === slug) ?? null;
}
