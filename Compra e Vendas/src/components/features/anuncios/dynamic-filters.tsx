"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { AtributoCategoria } from "@/lib/services/atributos";

interface DynamicFiltersProps {
  atributos: AtributoCategoria[];
  valores: Record<string, string>;
  onChange: (valores: Record<string, string>) => void;
}

export function DynamicFilters({ atributos, valores, onChange }: DynamicFiltersProps) {
  const [localValores, setLocalValores] = useState<Record<string, string>>(valores);

  useEffect(() => {
    setLocalValores(valores);
  }, [valores]);

  const handleChange = (atributoId: string, valor: string) => {
    const novosValores = { ...localValores, [atributoId]: valor };
    setLocalValores(novosValores);
  };

  const handleApply = () => {
    onChange(localValores);
  };

  const handleClear = () => {
    setLocalValores({});
    onChange({});
  };

  if (atributos.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Filtros Específicos</h4>
        {Object.keys(localValores).length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="space-y-3">
        {atributos.map((atributo) => (
          <div key={atributo.id}>
            <Label htmlFor={`attr-${atributo.id}`} className="mb-1 text-xs text-muted-foreground">
              {atributo.nome}
              {atributo.obrigatorio && <span className="text-destructive ml-1">*</span>}
            </Label>

            {atributo.tipo === "texto" && (
              <Input
                id={`attr-${atributo.id}`}
                type="text"
                placeholder={`Digite ${atributo.nome.toLowerCase()}`}
                value={localValores[atributo.id] || ""}
                onChange={(e) => handleChange(atributo.id, e.target.value)}
                className="h-9"
              />
            )}

            {atributo.tipo === "numero" && (
              <Input
                id={`attr-${atributo.id}`}
                type="number"
                placeholder={`Digite ${atributo.nome.toLowerCase()}`}
                value={localValores[atributo.id] || ""}
                onChange={(e) => handleChange(atributo.id, e.target.value)}
                className="h-9"
              />
            )}

            {atributo.tipo === "selecao" && atributo.opcoes && (
              <select
                id={`attr-${atributo.id}`}
                value={localValores[atributo.id] || ""}
                onChange={(e) => handleChange(atributo.id, e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Selecione...</option>
                {(atributo.opcoes as string[]).map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
            )}

            {atributo.tipo === "multipla_selecao" && atributo.opcoes && (
              <div className="space-y-2">
                {(atributo.opcoes as string[]).map((opcao) => (
                  <label key={opcao} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={localValores[atributo.id]?.split(",").includes(opcao) || false}
                      onChange={(e) => {
                        const valores = localValores[atributo.id]?.split(",").filter(Boolean) || [];
                        if (e.target.checked) {
                          valores.push(opcao);
                        } else {
                          const index = valores.indexOf(opcao);
                          if (index > -1) valores.splice(index, 1);
                        }
                        handleChange(atributo.id, valores.join(","));
                      }}
                      className="size-4 rounded border-input"
                    />
                    <span>{opcao}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Button onClick={handleApply} size="sm" className="w-full">
        Aplicar filtros específicos
      </Button>
    </div>
  );
}
