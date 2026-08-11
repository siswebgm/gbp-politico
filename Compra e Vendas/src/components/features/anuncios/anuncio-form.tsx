"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import type { ProductActionState } from "@/lib/actions/anuncios";
import type { CategoryWithChildren } from "@/lib/services/categorias";
import type { Tables } from "@/lib/supabase/database.types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, FormFieldError } from "@/components/ui/form-mensagem";
import { ImageUploader, type UploadedImage } from "@/components/features/anuncios/image-uploader";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button 
      type="submit" 
      disabled={pending} 
      size="lg"
      className="w-full sm:w-auto sm:min-w-[200px]"
    >
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}

export function ProductForm({
  action,
  categorias,
  userId,
  product,
  existingImages = [],
  submitLabel = "Publicar anúncio",
}: {
  action: (
    state: ProductActionState,
    formData: FormData
  ) => Promise<ProductActionState>;
  categorias: CategoryWithChildren[];
  userId: string;
  product?: Tables<"anuncios">;
  existingImages?: UploadedImage[];
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, { success: false });
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    product?.categoria_id ?? ""
  );

  const selectedCategory = categorias.find((c) => c.id === selectedCategoryId);

  return (
    <form action={formAction} className="space-y-8">
      <FormError message={state.message} />

      {/* Informações Básicas */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Informações Básicas</h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-sm font-medium">Título do anúncio</Label>
            <Input
              id="title"
              name="titulo"
              defaultValue={product?.titulo}
              placeholder="Ex: iPhone 13 128GB seminovo"
              className="mt-1.5"
            />
            <FormFieldError message={state.fieldErrors?.titulo?.[0]} />
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium">Descrição</Label>
            <textarea
              id="description"
              name="descricao"
              rows={5}
              defaultValue={product?.descricao ?? ""}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Detalhe o estado do produto, motivo da venda, etc."
            />
            <FormFieldError message={state.fieldErrors?.descricao?.[0]} />
          </div>
        </div>
      </div>

      {/* Preço e Quantidade */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Preço e Quantidade</h3>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="price" className="text-sm font-medium">Preço (R$)</Label>
            <Input
              id="price"
              name="preco"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.preco}
              placeholder="0,00"
              className="mt-1.5"
            />
            <FormFieldError message={state.fieldErrors?.preco?.[0]} />
          </div>

          <div>
            <Label htmlFor="quantity" className="text-sm font-medium">Quantidade</Label>
            <Input
              id="quantity"
              name="quantidade"
              type="number"
              min="1"
              defaultValue={product?.quantidade ?? 1}
              className="mt-1.5"
            />
            <FormFieldError message={state.fieldErrors?.quantidade?.[0]} />
          </div>
        </div>
      </div>

      {/* Categoria e Detalhes */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Categoria e Detalhes</h3>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="categoryId" className="text-sm font-medium">Categoria</Label>
            <select
              id="categoryId"
              name="categoryId"
              defaultValue={product?.categoria_id ?? ""}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Selecione...</option>
              {categorias.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nome}
                </option>
              ))}
            </select>
            <FormFieldError message={state.fieldErrors?.categoryId?.[0]} />
          </div>

          <div>
            <Label htmlFor="subcategoryId" className="text-sm font-medium">Subcategoria</Label>
            <select
              id="subcategoryId"
              name="subcategoryId"
              defaultValue={product?.subcategoria_id ?? ""}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!selectedCategory?.subcategorias.length}
            >
              <option value="">Nenhuma</option>
              {selectedCategory?.subcategorias.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="condition" className="text-sm font-medium">Condição</Label>
            <select
              id="condition"
              name="condicao"
              defaultValue={product?.condicao ?? "usado"}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="novo">Novo</option>
              <option value="usado">Usado</option>
            </select>
            <FormFieldError message={state.fieldErrors?.condicao?.[0]} />
          </div>

          <div>
            <Label htmlFor="city" className="text-sm font-medium">Cidade</Label>
            <Input id="city" name="cidade" defaultValue={product?.cidade ?? ""} className="mt-1.5" />
            <FormFieldError message={state.fieldErrors?.cidade?.[0]} />
          </div>
        </div>
      </div>

      {/* Localização */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Localização</h3>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="condominium" className="text-sm font-medium">Condomínio (opcional)</Label>
            <Input
              id="condominium"
              name="condominio"
              defaultValue={product?.condominio ?? ""}
              className="mt-1.5"
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="address" className="text-sm font-medium">Endereço aproximado (opcional)</Label>
            <Input id="address" name="endereco" defaultValue={product?.endereco ?? ""} className="mt-1.5" />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="videoUrl" className="text-sm font-medium">Link de vídeo (opcional)</Label>
            <Input
              id="videoUrl"
              name="videoUrl"
              placeholder="https://..."
              defaultValue={product?.video_url ?? ""}
              className="mt-1.5"
            />
            <FormFieldError message={state.fieldErrors?.videoUrl?.[0]} />
          </div>
        </div>
      </div>

      {/* Opções de Negociação */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Opções de Negociação</h3>
        
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input
              type="checkbox"
              name="negociavel"
              defaultChecked={product?.negociavel}
              className="size-4 rounded border-input accent-primary"
            />
            Aceita negociação
          </label>
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input
              type="checkbox"
              name="aceita_troca"
              defaultChecked={product?.aceita_troca}
              className="size-4 rounded border-input accent-primary"
            />
            Aceita troca
          </label>
        </div>
      </div>

      {/* Fotos */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Fotos do Produto</h3>
        <ImageUploader userId={userId} initialImages={existingImages} />
      </div>

      <div className="flex justify-end">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
