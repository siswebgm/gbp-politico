// ============================================================
// Integração Google Calendar — conexão POR EMPRESA.
// Um admin da empresa conecta uma conta Google; todos os usuários da
// empresa compartilham a mesma agenda sincronizada.
//
// Env vars necessárias (docker-compose.deploy.yml / .env):
//   GOOGLE_CLIENT_ID       — OAuth Client ID (Web)
//   GOOGLE_CLIENT_SECRET   — OAuth Client Secret (NUNCA vai pro frontend)
//   GOOGLE_REDIRECT_URI    — ex.: https://app.gbppolitico.com/push/google/callback
//   APP_ORIGIN             — ex.: https://app.gbppolitico.com (redirect pós-OAuth)
//   SUPABASE_SERVICE_ROLE_KEY — service_role para ler/escrever gbp_google_tokens
//   GOOGLE_STATE_SECRET    — segredo p/ assinar o state do OAuth (opcional;
//                            se ausente, deriva de GOOGLE_CLIENT_SECRET)
// ============================================================
const crypto = require('crypto');

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  APP_ORIGIN = 'https://app.gbppolitico.com',
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

const googleConfigurado = () =>
  !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI && SUPABASE_SERVICE_ROLE_KEY);

// O token salvo precisa de escopo de escrita na agenda (calendar.events ou calendar).
// Conexões feitas com consentimento parcial (usuário desmarcou a caixa do Agenda)
// ou antes do escopo existir ficam sem ele → precisa reconectar.
const temEscopoEscrita = (scopes = '') =>
  /auth\/calendar\.events|auth\/calendar(?![.\w])/.test(String(scopes));

// Admin no app é cargo='admin' OU nivel_acesso='admin'
const isAdmin = (user) =>
  String(user?.nivel_acesso || '').toLowerCase() === 'admin' ||
  String(user?.cargo || '').toLowerCase() === 'admin';

// ---- state do OAuth: JSON {e, u, n} + HMAC --------------------
const stateSecret = () => GOOGLE_CLIENT_SECRET + '|gbp';

const assinarState = (payload) => {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', stateSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
};

const validarState = (state) => {
  const [body, sig] = String(state || '').split('.');
  if (!body || !sig) return null;
  const esperado = crypto.createHmac('sha256', stateSecret()).update(body).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(esperado))) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
};

// ---- Supabase REST com service_role (ignora RLS) --------------
function sbFetch(supabaseUrl, path, init = {}) {
  return fetch(`${supabaseUrl}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

async function getTokenRow(supabaseUrl, empresaUid) {
  const r = await sbFetch(
    supabaseUrl,
    `/gbp_google_tokens?empresa_uid=eq.${empresaUid}&select=*&limit=1`,
  );
  if (!r.ok) throw new Error(`Supabase ${r.status} ao ler gbp_google_tokens`);
  const rows = await r.json();
  return rows[0] || null;
}

// ---- tokens Google --------------------------------------------
async function googleTokenRequest(params) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  const data = await r.json();
  if (!r.ok) throw Object.assign(new Error(data.error_description || data.error), { google: data });
  return data;
}

// Garante access token válido (refresh se <60s de vida).
// Se o refresh_token morreu (invalid_grant), apaga a linha → reconectar.
async function getAccessToken(supabaseUrl, empresaUid) {
  const row = await getTokenRow(supabaseUrl, empresaUid);
  if (!row) return { error: 'not_connected' };
  const expiraEm = row.token_expiry ? new Date(row.token_expiry).getTime() : 0;
  if (expiraEm - Date.now() > 60_000) return { token: row.access_token, row };
  if (!row.refresh_token) return { error: 'reconnect' };
  try {
    const data = await googleTokenRequest({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: row.refresh_token,
    });
    const novoExpiry = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
    await sbFetch(
      supabaseUrl,
      `/gbp_google_tokens?empresa_uid=eq.${empresaUid}`,
      { method: 'PATCH', body: JSON.stringify({ access_token: data.access_token, token_expiry: novoExpiry }) },
    );
    return { token: data.access_token, row };
  } catch (e) {
    if (e.google?.error === 'invalid_grant') {
      await sbFetch(supabaseUrl, `/gbp_google_tokens?empresa_uid=eq.${empresaUid}`, { method: 'DELETE' });
      return { error: 'reconnect' };
    }
    throw e;
  }
}

async function googleApi(supabaseUrl, empresaUid, method, path, body) {
  const { token, error } = await getAccessToken(supabaseUrl, empresaUid);
  if (error) return { error };
  const r = await fetch(`https://www.googleapis.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 204) return {};
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data.error?.message || `Google API ${r.status}`;
    const err = new Error(msg);
    err.status = r.status;
    err.google = data.error;
    throw err;
  }
  return data;
}

