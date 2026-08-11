import { RegisterForm } from "@/components/features/auth/register-form";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cadastro",
  description: "Crie sua conta",
};

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Criar conta</h1>
        <p className="text-muted-foreground">
          Preencha os dados abaixo para criar sua conta
        </p>
      </div>

      <RegisterForm />

      <p className="text-center text-sm text-muted-foreground">
        Já tem uma conta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Faça login
        </Link>
      </p>
    </div>
  );
}
