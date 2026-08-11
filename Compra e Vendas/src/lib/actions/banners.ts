"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { BannerPosition } from "@/lib/supabase/database.types";

export type BannerActionState = {
  success: boolean;
  message?: string;
};

export async function createBannerAction(
  _prevState: BannerActionState,
  formData: FormData
): Promise<BannerActionState> {
  const supabase = await createClient();

  const titulo = formData.get("titulo") as string;
  const descricao = formData.get("descricao") as string;
  const imagem_desktop_url = formData.get("imagem_desktop_url") as string;
  const imagem_mobile_url = formData.get("imagem_mobile_url") as string;
  const link = formData.get("link") as string;
  const posicao = formData.get("posicao") as string;
  const data_inicio = formData.get("data_inicio") as string;
  const data_fim = formData.get("data_fim") as string;

  if (!imagem_desktop_url) {
    return { success: false, message: "A URL da imagem desktop é obrigatória." };
  }

  const { error } = await supabase.schema("public").from("banners").insert({
    titulo: titulo || null,
    descricao: descricao || null,
    imagem_desktop_url,
    imagem_mobile_url: imagem_mobile_url || null,
    link: link || null,
    posicao: (posicao as BannerPosition) || "home_meio",
    data_inicio: data_inicio || new Date().toISOString().slice(0, 10),
    data_fim: data_fim || null,
    ativo: true,
  });

  if (error) {
    return { success: false, message: `Erro ao criar banner: ${error.message}` };
  }

  revalidatePath("/");
  redirect("/admin/banners");
}
