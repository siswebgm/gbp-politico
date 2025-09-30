import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { DocumentForm } from './components/DocumentForm/index';
import { DocumentFormData } from './types';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useAuth } from '../../providers/AuthProvider';
import { documentService } from '../../services/documentService';
import { toast } from 'react-toastify';

export function NewDocument() {
  const navigate = useNavigate();
  const company = useCompanyStore((state) => state.company);
  const { isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-500 dark:text-gray-400 p-8 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Selecione uma empresa</h3>
          <p>É necessário selecionar uma empresa para criar documentos.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: DocumentFormData) => {
    const toastId = toast.loading('Criando documento...');
    
    try {
      setIsSubmitting(true);
      
      // Criar documento no banco de dados
      await documentService.create(company.id.toString(), data);
      
      toast.update(toastId, {
        render: 'Documento criado com sucesso!',
        type: 'success',
        isLoading: false,
        autoClose: 3000
      });
      
      navigate('/app/documentos');
    } catch (error) {
      console.error('Error creating document:', error);
      toast.update(toastId, {
        render: 'Erro ao criar documento. Por favor, tente novamente.',
        type: 'error',
        isLoading: false,
        autoClose: 5000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white ml-2">
            Novo Documento
          </h1>
        </div>
      </div>

      {/* Form Content */}
      <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <DocumentForm 
          onSubmit={handleSubmit} 
          onCancel={() => navigate(-1)}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
