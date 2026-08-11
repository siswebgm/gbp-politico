"use client";

import { useState } from "react";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { adicionarAvaliacaoAction } from "@/lib/actions/avaliacoes";
import { cn } from "@/lib/utils";

interface AvaliarVendedorProps {
  vendedorId: string;
  vendedorNome: string;
  anuncioId?: string;
  isAuthenticated: boolean;
  isOwnProduct: boolean;
  className?: string;
}

export function AvaliarVendedor({
  vendedorId,
  vendedorNome,
  anuncioId,
  isAuthenticated,
  isOwnProduct,
  className,
}: AvaliarVendedorProps) {
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [aberto, setAberto] = useState(false);

  if (!isAuthenticated || isOwnProduct) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nota < 1) {
      setMensagem("Selecione uma nota");
      return;
    }

    setLoading(true);
    setMensagem("");

    const result = await adicionarAvaliacaoAction(vendedorId, anuncioId, nota, comentario);

    if (result.success) {
      setMensagem("Avaliação enviada com sucesso!");
      setNota(0);
      setComentario("");
      setTimeout(() => setAberto(false), 1500);
    } else {
      setMensagem(result.error ?? "Erro ao enviar avaliação");
    }

    setLoading(false);
  }

  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-sm", className)}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between text-left"
        type="button"
      >
        <span className="text-sm font-semibold">Avaliar {vendedorNome}</span>
        <span className="text-xs text-muted-foreground">
          {aberto ? "Fechar" : "Abrir"}
        </span>
      </button>

      {aberto && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((estrela) => (
              <button
                key={estrela}
                type="button"
                onClick={() => setNota(estrela)}
                className="p-1 transition-transform hover:scale-110"
                aria-label={`Nota ${estrela}`}
              >
                <Star
                  className={`size-6 ${
                    estrela <= nota
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-300"
                  }`}
                />
              </button>
            ))}
          </div>

          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Conte como foi a negociação (opcional)"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Enviar avaliação"}
          </Button>

          {mensagem && (
            <p
              className={`text-center text-xs ${
                mensagem.includes("sucesso") ? "text-green-600" : "text-red-500"
              }`}
            >
              {mensagem}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
