import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';
import { withAuth } from '../../../middleware/withAuth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { nr_votavel } = req.query;

    if (!nr_votavel) {
      return res.status(400).json({ 
        error: 'Parâmetro nr_votavel é obrigatório' 
      });
    }

    // Buscar informações básicas do candidato com total de votos
    const candidatoQuery = `
      SELECT 
        nr_votavel,
        nm_votavel,
        SUM(qt_votos) as total_votos,
        COUNT(DISTINCT nr_zona) as total_zonas,
        COUNT(DISTINCT nr_secao) as total_secoes
      FROM eleicoes_vereador
      WHERE nr_votavel = ?
      GROUP BY nr_votavel, nm_votavel
    `;
    
    const [candidatoInfo] = await query(candidatoQuery, [nr_votavel]);

    if (!candidatoInfo) {
      return res.status(404).json({ 
        error: 'Candidato não encontrado' 
      });
    }

    // Buscar detalhes por zona/seção com totalizadores
    const detalhesQuery = `
      SELECT 
        nr_zona,
        nr_secao,
        nm_local_votacao,
        qt_votos,
        qt_aptos,
        qt_comparecimento,
        qt_abstencoes,
        qt_votos_nominais,
        ROUND((qt_votos * 100.0 / NULLIF(qt_votos_nominais, 0)), 2) as percentual_votos,
        ROUND((qt_comparecimento * 100.0 / NULLIF(qt_aptos, 0)), 2) as percentual_comparecimento
      FROM eleicoes_vereador
      WHERE nr_votavel = ?
      ORDER BY nr_zona, nr_secao
    `;

    const detalhes = await query(detalhesQuery, [nr_votavel]);

    // Calcular totalizadores gerais
    const totalizadoresQuery = `
      SELECT 
        SUM(qt_aptos) as total_aptos,
        SUM(qt_comparecimento) as total_comparecimento,
        SUM(qt_abstencoes) as total_abstencoes,
        SUM(qt_votos_nominais) as total_votos_nominais,
        ROUND(AVG(qt_votos * 100.0 / NULLIF(qt_votos_nominais, 0)), 2) as media_percentual_votos
      FROM eleicoes_vereador
      WHERE nr_votavel = ?
    `;

    const [totalizadores] = await query(totalizadoresQuery, [nr_votavel]);

    // Agrupar resultados
    const resultado = {
      candidato: {
        ...candidatoInfo,
        percentual_geral: totalizadores.media_percentual_votos
      },
      totalizadores,
      detalhes: detalhes.map(d => ({
        ...d,
        percentual_votos: parseFloat(d.percentual_votos) || 0,
        percentual_comparecimento: parseFloat(d.percentual_comparecimento) || 0
      }))
    };

    return res.status(200).json(resultado);

  } catch (error) {
    console.error('Erro ao buscar resultados:', error);
    return res.status(500).json({ 
      error: 'Erro interno ao processar a requisição' 
    });
  }
}

export default withAuth(handler);
