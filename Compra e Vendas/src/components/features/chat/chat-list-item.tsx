import Image from "next/image";
import Link from "next/link";

import type { ChatRoomWithLastMessage } from "@/lib/services/chat";
import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ChatListItem({
  room,
  currentUserId,
  otherUserName,
  otherUserPhoto,
}: {
  room: ChatRoomWithLastMessage;
  currentUserId: string;
  otherUserName: string;
  otherUserPhoto: string | null;
}) {
  const isUnread =
    room.nao_lidas > 0 && room.ultima_mensagem_remetente_id !== currentUserId;

  return (
    <Link
      href={`/mensagens/${room.id}`}
      className="flex items-center gap-3 border-b p-4 hover:bg-accent"
    >
      <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-muted">
        {otherUserPhoto && (
          <Image
            src={otherUserPhoto}
            alt={otherUserName}
            fill
            className="object-cover"
            sizes="48px"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className={cn("truncate font-medium", isUnread && "font-semibold")}>
            {otherUserName}
          </p>
          {room.ultima_mensagem_criado_em && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatRelativeDate(room.ultima_mensagem_criado_em)}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{room.anuncio_titulo}</p>
        <p
          className={cn(
            "truncate text-sm",
            isUnread ? "font-medium text-foreground" : "text-muted-foreground"
          )}
        >
          {room.ultima_mensagem_conteudo ?? "Nenhuma mensagem ainda"}
        </p>
      </div>

      {isUnread && (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background">
          {room.nao_lidas}
        </span>
      )}
    </Link>
  );
}
