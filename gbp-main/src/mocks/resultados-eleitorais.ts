// Interfaces
export interface LocalVotacao {
  codigo: string;
  nome: string;
  endereco: string;
  municipio: string;
  zonas: string[];
}

export interface SecaoEleitoral {
  numero: string;
  zona: string;
  local: LocalVotacao;
  totalEleitores: number;
  comparecimento: number;
  abstencoes: number;
  votosValidos: number;
  votosBrancos: number;
  votosNulos: number;
  votosLegenda: number;
  votosNominais: number;
}

export interface ResultadoDetalhado {
  secao: SecaoEleitoral;
  votos: number;
  percentualSecao: number;
}

export interface HistoricoEleicao {
  ano: string;
  cargo: string;
  partido: string;
  coligacao: string;
  situacao: string;
  totalVotos: number;
  percentualVotos: number;
}

export interface CandidatoResultado {
  numero: string;
  nome: string;
  nomeUrna: string;
  partido: string;
  foto: string;
  votos: number;
  percentual: number;
  situacao: 'ELEITO' | 'NÃO ELEITO' | 'SUPLENTE';
  detalhes: ResultadoDetalhado[];
  historico: HistoricoEleicao[];
  estatisticas: {
    totalSecoes: number;
    totalZonas: number;
    maiorVotacao: {
      local: string;
      zona: string;
      secao: string;
      votos: number;
      percentual: number;
    };
    menorVotacao: {
      local: string;
      zona: string;
      secao: string;
      votos: number;
      percentual: number;
    };
    mediaPorSecao: number;
    totalEleitores: number;
    totalComparecimento: number;
    totalAbstencoes: number;
    votacaoPorZona: {
      [zona: string]: {
        votos: number;
        percentual: number;
        secoes: number;
      }
    };
    votacaoPorLocal: {
      [local: string]: {
        votos: number;
        percentual: number;
        secoes: number;
      }
    };
  };
}

export interface ResultadosEleicao {
  eleicao: string;
  turno: string;
  dataAtualizacao: string;
  candidatos: CandidatoResultado[];
}

// Dados mock
export const mockResultadosVereadores: ResultadosEleicao = {
  eleicao: "Eleições 2024",
  turno: "1",
  dataAtualizacao: "2024-10-02 22:00:00",
  candidatos: [
    {
      numero: "11111",
      nome: "JOÃO DA SILVA SANTOS",
      nomeUrna: "JOÃO DA SILVA",
      partido: "PARTIDO A",
      foto: "https://divulgacandcontas.tse.jus.br/candidaturas/oficial/2020/PR/12345/426/candidatos/123456/foto.jpg",
      votos: 5000,
      percentual: 25.5,
      situacao: "ELEITO",
      historico: [
        {
          ano: "2020",
          cargo: "VEREADOR",
          partido: "PARTIDO B",
          coligacao: "COLIGAÇÃO X",
          situacao: "NÃO ELEITO",
          totalVotos: 4200,
          percentualVotos: 22.1
        },
        {
          ano: "2016",
          cargo: "VEREADOR",
          partido: "PARTIDO C",
          coligacao: "COLIGAÇÃO Y",
          situacao: "SUPLENTE",
          totalVotos: 3800,
          percentualVotos: 20.5
        }
      ],
      estatisticas: {
        totalSecoes: 150,
        totalZonas: 5,
        maiorVotacao: {
          local: "ESCOLA MUNICIPAL CENTRO",
          zona: "001",
          secao: "0001",
          votos: 180,
          percentual: 35.5
        },
        menorVotacao: {
          local: "ESCOLA ESTADUAL NORTE",
          zona: "002",
          secao: "0010",
          votos: 15,
          percentual: 5.2
        },
        mediaPorSecao: 33.33,
        totalEleitores: 50000,
        totalComparecimento: 42000,
        totalAbstencoes: 8000,
        votacaoPorZona: {
          "001": {
            votos: 2000,
            percentual: 40,
            secoes: 50
          },
          "002": {
            votos: 1500,
            percentual: 30,
            secoes: 45
          },
          "003": {
            votos: 1500,
            percentual: 30,
            secoes: 55
          }
        },
        votacaoPorLocal: {
          "ESCOLA MUNICIPAL CENTRO": {
            votos: 1200,
            percentual: 24,
            secoes: 10
          },
          "ESCOLA ESTADUAL NORTE": {
            votos: 800,
            percentual: 16,
            secoes: 8
          }
        }
      },
      detalhes: [
        {
          secao: {
            numero: "0001",
            zona: "001",
            local: {
              codigo: "1234",
              nome: "ESCOLA MUNICIPAL CENTRO",
              endereco: "RUA DO CENTRO, 123",
              municipio: "SÃO PAULO",
              zonas: ["001"]
            },
            totalEleitores: 500,
            comparecimento: 450,
            abstencoes: 50,
            votosValidos: 430,
            votosBrancos: 10,
            votosNulos: 10,
            votosLegenda: 30,
            votosNominais: 400
          },
          votos: 150,
          percentualSecao: 33.33
        },
        {
          secao: {
            numero: "0002",
            zona: "001",
            local: {
              codigo: "1234",
              nome: "ESCOLA MUNICIPAL CENTRO",
              endereco: "RUA DO CENTRO, 123",
              municipio: "SÃO PAULO",
              zonas: ["001"]
            },
            totalEleitores: 480,
            comparecimento: 440,
            abstencoes: 40,
            votosValidos: 420,
            votosBrancos: 10,
            votosNulos: 10,
            votosLegenda: 20,
            votosNominais: 400
          },
          votos: 180,
          percentualSecao: 40.91
        }
      ]
    }
  ]
};

