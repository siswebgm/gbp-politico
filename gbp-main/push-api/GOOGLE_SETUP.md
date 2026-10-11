# Integração Google Calendar — setup

A conexão é **por empresa**: um admin da empresa conecta uma conta Google
e todos os usuários da empresa compartilham a agenda sincronizada.
Os tokens ficam em `gbp_google_tokens` — o frontend nunca os vê (RLS bloqueada;
o push-api acessa com `SUPABASE_SERVICE_ROLE_KEY`).

## 1. Banco de dados

Executar `../sql/create_gbp_google_tokens.sql` no Supabase.

## 2. Google Cloud Console

1. Criar projeto (ou usar o existente do Firebase)
2. **APIs & Services → Library** → ativar **Google Calendar API**
3. **OAuth consent screen** → External → preencher nome do app e e-mail
   - Escopos: `../auth/calendar.events`, `../auth/userinfo.email`, `../auth/userinfo.profile`
   - Usuários de teste: e-mails das contas que vão conectar (enquanto não verificado)
4. **Credentials → Create Credentials → OAuth client ID → Web application**
   - Authorized redirect URI: `https://app.gbppolitico.com/push/google/callback`
   - Copiar **Client ID** e **Client Secret**

## 3. Variáveis de ambiente do push-api

```env
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REDIRECT_URI=https://app.gbppolitico.com/push/google/callback
APP_ORIGIN=https://app.gbppolitico.com
SUPABASE_SERVICE_ROLE_KEY=eyJ...   (service_role, não a anon key)
```

Sem essas variáveis, os endpoints `/google/*` respondem `503` e o botão
"Conectar Google" não aparece na agenda (o app degrada silenciosamente).

## Endpoints

| Método | Rota | Quem | Descrição |
|--------|------|------|-----------|
| GET | `/google/status` | usuário da empresa | Estado da conexão |
| POST | `/google/auth-url` | admin | URL OAuth do Google |
| GET | `/google/callback` | Google | Recebe code, salva tokens, redireciona p/ `/app/agenda` |
| GET | `/google/events` | usuário da empresa | Lista eventos do período |
| POST | `/google/sync` | usuário da empresa | Sync incremental (syncToken) |
| POST | `/google/events` | usuário da empresa | `action: upsert\|delete` — propaga evento |
| POST | `/google/disconnect` | admin | Revoga e remove tokens |
