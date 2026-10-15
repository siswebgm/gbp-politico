import { NextApiRequest, NextApiResponse } from 'next';
import { PaymentService } from '../../services/PaymentService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { empresaUid, planoId } = req.body;

    if (!empresaUid || !planoId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const assinatura = await PaymentService.createSubscription(empresaUid, planoId);

    return res.status(200).json({ assinatura });
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    return res.status(500).json({ 
      error: 'Erro ao criar assinatura',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
