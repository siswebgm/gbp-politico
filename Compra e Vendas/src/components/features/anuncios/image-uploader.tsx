"use client";

import Image from "next/image";
import { useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { MAX_PRODUCT_IMAGES } from "@/schemas/product";

export interface UploadedImage {
  id: string;
  url: string;
}

export function ImageUploader({
  userId,
  initialImages = [],
  onExistingImageRemove,
}: {
  userId: string;
  initialImages?: UploadedImage[];
  onExistingImageRemove?: (imageId: string) => void;
}) {
  const [existing, setExisting] = useState(initialImages);
  const [newUrls, setNewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCount = existing.length + newUrls.length;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const remainingSlots = MAX_PRODUCT_IMAGES - totalCount;
    if (remainingSlots <= 0) {
      setError(`Limite de ${MAX_PRODUCT_IMAGES} imagens atingido.`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);

    const supabase = createClient();
    const uploaded: string[] = [];

    for (const file of filesToUpload) {
      const ext = file.name.split(".").pop();
      const fileName = `${userId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        setError("Falha ao enviar uma ou mais imagens.");
        continue;
      }

      const { data: publicUrl } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      uploaded.push(publicUrl.publicUrl);
    }

    setNewUrls((prev) => [...prev, ...uploaded]);
    setIsUploading(false);
  }

  function removeNewImage(url: string) {
    setNewUrls((prev) => prev.filter((u) => u !== url));
  }

  function removeExistingImage(imageId: string) {
    setExisting((prev) => prev.filter((img) => img.id !== imageId));
    onExistingImageRemove?.(imageId);
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {existing.map((img) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-md border">
            <Image src={img.url} alt="" fill className="object-cover" sizes="120px" />
            <button
              type="button"
              onClick={() => removeExistingImage(img.id)}
              className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Remover imagem"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {newUrls.map((url) => (
          <div key={url} className="group relative aspect-square overflow-hidden rounded-md border">
            <Image src={url} alt="" fill className="object-cover" sizes="120px" />
            <input type="hidden" name="imageUrls" value={url} />
            <button
              type="button"
              onClick={() => removeNewImage(url)}
              className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Remover imagem"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {totalCount < MAX_PRODUCT_IMAGES && (
          <label
            className={cn(
              "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed text-muted-foreground hover:border-foreground hover:text-foreground",
              isUploading && "pointer-events-none opacity-60"
            )}
          >
            {isUploading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <>
                <ImagePlus className="size-6" />
                <span className="text-xs">Adicionar</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
              disabled={isUploading}
            />
          </label>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {totalCount}/{MAX_PRODUCT_IMAGES} imagens · JPG, PNG ou WEBP até 8MB cada.
      </p>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
