import React from 'react';
import { Bold, Italic, Strikethrough, Code, Link, Image, Video, Mic, Smile } from 'lucide-react';
import { Button } from '../../../../components/ui/button';

interface EditorToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onStrike: () => void;
  onCode: () => void;
  onLink: () => void;
  onImage: () => void;
  onVideo: () => void;
  onAudio: () => void;
  onEmoji: () => void;
}

export function EditorToolbar({
  onBold,
  onItalic,
  onStrike,
  onCode,
  onLink,
  onImage,
  onVideo,
  onAudio,
  onEmoji,
}: EditorToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2 p-2 border-b border-gray-200 dark:border-gray-700">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBold}
        title="Negrito"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onItalic}
        title="Itálico"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onStrike}
        title="Tachado"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCode}
        title="Código"
      >
        <Code className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onLink}
        title="Link"
      >
        <Link className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onImage}
        title="Imagem"
      >
        <Image className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onVideo}
        title="Vídeo"
      >
        <Video className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onAudio}
        title="Áudio"
      >
        <Mic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onEmoji}
        title="Emoji"
      >
        <Smile className="h-4 w-4" />
      </Button>
    </div>
  );
}
