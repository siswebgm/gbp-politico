import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categoriaId = searchParams.get("categoria_id");

  if (!categoriaId) {
    return NextResponse.json(
      { error: "categoria_id é obrigatório" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("atributos_categoria")
    .select("*")
    .eq("categoria_id", categoriaId)
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (error) {
    console.error("Erro ao buscar atributos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar atributos" },
      { status: 500 }
    );
  }

  return NextResponse.json(data || []);
}
