import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';
import { withAuth } from '../../../middleware/withAuth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const locaisVotacaoQuery = `
      SELECT 
        nm_local_votacao as nome,
        SUM(qt_votos) as votos
      FROM eleicoes_vereador
      GROUP BY nm_local_votacao
      ORDER BY votos DESC
      LIMIT 10
    `;

    const locaisVotacao = await query(locaisVotacaoQuery);
    
    return res.status(200).json(locaisVotacao);

  } catch (error) {
    console.error('Erro ao buscar locais de votação:', error);
    return res.status(500).json({ 
      error: 'Erro interno ao processar a requisição' 
    });
  }
}

export default withAuth(handler);