export const mockResultadosPrefeitos: ResultadosEleicao = {
  eleicao: "Eleições 2024",
  turno: "1",
  dataAtualizacao: "2024-10-02 22:00:00",
  candidatos: [
    {
      numero: "10",
      nome: "ROBERTO LIMA SANTOS",
      nomeUrna: "ROBERTO LIMA",
      partido: "PARTIDO A",
      foto: "https://divulgacandcontas.tse.jus.br/candidaturas/oficial/2020/PR/12345/426/candidatos/654321/foto.jpg",
      votos: 25000,
      percentual: 45.0,
      situacao: "ELEITO",
      historico: [
        {
          ano: "2020",
          cargo: "VEREADOR",
          partido: "PARTIDO A",
          coligacao: "COLIGAÇÃO X",
          situacao: "ELEITO",
          totalVotos: 22000,
          percentualVotos: 42.5
        }
      ],
      estatisticas: {
        totalSecoes: 200,
        totalZonas: 5,
        maiorVotacao: {
          local: "ESCOLA MUNICIPAL CENTRO",
          zona: "001",
          secao: "0001",
          votos: 280,
          percentual: 55.5
        },
        menorVotacao: {
          local: "ESCOLA ESTADUAL NORTE",
          zona: "002",
          secao: "0010",
          votos: 85,
          percentual: 25.2
        },
        mediaPorSecao: 125,
        totalEleitores: 80000,
        totalComparecimento: 65000,
        totalAbstencoes: 15000,
        votacaoPorZona: {
          "001": {
            votos: 10000,
            percentual: 40,
            secoes: 70
          },
          "002": {
            votos: 8000,
            percentual: 32,
            secoes: 65
          },
          "003": {
            votos: 7000,
            percentual: 28,
            secoes: 65
          }
        },
        votacaoPorLocal: {
          "ESCOLA MUNICIPAL CENTRO": {
            votos: 5000,
            percentual: 20,
            secoes: 15
          },
          "ESCOLA ESTADUAL NORTE": {
            votos: 4000,
            percentual: 16,
            secoes: 12
          }
        }
      },
      detalhes: [
        {
          secao: {
            numero: "0001",
            zona: "001",
            local: {
              codigo: "1234",
              nome: "ESCOLA MUNICIPAL CENTRO",
              endereco: "RUA DO CENTRO, 123",
              municipio: "SÃO PAULO",
              zonas: ["001"]
            },
            totalEleitores: 500,
            comparecimento: 480,
            abstencoes: 20,
            votosValidos: 460,
            votosBrancos: 10,
            votosNulos: 10,
            votosLegenda: 0,
            votosNominais: 460
          },
          votos: 250,
          percentualSecao: 52.08
        }
      ]
    }
  ]
};