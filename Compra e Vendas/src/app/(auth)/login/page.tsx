import { LoginForm } from "@/components/features/auth/login-form";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Faça login na sua conta",
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Bem-vindo de volta</h1>
        <p className="text-muted-foreground">
          Entre com suas credenciais para acessar sua conta
        </p>
      </div>

      <LoginForm />

      <p className="text-center text-sm text-muted-foreground">
        Não tem uma conta?{" "}
        <Link href="/cadastro" className="font-medium text-primary hover:underline">
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}
