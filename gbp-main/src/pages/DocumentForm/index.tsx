import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, Upload, Calendar, User, Tag } from 'lucide-react';

const documentSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  type: z.enum(['law_project', 'office', 'requirement']),
  description: z.string().min(1, 'Descrição é obrigatória'),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().optional(),
  responsible: z.string().min(1, 'Responsável é obrigatório'),
  tags: z.string().optional(),
  attachments: z.any().optional(),
  status: z.enum(['draft', 'review', 'approved', 'rejected', 'archived']),
  notes: z.string().optional(),
});

type DocumentFormData = z.infer<typeof documentSchema>;

export function DocumentForm() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      type: 'law_project',
      priority: 'medium',
      status: 'draft',
    },
  });

  const onSubmit = async (data: DocumentFormData) => {
    try {
      console.log('Form data:', data);
      console.log('Files:', files);
      navigate('/documents');
    } catch (error) {
      console.error('Error submitting document:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Novo Documento</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Criar novo documento ou requerimento
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          {/* Informações Básicas */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Informações Básicas
            </h3>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Título
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    {...register('title')}
                    className="block w-full h-11 pl-10 pr-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Título do documento"
                  />
                </div>
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Documento
                </label>
                <select
                  {...register('type')}
                  className="block w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="law_project">Projeto de Lei</option>
                  <option value="office">Ofício</option>
                  <option value="requirement">Requerimento</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descrição
                </label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Descreva o documento..."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.description.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Detalhes */}
          <div className="mt-8 space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Detalhes
            </h3>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Prioridade
                </label>
                <select
                  {...register('priority')}
                  className="block w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Data de Vencimento
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    {...register('dueDate')}
                    className="block w-full h-11 pl-10 pr-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Responsável
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    {...register('responsible')}
                    className="block w-full h-11 pl-10 pr-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Nome do responsável"
                  />
                </div>
                {errors.responsible && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.responsible.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    {...register('tags')}
                    className="block w-full h-11 pl-10 pr-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Separe as tags por vírgula"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  {...register('status')}
                  className="block w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="draft">Rascunho</option>
                  <option value="review">Em Revisão</option>
                  <option value="approved">Aprovado</option>
                  <option value="rejected">Rejeitado</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Anexos
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 dark:text-gray-400">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                      >
                        <span>Faça upload de arquivos</span>
                        <input
                          id="file-upload"
                          type="file"
                          multiple
                          className="sr-only"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">ou arraste e solte</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      PDF, DOC, DOCX até 10MB
                    </p>
                  </div>
                </div>
                {files.length > 0 && (
                  <ul className="mt-2 divide-y divide-gray-200 dark:divide-gray-700">
                    {files.map((file, index) => (
                      <li key={index} className="py-2 flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFiles(files.filter((_, i) => i !== index))}
                          className="text-red-600 hover:text-red-800 dark:hover:text-red-400"
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Observações
                </label>
                <textarea
                  {...register('notes')}
                  rows={4}
                  className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Observações adicionais..."
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/documents')}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}