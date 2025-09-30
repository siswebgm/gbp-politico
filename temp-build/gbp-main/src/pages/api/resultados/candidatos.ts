import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';
import { withAuth } from '../../../middleware/withAuth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Buscar total de votos
    const totalVotosQuery = `
      SELECT SUM(qt_votos) as total_votos
      FROM eleicoes_vereador
    `;
    const [totalVotos] = await query(totalVotosQuery);

    // Buscar candidatos com seus votos
    const candidatosQuery = `
      SELECT 
        nr_votavel as nr_candidato,
        nm_votavel as nm_candidato,
        ds_cargo as cargo,
        sg_partido as partido,
        SUM(qt_votos) as qt_votos,
        ROUND((SUM(qt_votos) * 100.0 / NULLIF(?, 0)), 2) as percentual,
        CASE 
          WHEN SUM(qt_votos) >= ? THEN 'ELEITO'
          ELSE 'NÃO ELEITO'
        END as situacao
      FROM eleicoes_vereador
      GROUP BY nr_votavel, nm_votavel, ds_cargo, sg_partido
      ORDER BY qt_votos DESC
    `;

    const candidatos = await query(candidatosQuery, [
      totalVotos.total_votos,
      totalVotos.total_votos * 0.1 // exemplo: eleito se tiver mais de 10% dos votos
    ]);

    return res.status(200).json({
      total_votos: totalVotos.total_votos,
      candidatos: candidatos.map((c: any) => ({
        ...c,
        variacao: Math.random() * 10 - 5 // simulando variação para exemplo
      }))
    });

  } catch (error) {
    console.error('Erro ao buscar candidatos:', error);
    return res.status(500).json({ 
      error: 'Erro interno ao processar a requisição' 
    });
  }
}

export default withAuth(handler);
