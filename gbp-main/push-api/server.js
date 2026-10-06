const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Uso local: lê VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY do ../.env quando não definidos
function loadLocalEnv() {
  try {
    const content = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    const vars = {};
    content.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match) vars[match[1]] = match[2];
    });
    return vars;
  } catch {
    return {};
  }
}

const localEnv = loadLocalEnv();

const FIREBASE_SERVICE_ACCOUNT =
  process.env.FIREBASE_SERVICE_ACCOUNT ||
  (process.env.FIREBASE_SERVICE_ACCOUNT_FILE
    ? fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_FILE, 'utf8')
    : undefined);
const SUPABASE_URL = process.env.SUPABASE_URL || localEnv.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || localEnv.VITE_SUPABASE_ANON_KEY;
const {
  ALLOWED_ORIGINS = 'https://app.gbppolitico.com,http://localhost:3000',
  PORT = 3400,
} = process.env;

if (!FIREBASE_SERVICE_ACCOUNT) {
  console.error('Defina FIREBASE_SERVICE_ACCOUNT (JSON) ou FIREBASE_SERVICE_ACCOUNT_FILE (caminho do arquivo)');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)),
});

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(
  cors({
    origin: ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
    methods: ['POST', 'GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-user-uid'],
  }),
);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// O app usa login próprio (tabela gbp_usuarios), sem sessão do Supabase Auth.
// Confirma que o uid enviado pertence a um usuário cadastrado.
async function requireAuth(req, res, next) {
  const uid = String(req.headers['x-user-uid'] || '');
  if (!UUID_REGEX.test(uid)) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/gbp_usuarios?uid=eq.${uid}&select=uid&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    );
    if (!response.ok) return res.status(401).json({ error: 'Sessão inválida' });
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    next();
  } catch (error) {
    console.error('Erro ao validar sessão:', error);
    res.status(502).json({ error: 'Falha ao validar sessão' });
  }
}

app.get('/health', (_req, res) => res.json({ ok: true }));

// FCM limita sendEachForMulticast a 500 tokens por chamada
const FCM_BATCH_SIZE = 500;

app.post('/enviar', requireAuth, async (req, res) => {
  const { tokens, title, body, imagem_url, icon_url, badge_url, empresa_nome, link, data = {} } = req.body || {};

  if (!Array.isArray(tokens) || tokens.length === 0 || !title || !body) {
    return res.status(400).json({ error: 'Informe tokens, title e body' });
  }

  const stringData = {};
  Object.entries({
    ...data,
    link: link || '',
    empresa_nome: empresa_nome || '',
    icon_url: icon_url || '',
    badge_url: badge_url || '',
  }).forEach(([k, v]) => {
    stringData[k] = String(v ?? '');
  });

  const icon = badge_url || icon_url || undefined;

  const buildMessage = (batchTokens) => ({
    tokens: batchTokens,
    notification: {
      title,
      body,
      ...(imagem_url ? { imageUrl: imagem_url } : {}),
    },
    data: stringData,
    webpush: {
      headers: { Urgency: 'high', TTL: '86400' },
      notification: {
        title,
        body,
        ...(icon ? { icon, badge: icon } : {}),
        ...(imagem_url ? { image: imagem_url } : {}),
        requireInteraction: true,
        renotify: true,
        tag: 'gbp-notification',
        vibrate: [200, 100, 200],
      },
      ...(link ? { fcmOptions: { link } } : {}),
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'default',
        ...(icon ? { icon } : {}),
        ...(imagem_url ? { imageUrl: imagem_url } : {}),
      },
    },
    apns: {
      payload: {
        aps: {
          alert: { title, body },
          sound: 'default',
          badge: 1,
        },
      },
      ...(imagem_url ? { fcmOptions: { imageUrl: imagem_url } } : {}),
    },
  });

  const results = [];

  // Envia em lotes de até 500 tokens (limite do FCM), sequencialmente
  for (let i = 0; i < tokens.length; i += FCM_BATCH_SIZE) {
    const batchTokens = tokens.slice(i, i + FCM_BATCH_SIZE);
    try {
      const response = await admin.messaging().sendEachForMulticast(buildMessage(batchTokens));
      response.responses.forEach((r, idx) => {
        const code = r.error?.code || '';
        const msg = r.error?.message || '';
        const invalidToken =
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/unregistered' ||
          code === 'messaging/mismatched-credential' ||
          /unregistered|not.?registered|invalid.?token|sender.?id.?mismatch/i.test(msg);
        if (!r.success) {
          console.log('[push-api] Falha no token', batchTokens[idx]?.substring(0, 15) + '...', '| code:', code, '| msg:', msg);
        }
        results.push({
          token: batchTokens[idx],
          success: r.success,
          invalid_token: invalidToken,
          ...(r.error ? { error: r.error.message } : {}),
        });
      });
    } catch (error) {
      // Falha no lote inteiro (ex.: erro de rede/credencial): marca todos como falha
      batchTokens.forEach((token) => {
        results.push({ token, success: false, error: error.message });
      });
    }
  }

  res.json({ results });
});

app.listen(PORT, () => console.log(`push-api rodando na porta ${PORT}`));
