import React, { useMemo, useRef, useState } from 'react';
import { X, Eye } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from './use-toast';

interface FileUploadProps {
  value?: File[];
  onChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number;
  className?: string;
}

export function FileUpload({
  value = [],
  onChange,
  accept = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg',
  multiple = true,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  className,
}: FileUploadProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useMemo(() => `file-upload-${Math.random().toString(36).slice(2)}`, []);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const newFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast({
          title: "Arquivo muito grande",
          description: `O tamanho máximo é ${maxSize / (1024 * 1024)}MB`,
          variant: "error",
        });
        return false;
      }
      return true;
    });

    if (multiple) {
      const combinedFiles = [...value, ...newFiles];
      if (combinedFiles.length > maxFiles) {
        toast({
          title: "Limite de arquivos excedido",
          description: `Você só pode selecionar até ${maxFiles} arquivos`,
          variant: "warning",
        });
        return;
      }
      onChange(combinedFiles);
    } else {
      onChange(newFiles);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const removeFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFiles = value.filter((_, i) => i !== index);
    onChange(newFiles);
  };

  const viewFile = (file: File, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
  };

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-2 text-center transition-all',
        'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900',
        isDragging && 'border-blue-500 bg-blue-50 dark:bg-blue-900',
        className
      )}
      role="button"
      tabIndex={0}
      onClick={openFilePicker}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openFilePicker();
        }
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleFileInput}
      />

      <div className="space-y-2">
        <div className="flex flex-col items-center justify-center gap-2">
          <p className="text-sm text-gray-500">
            Arraste ou clique para selecionar
          </p>
          <p className="text-xs text-gray-400">
            {multiple ? `Máximo ${maxFiles} arquivos` : 'Apenas 1 arquivo'}
            {maxSize && ` | Máximo ${maxSize / (1024 * 1024)}MB por arquivo`}
          </p>
        </div>

        {value.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-sm font-medium text-gray-900">Arquivos selecionados:</p>
            <div className="space-y-1">
              {value.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-1.5 bg-gray-100 dark:bg-gray-800 rounded-md"
                >
                  <button
                    type="button"
                    onClick={(e) => viewFile(file, e)}
                    className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 text-left hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Clique para visualizar o arquivo"
                  >
                    {file.name}
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {Math.round(file.size / 1024)}KB
                    </span>
                    <button
                      type="button"
                      onClick={(e) => viewFile(file, e)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      title="Visualizar arquivo"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => removeFile(index, e)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title="Remover arquivo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
