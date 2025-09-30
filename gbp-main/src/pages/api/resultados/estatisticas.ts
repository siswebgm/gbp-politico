import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';
import { withAuth } from '../../../middleware/withAuth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const estatisticasQuery = `
      SELECT 
        SUM(qt_aptos) as total_eleitores,
        SUM(qt_comparecimento) as comparecimento,
        SUM(qt_abstencoes) as abstencoes,
        COUNT(DISTINCT nr_zona) as zonas_eleitorais
      FROM eleicoes_vereador
    `;

    const [estatisticas] = await query(estatisticasQuery);
    
    return res.status(200).json(estatisticas);

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return res.status(500).json({ 
      error: 'Erro interno ao processar a requisição' 
    });
  }
}

export default withAuth(handler);
