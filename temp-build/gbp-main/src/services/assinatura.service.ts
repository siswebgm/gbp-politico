import { supabaseClient as supabase } from '@/lib/supabase';

export interface PagamentoData {
  assinatura_id: string;
  valor: number;
  tipo_pagamento: 'CREDIT_CARD' | 'PIX' | 'BOLETO';
  status: 'pending' | 'paid' | 'cancelled' | 'failed';
  gateway_id: string;
  gateway_url?: string;
  data_pagamento?: Date | null;
  data_vencimento: Date;
  empresa_uid: string;
}

export const assinaturaService = {
  async criarPagamento(pagamentoData: Omit<PagamentoData, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('gbp_pagamentos')
      .insert([{
        ...pagamentoData,
        data_pagamento: pagamentoData.data_pagamento ? pagamentoData.data_pagamento.toISOString() : null,
        data_vencimento: pagamentoData.data_vencimento.toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async atualizarStatusPagamento(pagamentoId: string, status: PagamentoData['status']) {
    const { data, error } = await supabase
      .from('gbp_pagamentos')
      .update({ 
        status,
        ...(status === 'paid' ? { data_pagamento: new Date().toISOString() } : {})
      })
      .eq('id', pagamentoId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async obterPagamentoPorId(pagamentoId: string) {
    const { data, error } = await supabase
      .from('gbp_pagamentos')
      .select('*')
      .eq('id', pagamentoId)
      .single();

    if (error) throw error;
    return data;
  },

  async listarPagamentosPorEmpresa(empresaUid: string) {
    const { data, error } = await supabase
      .from('gbp_pagamentos')
      .select('*')
      .eq('empresa_uid', empresaUid)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};
