"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, CheckCircle2 } from "lucide-react";

import { signUpAction, type ActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, FormFieldError } from "@/components/ui/form-mensagem";

const initialState: ActionState = { success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      Criar conta
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(signUpAction, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="size-12 text-green-600" />
        <p className="font-medium">{state.message}</p>
        <Button asChild variant="outline" className="mt-2">
          <Link href="/login">Ir para o login</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.message} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="nome">Nome completo</Label>
          <Input id="nome" name="nome" autoComplete="nome" placeholder="Seu nome" />
          <FormFieldError message={state.fieldErrors?.nome?.[0]} />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
          />
          <FormFieldError message={state.fieldErrors?.email?.[0]} />
        </div>

        <div>
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
          />
          <FormFieldError message={state.fieldErrors?.password?.[0]} />
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirmar senha</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
          />
          <FormFieldError message={state.fieldErrors?.confirmPassword?.[0]} />
        </div>

        <div>
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            name="telefone"
            type="tel"
            autoComplete="tel"
            placeholder="(11) 99999-9999"
          />
          <FormFieldError message={state.fieldErrors?.telefone?.[0]} />
        </div>

        <div>
          <Label htmlFor="condominio">Condomínio (opcional)</Label>
          <Input id="condominio" name="condominio" placeholder="Nome do condomínio" />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="endereco">Endereço (opcional)</Label>
          <Input id="endereco" name="endereco" placeholder="Rua, número" />
        </div>

        <div>
          <Label htmlFor="cidade">Cidade</Label>
          <Input id="cidade" name="cidade" placeholder="Sua cidade" />
          <FormFieldError message={state.fieldErrors?.cidade?.[0]} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="estado">Estado</Label>
            <Input id="estado" name="estado" maxLength={2} placeholder="SP" />
            <FormFieldError message={state.fieldErrors?.estado?.[0]} />
          </div>
          <div>
            <Label htmlFor="cep">CEP</Label>
            <Input id="cep" name="cep" placeholder="00000-000" />
            <FormFieldError message={state.fieldErrors?.cep?.[0]} />
          </div>
        </div>
      </div>

      <SubmitButton />

      <p className="text-center text-sm text-muted-foreground">
        Já tem uma conta?{" "}
        <Link href="/login" className="font-medium text-foreground underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
