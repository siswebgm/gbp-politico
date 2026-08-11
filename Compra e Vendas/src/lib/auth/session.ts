import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const SESSION_COOKIE_NAME = "marketplace_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

export interface SessionUser {
  usuario_uid: string;
  autenticacao_uid: string;
  email: string;
  nome: string;
  papel: string;
}

export async function createSession(user: SessionUser) {
  const cookieStore = await cookies();
  const sessionData = JSON.stringify(user);
  
  cookieStore.set(SESSION_COOKIE_NAME, sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  
  if (!sessionCookie) {
    return null;
  }
  
  try {
    const user = JSON.parse(sessionCookie.value) as SessionUser;
    return user;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  const session = await getSession();
  
  if (!session) {
    return null;
  }
  
  // Buscar dados completos do usuário no banco
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", session.usuario_uid)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data;
}
