import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';

interface MediaFile {
  file: File;
  type: 'image' | 'video' | 'audio' | 'pdf';
  previewUrl: string;
}

interface MediaUploaderProps {
  mediaFiles: MediaFile[];
  onRemoveMedia: (index: number) => void;
}

export function MediaUploader({ mediaFiles, onRemoveMedia }: MediaUploaderProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
      {mediaFiles.map((media, index) => (
        <div key={index} className="relative group">
          {media.type === 'image' && (
            <img
              src={media.previewUrl}
              alt={`Preview ${index + 1}`}
              className="w-full h-32 object-cover rounded-lg"
            />
          )}
          {media.type === 'video' && (
            <video
              src={media.previewUrl}
              className="w-full h-32 object-cover rounded-lg"
              controls
            />
          )}
          {media.type === 'audio' && (
            <audio
              src={media.previewUrl}
              className="w-full h-32"
              controls
            />
          )}
          {media.type === 'pdf' && (
            <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <span className="text-sm text-gray-500">{media.file.name}</span>
            </div>
          )}
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onRemoveMedia(index)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
