import { Edit2, X } from 'lucide-react';
import React, { useState } from 'react';

interface MessageTagProps {
  tag: string | null;
  onRemove: () => void;
  onEdit: (newTag: string) => void;
}

export function MessageTag({ tag, onRemove, onEdit }: MessageTagProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(tag || '');

  const handleSaveEdit = () => {
    if (editValue && editValue !== tag) {
      onEdit(editValue);
    }
    setIsEditing(false);
  };

  if (!tag) {
    return null;
  }

  return (
    <div className="bg-blue-50 text-blue-600 px-2 py-1 rounded flex items-center gap-2 text-sm">
      {isEditing ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSaveEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSaveEdit();
            }
          }}
          className="bg-white border border-blue-300 rounded px-1 w-32 focus:outline-none focus:border-blue-500"
          autoFocus
        />
      ) : (
        <>
          <span>{tag}</span>
          <div className="flex gap-1">
            <button
              className="text-blue-400 hover:text-blue-600"
              onClick={() => {
                setEditValue(tag);
                setIsEditing(true);
              }}
            >
              <Edit2 size={14} />
            </button>
            <button
              className="text-blue-400 hover:text-blue-600"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <X size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
