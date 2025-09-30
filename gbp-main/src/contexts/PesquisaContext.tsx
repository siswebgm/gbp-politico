import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { usePesquisas, Pesquisa, Candidato, Pergunta } from '../hooks/usePesquisas';

interface PesquisaContextType {
  pesquisas: Pesquisa[];
  pesquisaAtual: Pesquisa | null;
  loading: boolean;
  error: string | null;
  carregarPesquisas: () => Promise<void>;
  carregarPesquisa: (id: string) => Promise<Pesquisa | null>;
  criarPesquisa: (dados: Omit<Pesquisa, 'id' | 'respostas' | 'dataCriacao' | 'candidatos' | 'perguntas'>) => Promise<Pesquisa>;
  atualizarPesquisa: (id: string, dados: Partial<Pesquisa>) => Promise<void>;
  excluirPesquisa: (id: string) => Promise<void>;
  adicionarCandidato: (pesquisaId: string, candidato: Omit<Candidato, 'id'>) => Promise<Candidato>;
  removerCandidato: (pesquisaId: string, candidatoId: string) => Promise<void>;
  adicionarPergunta: (pesquisaId: string, pergunta: Omit<Pergunta, 'id'>) => Promise<Pergunta>;
  removerPergunta: (pesquisaId: string, perguntaId: string) => Promise<void>;
  enviarRespostas: (pesquisaId: string, respostas: any[]) => Promise<boolean>;
  setPesquisaAtual: (pesquisa: Pesquisa | null) => void;
}

const PesquisaContext = createContext<PesquisaContextType | undefined>(undefined);

export function PesquisaProvider({ children }: { children: ReactNode }) {
  const [pesquisaAtual, setPesquisaAtual] = useState<Pesquisa | null>(null);
  
  const {
    pesquisas,
    loading,
    error,
    carregarPesquisas,
    carregarPesquisa,
    criarPesquisa: criarPesquisaHook,
    atualizarPesquisa,
    excluirPesquisa,
    adicionarCandidato,
    removerCandidato,
    adicionarPergunta,
    removerPergunta,
    enviarRespostas,
  } = usePesquisas();

  // Envolver a criação de pesquisa para atualizar a pesquisa atual
  const criarPesquisaWrapper = useCallback(async (dados: Omit<Pesquisa, 'id' | 'respostas' | 'dataCriacao' | 'candidatos' | 'perguntas'>) => {
    const novaPesquisa = await criarPesquisaHook(dados);
    setPesquisaAtual(novaPesquisa);
    return novaPesquisa;
  }, [criarPesquisaHook]);

  // Carregar uma pesquisa e definir como atual
  const carregarPesquisaWrapper = useCallback(async (id: string) => {
    const pesquisa = await carregarPesquisa(id);
    setPesquisaAtual(pesquisa);
    return pesquisa;
  }, [carregarPesquisa]);

  return (
    <PesquisaContext.Provider
      value={{
        pesquisas,
        pesquisaAtual,
        loading,
        error,
        carregarPesquisas,
        carregarPesquisa: carregarPesquisaWrapper,
        criarPesquisa: criarPesquisaWrapper,
        atualizarPesquisa,
        excluirPesquisa,
        adicionarCandidato,
        removerCandidato,
        adicionarPergunta,
        removerPergunta,
        enviarRespostas,
        setPesquisaAtual,
      }}
    >
      {children}
    </PesquisaContext.Provider>
  );
}

export function usePesquisa() {
  const context = useContext(PesquisaContext);
  if (context === undefined) {
    throw new Error('usePesquisa deve ser usado dentro de um PesquisaProvider');
  }
  return context;
}
