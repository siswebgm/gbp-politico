import React from 'react';
import { Image, Video, Mic, FileText, X } from 'lucide-react';

interface MediaFile {
  file: File;
  type: 'image' | 'video' | 'audio' | 'pdf';
  previewUrl: string;
}

interface MediaUploadProps {
  mediaFiles: MediaFile[];
  onMediaFilesChange: (files: MediaFile[]) => void;
  disabled?: boolean;
}

export function MediaUpload({ mediaFiles, onMediaFilesChange, disabled }: MediaUploadProps) {
  const handleFileSelect = async (type: MediaFile['type']) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' :
                   type === 'video' ? 'video/*' :
                   type === 'audio' ? 'audio/*' :
                   type === 'pdf' ? 'application/pdf' : '';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const previewUrl = URL.createObjectURL(file);
      const newMediaFile: MediaFile = {
        file,
        type,
        previewUrl
      };

      onMediaFilesChange([...mediaFiles, newMediaFile]);
    };

    input.click();
  };

  const removeFile = (index: number) => {
    const newFiles = [...mediaFiles];
    URL.revokeObjectURL(newFiles[index].previewUrl);
    newFiles.splice(index, 1);
    onMediaFilesChange(newFiles);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <button
          type="button"
          className="p-2 hover:bg-gray-100 rounded-lg dark:hover:bg-gray-700"
          onClick={() => handleFileSelect('image')}
          disabled={disabled}
        >
          <Image className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="p-2 hover:bg-gray-100 rounded-lg dark:hover:bg-gray-700"
          onClick={() => handleFileSelect('video')}
          disabled={disabled}
        >
          <Video className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="p-2 hover:bg-gray-100 rounded-lg dark:hover:bg-gray-700"
          onClick={() => handleFileSelect('audio')}
          disabled={disabled}
        >
          <Mic className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="p-2 hover:bg-gray-100 rounded-lg dark:hover:bg-gray-700"
          onClick={() => handleFileSelect('pdf')}
          disabled={disabled}
        >
          <FileText className="w-4 h-4" />
        </button>
      </div>

      {mediaFiles.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {mediaFiles.map((file, index) => (
            <div key={index} className="relative">
              {file.type === 'image' && (
                <img
                  src={file.previewUrl}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded-lg"
                />
              )}
              {file.type === 'video' && (
                <video
                  src={file.previewUrl}
                  className="w-full h-32 object-cover rounded-lg"
                />
              )}
              {(file.type === 'audio' || file.type === 'pdf') && (
                <div className="w-full h-32 flex items-center justify-center bg-gray-100 rounded-lg">
                  {file.type === 'audio' ? <Mic className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                </div>
              )}
              <button
                type="button"
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                onClick={() => removeFile(index)}
                disabled={disabled}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
