import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://studio.gbppolitico.com';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },
  db: {
    schema: 'public'
  }
});
