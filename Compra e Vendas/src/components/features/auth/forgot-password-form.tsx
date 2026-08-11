"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, MailCheck } from "lucide-react";

import { forgotPasswordAction, type ActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFieldError } from "@/components/ui/form-mensagem";

const initialState: ActionState = { success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      Enviar link de recuperação
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <MailCheck className="size-12 text-green-600" />
        <p className="font-medium">{state.message}</p>
        <Button asChild variant="outline" className="mt-2">
          <Link href="/login">Voltar ao login</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
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

      <SubmitButton />

      <p className="text-center text-sm text-muted-foreground">
        Lembrou a senha?{" "}
        <Link href="/login" className="font-medium text-foreground underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
