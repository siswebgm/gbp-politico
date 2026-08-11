import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { getSession } from "@/lib/auth/session";

export async function createClient() {
  const cookieStore = await cookies();
  const session = await getSession();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // A chamada setAll pode falhar em Server Components.
            // Server Actions e Route Handlers conseguem definir cookies.
          }
        },
      },
      global: {
        headers: {
          "x-user-id": session?.usuario_uid ?? "",
        },
      },
    }
  );
}
