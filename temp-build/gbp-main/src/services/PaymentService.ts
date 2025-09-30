import { supabaseClient as supabaseAdmin } from '../lib/supabase';
import axios from 'axios';
import { ASAAS_CONFIG } from '../config/asaas';

// Configuração do cliente Asaas
const asaasApi = axios.create({
  baseURL: ASAAS_CONFIG.IS_SANDBOX ? ASAAS_CONFIG.API_URL : ASAAS_CONFIG.PRODUCTION_API_URL,
  headers: {
    'access_token': ASAAS_CONFIG.API_KEY
  }
});

export class PaymentService {
  // Cria um novo cliente no Asaas
  static async createCustomer(empresa: any) {
    try {
      const customerData = {
        name: empresa.nome,
        email: empresa.email || '',
        phone: empresa.telefone || '',
        mobilePhone: empresa.telefone || '',
        cpfCnpj: empresa.cnpj || '',
        postalCode: empresa.cep || '',
        address: empresa.logradouro || '',
        addressNumber: empresa.numero || '',
        complement: '',
        province: empresa.bairro || '',
        city: empresa.cidade || '',
        state: empresa.estado || '',
        country: 'BR',
        observations: 'Cliente criado via API'
      };

      const { data: customer } = await asaasApi.post('/customers', customerData);
      
      // Atualiza a empresa com o ID do cliente no Asaas
      await supabaseAdmin
        .from('gbp_empresas')
        .update({ asaas_customer_id: customer.id })
        .eq('uid', empresa.uid);

      return customer;
    } catch (error) {
      console.error('Erro ao criar cliente no Asaas:', error);
      throw error;
    }
  }

  // Cria uma nova assinatura
  static async createSubscription(empresaUid: string, planoId: string) {
    try {
      // Busca dados da empresa e plano
      const { data: empresa } = await supabaseAdmin
        .from('gbp_empresas')
        .select('*')
        .eq('uid', empresaUid)
        .single();

      const { data: plano } = await supabaseAdmin
        .from('gbp_planos')
        .select('*')
        .eq('id', planoId)
        .single();

      if (!empresa || !plano) {
        throw new Error('Empresa ou plano não encontrado');
      }

      // Verifica se a empresa já tem ID no Asaas, se não, cria
      if (!empresa.asaas_customer_id) {
        const customer = await this.createCustomer(empresa);
        empresa.asaas_customer_id = customer.id;
      }

      // Calcula datas
      const dataInicio = new Date();
      const dataFim = new Date();
      dataFim.setDate(dataFim.getDate() + plano.periodo_dias);
      const dataVencimento = new Date(dataFim);

      // Cria assinatura no banco
      const { data: assinatura, error: assinaturaError } = await supabaseAdmin
        .from('gbp_assinaturas')
        .insert({
          empresa_uid: empresaUid,
          plano_id: planoId,
          status: 'pending',
          data_inicio: dataInicio.toISOString(),
          data_fim: dataFim.toISOString(),
          data_vencimento: dataVencimento.toISOString()
        })
        .select()
        .single();

      if (assinaturaError) throw assinaturaError;

      return assinatura;
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      throw error;
    }
  }

  // Gera um novo pagamento
  static async generatePayment(assinaturaId: string, tipoPagamento: 'pix' | 'boleto') {
    try {
      // Busca dados da assinatura
      const { data: assinatura } = await supabaseAdmin
        .from('gbp_assinaturas')
        .select('*, gbp_planos(*), gbp_empresas(*)')
        .eq('id', assinaturaId)
        .single();

      if (!assinatura) throw new Error('Assinatura não encontrada');

      // Cria cobrança no Asaas
      const paymentData = {
        customer: assinatura.gbp_empresas.asaas_customer_id,
        billingType: tipoPagamento === 'pix' ? 'PIX' : 'BOLETO',
        value: assinatura.gbp_planos.valor,
        dueDate: assinatura.data_vencimento,
        description: `Assinatura ${assinatura.gbp_planos.nome}`,
        postalService: false
      };

      const { data: asaasPayment } = await asaasApi.post('/payments', paymentData);

      // Registra pagamento no banco
      const { data: pagamento, error: pagamentoError } = await supabaseAdmin
        .from('gbp_pagamentos')
        .insert({
          assinatura_id: assinaturaId,
          valor: assinatura.gbp_planos.valor,
          tipo_pagamento: tipoPagamento,
          status: 'pending',
          gateway_id: asaasPayment.id,
          gateway_url: tipoPagamento === 'pix' ? asaasPayment.pixQrCodeUrl : asaasPayment.bankSlipUrl,
          data_vencimento: assinatura.data_vencimento
        })
        .select()
        .single();

      if (pagamentoError) throw pagamentoError;

      return {
        pagamento,
        paymentUrl: pagamento.gateway_url,
        qrCode: tipoPagamento === 'pix' ? asaasPayment.encodedImage : null,
        pixCopyPaste: tipoPagamento === 'pix' ? asaasPayment.payload : null
      };
    } catch (error) {
      console.error('Erro ao gerar pagamento:', error);
      throw error;
    }
  }

  // Webhook para receber notificações de pagamento
  static async handlePaymentWebhook(event: any) {
    try {
      const { payment } = event;
      
      // Atualiza o status do pagamento
      const { error: updateError } = await supabaseAdmin
        .from('gbp_pagamentos')
        .update({
          status: payment.status === 'CONFIRMED' ? 'paid' : 'failed',
          data_pagamento: payment.status === 'CONFIRMED' ? new Date().toISOString() : null
        })
        .eq('gateway_id', payment.id);

      if (updateError) throw updateError;

      // O trigger atualizar_status_empresa cuidará de atualizar o status da empresa
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      throw error;
    }
  }
} 