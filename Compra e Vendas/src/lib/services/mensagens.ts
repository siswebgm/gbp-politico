import "server-only";

export interface Conversation {
  id: string;
  otherUser: {
    id: string;
    nome: string;
    foto_url: string | null;
  };
  lastMessage: string;
  updatedAt: string;
}

export async function getConversations(): Promise<Conversation[]> {
  return [];
}
