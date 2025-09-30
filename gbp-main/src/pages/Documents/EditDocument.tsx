import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { DocumentForm } from './components/DocumentForm/index';
import { Document, DocumentFormData } from './types';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useAuth } from '../../providers/AuthProvider';
import { supabaseClient as supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';

export function EditDocument() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const company = useCompanyStore((state) => state.company);
  const { isAuthenticated } = useAuth();
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
          <p>É necessário selecionar uma empresa para editar documentos.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('gbp_documentos')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        console.log('Dados brutos do banco:', data);

        // Mapear tipo antigo para novo
        const mappedType = data.tipo_de_documento === 'office' ? 'official_letter' : data.tipo_de_documento;
        
        // Formatar os dados para o formulário
        const formattedData = {
          title: data.titulo || '',
          type: mappedType,
          number: data.numero_do_documento || data.id.toString(),
          description: data.descricao || '',
          status: data.status || 'draft',
          authors: data.autor ? (typeof data.autor === 'string' ? [data.autor] : data.autor) : [],
          presentationDate: data.data_de_apresentacao ? new Date(data.data_de_apresentacao) : undefined,
          destination: data.destino || '',
          responseDeadline: data.prazo_de_resposta ? new Date(data.prazo_de_resposta) : undefined,
          sender: data.remetente || '',
          recipient: data.responsavel || '',
          attachmentUrl: data.url_anexo
        };

        console.log('Dados formatados para o formulário:', formattedData);
        setDocument(formattedData);
      } catch (error) {
        console.error('Error fetching document:', error);
        toast.error('Erro ao carregar documento');
        navigate('/app/documentos');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchDocument();
    }
  }, [id, navigate]);

  const handleSubmit = async (data: DocumentFormData) => {
    const toastId = toast.loading('Salvando documento...');
    
    try {
      setIsSubmitting(true);
      
      const updateData = {
        titulo: data.title,
        tipo_de_documento: data.type,
        numero_do_documento: data.number,
        descricao: data.description,
        status: data.status,
        autor: Array.isArray(data.authors) ? data.authors.join(', ') : data.authors,
        data_de_apresentacao: data.presentationDate?.toISOString(),
        destino: data.destination,
        prazo_de_resposta: data.responseDeadline?.toISOString(),
        remetente: data.sender,
        responsavel: data.recipient,
        updated_at: new Date().toISOString()
      };

      console.log('Dados sendo enviados para atualização:', updateData);
      
      const { error } = await supabase
        .from('gbp_documentos')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      toast.update(toastId, {
        render: 'Documento atualizado com sucesso!',
        type: 'success',
        isLoading: false,
        autoClose: 3000
      });
      
      navigate('/app/documentos');
    } catch (error) {
      console.error('Error updating document:', error);
      toast.update(toastId, {
        render: 'Erro ao atualizar documento. Por favor, tente novamente.',
        type: 'error',
        isLoading: false,
        autoClose: 5000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full bg-white dark:bg-gray-900">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-full bg-white dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-gray-500 dark:text-gray-400">Documento não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/app/documentos')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white ml-2">
            Editar Documento
          </h1>
        </div>
      </div>

      {/* Form Content */}
      <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <DocumentForm 
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          initialData={document}
        />
      </div>
    </div>
  );
}
