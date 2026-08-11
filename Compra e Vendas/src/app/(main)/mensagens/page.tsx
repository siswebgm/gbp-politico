import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/services/usuarios";
import { getConversations } from "@/lib/services/mensagens";
import { ConversationList } from "@/components/features/mensagens/conversation-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mensagens",
  description: "Suas conversas",
};

export default async function MensagensPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/mensagens");
  }

  const conversations = await getConversations();

  return (
    <div className="container px-4 py-8 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Mensagens</h1>
        <p className="mt-2 text-muted-foreground">
          {conversations.length} conversa{conversations.length !== 1 ? "s" : ""}
        </p>
      </div>

      <ConversationList conversations={conversations} />
    </div>
  );
}
