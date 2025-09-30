import { supabaseClient } from '../lib/supabase';

interface ResultadoEleicao {
  total_votos: number;
  total_aptos: number;
  total_comparecimento: number;
  total_abstencoes: number;
  candidatos: Array<{
    nr_votavel: string;
    nm_votavel: string;
    qt_votos: number;
    percentual: number;
    situacao: string;
    qt_votos_nominais: number;
    ds_cargo: string;
    nm_municipio: string;
    dt_eleicao: string;
  }>;
}

export async function buscarResultados(): Promise<ResultadoEleicao> {
  console.log('[DEBUG] Iniciando busca de resultados...');
  
  try {
    // Buscar dados agregados por candidato
    const { data, error } = await supabaseClient
      .from('eleicoes_vereador')
      .select()
      .order('qt_votos', { ascending: false });

    console.log('[DEBUG] Resposta da query:', { data, error });

    if (error) {
      console.error('[ERROR] Erro ao buscar dados:', error);
      throw new Error(`Erro ao buscar dados: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.warn('[WARN] Nenhum dado encontrado');
      return {
        total_votos: 0,
        total_aptos: 0,
        total_comparecimento: 0,
        total_abstencoes: 0,
        candidatos: []
      };
    }

    console.log('[DEBUG] Dados recebidos:', data.length, 'registros');

    // Agrupar votos por candidato e calcular totais
    const candidatoMap = new Map();
    let totalVotos = 0;
    let totalAptos = 0;
    let totalComparecimento = 0;
    let totalAbstencoes = 0;

    data.forEach(registro => {
      const { 
        nr_votavel, 
        qt_votos = 0, 
        qt_aptos = 0, 
        qt_comparecimento = 0, 
        qt_abstencoes = 0,
        nm_votavel,
        ds_cargo,
        nm_municipio,
        dt_eleicao,
        qt_votos_nominais = 0
      } = registro;
      
      totalVotos += Number(qt_votos) || 0;
      totalAptos += Number(qt_aptos) || 0;
      totalComparecimento += Number(qt_comparecimento) || 0;
      totalAbstencoes += Number(qt_abstencoes) || 0;

      if (!candidatoMap.has(nr_votavel)) {
        candidatoMap.set(nr_votavel, {
          nr_votavel,
          nm_votavel,
          ds_cargo,
          nm_municipio,
          dt_eleicao,
          qt_votos: Number(qt_votos) || 0,
          qt_votos_nominais: Number(qt_votos_nominais) || 0
        });
      } else {
        const candidato = candidatoMap.get(nr_votavel);
        candidatoMap.set(nr_votavel, {
          ...candidato,
          qt_votos: (candidato.qt_votos + Number(qt_votos)) || 0,
          qt_votos_nominais: (candidato.qt_votos_nominais + Number(qt_votos_nominais)) || 0
        });
      }
    });

    console.log('[DEBUG] Totais calculados:', {
      totalVotos,
      totalAptos,
      totalComparecimento,
      totalAbstencoes
    });

    // Converter para array e calcular percentuais
    const candidatos = Array.from(candidatoMap.values()).map(candidato => ({
      ...candidato,
      percentual: totalVotos > 0 ? ((candidato.qt_votos / totalVotos) * 100) : 0,
      situacao: candidato.qt_votos > (totalVotos * 0.1) ? 'ELEITO' : 'NÃO ELEITO' // Exemplo de lógica, ajuste conforme necessário
    }));

    console.log('[DEBUG] Candidatos processados:', candidatos.length);

    const resultado = {
      total_votos: totalVotos,
      total_aptos: totalAptos,
      total_comparecimento: totalComparecimento,
      total_abstencoes: totalAbstencoes,
      candidatos: candidatos.sort((a, b) => b.qt_votos - a.qt_votos)
    };

    console.log('[DEBUG] Resultado final:', resultado);

    return resultado;
  } catch (error) {
    console.error('[ERROR] Erro ao processar dados:', error);
    throw error;
  }
}
