"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Send } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { sendMessageAction, markMessagesAsReadAction } from "@/lib/actions/chat-messages";
import type { ChatMessage } from "@/lib/services/chat";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatWindowProps {
  roomId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
  otherUser: {
    id: string;
    nome: string;
    foto_url: string | null;
  };
  product: {
    titulo: string;
    slug: string;
    imagem_url: string | null;
  };
}

export function ChatWindow({
  roomId,
  currentUserId,
  initialMessages,
  otherUser,
  product,
}: ChatWindowProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markMessagesAsReadAction(roomId);
  }, [roomId]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`chat-room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "marketplace",
          table: "mensagens",
          filter: `conversa_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });

          if (newMessage.remetente_id !== currentUserId) {
            markMessagesAsReadAction(roomId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const conteudo = input.trim();
    if (!conteudo) return;

    setInput("");

    startTransition(async () => {
      await sendMessageAction(roomId, conteudo);
    });
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center gap-3 border-b p-4">
        <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-muted">
          {otherUser.foto_url && (
            <Image
              src={otherUser.foto_url}
              alt={otherUser.nome}
              fill
              className="object-cover"
              sizes="40px"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{otherUser.nome}</p>
          <Link
            href={`/produtos/${product.slug}`}
            className="truncate text-xs text-muted-foreground hover:underline"
          >
            {product.titulo}
          </Link>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((mensagem) => {
          const isMine = mensagem.remetente_id === currentUserId;
          return (
            <div
              key={mensagem.id}
              className={cn("flex", isMine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                  isMine
                    ? "rounded-br-sm bg-foreground text-background"
                    : "rounded-bl-sm bg-muted"
                )}
              >
                <p className="whitespace-pre-line">{mensagem.conteudo}</p>
                <p
                  className={cn(
                    "mt-1 text-right text-[10px]",
                    isMine ? "text-background/70" : "text-muted-foreground"
                  )}
                >
                  {new Date(mensagem.criado_em).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite uma mensagem..."
          className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" size="icon" disabled={isPending || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
