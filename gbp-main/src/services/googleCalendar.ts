// ============================================================
// Integração Google Calendar — a conexão é POR EMPRESA.
// Um admin da empresa conecta uma conta Google no push-api; todos os
// usuários da empresa passam a ver/sincronizar a mesma agenda.
// Tokens NUNCA passam pelo frontend: tudo via push-api + service_role.
// ============================================================

import { getSessaoToken } from '../lib/session';

export interface GoogleConnectionStatus {
  connected: boolean;
  /** true quando o token salvo não tem escopo de escrita na agenda → precisa reconectar */
  needs_reconnect?: boolean;
  google_email: string | null;
  google_name: string | null;
  calendar_id: string | null;
}

export interface GoogleAgendaEvent {
  uid: string;            // 'gcal_<googleId>'
  google_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  status: string;
  type: string;
  attendees: { name: string; email?: string; confirmed?: boolean }[];
  origem: 'google';
  google_link: string | null;
  updated_at: string | null;
}

export interface GoogleEventInput {
  title: string;
  description?: string | null;
  location?: string | null;
  start_time: string; // ISO
  end_time: string;   // ISO
  all_day?: boolean;
}

const baseUrl = () =>
  (import.meta.env.VITE_PUSH_API_URL as string | undefined) || 'https://app.gbppolitico.com/push';

async function call<T>(
  path: string,
  {
    method = 'GET',
    userUid,
    body,
    params,
  }: { method?: string; userUid: string; body?: unknown; params?: Record<string, string> },
): Promise<T> {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${baseUrl()}${path}${qs}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-uid': userUid,
      'x-session-token': getSessaoToken(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `push-api ${res.status}`);
  return data as T;
}

export const googleCalendarService = {
  // Status da conexão da empresa
  status: (empresaUid: string, userUid: string) =>
    call<GoogleConnectionStatus>('/google/status', {
      userUid,
      params: { empresa_uid: empresaUid },
    }),

  // Retorna a URL OAuth — abrir em redirect (admin only)
  authUrl: (empresaUid: string, userUid: string) =>
    call<{ url: string }>('/google/auth-url', {
      method: 'POST',
      userUid,
      body: { empresa_uid: empresaUid },
    }),

  // Eventos do Google no período
  events: (empresaUid: string, userUid: string, timeMin: string, timeMax: string) =>
    call<{ connected: boolean; events: GoogleAgendaEvent[] }>('/google/events', {
      userUid,
      params: { empresa_uid: empresaUid, timeMin, timeMax },
    }),

  // Sincronização (Google → app). full=true força sync completa (90 dias atrás), ignorando o syncToken
  sync: (empresaUid: string, userUid: string, full = false) =>
    call<{ connected: boolean; events: GoogleAgendaEvent[]; deleted: string[] }>(
      '/google/sync',
      { method: 'POST', userUid, body: { empresa_uid: empresaUid, full } },
    ),

  // Criar/atualizar evento no Google (app → Google)
  upsertEvent: (empresaUid: string, userUid: string, event: GoogleEventInput, googleId?: string) =>
    call<{ ok: boolean; google_id: string; link?: string }>('/google/events', {
      method: 'POST',
      userUid,
      body: { empresa_uid: empresaUid, action: 'upsert', google_id: googleId, event },
    }),

  deleteEvent: (empresaUid: string, userUid: string, googleId: string) =>
    call<{ ok: boolean }>('/google/events', {
      method: 'POST',
      userUid,
      body: { empresa_uid: empresaUid, action: 'delete', google_id: googleId },
    }),

  disconnect: (empresaUid: string, userUid: string) =>
    call<{ ok: boolean }>('/google/disconnect', {
      method: 'POST',
      userUid,
      body: { empresa_uid: empresaUid },
    }),
};