// Evento do Google normalizado p/ o formato AgendaEvent do app
function normalizeEvent(item) {
  const allDay = !!item.start?.date;
  return {
    uid: `gcal_${item.id}`,
    google_id: item.id,
    title: item.summary || '(sem título)',
    description: item.description || null,
    location: item.location || null,
    start_time: item.start?.dateTime || item.start?.date || null,
    end_time: item.end?.dateTime || item.end?.date || null,
    all_day: allDay,
    status: item.status === 'cancelled' ? 'CANCELADO' : 'AGENDADO',
    type: 'OUTROS',
    color: null,
    attendees: (item.attendees || []).map((a) => ({
      name: a.displayName || a.email,
      email: a.email,
      confirmed: a.responseStatus === 'accepted',
    })),
    origem: 'google',
    google_link: item.htmlLink || null,
    updated_at: item.updated || null,
  };
}

// Evento do app → formato Google
function toGoogleEvent(ev = {}) {
  const g = {
    summary: ev.title,
    description: ev.description || undefined,
    location: ev.location || undefined,
  };
  if (ev.all_day) {
    const d = (iso) => String(iso || '').slice(0, 10);
    g.start = { date: d(ev.start_time) };
    g.end = { date: d(ev.end_time) };
  } else {
    g.start = { dateTime: ev.start_time };
    g.end = { dateTime: ev.end_time };
  }
  return g;
}

