import { NextApiRequest, NextApiResponse } from 'next';
import { PaymentService } from '../../../services/PaymentService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verifica a assinatura do webhook (exemplo com Asaas)
    const signature = req.headers['asaas-signature'];
    if (!signature) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Processa o webhook
    await PaymentService.handlePaymentWebhook(req.body);

    return res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 