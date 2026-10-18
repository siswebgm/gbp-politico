// ============================================================
// Rotinas agendadas de cobrança/bloqueio.
//
// Bloqueio automático por inadimplência — espelha a rotina manual:
//   vencimento até dia 10  → bloqueia a partir do dia (venc + 7)
//   vencimento após dia 10 → bloqueia no dia 3 do mês seguinte
// Ex.: venc. dia 5  → bloqueio no dia 12
//      venc. dia 20 → bloqueio no dia 3 do mês seguinte
//
// Não bloqueia:
//   - empresa já 'blocked' / 'inactive' ou ativa=false
//   - empresa prorrogada (data_expiracao no futuro) — quando o
//     prazo acaba, a próxima execução bloqueia se ainda dever
//
// Idempotente: pode rodar várias vezes por dia sem efeito extra.
// ============================================================

const INTERVALO_MS = 6 * 60 * 60 * 1000; // a cada 6h

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SB_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

const sb = async (path, { method = 'GET', body, prefer } = {}) => {
  const headers = {
    apikey: SB_KEY || '',
    Authorization: `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers['Prefer'] = prefer;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Supabase HTTP ${res.status}`);
  return data;
};

// Data a partir da qual a empresa pode ser bloqueada por essa cobrança
function dataDeBloqueio(dataVencimento) {
  const v = new Date(dataVencimento);
  const dia = v.getDate();
  if (dia <= 10) {
    // mesma janela do ciclo: venc + 7 dias (ex.: dia 5 → dia 12)
    return new Date(v.getFullYear(), v.getMonth(), dia + 7, 23, 59, 59);
  }
  // virou o mês: bloqueio no dia 3 (ex.: venc. dia 20 → dia 3 do mês seguinte)
  return new Date(v.getFullYear(), v.getMonth() + 1, 3, 23, 59, 59);
}

async function bloquearInadimplentes() {
  const agora = new Date();

  // Pendências já vencidas ('pending' que passou do vencimento também conta)
  const pendentes = await sb(
    `gbp_pagamentos?status=in.(pending,overdue)` +
      `&data_vencimento=lt.${agora.toISOString()}` +
      `&select=id,assinatura_id,data_vencimento,status,gbp_assinaturas(empresa_uid)`,
  );
  if (!Array.isArray(pendentes) || pendentes.length === 0) return;

  // Marca como 'overdue' os 'pending' que já venceram
  // (mantém o banco alinhado mesmo se o webhook do Asaas não chegou)
  const vencidos = pendentes
    .filter((p) => p.status === 'pending')
    .map((p) => p.id);
  if (vencidos.length) {
    await sb(`gbp_pagamentos?id=in.(${vencidos.join(',')})`, {
      method: 'PATCH',
      body: { status: 'overdue' },
      prefer: 'return=minimal',
    });
  }

  // Empresas com ao menos uma cobrança que passou da data de bloqueio
  const empresaUids = new Set();
  pendentes.forEach((p) => {
    const empUid = p.gbp_assinaturas?.empresa_uid;
    if (empUid && agora > dataDeBloqueio(p.data_vencimento)) {
      empresaUids.add(empUid);
    }
  });
  if (empresaUids.size === 0) return;

  const lista = [...empresaUids];
  const empresas = await sb(
    `gbp_empresas?uid=in.(${lista.join(',')})` +
      `&select=uid,nome,status,ativa,data_expiracao`,
  );

  const bloquear = (empresas || []).filter(
    (e) =>
      e &&
      e.ativa !== false &&
      e.status !== 'blocked' &&
      e.status !== 'inactive' &&
      // prorrogada ainda tem acesso válido
      (!e.data_expiracao || new Date(e.data_expiracao) < agora),
  );

  for (const e of bloquear) {
    await sb(`gbp_empresas?uid=eq.${e.uid}`, {
      method: 'PATCH',
      body: { status: 'blocked' },
      prefer: 'return=minimal',
    });
    console.log(`[jobs] Bloqueada por inadimplência: ${e.nome || e.uid}`);
  }
  if (bloquear.length) {
    console.log(`[jobs] ${bloquear.length} empresa(s) bloqueada(s) automaticamente`);
  }
}

function startJobs() {
  if (!SUPABASE_URL || !SB_KEY) {
    console.warn('[jobs] Supabase não configurado — bloqueio automático desligado');
    return;
  }
  const run = () =>
    bloquearInadimplentes().catch((e) =>
      console.error('[jobs] Falha no bloqueio automático:', e.message),
    );
  // primeira execução logo após subir, depois a cada 6h
  setTimeout(run, 30 * 1000);
  setInterval(run, INTERVALO_MS);
  console.log('[jobs] Bloqueio automático por inadimplência ativo (a cada 6h)');
}

module.exports = { startJobs };
