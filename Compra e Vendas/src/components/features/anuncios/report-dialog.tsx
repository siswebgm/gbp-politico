"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Flag, Loader2, X } from "lucide-react";

import { reportProductAction } from "@/lib/actions/chat";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const reasons = [
  { value: "spam", label: "Spam ou anúncio duplicado" },
  { value: "fraud", label: "Suspeita de fraude" },
  { value: "prohibited", label: "Item proibido" },
  { value: "inappropriate", label: "Conteúdo inapropriado" },
  { value: "other", label: "Outro motivo" },
];

const initialState: { success: boolean; message?: string } = { success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending && <Loader2 className="animate-spin" />}
      Enviar denúncia
    </Button>
  );
}

export function ReportDialog({
  productId,
  isAuthenticated,
}: {
  productId: string;
  isAuthenticated: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(reportProductAction, initialState);

  if (!isAuthenticated) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive"
      >
        <Flag className="size-4" />
        Denunciar anúncio
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4"
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>

            {state.success ? (
              <div className="py-4 text-center">
                <p className="font-medium">{state.message}</p>
                <Button className="mt-4" onClick={() => setOpen(false)}>
                  Fechar
                </Button>
              </div>
            ) : (
              <form action={formAction} className="space-y-4">
                <h3 className="text-lg font-semibold">Denunciar anúncio</h3>
                <input type="hidden" name="productId" value={productId} />

                <div>
                  <Label htmlFor="motivo">Motivo</Label>
                  <select
                    id="motivo"
                    name="motivo"
                    required
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {reasons.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="detalhes">Detalhes (opcional)</Label>
                  <textarea
                    id="detalhes"
                    name="detalhes"
                    rows={3}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Conte mais sobre o problema"
                  />
                </div>

                {state.message && !state.success && (
                  <p className="text-sm text-destructive">{state.message}</p>
                )}

                <SubmitButton />
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
