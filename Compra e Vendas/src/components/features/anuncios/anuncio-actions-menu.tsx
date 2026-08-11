"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  MoreVertical,
  Pencil,
  Pause,
  Play,
  Copy,
  RefreshCw,
  Trash2,
  CheckCircle,
} from "lucide-react";

import {
  pauseProductAction,
  reactivateProductAction,
  duplicateProductAction,
  renewProductAction,
  deleteProductAction,
  markAsSoldAction,
} from "@/lib/actions/anuncios";
import type { MyProduct } from "@/lib/services/anuncios";

export function ProductActionsMenu({ product }: { product: MyProduct }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ success: boolean }>) {
    setOpen(false);
    startTransition(async () => {
      await action();
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex size-8 items-center justify-center rounded-md hover:bg-accent"
        aria-label="Mais ações"
        disabled={isPending}
      >
        <MoreVertical className="size-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-52 rounded-md border bg-popover p-1 shadow-md">
            <Link
              href={`/anuncios/${product.id}/editar`}
              className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
            >
              <Pencil className="size-4" />
              Editar
            </Link>

            {product.situacao === "ativo" && (
              <MenuButton
                icon={<Pause className="size-4" />}
                label="Pausar"
                onClick={() => run(() => pauseProductAction(product.id))}
              />
            )}

            {product.situacao === "pausado" && (
              <MenuButton
                icon={<Play className="size-4" />}
                label="Reativar"
                onClick={() => run(() => reactivateProductAction(product.id))}
              />
            )}

            {product.situacao !== "vendido" && (
              <MenuButton
                icon={<CheckCircle className="size-4" />}
                label="Marcar como vendido"
                onClick={() => run(() => markAsSoldAction(product.id))}
              />
            )}

            <MenuButton
              icon={<Copy className="size-4" />}
              label="Duplicar"
              onClick={() => run(() => duplicateProductAction(product.id))}
            />

            <MenuButton
              icon={<RefreshCw className="size-4" />}
              label="Renovar anúncio"
              onClick={() => run(() => renewProductAction(product.id))}
            />

            <div className="my-1 h-px bg-border" />

            <MenuButton
              icon={<Trash2 className="size-4" />}
              label="Excluir"
              destructive
              onClick={() => run(() => deleteProductAction(product.id))}
            />
          </div>
        </>
      )}
    </div>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent ${
        destructive ? "text-destructive" : ""
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
