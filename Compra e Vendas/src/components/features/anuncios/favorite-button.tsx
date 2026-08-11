"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Heart } from "lucide-react";

import { toggleFavoriteAction } from "@/lib/actions/favoritos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  productId,
  productSlug,
  initialFavorited,
  isAuthenticated,
  variant = "default",
  className,
}: {
  productId: string;
  productSlug: string;
  initialFavorited: boolean;
  isAuthenticated: boolean;
  variant?: "default" | "icon";
  className?: string;
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    startTransition(async () => {
      const result = await toggleFavoriteAction(productId, productSlug);
      if ("favorited" in result) {
        setFavorited(result.favorited);
      } else if (result.error === "unauthenticated") {
        router.push("/login");
      }
    });
  }

  const icon = (
    <Heart
      className={cn(
        "size-4 transition-colors",
        favorited && "fill-red-500 text-red-500"
      )}
    />
  );

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={favorited}
        aria-label={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        type="button"
        className={cn(
          "flex size-8 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-500 shadow-sm transition-all hover:border-red-200 hover:text-red-500 sm:size-9",
          favorited && "border-red-100 text-red-500",
          className
        )}
      >
        {icon}
      </button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={favorited}
      className={className}
    >
      {icon}
      {favorited ? "Favoritado" : "Favoritar"}
    </Button>
  );
}
