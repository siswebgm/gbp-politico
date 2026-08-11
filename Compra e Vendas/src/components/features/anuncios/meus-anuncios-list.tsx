"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect, useRef } from "react";
import {
  Pencil,
  Pause,
  Play,
  CheckCircle,
  Trash2,
  Eye,
  AlertCircle,
  MoreVertical,
} from "lucide-react";

import type { MyProduct } from "@/lib/services/anuncios";
import { formatPrice, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  pauseProductAction,
  reactivateProductAction,
  markAsSoldAction,
  deleteProductAction,
} from "@/lib/actions/anuncios";

interface MeusAnunciosListProps {
  produtos: MyProduct[];
}

const statusConfig = {
  ativo: { label: "Ativo", color: "bg-green-100 text-green-700" },
  pausado: { label: "Pausado", color: "bg-amber-100 text-amber-700" },
  vendido: { label: "Vendido", color: "bg-blue-100 text-blue-700" },
  removido: { label: "Removido", color: "bg-red-100 text-red-700" },
};

export function MeusAnunciosList({ produtos }: MeusAnunciosListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (produtos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border bg-muted/30 py-16 text-center">
        <AlertCircle className="mb-3 size-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Nenhum anúncio</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Você ainda não publicou nenhum anúncio.
        </p>
        <a
          href="/anuncios/novo"
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Criar anúncio
        </a>
      </div>
    );
  }

  function runAction(action: () => Promise<{ success: boolean }>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {produtos.map((product) => (
        <MeusAnunciosCard
          key={product.id}
          product={product}
          isPending={isPending}
          onPause={() => runAction(() => pauseProductAction(product.id))}
          onReactivate={() => runAction(() => reactivateProductAction(product.id))}
          onMarkSold={() => runAction(() => markAsSoldAction(product.id))}
          onDelete={() => {
            if (!window.confirm("Tem certeza que deseja excluir este anúncio?")) return;
            runAction(() => deleteProductAction(product.id));
          }}
        />
      ))}
    </div>
  );
}

interface MeusAnunciosCardProps {
  product: MyProduct;
  isPending: boolean;
  onPause: () => void;
  onReactivate: () => void;
  onMarkSold: () => void;
  onDelete: () => void;
}

function MeusAnunciosCard({
  product,
  isPending,
  onPause,
  onReactivate,
  onMarkSold,
  onDelete,
}: MeusAnunciosCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const status = statusConfig[product.situacao];

  useEffect(() => {
    if (!menuOpen) return;

    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  function handleAction(fn: () => void) {
    setMenuOpen(false);
    fn();
  }

  return (
    <div
      className={cn(
        "group flex flex-row overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all",
        isPending && "opacity-60"
      )}
    >
      <Link
        href={`/produtos/${product.slug}`}
        className="relative aspect-square w-32 shrink-0 overflow-hidden bg-slate-100 sm:w-36"
      >
        {product.capa_url ? (
          <Image
            src={product.capa_url}
            alt={product.titulo}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="128px"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
            Sem imagem
          </div>
        )}
        <div className="absolute left-2 top-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
              status.color
            )}
          >
            {status.label}
          </span>
        </div>
      </Link>

      <div className="relative flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/produtos/${product.slug}`}
            className="text-sm font-semibold leading-tight text-foreground hover:text-primary sm:text-base"
          >
            {product.titulo}
          </Link>

          <div ref={menuRef} className="relative shrink-0">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              disabled={isPending}
              type="button"
              className="flex size-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-foreground"
              aria-label="Ações"
              title="Ações"
            >
              <MoreVertical className="size-5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-slate-100 bg-white p-1 shadow-lg">
                <Link
                  href={`/anuncios/editar/${product.id}`}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  onClick={() => setMenuOpen(false)}
                >
                  <Pencil className="size-4" />
                  Editar
                </Link>

                {product.situacao === "ativo" ? (
                  <button
                    onClick={() => handleAction(onPause)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <Pause className="size-4" />
                    Pausar
                  </button>
                ) : product.situacao === "pausado" ? (
                  <button
                    onClick={() => handleAction(onReactivate)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <Play className="size-4" />
                    Retomar
                  </button>
                ) : (
                  <span className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400">
                    <Pause className="size-4" />
                    Pausar
                  </span>
                )}

                {product.situacao !== "vendido" && product.situacao !== "removido" ? (
                  <button
                    onClick={() => handleAction(onMarkSold)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <CheckCircle className="size-4" />
                    Marcar vendido
                  </button>
                ) : (
                  <span className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400">
                    <CheckCircle className="size-4" />
                    Marcar vendido
                  </span>
                )}

                <button
                  onClick={() => handleAction(onDelete)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <Trash2 className="size-4" />
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>

        <p
          className={cn(
            "mt-1 text-base font-bold",
            product.preco === 0 ? "text-green-600" : "text-slate-900"
          )}
        >
          {formatPrice(product.preco)}
        </p>

        <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-muted-foreground sm:pt-3">
          <span className="flex items-center gap-1">
            <Eye className="size-3.5" />
            {product.visualizacoes}
          </span>
          <span>{formatRelativeDate(product.criado_em)}</span>
        </div>
      </div>
    </div>
  );
}
