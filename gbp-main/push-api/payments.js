// ============================================================
// Integração Asaas — cobranças de assinatura (PIX/Boleto).
// A chave da API NUNCA vai pro frontend: todas as chamadas
// ao Asaas passam por aqui.
//
// Env vars necessárias (.env local / Portainer em produção):
//   ASAAS_API_KEY          — access_token da conta Asaas
//   ASAAS_ENV              — 'production' (default) ou 'sandbox'
//   ASAAS_WEBHOOK_TOKEN    — token configurado no painel Asaas
//                            (validado no header asaas-access-token)
//   SUPABASE_SERVICE_ROLE_KEY — preferido p/ escrita (webhook);
//                            fallback: SUPABASE_ANON_KEY
//
// Rotas:
//   POST /pagamentos/assinaturas  (requireAuth) — cria customer
//      Asaas (se preciso) + registro em gbp_assinaturas
//   POST /pagamentos/gerar        (requireAuth) — cria cobrança
//      no Asaas + registro em gbp_pagamentos (com QR PIX)
//   POST /pagamentos/status       (requireAuth) — consulta o Asaas e sincroniza o status no banco
//   POST /webhooks/asaas          (token) — recebe eventos do
//      Asaas e baixa o pagamento + confirma comissão de afiliado
// ============================================================

const {
  ASAAS_API_KEY,
  ASAAS_ENV = 'production',
  ASAAS_WEBHOOK_TOKEN,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

// Dev local lê o ../.env (que só tem vars VITE_*); produção usa SUPABASE_URL direto
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const ASAAS_BASE =
  ASAAS_ENV === 'sandbox'
    ? 'https://sandbox.asaas.com/api/v3'
    : 'https://www.asaas.com/api/v3';

const SB_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

// ---- helpers -------------------------------------------------

const asaas = async (path, { method = 'GET', body } = {}) => {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method,
    headers: {
      'access_token': ASAAS_API_KEY || '',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data?.errors?.[0]?.description || data?.message || `Asaas HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
};

const sb = async (path, { method = 'GET', body, single = false, prefer } = {}) => {
  const headers = {
    apikey: SB_KEY || '',
    Authorization: `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
  };
  if (single) headers['Accept'] = 'application/vnd.pgrst.object+json';
  if (prefer) headers['Prefer'] = prefer;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message || `Supabase HTTP ${res.status}`);
  }
  return data;
};

const sbOne = (path) => sb(path, { single: true });

const isAdmin = (user) =>
  String(user?.nivel_acesso || '').toLowerCase() === 'admin' ||
  String(user?.cargo || '').toLowerCase() === 'admin';

// Mesma empresa do usuário autenticado (admin pode operar a própria)
const mesmaEmpresa = (req, empresaUid) =>
  req.user?.empresa_uid && req.user.empresa_uid === empresaUid;

// Ciclo de cobrança: cada empresa tem um dia de vencimento
// (gbp_empresas.dia_vencimento — ex.: 5 → janela 5–10, 20 → janela 20–30).
// Retorna a próxima ocorrência desse dia a partir da data base.
function proximaDataVencimento(dia, aPartirDe = new Date()) {
  const base = new Date(aPartirDe);
  let v = new Date(base.getFullYear(), base.getMonth(), dia);
  if (v <= base) {
    v = new Date(base.getFullYear(), base.getMonth() + 1, dia);
  }
  return v;
}

const diaVencimentoEmpresa = (empresa) => {
  const dia = Number(empresa?.dia_vencimento);
  return dia >= 1 && dia <= 28 ? dia : 20;
};

// ---- lógica de negócio ----------------------------------------

// Persiste asaas_customer_id (e cpf_cnpj, se informado e a coluna existir)
async function salvarEmpresa(uid, patch) {
  try {
    await sb(`gbp_empresas?uid=eq.${uid}`, { method: 'PATCH', body: patch });
  } catch (e) {
    // Se a coluna cpf_cnpj ainda não existir, salva só o customer id
    if (patch.cpf_cnpj !== undefined) {
      await sb(`gbp_empresas?uid=eq.${uid}`, {
        method: 'PATCH',
        body: { asaas_customer_id: patch.asaas_customer_id },
      });
    } else {
      throw e;
    }
  }
}

