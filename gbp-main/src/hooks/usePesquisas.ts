import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface Candidato {
  id: string;
  nome: string;
  partido: string;
  imagem: string | null;
}

export interface Pergunta {
  id: string;
  texto: string;
  tipo: 'estrelas' | 'nota' | 'votacao';
}

export interface Pesquisa {
  id: string;
  titulo: string;
  descricao: string;
  dataCriacao: string;
  status: 'rascunho' | 'publicada' | 'encerrada';
  respostas: number;
  candidatos: Candidato[];
  perguntas: Pergunta[];
}

export function usePesquisas() {
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar todas as pesquisas
  const carregarPesquisas = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulando chamada à API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Dados mockados para exemplo
      const dadosMockados: Pesquisa[] = [
        {
          id: '1',
          titulo: 'Pesquisa de intenção de votos - Eleições 2024',
          descricao: 'Pesquisa para avaliar a intenção de votos para prefeito',
          dataCriacao: '2024-08-01',
          status: 'publicada',
          respostas: 42,
          candidatos: [
            { id: '1', nome: 'João Silva', partido: 'PSDB', imagem: null },
            { id: '2', nome: 'Maria Souza', partido: 'PT', imagem: null },
          ],
          perguntas: [
            { id: '1', texto: 'Qual a sua avaliação sobre o candidato?', tipo: 'estrelas' },
            { id: '2', texto: 'De 0 a 10, qual a chance de você votar neste candidato?', tipo: 'nota' },
            { id: '3', texto: 'Você votaria neste candidato?', tipo: 'votacao' },
          ],
        },
        {
          id: '2',
          titulo: 'Avaliação de desempenho dos vereadores',
          descricao: 'Pesquisa para avaliar o desempenho dos vereadores da câmara municipal',
          dataCriacao: '2024-07-15',
          status: 'rascunho',
          respostas: 0,
          candidatos: [],
          perguntas: [],
        },
      ];
      
      setPesquisas(dadosMockados);
    } catch (err) {
      console.error('Erro ao carregar pesquisas:', err);
      setError('Erro ao carregar as pesquisas. Tente novamente mais tarde.');
      toast.error('Erro ao carregar as pesquisas');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar uma pesquisa específica por ID
  const carregarPesquisa = useCallback(async (id: string): Promise<Pesquisa | null> => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulando chamada à API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Dados mockados para exemplo
      const pesquisaMockada: Pesquisa = {
        id,
        titulo: 'Pesquisa de intenção de votos - Eleições 2024',
        descricao: 'Pesquisa para avaliar a intenção de votos para prefeito',
        dataCriacao: '2024-08-01',
        status: 'publicada',
        respostas: 42,
        candidatos: [
          { id: '1', nome: 'João Silva', partido: 'PSDB', imagem: null },
          { id: '2', nome: 'Maria Souza', partido: 'PT', imagem: null },
        ],
        perguntas: [
          { id: '1', texto: 'Qual a sua avaliação sobre o candidato?', tipo: 'estrelas' },
          { id: '2', texto: 'De 0 a 10, qual a chance de você votar neste candidato?', tipo: 'nota' },
          { id: '3', texto: 'Você votaria neste candidato?', tipo: 'votacao' },
        ],
      };
      
      return pesquisaMockada;
    } catch (err) {
      console.error(`Erro ao carregar pesquisa ${id}:`, err);
      setError('Erro ao carregar a pesquisa. Tente novamente mais tarde.');
      toast.error('Erro ao carregar a pesquisa');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Criar uma nova pesquisa
  const criarPesquisa = useCallback(async (dados: Omit<Pesquisa, 'id' | 'respostas' | 'dataCriacao' | 'candidatos' | 'perguntas'>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulando chamada à API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const novaPesquisa: Pesquisa = {
        ...dados,
        id: Math.random().toString(36).substr(2, 9),
        dataCriacao: new Date().toISOString(),
        respostas: 0,
        candidatos: [],
        perguntas: [],
      };
      
      setPesquisas(prev => [...prev, novaPesquisa]);
      toast.success('Pesquisa criada com sucesso!');
      return novaPesquisa;
    } catch (err) {
      console.error('Erro ao criar pesquisa:', err);
      setError('Erro ao criar a pesquisa. Tente novamente mais tarde.');
      toast.error('Erro ao criar a pesquisa');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Atualizar uma pesquisa existente
  const atualizarPesquisa = useCallback(async (id: string, dados: Partial<Pesquisa>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulando chamada à API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPesquisas(prev => 
        prev.map(pesquisa => 
          pesquisa.id === id ? { ...pesquisa, ...dados } : pesquisa
        )
      );
      
      toast.success('Pesquisa atualizada com sucesso!');
    } catch (err) {
      console.error(`Erro ao atualizar pesquisa ${id}:`, err);
      setError('Erro ao atualizar a pesquisa. Tente novamente mais tarde.');
      toast.error('Erro ao atualizar a pesquisa');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Excluir uma pesquisa
  const excluirPesquisa = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulando chamada à API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setPesquisas(prev => prev.filter(pesquisa => pesquisa.id !== id));
      toast.success('Pesquisa excluída com sucesso!');
    } catch (err) {
      console.error(`Erro ao excluir pesquisa ${id}:`, err);
      setError('Erro ao excluir a pesquisa. Tente novamente mais tarde.');
      toast.error('Erro ao excluir a pesquisa');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Adicionar candidato a uma pesquisa
  const adicionarCandidato = useCallback(async (pesquisaId: string, candidato: Omit<Candidato, 'id'>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulando chamada à API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const novoCandidato: Candidato = {
        ...candidato,
        id: Math.random().toString(36).substr(2, 9),
      };
      
      setPesquisas(prev => 
        prev.map(pesquisa => 
          pesquisa.id === pesquisaId
            ? {
                ...pesquisa,
                candidatos: [...pesquisa.candidatos, novoCandidato],
              }
            : pesquisa
        )
      );
      
      toast.success('Candidato adicionado com sucesso!');
      return novoCandidato;
    } catch (err) {
      console.error('Erro ao adicionar candidato:', err);
      setError('Erro ao adicionar o candidato. Tente novamente mais tarde.');
      toast.error('Erro ao adicionar o candidato');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Adicionar pergunta a uma pesquisa
  const adicionarPergunta = useCallback(async (pesquisaId: string, pergunta: Omit<Pergunta, 'id'>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulando chamada à API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const novaPergunta: Pergunta = {
        ...pergunta,
        id: Math.random().toString(36).substr(2, 9),
      };
      
      setPesquisas(prev => 
        prev.map(pesquisa => 
          pesquisa.id === pesquisaId
            ? {
                ...pesquisa,
                perguntas: [...pesquisa.perguntas, novaPergunta],
              }
            : pesquisa
        )
      );
      
      toast.success('Pergunta adicionada com sucesso!');
      return novaPergunta;
    } catch (err) {
      console.error('Erro ao adicionar pergunta:', err);
      setError('Erro ao adicionar a pergunta. Tente novamente mais tarde.');
      toast.error('Erro ao adicionar a pergunta');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Remover pergunta de uma pesquisa
  const removerPergunta = useCallback(async (pesquisaId: string, perguntaId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulando chamada à API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setPesquisas(prev => 
        prev.map(pesquisa => 
          pesquisa.id === pesquisaId
            ? {
                ...pesquisa,
                perguntas: pesquisa.perguntas.filter(p => p.id !== perguntaId),
              }
            : pesquisa
        )
      );
      
      toast.success('Pergunta removida com sucesso!');
    } catch (err) {
      console.error('Erro ao remover pergunta:', err);
      setError('Erro ao remover a pergunta. Tente novamente mais tarde.');
      toast.error('Erro ao remover a pergunta');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Remover candidato de uma pesquisa
  const removerCandidato = useCallback(async (pesquisaId: string, candidatoId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulando chamada à API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setPesquisas(prev => 
        prev.map(pesquisa => 
          pesquisa.id === pesquisaId
            ? {
                ...pesquisa,
                candidatos: pesquisa.candidatos.filter(c => c.id !== candidatoId),
              }
            : pesquisa
        )
      );
      
      toast.success('Candidato removido com sucesso!');
    } catch (err) {
      console.error('Erro ao remover candidato:', err);
      setError('Erro ao remover o candidato. Tente novamente mais tarde.');
      toast.error('Erro ao remover o candidato');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Enviar respostas de uma pesquisa
  const enviarRespostas = useCallback(async (pesquisaId: string, respostas: any[]) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulando chamada à API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Atualizar contagem de respostas
      setPesquisas(prev => 
        prev.map(pesquisa => 
          pesquisa.id === pesquisaId
            ? {
                ...pesquisa,
                respostas: pesquisa.respostas + 1,
              }
            : pesquisa
        )
      );
      
      toast.success('Respostas enviadas com sucesso!');
      return true;
    } catch (err) {
      console.error('Erro ao enviar respostas:', err);
      setError('Erro ao enviar as respostas. Tente novamente mais tarde.');
      toast.error('Erro ao enviar as respostas');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    pesquisas,
    loading,
    error,
    carregarPesquisas,
    carregarPesquisa,
    criarPesquisa,
    atualizarPesquisa,
    excluirPesquisa,
    adicionarCandidato,
    removerCandidato,
    adicionarPergunta,
    removerPergunta,
    enviarRespostas,
  };
}
