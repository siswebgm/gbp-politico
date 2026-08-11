"use client";

import { useState, useEffect } from "react";
import { adicionarAoCarrinhoAction } from "@/lib/actions/carrinho";

const CARRINHO_LOCAL_KEY = "carrinho_local";

interface CarrinhoLocalItem {
  anuncioId: string;
  quantidade: number;
}

export function useCarrinho() {
  const [carrinhoLocal, setCarrinhoLocal] = useState<CarrinhoLocalItem[]>([]);
  const [carrinhoCount, setCarrinhoCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Carrega carrinho do localStorage ao montar
  useEffect(() => {
    const stored = localStorage.getItem(CARRINHO_LOCAL_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CarrinhoLocalItem[];
        setCarrinhoLocal(parsed);
      } catch (error) {
        console.error("Erro ao carregar carrinho local:", error);
      }
    }
  }, []);

  // Atualiza contador sempre que o carrinho mudar
  useEffect(() => {
    localStorage.setItem(CARRINHO_LOCAL_KEY, JSON.stringify(carrinhoLocal));
    setCarrinhoCount(carrinhoLocal.reduce((total, item) => total + item.quantidade, 0));
  }, [carrinhoLocal]);

  const adicionarAoCarrinho = async (anuncioId: string, isUserLoggedIn: boolean) => {
    setIsLoading(true);

    if (isUserLoggedIn) {
      // Usuário logado: salva no banco
      const result = await adicionarAoCarrinhoAction(anuncioId, 1);
      if (result.success) {
        setCarrinhoCount((prev) => prev + 1);
      }
      setIsLoading(false);
      return result;
    } else {
      // Usuário não logado: salva no localStorage
      setCarrinhoLocal((prev) => {
        const existing = prev.find((item) => item.anuncioId === anuncioId);
        
        if (existing) {
          return prev.map((item) =>
            item.anuncioId === anuncioId
              ? { ...item, quantidade: item.quantidade + 1 }
              : item
          );
        }
        
        return [...prev, { anuncioId, quantidade: 1 }];
      });

      setIsLoading(false);
      return { success: true, message: "Produto adicionado ao carrinho!" };
    }
  };

  const getCarrinhoCount = () => carrinhoCount;

  const limparCarrinhoLocal = () => {
    setCarrinhoLocal([]);
    localStorage.removeItem(CARRINHO_LOCAL_KEY);
  };

  return {
    adicionarAoCarrinho,
    carrinhoCount,
    getCarrinhoCount,
    limparCarrinhoLocal,
    carrinhoLocal,
    isLoading,
  };
}
