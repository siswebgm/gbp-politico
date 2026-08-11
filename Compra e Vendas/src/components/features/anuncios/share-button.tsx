"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ShareButton({ titulo, url }: { titulo: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, url });
        return;
      } catch {
        // usuário cancelou ou não suportado; cai para o fallback de copiar
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" size="icon" onClick={handleShare} aria-label="Compartilhar">
      {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
    </Button>
  );
}
