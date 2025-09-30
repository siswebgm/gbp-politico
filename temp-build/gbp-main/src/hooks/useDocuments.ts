import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '../services/documents';
import { useCompanyStore } from './useCompanyContext';
import type { Document } from '../types/document';

export function useDocuments() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useCompanyStore();

  const documents = useQuery({
    queryKey: ['documents', currentCompanyId],
    queryFn: () => {
      if (!currentCompanyId) {
        throw new Error('Empresa não selecionada');
      }
      return documentService.list(currentCompanyId);
    },
    enabled: !!currentCompanyId,
  });

  const createDocument = useMutation({
    mutationFn: (data: Omit<Document, 'id' | 'created_at' | 'tags' | 'updates' | 'messages' | 'approvals'>) => {
      if (!currentCompanyId) {
        throw new Error('Empresa não selecionada');
      }
      return documentService.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', currentCompanyId] });
    },
  });

  const updateDocument = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Document> }) => {
      if (!currentCompanyId) {
        throw new Error('Empresa não selecionada');
      }
      return documentService.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', currentCompanyId] });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: (id: number) => {
      if (!currentCompanyId) {
        throw new Error('Empresa não selecionada');
      }
      return documentService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', currentCompanyId] });
    },
  });

  return {
    documents,
    createDocument,
    updateDocument,
    deleteDocument,
  };
}