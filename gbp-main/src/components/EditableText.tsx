import React, { useState, useEffect } from 'react';
import { useEditMode } from '../contexts/EditModeContext';

interface EditableTextProps {
  value: string;
  onChange: (newValue: string) => void;
  className?: string;
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'div';
  placeholder?: string;
}

const EditableText: React.FC<EditableTextProps> = ({
  value,
  onChange,
  className = '',
  as: Tag = 'div',
  placeholder = 'Digite o texto...',
}) => {
  const { isEditMode } = useEditMode();
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(value);

  useEffect(() => {
    setEditedValue(value);
  }, [value]);

  const handleSave = () => {
    console.log('Salvando alterações:', { 
      oldValue: value, 
      newValue: editedValue,
      isEditMode,
      isEditing
    });
    
    if (editedValue !== value) {
      console.log('Valor alterado, chamando onChange');
      onChange(editedValue);
    } else {
      console.log('Nenhuma alteração detectada');
    }
    
    setIsEditing(false);
  };

  console.log('EditableText - Estado:', { isEditMode, isEditing, value });

  if (isEditMode && isEditing) {
    return (
      <div className="relative">
        <Tag className={`${className} border border-blue-500 p-1`}>
          <input
            type="text"
            value={editedValue}
            onChange={(e) => setEditedValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full bg-transparent outline-none"
            autoFocus
          />
        </Tag>
        <div className="absolute -right-8 top-0 flex space-x-1">
          <button
            onClick={handleSave}
            className="text-green-600 hover:text-green-800"
            title="Salvar"
          >
            ✓
          </button>
          <button
            onClick={() => {
              setEditedValue(value);
              setIsEditing(false);
            }}
            className="text-red-600 hover:text-red-800"
            title="Cancelar"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <Tag 
        className={`${className} ${isEditMode ? 'hover:bg-blue-50 cursor-pointer' : ''}`}
        onClick={() => isEditMode && setIsEditing(true)}
      >
        {value || <span className="text-gray-400">{placeholder}</span>}
      </Tag>
      {isEditMode && (
        <button
          onClick={() => setIsEditing(true)}
          className="absolute -left-6 top-0 opacity-0 group-hover:opacity-100 text-blue-500"
          title="Editar"
        >
          ✏️
        </button>
      )}
    </div>
  );
};

export default EditableText;
