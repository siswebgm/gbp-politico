import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';
import { withAuth } from '../../../middleware/withAuth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const votosPorZonaQuery = `
      SELECT 
        nr_zona as zona,
        SUM(qt_votos) as votos
      FROM eleicoes_vereador
      GROUP BY nr_zona
      ORDER BY nr_zona
    `;

    const votosPorZona = await query(votosPorZonaQuery);
    
    return res.status(200).json(votosPorZona);

  } catch (error) {
    console.error('Erro ao buscar votos por zona:', error);
    return res.status(500).json({ 
      error: 'Erro interno ao processar a requisição' 
    });
  }
}

export default withAuth(handler);
