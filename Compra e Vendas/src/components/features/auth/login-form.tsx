"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { signInAction, type ActionState } from "@/lib/actions/auth";
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
      Entrar
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.message} />

      <div>
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
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <Link
            href="/esqueci-senha"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Esqueceu a senha?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
        />
        <FormFieldError message={state.fieldErrors?.password?.[0]} />
      </div>

      <SubmitButton />

      <p className="text-center text-sm text-muted-foreground">
        Não tem uma conta?{" "}
        <Link href="/cadastro" className="font-medium text-foreground underline">
          Cadastre-se
        </Link>
      </p>
    </form>
  );
}
