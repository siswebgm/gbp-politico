import { NextApiRequest, NextApiResponse } from 'next';
import { query as q } from 'faunadb';
import { fauna } from '../../../../services/fauna';
import { getSession } from 'next-auth/react';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const response = await fauna.query(
      q.Let(
        {
          eleicoes: q.Map(
            q.Paginate(q.Documents(q.Collection('eleicoes_vereador')), { size: 100000 }),
            q.Lambda('ref', q.Get(q.Var('ref')))
          ),
        },
        q.Map(
          q.Var('eleicoes'),
          q.Lambda(
            'doc',
            q.Let(
              {
                data: q.Select(['data'], q.Var('doc')),
              },
              {
                id: q.Select(['ref', 'id'], q.Var('doc')),
                ...q.Var('data'),
              }
            )
          )
        )
      )
    );

    const resultados = response.data;
    return res.status(200).json(resultados);
  } catch (error) {
    console.error('Error fetching election results:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
