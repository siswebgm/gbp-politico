"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/schemas/auth";
import { siteConfig } from "@/lib/site-config";
import { createSession, destroySession } from "@/lib/auth/session";

export type ActionState = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function signInAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  
  // Usar a função autenticar_usuario() do banco de dados
  const { data, error } = await supabase.rpc('autenticar_usuario', {
    p_email: parsed.data.email,
    p_senha: parsed.data.password,
  } as any);

  if (error) {
    return {
      success: false,
      message: "Erro ao autenticar. Tente novamente.",
    };
  }

  const result = data as any[];
  if (!result || result.length === 0 || !result[0].autenticado) {
    return {
      success: false,
      message: "E-mail ou senha incorretos",
    };
  }

  // Usuário autenticado com sucesso
  const usuario = result[0] as {
    autenticado: boolean;
    usuario_uid: string;
    autenticacao_uid: string;
    email: string;
    nome: string;
    papel: string;
    email_confirmado: boolean;
  };
  
  // Criar sessão
  await createSession({
    usuario_uid: usuario.usuario_uid,
    autenticacao_uid: usuario.autenticacao_uid,
    email: usuario.email,
    nome: usuario.nome,
    papel: usuario.papel,
  });
  
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUpAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    nome: formData.get("nome"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    telefone: formData.get("telefone"),
    condominio: formData.get("condominio") || undefined,
    endereco: formData.get("endereco") || undefined,
    cidade: formData.get("cidade"),
    estado: formData.get("estado"),
    cep: formData.get("cep"),
  };

  const parsed = registerSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { nome, email, password, telefone, condominio, endereco, cidade, estado, cep } =
    parsed.data;

  const supabase = await createClient();

  console.log('[DEBUG] Tentando cadastrar usuário:', { email, nome });

  // Usar a função criar_usuario() do banco de dados
  const { data, error } = await supabase.rpc('criar_usuario', {
    p_email: email,
    p_senha: password,
    p_nome: nome,
    p_telefone: telefone,
    p_condominio: condominio,
    p_endereco: endereco,
    p_cidade: cidade,
    p_estado: estado,
    p_cep: cep,
  } as any);

  console.log('[DEBUG] Resposta do criar_usuario:', { data, error });

  if (error) {
    console.error('[DEBUG] Erro ao criar usuário:', error);
    return {
      success: false,
      message:
        error.code === '23505' // Unique violation
          ? "Este e-mail já está cadastrado"
          : error.message || "Erro ao criar usuário",
    };
  }

  const resultCadastro = data as any[];
  if (!resultCadastro || resultCadastro.length === 0) {
    return {
      success: false,
      message: "Erro ao criar usuário",
    };
  }

  console.log('[DEBUG] Usuário criado com sucesso:', data[0]);

  return {
    success: true,
    message:
      "Cadastro realizado com sucesso! Você já pode fazer login.",
  };
}

export async function signOutAction() {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function forgotPasswordAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${siteConfig.url}/auth/callback?next=/redefinir-senha`,
    }
  );

  if (error) {
    return { success: false, message: error.message };
  }

  return {
    success: true,
    message: "Se o e-mail existir, enviaremos um link de recuperação.",
  };
}

export async function resetPasswordAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  redirect("/login");
}
