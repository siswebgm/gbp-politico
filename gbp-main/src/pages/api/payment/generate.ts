import { NextApiRequest, NextApiResponse } from 'next';
import { PaymentService } from '../../../services/PaymentService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { assinaturaId, tipoPagamento, descontoPercentual } = req.body;

    if (!assinaturaId || !tipoPagamento) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await PaymentService.generatePayment(
      assinaturaId, 
      tipoPagamento, 
      descontoPercentual || 0
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao gerar pagamento:', error);
    return res.status(500).json({ 
      error: 'Erro ao gerar pagamento',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
