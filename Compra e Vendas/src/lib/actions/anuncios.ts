"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/services/usuarios";
import { productSchema } from "@/schemas/product";

export type ProductActionState = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  productSlug?: string;
};

const initialErrorState: ProductActionState = { success: false };

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    titulo: formData.get("titulo") || "",
    descricao: formData.get("descricao") || undefined,
    preco: formData.get("preco"),
    categoryId: formData.get("categoryId") || "",
    subcategoryId: formData.get("subcategoryId") || "",
    condicao: formData.get("condicao") || "",
    quantidade: formData.get("quantidade") || 1,
    cidade: formData.get("cidade") || "",
    condominio: formData.get("condominio") || undefined,
    endereco: formData.get("endereco") || undefined,
    negociavel: formData.get("negociavel") === "on",
    acceptsTrade: formData.get("aceita_troca") === "on",
    videoUrl: formData.get("videoUrl") || "",
  });
}

export async function createProductAction(
  _prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Você precisa entrar para anunciar." };
  }

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.entries(fieldErrors).find(([, v]) => v?.length)?.[1]?.[0];
    console.log("[createProductAction] validation errors:", fieldErrors, "formData:", Object.fromEntries(formData.entries()));
    return {
      success: false,
      fieldErrors,
      message: `Erro de validação: ${firstError ?? "Verifique os campos"}`,
    };
  }

  const { categoryId, subcategoryId, videoUrl, ...rest } = parsed.data;

  const supabase = await createClient();
  const { data: product, error } = await supabase
    .schema("public")
    .from("anuncios")
    .insert({
      usuario_id: user.id,
      titulo: rest.titulo,
      descricao: rest.descricao ?? null,
      preco: rest.preco,
      categoria_id: categoryId,
      subcategoria_id: subcategoryId || null,
      condicao: rest.condicao,
      quantidade: rest.quantidade,
      cidade: rest.cidade,
      condominio: rest.condominio ?? null,
      endereco: rest.endereco ?? null,
      negociavel: rest.negociavel,
      aceita_troca: rest.acceptsTrade,
      situacao: "ativo",
      video_url: videoUrl || null,
    })
    .select("id, slug")
    .single();

  if (error || !product) {
    console.error("[createProductAction] insert error:", error, "data:", product);
    return {
      success: false,
      message: `Não foi possível criar o anúncio: ${error?.message ?? "erro desconhecido"}`,
    };
  }

  const imageUrls = formData.getAll("imageUrls") as string[];
  if (imageUrls.length > 0) {
    await supabase
      .schema("public")
      .from("anuncio_imagens")
      .insert(
        imageUrls.map((url, index) => ({
          anuncio_id: product.id,
          url,
          ordem: index,
        }))
      );
  }

  revalidatePath("/produtos");
  revalidatePath("/meus-anuncios");
  redirect(`/produtos/${product.slug}`);
}

export async function updateProductAction(
  productId: string,
  _prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Você precisa entrar para editar." };
  }

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { categoryId, subcategoryId, videoUrl, ...rest } = parsed.data;

  const supabase = await createClient();
  const { data: product, error } = await supabase
    .schema("public")
    .from("anuncios")
    .update({
      titulo: rest.titulo,
      descricao: rest.descricao ?? null,
      preco: rest.preco,
      categoria_id: categoryId,
      subcategoria_id: subcategoryId || null,
      condicao: rest.condicao,
      quantidade: rest.quantidade,
      cidade: rest.cidade,
      condominio: rest.condominio ?? null,
      endereco: rest.endereco ?? null,
      negociavel: rest.negociavel,
      aceita_troca: rest.acceptsTrade,
      video_url: videoUrl || null,
    })
    .eq("id", productId)
    .eq("usuario_id", user.id)
    .select("slug")
    .single();

  if (error || !product) {
    return { success: false, message: "Não foi possível atualizar o anúncio." };
  }

  const newImageUrls = formData.getAll("imageUrls") as string[];
  if (newImageUrls.length > 0) {
    const { data: existingImages } = await supabase
      .schema("public")
      .from("anuncio_imagens")
      .select("ordem")
      .eq("anuncio_id", productId)
      .order("ordem", { ascending: false })
      .limit(1);

    const startOrder = (existingImages?.[0]?.ordem ?? -1) + 1;

    await supabase
      .schema("public")
      .from("anuncio_imagens")
      .insert(
        newImageUrls.map((url, index) => ({
          anuncio_id: productId,
          url,
          ordem: startOrder + index,
        }))
      );
  }

  revalidatePath("/produtos");
  revalidatePath(`/produtos/${product.slug}`);
  revalidatePath("/meus-anuncios");
  redirect(`/produtos/${product.slug}`);
}

