import React, { useRef } from 'react';
import { Bold, Italic, Strikethrough, Code, Link, Image, Video, Mic, Smile } from 'lucide-react';
import { GreetingMenu } from '../../../components/GreetingMenu';
import { MessageTag } from '../../../components/MessageTag';

interface MessageEditorProps {
  message: string;
  onMessageChange: (message: string) => void;
  selectedGreeting: string | null;
  onGreetingChange: (greeting: string | null) => void;
  showEmojis: boolean;
  onShowEmojisChange: (show: boolean) => void;
  showGreetings: boolean;
  onShowGreetingsChange: (show: boolean) => void;
  includeUserName: boolean;
  onIncludeUserNameChange: (include: boolean) => void;
}

export function MessageEditor({
  message,
  onMessageChange,
  selectedGreeting,
  onGreetingChange,
  showEmojis,
  onShowEmojisChange,
  showGreetings,
  onShowGreetingsChange,
  includeUserName,
  onIncludeUserNameChange
}: MessageEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleRemoveTag = () => {
    onGreetingChange(null);
    // Clear the greeting from the message if it exists at the start
    const lines = message.split('\n');
    if (lines[0].includes('{nome_eleitor}')) {
      // Remove the first line and any empty lines that follow
      while (lines.length > 0 && !lines[0].trim()) {
        lines.shift();
      }
      onMessageChange(lines.join('\n'));
    }
  };

  const handleEditTag = (newTag: string) => {
    onGreetingChange(newTag);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        {selectedGreeting && (
          <MessageTag
            text={selectedGreeting}
            onRemove={handleRemoveTag}
            onEdit={handleEditTag}
          />
        )}
      </div>

      <div className="flex items-center space-x-2 mb-2">
        <button
          type="button"
          className="p-2 hover:bg-gray-100 rounded-lg dark:hover:bg-gray-700"
          onClick={() => document.execCommand('bold')}
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="p-2 hover:bg-gray-100 rounded-lg dark:hover:bg-gray-700"
          onClick={() => document.execCommand('italic')}
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="p-2 hover:bg-gray-100 rounded-lg dark:hover:bg-gray-700"
          onClick={() => document.execCommand('strikethrough')}
        >
          <Strikethrough className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="p-2 hover:bg-gray-100 rounded-lg dark:hover:bg-gray-700"
          onClick={() => onShowGreetingsChange(!showGreetings)}
        >
          <Code className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="p-2 hover:bg-gray-100 rounded-lg dark:hover:bg-gray-700"
          onClick={() => onShowEmojisChange(!showEmojis)}
        >
          <Smile className="w-4 h-4" />
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        placeholder="Digite sua mensagem..."
      />

      {showGreetings && (
        <GreetingMenu
          onSelect={(greeting) => {
            onGreetingChange(greeting);
            onShowGreetingsChange(false);
          }}
          onClose={() => onShowGreetingsChange(false)}
        />
      )}

      <div className="flex items-center space-x-4">
        <input
          type="checkbox"
          checked={includeUserName}
          onChange={(e) => onIncludeUserNameChange(e.target.checked)}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Incluir nome do usuário na mensagem
        </span>
      </div>
    </div>
  );
}
