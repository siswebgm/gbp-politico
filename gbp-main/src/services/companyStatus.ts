import { supabaseClient } from '../lib/supabase';

// Veredito centralizado do status de acesso da empresa.
// Usado por Login, Layout (gate) e SelectCompany para decidir
// para onde o usuário vai antes de renderizar o app.
export type CompanyStatusVerdict =
  | 'active'
  | 'blocked'
  | 'inactive'
  | 'suspended'
  | 'unknown';

export interface CompanyStatusResult {
  empresaUid: string;
  status: CompanyStatusVerdict;
  nome: string | null;
}

const CACHE_KEY = 'gbp_empresa_status_cache';
// Cache curto: evita query a cada reload sem comprometer o bloqueio
const CACHE_TTL_MS = 3 * 60 * 1000;
// Fail-open: se o Supabase não responder neste prazo, libera o app
const QUERY_TIMEOUT_MS = 5000;

interface CacheEntry {
  uid: string;
  status: CompanyStatusVerdict;
  nome: string | null;
  checkedAt: number;
}

// Função pura: aplica a regra de negócio sobre a linha de gbp_empresas
export function resolveEmpresaStatus(empresa: {
  ativa?: boolean | null;
  status?: string | null;
  data_expiracao?: string | null;
}): CompanyStatusVerdict {
  if (empresa.ativa === false || empresa.status === 'inactive') return 'inactive';
  if (empresa.status === 'suspended') return 'suspended';

  const expirada =
    !!empresa.data_expiracao &&
    new Date(empresa.data_expiracao).getTime() < Date.now();
  if (empresa.status === 'blocked' || expirada) return 'blocked';

  return 'active';
}

export function getCachedCompanyStatus(
  empresaUid: string
): CompanyStatusResult | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (entry.uid !== empresaUid) return null;
    if (Date.now() - entry.checkedAt > CACHE_TTL_MS) return null;
    return { empresaUid, status: entry.status, nome: entry.nome };
  } catch {
    return null;
  }
}

export function setCachedCompanyStatus(result: CompanyStatusResult): void {
  try {
    const entry: CacheEntry = {
      uid: result.empresaUid,
      status: result.status,
      nome: result.nome,
      checkedAt: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Storage indisponível — segue sem cache
  }
}

export function clearCompanyStatusCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

// Consulta o status da empresa com timeout fail-open.
// Em erro/rede lenta retorna 'unknown' — o chamador decide liberar o acesso.
export async function checkCompanyStatus(
  empresaUid: string
): Promise<CompanyStatusResult> {
  try {
    const query = Promise.resolve(
      supabaseClient
        .from('gbp_empresas')
        .select('status, nome, data_expiracao, ativa')
        .eq('uid', empresaUid)
        .single()
    );
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('status-timeout')), QUERY_TIMEOUT_MS)
    );

    const { data, error } = (await Promise.race([query, timeout])) as any;
    if (error || !data) {
      return { empresaUid, status: 'unknown', nome: null };
    }

    const result: CompanyStatusResult = {
      empresaUid,
      status: resolveEmpresaStatus(data),
      nome: data.nome ?? null,
    };
    setCachedCompanyStatus(result);
    return result;
  } catch {
    return { empresaUid, status: 'unknown', nome: null };
  }
}
