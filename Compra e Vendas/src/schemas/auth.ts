import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Informe seu e-mail").email("E-mail inválido"),
  password: z.string().min(1, "Informe sua senha"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    email: z.string().min(1, "Informe seu e-mail").email("E-mail inválido"),
    password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres")
      .regex(/[a-z]/, "A senha deve ter ao menos uma letra minúscula")
      .regex(/[A-Z]/, "A senha deve ter ao menos uma letra maiúscula")
      .regex(/[0-9]/, "A senha deve ter ao menos um número"),
    confirmPassword: z.string().min(1, "Confirme sua senha"),
    telefone: z
      .string()
      .min(10, "Telefone inválido")
      .max(15, "Telefone inválido"),
    condominio: z.string().optional(),
    endereco: z.string().optional(),
    cidade: z.string().min(2, "Informe a cidade"),
    estado: z
      .string()
      .length(2, "Use a sigla do estado (ex: SP)")
      .transform((v) => v.toUpperCase()),
    cep: z.string().min(8, "CEP inválido").max(9, "CEP inválido"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Informe seu e-mail").email("E-mail inválido"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres")
      .regex(/[a-z]/, "A senha deve ter ao menos uma letra minúscula")
      .regex(/[A-Z]/, "A senha deve ter ao menos uma letra maiúscula")
      .regex(/[0-9]/, "A senha deve ter ao menos um número"),
    confirmPassword: z.string().min(1, "Confirme sua senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
