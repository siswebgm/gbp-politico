"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { addToCarrinho, updateCarrinhoQuantidade, removeFromCarrinho } from "@/lib/services/carrinho";

export async function adicionarAoCarrinhoAction(anuncioId: string, quantidade: number = 1) {
  try {
    console.log("[adicionarAoCarrinhoAction] Iniciando:", { anuncioId, quantidade });
    
    const user = await getCurrentUser();
    console.log("[adicionarAoCarrinhoAction] Usuário:", user ? { id: user.id, nome: user.nome } : null);
    
    if (!user) {
      console.log("[adicionarAoCarrinhoAction] Usuário não autenticado");
      return { success: false, error: "Usuário não autenticado" };
    }
    
    const success = await addToCarrinho(user.id, anuncioId, quantidade);
    console.log("[adicionarAoCarrinhoAction] Resultado addToCarrinho:", success);
    
    if (success) {
      revalidatePath("/carrinho");
      console.log("[adicionarAoCarrinhoAction] Sucesso!");
      return { success: true, message: "Produto adicionado ao carrinho!" };
    }
    
    console.log("[adicionarAoCarrinhoAction] Falha ao adicionar");
    return { success: false, error: "Erro ao adicionar ao carrinho" };
  } catch (error) {
    console.error("[adicionarAoCarrinhoAction] Erro capturado:", error);
    return { success: false, error: "Erro ao adicionar ao carrinho" };
  }
}

export async function updateQuantidadeAction(itemId: string, quantidade: number) {
  try {
    const success = await updateCarrinhoQuantidade(itemId, quantidade);
    
    if (success) {
      revalidatePath("/carrinho");
      return { success: true };
    }
    
    return { success: false, error: "Erro ao atualizar quantidade" };
  } catch (error) {
    console.error("Erro ao atualizar quantidade:", error);
    return { success: false, error: "Erro ao atualizar quantidade" };
  }
}

export async function removerItemAction(itemId: string) {
  try {
    const success = await removeFromCarrinho(itemId);
    
    if (success) {
      revalidatePath("/carrinho");
      return { success: true };
    }
    
    return { success: false, error: "Erro ao remover item" };
  } catch (error) {
    console.error("Erro ao remover item:", error);
    return { success: false, error: "Erro ao remover item" };
  }
}
