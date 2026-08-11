"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, type FormEvent } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CategoryWithChildren } from "@/lib/services/categorias";
import type { AtributoCategoria } from "@/lib/services/atributos";
import { DynamicFilters } from "./dynamic-filters";
import { cn } from "@/lib/utils";

export function ProductFiltersPanel({
  categorias,
  atributos = [],
  children,
}: {
  categorias: CategoryWithChildren[];
  atributos?: AtributoCategoria[];
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const [minPrice, setMinPrice] = useState(searchParams.get("preco_min") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("preco_max") ?? "");
  const [cidade, setCity] = useState(searchParams.get("cidade") ?? "");
  const [condominio, setCondominium] = useState(
    searchParams.get("condominio") ?? ""
  );

  const currentCategory = searchParams.get("categoria") ?? "";
  const currentCondition = searchParams.get("condicao") ?? "";
  const negociavel = searchParams.get("negociavel") === "true";
  const acceptsTrade = searchParams.get("troca") === "true";

  // Estado para filtros dinâmicos
  const [atributosValores, setAtributosValores] = useState<Record<string, string>>({});

  // Carrega valores dos atributos da URL
  useEffect(() => {
    const valores: Record<string, string> = {};
    atributos.forEach((attr) => {
      const valor = searchParams.get(`attr_${attr.chave}`);
      if (valor) {
        valores[attr.id] = valor;
      }
    });
    setAtributosValores(valores);
  }, [searchParams, atributos]);

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("pagina");
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleApplyPriceRange(event: FormEvent) {
    event.preventDefault();
    updateParams((params) => {
      if (minPrice) params.set("preco_min", minPrice);
      else params.delete("preco_min");
      if (maxPrice) params.set("preco_max", maxPrice);
      else params.delete("preco_max");
    });
  }

  function handleApplyLocation(event: FormEvent) {
    event.preventDefault();
    updateParams((params) => {
      if (cidade) params.set("cidade", cidade);
      else params.delete("cidade");
      if (condominio) params.set("condominio", condominio);
      else params.delete("condominio");
    });
  }

  function toggleCondition(value: string) {
    updateParams((params) => {
      if (currentCondition === value) params.delete("condicao");
      else params.set("condicao", value);
    });
  }

  function toggleBoolean(chave: string, isActive: boolean) {
    updateParams((params) => {
      if (isActive) params.delete(chave);
      else params.set(chave, "true");
    });
  }

  function handleDynamicFiltersChange(valores: Record<string, string>) {
    updateParams((params) => {
      // Remove todos os atributos antigos
      atributos.forEach((attr) => {
        params.delete(`attr_${attr.chave}`);
      });

      // Adiciona novos valores
      Object.entries(valores).forEach(([atributoId, valor]) => {
        const atributo = atributos.find((a) => a.id === atributoId);
        if (atributo && valor) {
          params.set(`attr_${atributo.chave}`, valor);
        }
      });
    });
  }

  function clearAll() {
    router.push(pathname);
  }

  const conteudo = (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="text-base font-semibold">Filtros</h3>
        <button
          onClick={clearAll}
          className="text-xs font-medium text-primary hover:underline"
        >
          Limpar tudo
        </button>
      </div>

      <form onSubmit={handleApplyPriceRange} className="space-y-3">
        <h4 className="text-sm font-semibold">Preço</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Label htmlFor="price-min" className="mb-1 text-xs text-muted-foreground">Mínimo</Label>
              <Input
                id="price-min"
                type="number"
                min={0}
                placeholder="R$ 0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="price-max" className="mb-1 text-xs text-muted-foreground">Máximo</Label>
              <Input
                id="price-max"
                type="number"
                min={0}
                placeholder="R$ 0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <Button type="submit" size="sm" className="w-full">
            Aplicar preço
          </Button>
        </div>
      </form>

      <form onSubmit={handleApplyLocation} className="space-y-3">
        <h4 className="text-sm font-semibold">Localização</h4>
        <div className="space-y-2">
          <div>
            <Label htmlFor="filter-city" className="mb-1 text-xs text-muted-foreground">Cidade</Label>
            <Input
              id="filter-city"
              placeholder="Ex: São Paulo"
              value={cidade}
              onChange={(e) => setCity(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label htmlFor="filter-condominium" className="mb-1 text-xs text-muted-foreground">Condomínio</Label>
            <Input
              id="filter-condominium"
              placeholder="Nome do condomínio"
              value={condominio}
              onChange={(e) => setCondominium(e.target.value)}
              className="h-9"
            />
          </div>
          <Button type="submit" size="sm" className="w-full">
            Aplicar localização
          </Button>
        </div>
      </form>

      <div>
        <h4 className="mb-3 text-sm font-semibold">Estado do produto</h4>
        <div className="flex gap-2">
          <button
            onClick={() => toggleCondition("novo")}
            className={cn(
              "flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
              currentCondition === "novo"
                ? "border-foreground bg-foreground text-background"
                : "border-input hover:border-foreground/50 hover:bg-accent"
            )}
          >
            Novo
          </button>
          <button
            onClick={() => toggleCondition("usado")}
            className={cn(
              "flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
              currentCondition === "usado"
                ? "border-foreground bg-foreground text-background"
                : "border-input hover:border-foreground/50 hover:bg-accent"
            )}
          >
            Usado
          </button>
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-sm font-semibold">Opções</h4>
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={negociavel}
              onChange={() => toggleBoolean("negociavel", negociavel)}
              className="size-4 rounded border-input cursor-pointer"
            />
            <span>Aceita negociação</span>
          </label>
          <label className="flex items-center gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={acceptsTrade}
              onChange={() => toggleBoolean("troca", acceptsTrade)}
              className="size-4 rounded border-input cursor-pointer"
            />
            <span>Aceita troca</span>
          </label>
        </div>
      </div>

      {/* Filtros dinâmicos por categoria */}
      {atributos.length > 0 && (
        <DynamicFilters
          atributos={atributos}
          valores={atributosValores}
          onChange={handleDynamicFiltersChange}
        />
      )}
    </div>
  );

  return (
    <>
      <div className="hidden w-64 shrink-0 lg:block">{conteudo}</div>

      <button
        data-filter-button
        className="hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir filtros"
      />

      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative ml-auto flex h-full w-full max-w-sm flex-col bg-background shadow-xl">
            <div className="flex items-center justify-between border-b bg-background px-4 py-3 sticky top-0 z-10">
              <h3 className="text-base font-semibold">Filtros</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={clearAll}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Limpar
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1 hover:bg-muted"
                  aria-label="Fechar filtros"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-6">
                {/* Preço */}
                <form onSubmit={handleApplyPriceRange} className="space-y-3">
                  <h4 className="text-sm font-semibold">Preço</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="price-min-mobile" className="mb-1 text-xs text-muted-foreground">Mínimo</Label>
                      <Input
                        id="price-min-mobile"
                        type="number"
                        min={0}
                        placeholder="R$ 0"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="price-max-mobile" className="mb-1 text-xs text-muted-foreground">Máximo</Label>
                      <Input
                        id="price-max-mobile"
                        type="number"
                        min={0}
                        placeholder="R$ 0"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="h-10"
                      />
                    </div>
                  </div>
                  <Button type="submit" size="sm" className="w-full">
                    Aplicar preço
                  </Button>
                </form>

                {/* Localização */}
                <form onSubmit={handleApplyLocation} className="space-y-3">
                  <h4 className="text-sm font-semibold">Localização</h4>
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="filter-city-mobile" className="mb-1 text-xs text-muted-foreground">Cidade</Label>
                      <Input
                        id="filter-city-mobile"
                        placeholder="Ex: São Paulo"
                        value={cidade}
                        onChange={(e) => setCity(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="filter-condominium-mobile" className="mb-1 text-xs text-muted-foreground">Condomínio</Label>
                      <Input
                        id="filter-condominium-mobile"
                        placeholder="Nome do condomínio"
                        value={condominio}
                        onChange={(e) => setCondominium(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <Button type="submit" size="sm" className="w-full">
                      Aplicar localização
                    </Button>
                  </div>
                </form>

                {/* Estado do produto */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold">Estado do produto</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => toggleCondition("novo")}
                      className={cn(
                        "rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                        currentCondition === "novo"
                          ? "border-foreground bg-foreground text-background"
                          : "border-input hover:border-foreground/50 hover:bg-accent"
                      )}
                    >
                      Novo
                    </button>
                    <button
                      onClick={() => toggleCondition("usado")}
                      className={cn(
                        "rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                        currentCondition === "usado"
                          ? "border-foreground bg-foreground text-background"
                          : "border-input hover:border-foreground/50 hover:bg-accent"
                      )}
                    >
                      Usado
                    </button>
                  </div>
                </div>

                {/* Opções */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold">Opções</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 rounded-lg border border-input p-3 cursor-pointer hover:bg-accent transition-colors">
                      <input
                        type="checkbox"
                        checked={negociavel}
                        onChange={() => toggleBoolean("negociavel", negociavel)}
                        className="size-4 rounded border-input cursor-pointer"
                      />
                      <span className="text-sm">Aceita negociação</span>
                    </label>
                    <label className="flex items-center gap-3 rounded-lg border border-input p-3 cursor-pointer hover:bg-accent transition-colors">
                      <input
                        type="checkbox"
                        checked={acceptsTrade}
                        onChange={() => toggleBoolean("troca", acceptsTrade)}
                        className="size-4 rounded border-input cursor-pointer"
                      />
                      <span className="text-sm">Aceita troca</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
