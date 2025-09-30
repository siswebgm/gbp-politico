import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log das variáveis de ambiente
console.log('Configuração do Supabase:', {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  isClientSide: typeof window !== 'undefined'
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Variáveis de ambiente do Supabase não configuradas corretamente');
}

// Criando uma única instância do cliente Supabase com configurações otimizadas
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
  storage: {
    // Configurações específicas para o storage
    // Evitar conflitos de nomes de arquivo
    fileKey: 'name',
    // Tamanho máximo de arquivo: 10MB
    fileSizeLimit: 10 * 1024 * 1024,
    // Tipos de arquivo permitidos
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
  },
  global: {
    headers: { 'x-application-name': 'gbp-politico' },
  },
  realtime: {
    timeout: 20000, // 20 segundos
    retries: 3,
  },
});

// Exportando a mesma instância para uso público
export const supabasePublicClient = supabaseClient;

// Exportar o cliente principal como default para manter compatibilidade
export default supabaseClient;