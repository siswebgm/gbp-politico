export interface ParticipanteStats {
  totalParticipantes: number;
  porCidade: {
    cidade: string;
    total: number;
  }[];
  porBairro: {
    cidade: string;
    bairro: string;
    total: number;
  }[];
  comparacaoEleitores: {
    totalParticipantes: number;
    totalEleitores: number;
    correspondencias: number;
    semCorrespondencia: number;
    taxaCorrespondencia: number;
  };
  porPesquisa: Array<{
    pesquisa_uid: string;
    pesquisa_nome: string;
    total: number;
  }>;
  porData: Array<{
    data: string;
    total: number;
  }>;
}

export interface ParticipanteFiltros {
  pesquisa_uid?: string;
  cidade?: string;
  bairro?: string;
  data_inicio?: string;
  data_fim?: string;
}
