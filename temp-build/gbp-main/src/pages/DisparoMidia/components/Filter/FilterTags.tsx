import React from 'react';
import { MessageTag } from '../../../../components/MessageTag';
import { X } from 'lucide-react';

interface FilterOption {
  id: string;
  label: string;
  value: string;
  type: 'cidade' | 'bairro' | 'categoria' | 'genero';
}

interface FilterTagsProps {
  filters: FilterOption[];
  onRemove: (filter: FilterOption) => void;
}

export function FilterTags({ filters, onRemove }: FilterTagsProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {filters.map((filter) => (
        <MessageTag
          key={filter.id}
          onRemove={() => onRemove(filter)}
        >
          <span className="text-sm">{filter.label}</span>
          <X className="w-4 h-4 ml-2 cursor-pointer" />
        </MessageTag>
      ))}
    </div>
  );
}
