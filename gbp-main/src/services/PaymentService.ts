import { supabaseClient as supabaseAdmin } from '../lib/supabase';

// A chave do Asaas NÃO fica no frontend — todas as chamadas passam
// pelo push-api (mesmo host em produção: app.gbppolitico.com/push).
const PUSH_API_BASE =
  (import.meta.env.VITE_PUSH_API_URL as string | undefined) ||
  'https://app.gbppolitico.com/push';

function getUserUid(): string {
  const direct = localStorage.getItem('user_uid');
  if (direct) return direct;
  try {
    const user = JSON.parse(localStorage.getItem('gbp_user') || '{}');
    return user?.uid || '';
  } catch {
    return '';
  }
}

async function callApi<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${PUSH_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-uid': getUserUid(),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Erro ${response.status}`);
  }
  return data as T;
}

export class PaymentService {
  // Cria uma nova assinatura (via push-api → Asaas)
  static async createSubscription(
    empresaUid: string,
    planoId: string,
    cpfCnpj?: string,
  ) {
    try {
      const { assinatura } = await callApi<{ assinatura: any }>(
        '/pagamentos/assinaturas',
        { empresaUid, planoId, cpfCnpj },
      );
      return assinatura;
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      throw error;
    }
  }

  // Gera um novo pagamento (via push-api → Asaas)
  static async generatePayment(
    assinaturaId: string,
    tipoPagamento: 'pix' | 'boleto',
    descontoPercentual: number = 0,
    cpfCnpj?: string,
    diaVencimento?: number,
  ) {
    try {
      return await callApi<{
        pagamento: any;
        paymentUrl: string | null;
        qrCode: string | null;
        pixCopyPaste: string | null;
        existing?: boolean;
      }>('/pagamentos/gerar', { assinaturaId, tipoPagamento, descontoPercentual, cpfCnpj, diaVencimento });
    } catch (error) {
      console.error('Erro ao gerar pagamento:', error);
      throw error;
    }
  }

  // Baixa manual: marca como paga quando recebida por outro meio
  // (dinheiro, transferência...). Informa o Asaas via push-api.
  static async baixarPagamento(pagamentoId: string, dataPagamento?: string) {
    try {
      return await callApi<{ pagamento: { id: string; status: string } }>(
        '/pagamentos/baixa',
        { pagamentoId, dataPagamento }
      );
    } catch (error) {
      console.error('Erro ao dar baixa no pagamento:', error);
      throw error;
    }
  }

  // Consulta o status da cobrança no Asaas e sincroniza o banco
  static async checkPaymentStatus(pagamentoId: string) {
    try {
      return await callApi<{
        pagamento: { id: string; status: string; data_pagamento: string | null };
        statusAsaas: string;
      }>('/pagamentos/status', { pagamentoId });
    } catch (error) {
      console.error('Erro ao consultar status:', error);
      throw error;
    }
  }

  // Webhook para receber notificações de pagamento
  static async handlePaymentWebhook(event: any) {
    try {
      const { payment } = event;
      const pago = ['CONFIRMED', 'RECEIVED'].includes(payment.status);

      // Atualiza o status do pagamento
      const { data: pagamentoData, error: updateError } = await supabaseAdmin
        .from('gbp_pagamentos')
        .update({
          status: pago ? 'paid' : 'failed',
          data_pagamento: pago ? new Date().toISOString() : null
        })
        .eq('gateway_id', payment.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Se pagamento foi confirmado, verifica se há indicação de afiliado
      if (pago && pagamentoData) {
        const { AffiliateService } = await import('./AffiliateService');

        // Busca a assinatura do pagamento
        const { data: assinatura } = await supabaseAdmin
          .from('gbp_assinaturas')
          .select('*, gbp_empresas(*)')
          .eq('id', pagamentoData.assinatura_id)
          .single();

        if (assinatura?.gbp_empresas?.afiliado_codigo) {
          // Busca a indicação pendente
          const { data: indicacao } = await supabaseAdmin
            .from('gbp_indicacoes')
            .select('*')
            .eq('empresa_uid', assinatura.gbp_empresas.uid)
            .eq('status', 'pending')
            .single();

          if (indicacao) {
            // Confirma a indicação e credita comissão
            await AffiliateService.confirmIndication(
              indicacao.id,
              pagamentoData.valor
            );
            console.log('Indicação confirmada e comissão creditada');
          }
        }
      }

      // O trigger atualizar_status_empresa cuidará de atualizar o status da empresa
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      throw error;
    }
  }
}