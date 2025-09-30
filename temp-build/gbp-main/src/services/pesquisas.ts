import api from './api';
import { uploadImagemCandidato, removerArquivo } from './uploadService';

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
  empresa_uid: string;
  usuario_uid: string;
}

export interface CriarPesquisaDTO {
  titulo: string;
  descricao: string;
  empresa_uid: string;
  usuario_uid: string;
}

export interface AtualizarPesquisaDTO {
  titulo?: string;
  descricao?: string;
  status?: 'rascunho' | 'publicada' | 'encerrada';
}

export interface AdicionarCandidatoDTO {
  nome: string;
  partido: string;
  imagem?: File | null;
}

export interface AdicionarPerguntaDTO {
  texto: string;
  tipo: 'estrelas' | 'nota' | 'votacao';
}

export interface RespostaPerguntaDTO {
  perguntaId: string;
  resposta: any; // Pode ser número (para estrelas/nota) ou string (para voto sim/não)
}

export interface EnviarRespostasDTO {
  pesquisaId: string;
  respostas: {
    candidatoId: string;
    respostas: RespostaPerguntaDTO[];
  }[];
  participante: {
    nome: string;
    faixaEtaria: string;
    celular: string;
  };
}

export const pesquisasService = {
  // Listar todas as pesquisas
  async listar(empresa_uid: string): Promise<Pesquisa[]> {
    const response = await api.get(`/pesquisas`, { params: { empresa_uid } });
    return response.data;
  },

  // Obter uma pesquisa específica
  async obter(id: string): Promise<Pesquisa> {
    const response = await api.get(`/pesquisas/${id}`);
    return response.data;
  },

  // Criar uma nova pesquisa
  async criar(dados: CriarPesquisaDTO): Promise<Pesquisa> {
    const response = await api.post('/pesquisas', dados);
    return response.data;
  },

  // Atualizar uma pesquisa existente
  async atualizar(id: string, dados: AtualizarPesquisaDTO): Promise<Pesquisa> {
    const response = await api.put(`/pesquisas/${id}`, dados);
    return response.data;
  },

  // Excluir uma pesquisa
  async excluir(id: string): Promise<void> {
    await api.delete(`/pesquisas/${id}`);
  },

  // Adicionar candidato a uma pesquisa
  async adicionarCandidato(pesquisaId: string, candidato: AdicionarCandidatoDTO, empresaId: string): Promise<Candidato> {
    let imagemUrl = null;
    
    // Faz upload da imagem se existir
    if (candidato.imagem) {
      try {
        imagemUrl = await uploadImagemCandidato(candidato.imagem, empresaId);
      } catch (error) {
        console.error('Erro ao fazer upload da imagem do candidato:', error);
        throw new Error('Não foi possível fazer upload da imagem do candidato');
      }
    }

    const dadosCandidato = {
      nome: candidato.nome,
      partido: candidato.partido,
      imagem: imagemUrl
    };

    const response = await api.post(`/pesquisas/${pesquisaId}/candidatos`, dadosCandidato);
    return response.data;
  },

  // Remover candidato de uma pesquisa
  async removerCandidato(pesquisaId: string, candidatoId: string, imagemUrl?: string | null): Promise<void> {
    try {
      // Remove a imagem do storage se existir
      if (imagemUrl) {
        await removerArquivo(imagemUrl);
      }
      
      // Remove o candidato da pesquisa
      await api.delete(`/pesquisas/${pesquisaId}/candidatos/${candidatoId}`);
    } catch (error) {
      console.error('Erro ao remover candidato:', error);
      throw new Error('Não foi possível remover o candidato');
    }
  },

  // Adicionar pergunta a uma pesquisa
  async adicionarPergunta(pesquisaId: string, pergunta: AdicionarPerguntaDTO): Promise<Pergunta> {
    const response = await api.post(`/pesquisas/${pesquisaId}/perguntas`, pergunta);
    return response.data;
  },

  // Remover pergunta de uma pesquisa
  async removerPergunta(pesquisaId: string, perguntaId: string): Promise<void> {
    await api.delete(`/pesquisas/${pesquisaId}/perguntas/${perguntaId}`);
  },

  // Enviar respostas de uma pesquisa
  async enviarRespostas(dados: EnviarRespostasDTO): Promise<void> {
    await api.post(`/pesquisas/${dados.pesquisaId}/respostas`, dados);
  },

  // Obter resultados de uma pesquisa
  async obterResultados(pesquisaId: string): Promise<any> {
    const response = await api.get(`/pesquisas/${pesquisaId}/resultados`);
    return response.data;
  },
};
