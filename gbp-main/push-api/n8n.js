// Endpoint que duplica um workflow template no n8n para cada empresa criada.
//
// Chamado pelo trigger Postgres (pg_net) no INSERT de gbp_empresas.
// Body esperado: { record: <linha da empresa> } ou a própria linha.
// Auth: header x-webhook-secret deve bater com N8N_HOOK_SECRET.
//
// Variáveis de ambiente necessárias:
//   N8N_API_URL       = https://edtn8n.guardia.work/api/v1
//   N8N_API_KEY       = api key do n8n (Settings -> n8n API)
//   N8N_TEMPLATE_ID   = id do workflow molde (ex.: dXevsufDzj4c4YYlIkZ)
//   N8N_HOOK_SECRET   = segredo compartilhado com o trigger do banco
//
// No template, placeholders substituídos em todo o JSON:
//   {{EMPRESA_UID}} {{EMPRESA_NOME}} {{INSTANCIA}} {{TOKEN}} {{PORTA}} {{STORAGE}}
//
// O clone recebe path único de webhook (fila-<empresa_uid>), é criado ATIVO,
// e o path é gravado em gbp_empresas.fila.

module.exports = function n8nRoutes(app, { supabaseUrl, serviceKey }) {
  const {
    N8N_API_URL = '',
    N8N_API_KEY = '',
    N8N_TEMPLATE_ID = '',
    N8N_HOOK_SECRET = '',
  } = process.env;

  app.post('/n8n/nova-empresa', async (req, res) => {
    try {
      if (!N8N_HOOK_SECRET || req.headers['x-webhook-secret'] !== N8N_HOOK_SECRET) {
        return res.status(401).json({ error: 'Não autorizado' });
      }
      if (!N8N_API_URL || !N8N_API_KEY || !N8N_TEMPLATE_ID) {
        return res.status(500).json({ error: 'N8N_API_URL, N8N_API_KEY ou N8N_TEMPLATE_ID não configurados' });
      }

      const emp = req.body?.record || req.body || {};
      if (!emp.uid || !emp.nome) {
        return res.status(400).json({ error: 'payload sem uid/nome da empresa' });
      }

      const api = N8N_API_URL.replace(/\/+$/, '');
      const headers = { 'X-N8N-API-KEY': N8N_API_KEY, 'Content-Type': 'application/json' };

      // 1) baixa o workflow template
      const tplRes = await fetch(`${api}/workflows/${N8N_TEMPLATE_ID}`, { headers });
      if (!tplRes.ok) {
        return res.status(502).json({ error: `template n8n ${tplRes.status}: ${await tplRes.text()}` });
      }
      const tpl = await tplRes.json();

      // 2) clona substituindo placeholders pelos dados da empresa
      const vars = {
        EMPRESA_UID: emp.uid,
        EMPRESA_NOME: emp.nome || '',
        INSTANCIA: emp.instancia || '',
        TOKEN: emp.token || '',
        PORTA: emp.porta || '',
        STORAGE: emp.storage || '',
      };
      let novo = JSON.parse(JSON.stringify({
        name: `GBP Disparo ${emp.nome}`,
        nodes: tpl.nodes,
        connections: tpl.connections,
        settings: tpl.settings || {},
        staticData: tpl.staticData || null,
      }));
      let s = JSON.stringify(novo);
      for (const [k, v] of Object.entries(vars)) s = s.split(`{{${k}}}`).join(v ?? '');
      novo = JSON.parse(s);

      // 3) path de webhook único por empresa (evita colisão entre clones)
      const fila = `fila-${emp.uid}`;
      novo.nodes = (novo.nodes || []).map((n) => {
        if (n.type === 'n8n-nodes-base.webhook') {
          const { webhookId: _omit, ...rest } = n; // n8n gera webhookId novo
          return { ...rest, parameters: { ...(n.parameters || {}), path: fila } };
        }
        return n;
      });

      // 4) cria o workflow (campo active é read-only) e depois ativa
      const createRes = await fetch(`${api}/workflows`, {
        method: 'POST',
        headers,
        body: JSON.stringify(novo),
      });
      const created = await createRes.json();
      if (!createRes.ok) {
        return res.status(502).json({ error: `falha ao criar workflow: ${JSON.stringify(created)}` });
      }
      const actRes = await fetch(`${api}/workflows/${created.id}/activate`, { method: 'POST', headers });
      if (!actRes.ok) {
        console.error('Workflow criado mas falha ao ativar:', created.id, actRes.status);
      }

      // 5) grava o path do webhook + id do workflow na empresa
      if (serviceKey) {
        const patchEmpresa = (body) => fetch(
          `${supabaseUrl}/rest/v1/gbp_empresas?uid=eq.${emp.uid}`,
          {
            method: 'PATCH',
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify(body),
          },
        );
        let upd = await patchEmpresa({ fila, n8n_workflow_id: created.id });
        if (!upd.ok) {
          // coluna n8n_workflow_id ainda não existe? grava só a fila
          upd = await patchEmpresa({ fila });
        }
        if (!upd.ok) {
          return res.json({
            ok: true, workflow_id: created.id, fila,
            aviso: `workflow criado, mas falhou gravar fila: ${upd.status}`,
          });
        }
      }

      return res.json({ ok: true, workflow_id: created.id, fila, empresa: emp.nome });
    } catch (e) {
      console.error('Erro ao clonar workflow n8n:', e);
      return res.status(500).json({ error: String(e && e.message || e) });
    }
  });

  // Chamado pelo trigger AFTER DELETE em gbp_empresas.
  // Body: { record: <linha deletada> } — usa n8n_workflow_id ou busca por nome.
  app.post('/n8n/remover-empresa', async (req, res) => {
    try {
      if (!N8N_HOOK_SECRET || req.headers['x-webhook-secret'] !== N8N_HOOK_SECRET) {
        return res.status(401).json({ error: 'Não autorizado' });
      }
      const emp = req.body?.record || req.body || {};
      let wfId = emp.n8n_workflow_id || null;
      const api = N8N_API_URL.replace(/\/+$/, '');
      const headers = { 'X-N8N-API-KEY': N8N_API_KEY };

      // fallback: procura workflow pelo nome "template - empresa"
      if (!wfId && emp.nome) {
        const listRes = await fetch(`${api}/workflows?limit=250`, { headers });
        if (listRes.ok) {
          const list = await listRes.json();
          const alvo = (list.data || []).find(
            (w) => w.name === `GBP Disparo ${emp.nome}` || w.name.endsWith(` - ${emp.nome}`),
          );
          wfId = alvo?.id || null;
        }
      }
      if (!wfId) {
        return res.json({ ok: true, removido: false, motivo: 'workflow não identificado' });
      }

      // n8n exige workflow inativo para deletar
      await fetch(`${api}/workflows/${wfId}/deactivate`, { method: 'POST', headers });
      const del = await fetch(`${api}/workflows/${wfId}`, { method: 'DELETE', headers });
      if (!del.ok) {
        return res.status(502).json({ error: `falha ao deletar workflow ${wfId}: ${del.status}` });
      }
      return res.json({ ok: true, removido: true, workflow_id: wfId, empresa: emp.nome });
    } catch (e) {
      console.error('Erro ao remover workflow n8n:', e);
      return res.status(500).json({ error: String(e && e.message || e) });
    }
  });
};
