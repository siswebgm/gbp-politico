import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Nota: as tabelas reais vivem no schema "marketplace", mas o PostgREST
// desta instância self-hosted só expõe o schema "public". Por isso usamos
// views-ponte em "public" (ver sql/07_public_bridge.sql) e o client aqui
// aponta para o schema padrão (public).
export function createClient() {
  return createBrowserClient<Database, "public">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
