// Edge Function: envia notificações push via FCM HTTP v1.
// Secret necessário: FIREBASE_SERVICE_ACCOUNT (JSON completo da conta de serviço).

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Payload {
  tokens: string[];
  title: string;
  body: string;
  imagem_url?: string;
  link?: string;
  data?: Record<string, string>;
}

function base64Url(input: ArrayBuffer | string): string {
  const bytes =
    typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken(sa: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );

  const pem = sa.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );
  const jwt = `${header}.${claims}.${base64Url(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`Falha ao obter access token: ${await res.text()}`);
  return (await res.json()).access_token as string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!raw) return json({ error: 'Secret FIREBASE_SERVICE_ACCOUNT não configurado' }, 500);
    const sa = JSON.parse(raw);

    const { tokens, title, body, imagem_url, link, data = {} }: Payload = await req.json();
    if (!Array.isArray(tokens) || tokens.length === 0 || !title || !body) {
      return json({ error: 'Informe tokens, title e body' }, 400);
    }

    const accessToken = await getAccessToken(sa);
    const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

    const stringData: Record<string, string> = {};
    Object.entries({ ...data, link: link ?? '' }).forEach(([k, v]) => {
      stringData[k] = String(v ?? '');
    });

    const results = await Promise.all(
      tokens.map(async (token) => {
        const message = {
          message: {
            token,
            notification: { title, body, ...(imagem_url ? { image: imagem_url } : {}) },
            data: stringData,
            webpush: {
              headers: { Urgency: 'high', TTL: '86400' },
              ...(link ? { fcm_options: { link } } : {}),
            },
          },
        };
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(message),
        });
        if (res.ok) return { token, success: true };

        const err = await res.json().catch(() => ({}));
        const status = err?.error?.status as string | undefined;
        return {
          token,
          success: false,
          invalid_token: status === 'NOT_FOUND' || status === 'INVALID_ARGUMENT' || status === 'UNREGISTERED',
          error: err?.error?.message ?? `HTTP ${res.status}`,
        };
      }),
    );

    return json({ results });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
