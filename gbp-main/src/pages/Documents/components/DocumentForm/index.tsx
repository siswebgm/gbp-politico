import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { FileText, Upload, X } from 'lucide-react';
import { DocumentFormData, DocumentType } from '../../types';

const documentSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  type: z.enum(['law_project', 'requirement', 'official_letter'], {
    required_error: 'Tipo de documento é obrigatório',
  }),
  number: z.string().min(1, 'Número é obrigatório'),
  description: z.string().optional(),
  status: z.string({
    required_error: 'Status é obrigatório',
  }),
  
  // Law Project
  authors: z.array(z.string()).optional(),
  presentationDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  
  // Requirement
  destination: z.string().optional(),
  responseDeadline: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  
  // Official Letter
  sender: z.string().optional(),
  recipient: z.string().optional(),
  
  attachment: z.any().optional(),
});

interface DocumentFormProps {
  onSubmit: (data: DocumentFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  initialData?: Partial<DocumentFormData>;
}

export function DocumentForm({ onSubmit, onCancel, isSubmitting = false, initialData }: DocumentFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    setValue,
    trigger,
    getValues
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      status: 'draft',
      ...initialData
    },
    mode: 'onChange'
  });

  const documentType = watch('type');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValue('attachment', file);
      trigger('attachment');
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setValue('attachment', undefined);
    trigger('attachment');
  };

  const onFormSubmit = handleSubmit((data) => {
    onSubmit({
      ...data,
      status: data.status || 'draft',
      attachment: selectedFile
    });
  });

  const renderTypeSpecificFields = () => {
    switch (documentType as DocumentType) {
      case 'law_project':
        return (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Autor(es)
              </label>
              <input
                type="text"
                {...register('authors')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Nome dos autores"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Data de Apresentação
              </label>
              <input
                type="date"
                {...register('presentationDate')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
          </>
        );
      
      case 'requirement':
        return (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Destino
              </label>
              <input
                type="text"
                {...register('destination')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Instituição/Autoridade"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Prazo de Resposta
              </label>
              <input
                type="date"
                {...register('responseDeadline')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
          </>
        );
      
      case 'official_letter':
        return (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Remetente
              </label>
              <input
                type="text"
                {...register('sender')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Nome do remetente"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Destinatário
              </label>
              <input
                type="text"
                {...register('recipient')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Nome do destinatário"
              />
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <form onSubmit={onFormSubmit} className="space-y-6 pb-20 sm:pb-0">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Título
        </label>
        <input
          type="text"
          {...register('title')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          placeholder="Título do documento"
        />
        {errors.title && (
          <p className="text-sm text-red-500">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Tipo de Documento
        </label>
        <select
          {...register('type')}
          onChange={(e) => {
            register('type').onChange(e);
            trigger('type');
          }}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        >
          <option value="">Selecione um tipo</option>
          <option value="law_project">Projeto de Lei</option>
          <option value="requirement">Requerimento</option>
          <option value="official_letter">Ofício</option>
        </select>
        {errors.type && (
          <p className="text-sm text-red-500">{errors.type.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Número do Documento
        </label>
        <input
          type="text"
          {...register('number')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          placeholder="Número/Identificador"
        />
        {errors.number && (
          <p className="text-sm text-red-500">{errors.number.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Descrição
        </label>
        <textarea
          {...register('description')}
          rows={4}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          placeholder="Descrição ou resumo do documento"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Status
        </label>
        <select
          {...register('status')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        >
          <option value="draft">Em Elaboração</option>
          <option value="pending">Em Tramitação</option>
          <option value="approved">Aprovado</option>
          <option value="rejected">Rejeitado</option>
        </select>
      </div>

      {documentType && renderTypeSpecificFields()}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Anexo
        </label>
        <div className="mt-1 flex items-center space-x-4">
          <label className="flex cursor-pointer items-center space-x-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
            <Upload className="h-5 w-5" />
            <span>Selecionar arquivo</span>
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx"
            />
          </label>
          {selectedFile && (
            <div className="flex items-center space-x-2 rounded-md bg-gray-100 px-3 py-2 dark:bg-gray-800">
              <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">{selectedFile.name}</span>
              <button
                type="button"
                onClick={removeFile}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 border border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!isValid || isSubmitting}
        >
          Salvar
        </button>
      </div>
    </form>
  );
}
