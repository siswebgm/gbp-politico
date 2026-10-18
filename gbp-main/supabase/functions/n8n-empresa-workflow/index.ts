// Edge Function: ao criar empresa, duplica um workflow template no n8n.
//
// Secrets necessários (supabase secrets set):
//   N8N_API_URL       = https://edtn8n.guardia.work/api/v1
//   N8N_API_KEY       = <api key criada em Settings -> n8n API>
//   N8N_TEMPLATE_ID   = <id do workflow que serve de molde>
//
// Entrada: aceita o payload do Database Webhook do Supabase
//   { type, table, record: {...} }
// ou um objeto direto com os campos da empresa:
//   { uid, nome, instancia, token, porta, storage }
//
// No template do n8n, use placeholders que serão substituídos:
//   {{EMPRESA_UID}} {{EMPRESA_NOME}} {{INSTANCIA}} {{TOKEN}} {{PORTA}} {{STORAGE}}
// O workflow clonado é criado ATIVO.
//
// Webhook: o clone recebe um path NOVO e único (fila-{empresa_uid}),
// o webhookId é removido para o n8n gerar outro, e o path final é gravado
// em gbp_empresas.fila via REST do Supabase.
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem no ambiente da função.

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// substitui {{CHAVE}} em todo o JSON do workflow
function substituir(obj: unknown, vars: Record<string, string>): unknown {
  let s = JSON.stringify(obj);
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{{${k}}}`).join(v ?? '');
  }
  return JSON.parse(s);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'use POST' }, 405);

  const N8N_API_URL = (Deno.env.get('N8N_API_URL') || '').replace(/\/+$/, '');
  const N8N_API_KEY = Deno.env.get('N8N_API_KEY') || '';
  const N8N_TEMPLATE_ID = Deno.env.get('N8N_TEMPLATE_ID') || '';
  if (!N8N_API_URL || !N8N_API_KEY || !N8N_TEMPLATE_ID) {
    return json({ error: 'secrets N8N_API_URL, N8N_API_KEY ou N8N_TEMPLATE_ID ausentes' }, 500);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'body inválido' }, 400);
  }

  // aceita formato webhook do Supabase ou objeto direto da empresa
  const emp = body.record ?? body;
  if (!emp?.uid || !emp?.nome) {
    return json({ error: 'payload sem uid/nome da empresa' }, 400);
  }

  const headers = { 'X-N8N-API-KEY': N8N_API_KEY, 'Content-Type': 'application/json' };

  // 1) busca o workflow template
  const tplRes = await fetch(`${N8N_API_URL}/workflows/${N8N_TEMPLATE_ID}`, { headers });
  if (!tplRes.ok) {
    return json({ error: `template n8n ${tplRes.status}: ${await tplRes.text()}` }, 502);
  }
  const tpl = await tplRes.json();

  // 2) clona trocando os placeholders pelos dados da empresa
  const vars: Record<string, string> = {
    EMPRESA_UID: emp.uid,
    EMPRESA_NOME: emp.nome ?? '',
    INSTANCIA: emp.instancia ?? '',
    TOKEN: emp.token ?? '',
    PORTA: emp.porta ?? '',
    STORAGE: emp.storage ?? '',
  };

  const novo: Record<string, unknown> = substituir(
    {
      name: `${tpl.name} - ${emp.nome}`,
      nodes: tpl.nodes,
      connections: tpl.connections,
      settings: tpl.settings ?? {},
      staticData: tpl.staticData ?? null,
    },
    vars,
  ) as Record<string, unknown>;

  // path único por empresa no(s) nó(s) Webhook (evita colisão entre clones)
  const fila = `fila-${emp.uid}`;
  novo.nodes = (novo.nodes as any[]).map((n: any) => {
    if (n.type === 'n8n-nodes-base.webhook') {
      const { webhookId: _omit, ...rest } = n; // webhookId novo é gerado pelo n8n
      return {
        ...rest,
        parameters: { ...(n.parameters || {}), path: fila },
      };
    }
    return n;
  });

  // 3) cria o workflow já ativo
  const createRes = await fetch(`${N8N_API_URL}/workflows`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...novo, active: true }),
  });
  const created = await createRes.json();
  if (!createRes.ok) {
    return json({ error: `falha ao criar workflow: ${JSON.stringify(created)}` }, 502);
  }

  // garante ativação (algumas versões ignoram "active" no POST)
  if (!created.active) {
    await fetch(`${N8N_API_URL}/workflows/${created.id}/activate`, {
      method: 'POST',
      headers,
    });
  }

  // 4) grava o path do webhook na coluna fila da empresa
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
  const SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (SUPABASE_URL && SRK) {
    const upd = await fetch(
      `${SUPABASE_URL}/rest/v1/gbp_empresas?uid=eq.${emp.uid}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SRK,
          Authorization: `Bearer ${SRK}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ fila }),
      },
    );
    if (!upd.ok) {
      return json({
        ok: true,
        workflow_id: created.id,
        fila,
        aviso: `workflow criado, mas falhou gravar fila: ${upd.status}`,
      });
    }
  }

  return json({ ok: true, workflow_id: created.id, fila, empresa: emp.nome });
});