// ---- montagem das rotas ---------------------------------------
module.exports = function mountGoogleRoutes(app, { supabaseUrl, requireAuth }) {
  const naoConfigurado = (_req, res) =>
    res.status(503).json({ error: 'Integração Google não configurada no servidor' });

  const guard = (req, res, next) => {
    if (!googleConfigurado()) return naoConfigurado(req, res);
    next();
  };

  // Usuário precisa pertencer à empresa informada
  const mesmaEmpresa = (req, res) => {
    const empresaUid = String(req.query.empresa_uid || req.body?.empresa_uid || '');
    if (!empresaUid || req.user.empresa_uid !== empresaUid) {
      res.status(403).json({ error: 'Empresa inválida para este usuário' });
      return null;
    }
    return empresaUid;
  };

  // GET /google/status?empresa_uid=
  app.get('/google/status', requireAuth, guard, async (req, res) => {
    const empresaUid = mesmaEmpresa(req, res);
    if (!empresaUid) return;
    try {
      const row = await getTokenRow(supabaseUrl, empresaUid);
      res.json({
        connected: !!row,
        needs_reconnect: !!row && !temEscopoEscrita(row.scopes),
        google_email: row?.google_email || null,
        google_name: row?.google_name || null,
        calendar_id: row?.calendar_id || null,
      });
    } catch (e) {
      console.error('[google] status:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // POST /google/auth-url {empresa_uid} — só admin conecta
  app.post('/google/auth-url', requireAuth, guard, async (req, res) => {
    const empresaUid = mesmaEmpresa(req, res);
    if (!empresaUid) return;
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: 'Apenas administradores podem conectar o Google Agenda' });
    }
    const state = assinarState({
      e: empresaUid,
      u: req.user.uid,
      n: crypto.randomBytes(8).toString('hex'),
      ts: Date.now(),
    });
    const url =
      'https://accounts.google.com/o/oauth2/v2/auth' +
      `?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}` +
      '&response_type=code&access_type=offline&prompt=consent' +
      `&scope=${encodeURIComponent(GOOGLE_SCOPES)}` +
      `&state=${encodeURIComponent(state)}`;
    res.json({ url });
  });

  // GET /google/callback — redirect do Google (sem x-user-uid)
  app.get('/google/callback', guard, async (req, res) => {
    const destino = (suf) => res.redirect(`${APP_ORIGIN}/app/agenda?google=${suf}`);
    const { code, state, error } = req.query;
    if (error) return destino(`erro_${encodeURIComponent(error)}`);
    const payload = validarState(state);
    if (!payload || !code) return destino('erro_state');
    try {
      const tokens = await googleTokenRequest({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: GOOGLE_REDIRECT_URI,
      });
      // Perfil da conta conectada (p/ exibir no status)
      let google_email = null;
      let google_name = null;
      try {
        const u = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const info = await u.json();
        google_email = info.email || null;
        google_name = info.name || null;
      } catch { /* opcional */ }

      const row = {
        empresa_uid: payload.e,
        google_email,
        google_name,
        calendar_id: 'primary',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expiry: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        scopes: tokens.scope || GOOGLE_SCOPES,
        sync_token: null,
        connected_by: payload.u,
      };
      const r = await sbFetch(supabaseUrl, '/gbp_google_tokens', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(row),
      });
      if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
      return destino('conectado');
    } catch (e) {
      console.error('[google] callback:', e);
      return destino(`erro_${encodeURIComponent(e.message.slice(0, 80))}`);
    }
  });

  // GET /google/events?empresa_uid&timeMin&timeMax
  app.get('/google/events', requireAuth, guard, async (req, res) => {
    const empresaUid = mesmaEmpresa(req, res);
    if (!empresaUid) return;
    try {
      const row = await getTokenRow(supabaseUrl, empresaUid);
      if (!row) return res.json({ connected: false, events: [] });
      const params = new URLSearchParams({
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '2500',
        timeMin: req.query.timeMin || new Date().toISOString(),
        timeMax: req.query.timeMax || new Date(Date.now() + 365 * 864e5).toISOString(),
      });
      const data = await googleApi(
        supabaseUrl,
        empresaUid,
        'GET',
        `/calendar/v3/calendars/${encodeURIComponent(row.calendar_id)}/events?${params}`,
      );
      if (data.error) return res.status(401).json({ error: data.error });
      res.json({ connected: true, events: (data.items || []).map(normalizeEvent) });
    } catch (e) {
      console.error('[google] events:', e);
      res.status(502).json({ error: e.message });
    }
  });

  // POST /google/sync {empresa_uid} — incremental via syncToken
  app.post('/google/sync', requireAuth, guard, async (req, res) => {
    const empresaUid = mesmaEmpresa(req, res);
    if (!empresaUid) return;
    try {
      const row = await getTokenRow(supabaseUrl, empresaUid);
      if (!row) return res.json({ connected: false, events: [], deleted: [] });
      // Janela da sync completa: 90 dias atrás → pegar eventos já criados
      const janelaInicial = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const fullSync = req.body?.full === true || req.query?.full === 'true';
      const params = new URLSearchParams({ singleEvents: 'true', showDeleted: 'true', maxResults: '2500' });
      if (row.sync_token && !fullSync) params.set('syncToken', row.sync_token);
      else {
        // primeira sync ou sync forçada: desde 90 dias atrás
        params.set('timeMin', janelaInicial);
      }
      let data;
      try {
        data = await googleApi(
          supabaseUrl,
          empresaUid,
          'GET',
          `/calendar/v3/calendars/${encodeURIComponent(row.calendar_id)}/events?${params}`,
        );
      } catch (e) {
        // syncToken expirou (410) → resync completo
        if (e.status === 410) {
          params.delete('syncToken');
          params.set('timeMin', janelaInicial);
          data = await googleApi(
            supabaseUrl,
            empresaUid,
            'GET',
            `/calendar/v3/calendars/${encodeURIComponent(row.calendar_id)}/events?${params}`,
          );
        } else throw e;
      }
      if (data.error) return res.status(401).json({ error: data.error });
      if (data.nextSyncToken) {
        await sbFetch(supabaseUrl, `/gbp_google_tokens?empresa_uid=eq.${empresaUid}`, {
          method: 'PATCH',
          body: JSON.stringify({ sync_token: data.nextSyncToken }),
        });
      }
      const items = data.items || [];
      res.json({
        connected: true,
        events: items.filter((i) => i.status !== 'cancelled').map(normalizeEvent),
        deleted: items.filter((i) => i.status === 'cancelled').map((i) => i.id),
      });
    } catch (e) {
      console.error('[google] sync:', e);
      res.status(502).json({ error: e.message });
    }
  });

  // POST /google/events {empresa_uid, action:'upsert'|'delete', google_id?, event?}
  app.post('/google/events', requireAuth, guard, async (req, res) => {
    const empresaUid = mesmaEmpresa(req, res);
    if (!empresaUid) return;
    const { action, google_id, event } = req.body || {};
    try {
      const row = await getTokenRow(supabaseUrl, empresaUid);
      if (!row) return res.status(412).json({ error: 'not_connected' });
      const cal = encodeURIComponent(row.calendar_id);

      if (action === 'delete') {
        if (!google_id) return res.status(400).json({ error: 'google_id ausente' });
        await googleApi(supabaseUrl, empresaUid, 'DELETE', `/calendar/v3/calendars/${cal}/events/${encodeURIComponent(google_id)}`);
        return res.json({ ok: true });
      }
      if (action === 'upsert') {
        const body = toGoogleEvent(event);
        const data = google_id
          ? await googleApi(supabaseUrl, empresaUid, 'PUT', `/calendar/v3/calendars/${cal}/events/${encodeURIComponent(google_id)}`, body)
          : await googleApi(supabaseUrl, empresaUid, 'POST', `/calendar/v3/calendars/${cal}/events`, body);
        if (data.error) return res.status(401).json({ error: data.error });
        return res.json({ ok: true, google_id: data.id, link: data.htmlLink });
      }
      res.status(400).json({ error: 'action inválida (upsert|delete)' });
    } catch (e) {
      console.error('[google] push event:', e);
      res.status(502).json({ error: e.message });
    }
  });

  // POST /google/disconnect {empresa_uid} — só admin
  app.post('/google/disconnect', requireAuth, guard, async (req, res) => {
    const empresaUid = mesmaEmpresa(req, res);
    if (!empresaUid) return;
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: 'Apenas administradores podem desconectar' });
    }
    try {
      const row = await getTokenRow(supabaseUrl, empresaUid);
      if (row?.access_token) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(row.access_token)}`, { method: 'POST' }).catch(() => {});
      }
      await sbFetch(supabaseUrl, `/gbp_google_tokens?empresa_uid=eq.${empresaUid}`, { method: 'DELETE' });
      res.json({ ok: true });
    } catch (e) {
      console.error('[google] disconnect:', e);
      res.status(500).json({ error: e.message });
    }
  });
};