// Garante um customer válido no Asaas (recria se removido, exige cpfCnpj)
async function ensureCustomer(empresa, cpfCnpj) {
  const doc = String(cpfCnpj || empresa.cpf_cnpj || '').replace(/\D/g, '');

  if (empresa.asaas_customer_id) {
    try {
      const customer = await asaas(`/customers/${empresa.asaas_customer_id}`);
      if (!customer.deleted) {
        // Atualiza o documento no Asaas se veio um novo
        if (doc && customer.cpfCnpj !== doc) {
          await asaas(`/customers/${empresa.asaas_customer_id}`, {
            method: 'POST',
            body: { cpfCnpj: doc },
          });
        }
        if (doc && empresa.cpf_cnpj !== doc) {
          try {
            await sb(`gbp_empresas?uid=eq.${empresa.uid}`, {
              method: 'PATCH',
              body: { cpf_cnpj: doc },
            });
          } catch (_) { /* coluna pode não existir ainda */ }
        }
        return empresa.asaas_customer_id;
      }
    } catch (_) {
      // customer não encontrado/removido → cria um novo abaixo
    }
  }

  if (!doc) {
    throw new Error(
      'É necessário informar o CPF ou CNPJ da empresa para gerar cobranças',
    );
  }

  const customer = await asaas('/customers', {
    method: 'POST',
    body: {
      name: empresa.nome,
      email: empresa.email || '',
      phone: empresa.contato || empresa.telefone || '',
      mobilePhone: empresa.contato || empresa.telefone || '',
      cpfCnpj: doc,
      postalCode: empresa.cep || '',
      address: empresa.logradouro || '',
      addressNumber: empresa.numero || '',
      province: empresa.bairro || '',
      city: empresa.cidade || '',
      state: empresa.estado || '',
      country: 'BR',
      observations: 'Cliente criado via API',
    },
  });

  await salvarEmpresa(empresa.uid, {
    asaas_customer_id: customer.id,
    cpf_cnpj: doc,
  });

  return customer.id;
}

// Confirma indicação de afiliado e credita comissão (port de
// AffiliateService.confirmIndication)
async function confirmarIndicacao(indicacaoId, valorPagamento) {
  const indicacao = await sbOne(
    `gbp_indicacoes?id=eq.${indicacaoId}&select=*,gbp_afiliados(*)`,
  );
  const afiliado = indicacao?.gbp_afiliados;
  if (!afiliado) return;

  const comissaoValor =
    valorPagamento * ((afiliado.comissao_percentual || 0) / 100);

  await sb(`gbp_afiliados?id=eq.${afiliado.id}`, {
    method: 'PATCH',
    body: {
      saldo_comissoes: (afiliado.saldo_comissoes || 0) + comissaoValor,
      total_comissoes: (afiliado.total_comissoes || 0) + comissaoValor,
      data_atualizacao: new Date().toISOString(),
    },
  });

  await sb(`gbp_indicacoes?id=eq.${indicacaoId}`, {
    method: 'PATCH',
    body: {
      status: 'confirmed',
      comissao_valor: comissaoValor,
      data_confirmacao: new Date().toISOString(),
    },
  });

  console.log('[payments] Indicação confirmada, comissão:', comissaoValor);
}

// Processa evento de pagamento vindo do Asaas
async function handlePaymentEvent(payment) {
  // Mapa de status Asaas → gbp_pagamentos
  const pago = ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(payment.status);
  const mapa = {
    PENDING: 'pending',
    CONFIRMED: 'paid',
    RECEIVED: 'paid',
    OVERDUE: 'overdue',
    REFUNDED: 'cancelled',
    RECEIVED_IN_CASH: 'paid',
    REFUND_REQUESTED: 'cancelled',
    CHARGEBACK_REQUESTED: 'cancelled',
    CHARGEBACK_DISPUTE: 'cancelled',
    AWAITING_CHARGEBACK_REVERSAL: 'cancelled',
    DUNNING_REQUESTED: 'overdue',
    DUNNING_RECEIVED: 'paid',
    AWAITING_RISK_ANALYSIS: 'pending',
    DELETED: 'cancelled',
  };
  const novoStatus = mapa[payment.status] || 'pending';

  const update = {
    status: novoStatus,
    data_pagamento: pago ? new Date().toISOString() : null,
  };

  // UPDATE + retorna a linha pra pegar assinatura_id/valor
  const rows = await sb(`gbp_pagamentos?gateway_id=eq.${payment.id}`, {
    method: 'PATCH',
    body: update,
    prefer: 'return=representation',
  });
  const pagamento = Array.isArray(rows) ? rows[0] : null;
  if (!pagamento) {
    console.log('[payments] webhook: pagamento não encontrado', payment.id);
    return;
  }

  // Se confirmado → verifica comissão de afiliado
  if (pago) {
    const assinatura = await sbOne(
      `gbp_assinaturas?id=eq.${pagamento.assinatura_id}&select=*,gbp_empresas(*)`,
    );
    const empresa = assinatura?.gbp_empresas;

    if (empresa?.afiliado_codigo) {
      const pendentes = await sb(
        `gbp_indicacoes?empresa_uid=eq.${empresa.uid}&status=eq.pending&select=id&limit=1`,
      );
      const indicacao = Array.isArray(pendentes) ? pendentes[0] : null;
      if (indicacao) {
        await confirmarIndicacao(indicacao.id, pagamento.valor);
      }
    }
  }
}

