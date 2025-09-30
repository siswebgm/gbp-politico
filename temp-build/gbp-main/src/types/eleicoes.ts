export interface ResultadoEleicao {
  id: number;
  aa_eleicao: string;
  cd_tipo_eleicao: string;
  nm_tipo_eleicao: string;
  cd_eleicao: string;
  ds_eleicao: string;
  dt_eleicao: Date;
  sg_uf: string;
  cd_municipio: string;
  nm_municipio: string;
  nr_zona: string;
  nm_local_votacao: string;
  ds_local_votacao_endereco: string;
  nr_secao: string;
  nr_local_votacao: string;
  cd_modelo_urna: string;
  ds_modelo_urna: string;
  nr_turno: string;
  ds_cargo: string;
  nr_votavel: string;
  nm_votavel: string;
  sq_candidato: string;
  qt_aptos: number;
  qt_comparecimento: number;
  qt_abstencoes: number;
  qt_votos_nominais: number;
  qt_votos: number;
  dt_carga: Date;
  qt_registros: number;
}

export interface ResultadoAgrupado {
  candidato: {
    numero: string;
    nome: string;
    totalVotos: number;
    percentual: number;
  };
  zonas: {
    [zona: string]: {
      totalVotos: number;
      percentual: number;
      secoes: {
        [secao: string]: {
          local: {
            nome: string;
            endereco: string;
          };
          aptos: number;
          comparecimento: number;
          abstencoes: number;
          votos: number;
          percentual: number;
        };
      };
    };
  };
  totais: {
    aptos: number;
    comparecimento: number;
    abstencoes: number;
    votos: number;
    percentualComparecimento: number;
  };
}

export interface EstatisticasGerais {
  totalEleitoresAptos: number;
  totalComparecimento: number;
  totalAbstencoes: number;
  totalVotosNominais: number;
  percentualComparecimento: number;
  percentualAbstencao: number;
  totalSecoes: number;
  totalZonas: number;
  totalLocaisVotacao: number;
}
