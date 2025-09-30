```tsx
import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { documentService } from '../../../services/documents';
import type { DocumentMessage } from '../../../types/document';

interface DocumentChatProps {
  documentId: number;
  messages: DocumentMessage[];
  onNewMessage?: () => void;
}

export function DocumentChat({ documentId, messages, onNewMessage }: DocumentChatProps) {
  const { user } = useAuthStore();
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.id) return;

    setIsSubmitting(true);
    try {
      await documentService.addMessage(documentId, Number(user.id), newMessage);
      setNewMessage('');
      onNewMessage?.();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.usuario_id === Number(user?.id) ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.usuario_id === Number(user?.id)
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              <p className="text-sm">{message.mensagem}</p>
              <span className="text-xs opacity-75">
                {new Date(message.created_at).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t dark:border-gray-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Digite sua mensagem..."
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting || !newMessage.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
```