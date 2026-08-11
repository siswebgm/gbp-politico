import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { getCurrentUser as getSessionUser } from "@/lib/auth/session";
import type { ProductPublic } from "@/lib/services/anuncios";

export type CurrentUser = Tables<"usuarios">;

export async function getCurrentUser(): Promise<CurrentUser | null> {
  return await getSessionUser();
}

export async function getUserBySlug(_slug: string): Promise<CurrentUser | null> {
  return null;
}

export async function getUserProducts(_slug: string): Promise<ProductPublic[]> {
  return [];
}
