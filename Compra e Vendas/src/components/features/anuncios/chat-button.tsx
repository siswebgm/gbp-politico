"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { MessageCircle, Loader2 } from "lucide-react";

import { startChatAction } from "@/lib/actions/chat";
import { Button } from "@/components/ui/button";

export function ChatButton({
  productId,
  sellerId,
  isAuthenticated,
  isOwnProduct,
}: {
  productId: string;
  sellerId: string;
  isAuthenticated: boolean;
  isOwnProduct: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (isOwnProduct) return null;

  function handleClick() {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    startTransition(async () => {
      const result = await startChatAction(productId, sellerId);
      if (result && "error" in result) {
        // startChatAction redirects on success; only errors reach here.
        console.error(result.error);
      }
    });
  }

  return (
    <Button onClick={handleClick} disabled={isPending} className="flex-1">
      {isPending ? <Loader2 className="animate-spin" /> : <MessageCircle className="size-4" />}
      Conversar com vendedor
    </Button>
  );
}