// ---- rotas ----------------------------------------------------

module.exports = function registerPayments(app, { requireAuth }) {
  if (!ASAAS_API_KEY) {
    console.warn('[payments] ASAAS_API_KEY não definida — rotas de pagamento retornarão 503');
  }

  const asaasConfigurado = (_req, res, next) =>
    ASAAS_API_KEY ? next() : res.status(503).json({ error: 'Pagamentos não configurados' });

  // Cria assinatura (customer Asaas + linha em gbp_assinaturas)
  app.post('/pagamentos/assinaturas', requireAuth, asaasConfigurado, async (req, res) => {
    try {
      const { empresaUid, planoId, cpfCnpj } = req.body || {};
      if (!empresaUid || !planoId) {
        return res.status(400).json({ error: 'empresaUid e planoId são obrigatórios' });
      }
      if (!mesmaEmpresa(req, empresaUid) && !isAdmin(req.user)) {
        return res.status(403).json({ error: 'Empresa diferente do usuário' });
      }

      const empresa = await sbOne(`gbp_empresas?uid=eq.${empresaUid}&select=*`);
      const plano = await sbOne(`gbp_planos?id=eq.${planoId}&select=*`);
      if (!empresa || !plano) {
        return res.status(404).json({ error: 'Empresa ou plano não encontrado' });
      }

      await ensureCustomer(empresa, cpfCnpj);

      const dataInicio = new Date();
      const diaVenc = diaVencimentoEmpresa(empresa);
      // Vencimento sempre no dia de cobrança da empresa (5 ou 20...)
      const vencimento = proximaDataVencimento(diaVenc);
      // data_fim = próximo ciclo após o vencimento (cobertura do período)
      const dataFim = proximaDataVencimento(
        diaVenc,
        new Date(vencimento.getTime() + 24 * 60 * 60 * 1000),
      );

      const rows = await sb('gbp_assinaturas', {
        method: 'POST',
        body: {
          empresa_uid: empresaUid,
          plano_id: planoId,
          status: 'pending',
          data_inicio: dataInicio.toISOString(),
          data_fim: dataFim.toISOString(),
          data_vencimento: vencimento.toISOString(),
          dias_tolerancia: 10, // janela de pagamento (5→10 ou 20→30)
        },
        prefer: 'return=representation',
      });

      res.json({ assinatura: Array.isArray(rows) ? rows[0] : rows });
    } catch (error) {
      console.error('[payments] Erro ao criar assinatura:', error);
      res.status(500).json({ error: 'Erro ao criar assinatura', message: error.message });
    }
  });

  // Gera cobrança no Asaas + registra em gbp_pagamentos
  app.post('/pagamentos/gerar', requireAuth, asaasConfigurado, async (req, res) => {
    try {
      const { assinaturaId, tipoPagamento, descontoPercentual = 0, cpfCnpj, diaVencimento } = req.body || {};
      if (!assinaturaId || !tipoPagamento) {
        return res.status(400).json({ error: 'assinaturaId e tipoPagamento são obrigatórios' });
      }

      // Sem embed gbp_planos(*) — não há FK assinaturas→planos no banco
      const assinatura = await sbOne(
        `gbp_assinaturas?id=eq.${assinaturaId}&select=*,gbp_empresas(*)`,
      );
      if (!assinatura) {
        return res.status(404).json({ error: 'Assinatura não encontrada' });
      }
      if (!mesmaEmpresa(req, assinatura.empresa_uid) && !isAdmin(req.user)) {
        return res.status(403).json({ error: 'Assinatura de outra empresa' });
      }

      const plano = await sbOne(`gbp_planos?id=eq.${assinatura.plano_id}&select=*`);
      if (!plano) {
        return res.status(404).json({ error: 'Plano não encontrado' });
      }

      // Não duplica cobrança do mesmo tipo (PIX e boleto são independentes)
      const pendente = await sbOne(
        `gbp_pagamentos?assinatura_id=eq.${assinaturaId}` +
          `&tipo_pagamento=eq.${tipoPagamento}` +
          `&status=in.(pending,overdue)&order=data_vencimento.desc&limit=1&select=*`,
      );
      if (pendente) {
        // Reexibe o QR do PIX pendente em vez de gerar nova cobrança
        let qrCode = null;
        let pixCopyPaste = null;
        if (tipoPagamento === 'pix' && pendente.gateway_id) {
          try {
            const pix = await asaas(`/payments/${pendente.gateway_id}/pixQrCode`);
            qrCode = pix.encodedImage || null;
            pixCopyPaste = pix.payload || null;
          } catch (e) {
            console.warn('[payments] Falha ao buscar pixQrCode da cobrança existente:', e.message);
          }
        }
        return res.json({
          pagamento: pendente,
          paymentUrl: pendente.gateway_url,
          qrCode,
          pixCopyPaste,
          existing: true,
        });
      }

      // Garante customer válido (recria se removido, exige cpfCnpj)
      const customerId = await ensureCustomer(assinatura.gbp_empresas, cpfCnpj);

      const valorOriginal = plano.valor;
      const valorComDesconto =
        descontoPercentual > 0
          ? valorOriginal * (1 - descontoPercentual / 100)
          : valorOriginal;
      // Vencimento no dia de cobrança da empresa (permite override)
      const diaVenc =
        Number(diaVencimento) >= 1 && Number(diaVencimento) <= 28
          ? Number(diaVencimento)
          : diaVencimentoEmpresa(assinatura.gbp_empresas);
      const vencimento = proximaDataVencimento(diaVenc);
      const dueDate = vencimento.toISOString().slice(0, 10);

      const asaasPayment = await asaas('/payments', {
        method: 'POST',
        body: {
          customer: customerId,
          billingType: tipoPagamento === 'pix' ? 'PIX' : 'BOLETO',
          value: valorComDesconto,
          dueDate,
          description:
            descontoPercentual > 0
              ? `Assinatura ${plano.nome} (${descontoPercentual}% de desconto)`
              : `Assinatura ${plano.nome}`,
          postalService: false,
        },
      });

      // O POST /payments não retorna o QR — precisa do endpoint dedicado
      let qrCode = null;
      let pixCopyPaste = null;
      if (tipoPagamento === 'pix') {
        try {
          const pix = await asaas(`/payments/${asaasPayment.id}/pixQrCode`);
          qrCode = pix.encodedImage || null;
          pixCopyPaste = pix.payload || null;
        } catch (e) {
          console.warn('[payments] Falha ao buscar pixQrCode:', e.message);
        }
      }

      const rows = await sb('gbp_pagamentos', {
        method: 'POST',
        body: {
          assinatura_id: assinaturaId,
          valor: valorComDesconto,
          tipo_pagamento: tipoPagamento,
          status: 'pending',
          gateway_id: asaasPayment.id,
          gateway_url:
            tipoPagamento === 'pix' ? asaasPayment.invoiceUrl : asaasPayment.bankSlipUrl,
          data_vencimento: vencimento.toISOString(),
        },
        prefer: 'return=representation',
      });
      const pagamento = Array.isArray(rows) ? rows[0] : rows;

      // Mantém a assinatura alinhada ao próximo vencimento calculado
      try {
        await sb(`gbp_assinaturas?id=eq.${assinaturaId}`, {
          method: 'PATCH',
          body: {
            data_vencimento: vencimento.toISOString(),
            data_fim: proximaDataVencimento(
              diaVenc,
              new Date(vencimento.getTime() + 24 * 60 * 60 * 1000),
            ).toISOString(),
          },
        });
      } catch (e) {
        console.warn('[payments] Falha ao atualizar vencimento da assinatura:', e.message);
      }

      res.json({
        pagamento,
        paymentUrl: pagamento.gateway_url,
        qrCode,
        pixCopyPaste,
      });
    } catch (error) {
      console.error('[payments] Erro ao gerar pagamento:', error);
      res.status(500).json({ error: 'Erro ao gerar pagamento', message: error.message });
    }
  });

  // Consulta status da cobrança no Asaas e sincroniza o banco
  // (fallback para quando o webhook não chega / testes locais)
  app.post('/pagamentos/status', requireAuth, asaasConfigurado, async (req, res) => {
    try {
      const { pagamentoId } = req.body || {};
      if (!pagamentoId) {
        return res.status(400).json({ error: 'pagamentoId é obrigatório' });
      }

      const pagamento = await sbOne(
        `gbp_pagamentos?id=eq.${pagamentoId}&select=*,gbp_assinaturas(empresa_uid)`,
      );
      if (!pagamento?.gateway_id) {
        return res.status(404).json({ error: 'Pagamento não encontrado' });
      }
      const empresaUid = pagamento.gbp_assinaturas?.empresa_uid;
      if (!mesmaEmpresa(req, empresaUid) && !isAdmin(req.user)) {
        return res.status(403).json({ error: 'Pagamento de outra empresa' });
      }

      const asaasPayment = await asaas(`/payments/${pagamento.gateway_id}`);
      await handlePaymentEvent(asaasPayment);

      const atualizado = await sbOne(
        `gbp_pagamentos?id=eq.${pagamentoId}&select=id,status,data_pagamento`,
      );
      res.json({ pagamento: atualizado, statusAsaas: asaasPayment.status });
    } catch (error) {
      console.error('[payments] Erro ao consultar status:', error);
      res.status(500).json({ error: 'Erro ao consultar status', message: error.message });
    }
  });

  // Baixa manual: informa ao Asaas que a cobrança foi paga por outro meio
  // (dinheiro, transferência etc.) via POST /payments/:id/receiveInCash.
  // Body: { pagamentoId, dataPagamento? (YYYY-MM-DD, default hoje) }
  app.post('/pagamentos/baixa', requireAuth, async (req, res) => {
    try {
      const { pagamentoId, dataPagamento } = req.body || {};
      if (!pagamentoId) {
        return res.status(400).json({ error: 'pagamentoId é obrigatório' });
      }

      const pagamento = await sbOne(
        `gbp_pagamentos?id=eq.${pagamentoId}&select=*,gbp_assinaturas(empresa_uid)`,
      );
      if (!pagamento) {
        return res.status(404).json({ error: 'Pagamento não encontrado' });
      }
      const empresaUid = pagamento.gbp_assinaturas?.empresa_uid;
      if (!mesmaEmpresa(req, empresaUid) && !isAdmin(req.user)) {
        return res.status(403).json({ error: 'Pagamento de outra empresa' });
      }
      if (!['pending', 'overdue'].includes(pagamento.status)) {
        return res.status(400).json({ error: `Cobrança já está ${pagamento.status}` });
      }

      const hoje = new Date().toISOString().slice(0, 10);
      const data = dataPagamento || hoje;

      // Informa o Asaas (só se a cobrança existir lá)
      if (pagamento.gateway_id) {
        if (!ASAAS_API_KEY) {
          return res.status(503).json({ error: 'Pagamentos não configurados' });
        }
        await asaas(`/payments/${pagamento.gateway_id}/receiveInCash`, {
          method: 'POST',
          body: {
            paymentDate: data,
            value: pagamento.valor,
            notifyCustomer: false,
          },
        });
        // Sincroniza status/comissão com base no pagamento atualizado
        const asaasPayment = await asaas(`/payments/${pagamento.gateway_id}`);
        await handlePaymentEvent(asaasPayment);
      }

      // Baixa local (garante data_pagamento mesmo sem gateway ou com data custom)
      const rows = await sb(`gbp_pagamentos?id=eq.${pagamentoId}`, {
        method: 'PATCH',
        body: {
          status: 'paid',
          data_pagamento: new Date(`${data}T12:00:00`).toISOString(),
        },
        prefer: 'return=representation',
      });

      res.json({ pagamento: Array.isArray(rows) ? rows[0] : null });
    } catch (error) {
      console.error('[payments] Erro na baixa manual:', error);
      res.status(500).json({ error: 'Erro ao dar baixa', message: error.message });
    }
  });

  // Webhook do Asaas — auth via header asaas-access-token
  app.post('/webhooks/asaas', async (req, res) => {
    try {
      if (!ASAAS_WEBHOOK_TOKEN) {
        return res.status(503).json({ error: 'Webhook não configurado' });
      }
      const token = req.headers['asaas-access-token'];
      if (token !== ASAAS_WEBHOOK_TOKEN) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      const { event, payment } = req.body || {};
      console.log('[payments] webhook:', event, payment?.id, payment?.status);

      if (payment?.id) {
        await handlePaymentEvent(payment);
      }

      res.json({ ok: true });
    } catch (error) {
      console.error('[payments] Erro no webhook:', error);
      // Asaas reenvia em caso de não-2xx; retornar 200 evita retry infinito
      // em erros permanentes. Aqui devolvemos 500 só se for inesperado.
      res.status(500).json({ error: 'Erro ao processar webhook' });
    }
  });
};
