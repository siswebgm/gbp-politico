"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import type { Conversation } from "@/lib/services/mensagens";

export function ConversationList({ conversations }: { conversations: Conversation[] }) {
  if (conversations.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border-2 border-dashed bg-muted/20">
        <div className="text-center">
          <MessageSquare className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma conversa encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conversation) => (
        <Link
          key={conversation.id}
          href={`/chat/${conversation.id}`}
          className="flex items-center gap-3 rounded-xl border bg-white p-4 transition-colors hover:bg-muted/50"
        >
          <div className="size-10 rounded-full bg-muted" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{conversation.otherUser.nome}</p>
            <p className="truncate text-sm text-muted-foreground">{conversation.lastMessage}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
