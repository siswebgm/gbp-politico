import React, { useState } from 'react';
import { Button } from './button';
import { FilePlus } from 'lucide-react';
import { cn } from '../../lib/utils';

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
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const newFiles = files.filter(file => {
      if (file.size > maxSize) {
        alert(`Arquivo muito grande. O tamanho máximo é ${maxSize / (1024 * 1024)}MB`);
        return false;
      }
      return true;
    });

    if (multiple) {
      const combinedFiles = [...value, ...newFiles];
      if (combinedFiles.length > maxFiles) {
        alert(`Você só pode selecionar até ${maxFiles} arquivos`);
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

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all',
        'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900',
        isDragging && 'border-blue-500 bg-blue-50 dark:bg-blue-900',
        className
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleFileInput}
      />

      <div className="space-y-2">
        <div className="flex flex-col items-center justify-center gap-4">
          <FilePlus className="h-6 w-6 text-gray-400" />
          <p className="text-sm text-gray-500">
            Arraste e solte os arquivos aqui ou clique para selecionar
          </p>
          <p className="text-xs text-gray-400">
            {multiple ? `Máximo ${maxFiles} arquivos` : 'Apenas 1 arquivo'}
            {maxSize && ` | Máximo ${maxSize / (1024 * 1024)}MB por arquivo`}
          </p>
        </div>

        {value.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-900">Arquivos selecionados:</p>
            <div className="space-y-1">
              {value.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded-md"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {file.name}
                  </span>
                  <span className="text-sm text-gray-500">
                    {Math.round(file.size / 1024)}KB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
