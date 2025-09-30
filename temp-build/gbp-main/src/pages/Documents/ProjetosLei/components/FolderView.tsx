import React from 'react';
import { ChevronRight, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../../components/ui/dropdown-menu';

interface Folder {
  id: string;
  name: string;
  type: 'folder';
  children: (Folder | ProjetoLei)[];
}

interface ProjetoLei {
  id: string;
  name: string;
  type: 'file';
  numero: string;
  ano: number;
  titulo: string;
  autor: string;
  coautores: string[];
  dataProtocolo: string;
  status: 'em_andamento' | 'aprovado' | 'arquivado';
  ementa: string;
  justificativa: string;
  textoLei: {
    objetivo: string;
    artigos: { numero: number; texto: string }[];
    disposicoesFinais: string;
  };
  tags: string[];
  arquivos: { name: string; size: number; type: string; }[];
  tramitacao: {
    data: string;
    descricao: string;
    status: string;
  }[];
}

interface FolderViewProps {
  items: (Folder | ProjetoLei)[];
  onDelete: (item: Folder | ProjetoLei) => void;
  onEdit: (item: ProjetoLei) => void;
}

export function FolderView({ items, onDelete, onEdit }: FolderViewProps) {
  const getStatusColor = (status: ProjetoLei['status']) => {
    switch (status) {
      case 'em_andamento':
        return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-300';
      case 'aprovado':
        return 'border-green-200 bg-green-50 text-green-700 dark:border-green-500 dark:bg-green-950 dark:text-green-300';
      case 'arquivado':
        return 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-500 dark:bg-gray-950 dark:text-gray-300';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-700';
    }
  };

  const getStatusText = (status: ProjetoLei['status']) => {
    switch (status) {
      case 'em_andamento':
        return 'Em Andamento';
      case 'aprovado':
        return 'Aprovado';
      case 'arquivado':
        return 'Arquivado';
      default:
        return status;
    }
  };

  const renderItem = (item: Folder | ProjetoLei, depth = 0) => {
    const isFolder = item.type === 'folder';
    const projeto = item as ProjetoLei;

    return (
      <div key={item.id}>
        <div
          className={`
            group flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800
            ${depth > 0 ? 'ml-6' : ''}
          `}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {isFolder ? item.name : projeto.numero}
              </span>
              {!isFolder && (
                <>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(projeto.status)}`}>
                    {getStatusText(projeto.status)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(projeto.dataProtocolo).getFullYear()}
                  </span>
                  {projeto.tags.length > 0 && (
                    <div className="flex gap-1">
                      {projeto.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            {!isFolder && (
              <>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  {projeto.titulo}
                </p>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                  <span>Autor: {projeto.autor}</span>
                  {projeto.coautores.length > 0 && (
                    <span>Coautores: {projeto.coautores.join(', ')}</span>
                  )}
                  <span>Protocolo: {new Date(projeto.dataProtocolo).toLocaleDateString()}</span>
                  {projeto.arquivos.length > 0 && (
                    <span>{projeto.arquivos.length} arquivo{projeto.arquivos.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {projeto.ementa}
                </p>
              </>
            )}
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <MoreVertical className="h-4 w-4 text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isFolder && (
                  <DropdownMenuItem onClick={() => onEdit(projeto)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onDelete(item)}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isFolder && item.children.length > 0 && (
          <div className="pl-4">
            {item.children.map(child => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {items.map(item => renderItem(item))}
    </div>
  );
}
