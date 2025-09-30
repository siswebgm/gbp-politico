import axios from 'axios';

interface ElectionFilters {
  cargo: string;
  ano: string;
  cidade: string;
  bairro: string;
  colegio: string;
  tipoVoto: string;
}

interface CandidateResult {
  nome: string;
  cargo: string;
  ano: number;
  cidade: string;
  bairro: string;
  colegio: string;
  votos: number;
  percentual: number;
  situacao: string;
}

// Mock data for when the API is unavailable
const mockResults: CandidateResult[] = [
  {
    nome: 'JOÃO DA SILVA',
    cargo: 'DEPUTADO FEDERAL',
    ano: 2022,
    cidade: 'SÃO PAULO',
    bairro: 'CENTRO',
    colegio: 'ESCOLA MUNICIPAL',
    votos: 45678,
    percentual: 23.45,
    situacao: 'ELEITO'
  },
  {
    nome: 'MARIA SANTOS',
    cargo: 'DEPUTADO ESTADUAL',
    ano: 2022,
    cidade: 'SÃO PAULO',
    bairro: 'VILA MARIANA',
    colegio: 'COLÉGIO ESTADUAL',
    votos: 34567,
    percentual: 18.32,
    situacao: 'ELEITO'
  },
  // Add more mock results as needed
];

export const searchCandidateResults = async (
  name: string,
  filters: ElectionFilters
): Promise<CandidateResult[]> => {
  // Return filtered mock results
  const filteredResults = mockResults.filter(result => {
    const matchesName = result.nome.toLowerCase().includes(name.toLowerCase());
    const matchesCargo = !filters.cargo || result.cargo.toLowerCase() === filters.cargo.toLowerCase();
    const matchesCidade = !filters.cidade || result.cidade.toLowerCase().includes(filters.cidade.toLowerCase());
    const matchesBairro = !filters.bairro || result.bairro.toLowerCase().includes(filters.bairro.toLowerCase());
    const matchesColegio = !filters.colegio || result.colegio.toLowerCase().includes(filters.colegio.toLowerCase());
    
    return matchesName && matchesCargo && matchesCidade && matchesBairro && matchesColegio;
  });

  return new Promise(resolve => {
    setTimeout(() => {
      resolve(filteredResults);
    }, 1000); // Simulate API delay
  });
};

export const getAvailableElections = async () => {
  return [
    { year: '2022', description: 'Eleições Gerais 2022', rounds: ['1', '2'] },
    { year: '2020', description: 'Eleições Municipais 2020', rounds: ['1', '2'] },
    { year: '2018', description: 'Eleições Gerais 2018', rounds: ['1', '2'] },
    { year: '2016', description: 'Eleições Municipais 2016', rounds: ['1', '2'] },
  ];
};

export const getElectionDetails = async (year: string) => {
  // Mock election details
  return {
    lastUpdate: new Date().toISOString(),
    totalVoters: 156789012,
    abstentions: 23456789,
    validVotes: 123456789,
    blankVotes: 4567890,
    nullVotes: 5678901,
  };
};