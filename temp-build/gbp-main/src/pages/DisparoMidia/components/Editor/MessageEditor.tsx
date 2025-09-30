import React, { useState, useRef } from 'react';
import { EditorToolbar } from './EditorToolbar';
import { MediaUploader } from './MediaUploader';
import { Button } from '../../../../components/ui/button';
import { Send } from 'lucide-react';
import { useToast } from '../../../../hooks/useToast';

interface MessageEditorProps {
  onSend: (message: string, files: File[]) => Promise<void>;
}

interface MediaFile {
  file: File;
  type: 'image' | 'video' | 'audio' | 'pdf';
  previewUrl: string;
}

const MAX_FILE_SIZE = 70 * 1024 * 1024; // 70MB

export function MessageEditor({ onSend }: MessageEditorProps) {
  const [message, setMessage] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'Erro',
          description: `O arquivo ${file.name} excede o tamanho máximo permitido de 70MB`,
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const type = file.type.split('/')[0] as 'image' | 'video' | 'audio';
        const isPdf = file.type === 'application/pdf';
        
        setMediaFiles(prev => [...prev, {
          file,
          type: isPdf ? 'pdf' : type,
          previewUrl: reader.result as string,
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!message.trim() && mediaFiles.length === 0) {
      toast({
        title: 'Erro',
        description: 'Adicione uma mensagem ou arquivo para enviar',
        variant: 'destructive',
      });
      return;
    }

    try {
      await onSend(message, mediaFiles.map(m => m.file));
      setMessage('');
      setMediaFiles([]);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao enviar mensagem',
        variant: 'destructive',
      });
    }
  };

  const insertText = (before: string, after: string = '') => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    const newText = text.substring(0, start) + 
                   before + selectedText + after + 
                   text.substring(end);
    
    setMessage(newText);
    
    // Reposiciona o cursor após a inserção
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        end + before.length
      );
    }, 0);
  };

  return (
    <div className="border rounded-lg shadow-sm dark:border-gray-700">
      <EditorToolbar
        onBold={() => insertText('**', '**')}
        onItalic={() => insertText('_', '_')}
        onStrike={() => insertText('~~', '~~')}
        onCode={() => insertText('`', '`')}
        onLink={() => insertText('[', '](url)')}
        onImage={() => {
          fileInputRef.current?.click();
        }}
        onVideo={() => {
          fileInputRef.current?.click();
        }}
        onAudio={() => {
          fileInputRef.current?.click();
        }}
        onEmoji={() => insertText(':)')}
      />

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full p-4 min-h-[200px] focus:outline-none dark:bg-gray-800 dark:text-white"
        placeholder="Digite sua mensagem..."
      />

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept="image/*,video/*,audio/*,application/pdf"
        onChange={handleFileSelect}
      />

      <MediaUploader
        mediaFiles={mediaFiles}
        onRemoveMedia={handleRemoveMedia}
      />

      <div className="p-4 border-t dark:border-gray-700">
        <Button
          onClick={handleSend}
          className="w-full"
        >
          <Send className="w-4 h-4 mr-2" />
          Enviar Mensagem
        </Button>
      </div>
    </div>
  );
}