export async function deleteProductImageAction(
  productId: string,
  imageId: string
): Promise<{ success: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { success: false };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("public")
    .from("anuncio_imagens")
    .delete()
    .eq("id", imageId)
    .eq("anuncio_id", productId);

  revalidatePath("/meus-anuncios");
  return { success: !error };
}

async function updateProductStatus(
  productId: string,
  situacao: "ativo" | "pausado" | "vendido" | "removido"
) {
  const user = await getCurrentUser();
  if (!user) return { success: false };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("public")
    .from("anuncios")
    .update({ situacao })
    .eq("id", productId)
    .eq("usuario_id", user.id);

  revalidatePath("/meus-anuncios");
  revalidatePath("/produtos");
  return { success: !error };
}

export async function pauseProductAction(productId: string) {
  return updateProductStatus(productId, "pausado");
}

export async function reactivateProductAction(productId: string) {
  return updateProductStatus(productId, "ativo");
}

export async function markAsSoldAction(productId: string) {
  return updateProductStatus(productId, "vendido");
}

export async function deleteProductAction(productId: string) {
  return updateProductStatus(productId, "removido");
}

export async function renewProductAction(productId: string) {
  const user = await getCurrentUser();
  if (!user) return { success: false };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("public")
    .from("anuncios")
    .update({ criado_em: new Date().toISOString(), situacao: "ativo" })
    .eq("id", productId)
    .eq("usuario_id", user.id);

  revalidatePath("/meus-anuncios");
  revalidatePath("/produtos");
  return { success: !error };
}

export async function duplicateProductAction(productId: string) {
  const user = await getCurrentUser();
  if (!user) return { success: false };

  const supabase = await createClient();

  const { data: original } = await supabase
    .schema("public")
    .from("anuncios")
    .select("*")
    .eq("id", productId)
    .eq("usuario_id", user.id)
    .single();

  if (!original) return { success: false };

  const { data: newProduct, error } = await supabase
    .schema("public")
    .from("anuncios")
    .insert({
      usuario_id: user.id,
      titulo: `${original.titulo} (cópia)`,
      descricao: original.descricao,
      preco: original.preco,
      categoria_id: original.categoria_id,
      subcategoria_id: original.subcategoria_id,
      condicao: original.condicao,
      quantidade: original.quantidade,
      cidade: original.cidade,
      condominio: original.condominio,
      endereco: original.endereco,
      latitude: original.latitude,
      longitude: original.longitude,
      negociavel: original.negociavel,
      aceita_troca: original.aceita_troca,
      video_url: original.video_url,
      situacao: "pausado",
    })
    .select("id")
    .single();

  if (error || !newProduct) return { success: false };

  const { data: images } = await supabase
    .schema("public")
    .from("anuncio_imagens")
    .select("url, ordem")
    .eq("anuncio_id", productId);

  if (images && images.length > 0) {
    await supabase
      .schema("public")
      .from("anuncio_imagens")
      .insert(
        images.map((img) => ({
          anuncio_id: newProduct.id,
          url: img.url,
          ordem: img.ordem,
        }))
      );
  }

  revalidatePath("/meus-anuncios");
  return { success: true };
}
