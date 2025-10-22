import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { demandasRuasService, DemandaRua } from '@/services/demandasRuasService';
import { useCompanyStore } from '@/store/useCompanyStore';
import { useToast } from '@/hooks/useToast';
import { DemandaForm } from './components/DemandaForm';

export function EditarDemanda() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { company } = useCompanyStore();
  const { showSuccessToast, showErrorToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [demanda, setDemanda] = useState<DemandaRua | null>(null);
  

  // Carregar os dados da demanda
  useEffect(() => {
    const carregarDemanda = async () => {
      if (!id || !company?.uid) return;
      
      try {
        setLoading(true);
        const data = await demandasRuasService.getDemandaByUid(id);
        
        if (data && data.empresa_uid === company.uid) {
          setDemanda(data);
        } else {
          showErrorToast('Demanda não encontrada ou você não tem permissão para acessá-la.');
          navigate('/app/documentos/demandas-ruas');
        }
      } catch (error) {
        console.error('Erro ao carregar demanda:', error);
        showErrorToast('Erro ao carregar os dados da demanda.');
        navigate('/app/documentos/demandas-ruas');
      } finally {
        setLoading(false);
      }
    };

    carregarDemanda();
  }, [id, company?.uid, navigate, showErrorToast]);

  // Função para salvar as alterações
  const handleSave = async (data: Partial<DemandaRua>) => {
    if (!id || !company?.uid) return;
    
    try {
      await demandasRuasService.updateDemanda(id, {
        ...data,
        empresa_uid: company.uid,
      });
      
      showSuccessToast('Demanda atualizada com sucesso!');
      navigate('/app/documentos/demandas-ruas');
    } catch (error) {
      console.error('Erro ao atualizar demanda:', error);
      throw error; // Será tratado pelo DemandaForm
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!demanda) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">Demanda não encontrada</p>
        <Button onClick={() => navigate('/app/documentos/demandas-ruas')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full px-2 pt-2 pb-4 sm:px-4 sm:pt-4 sm:pb-8 flex-1">
        <div className="max-w-7xl mx-auto">
          <Button 
            variant="outline" 
            className="mb-4"
            onClick={() => navigate('/app/documentos/demandas-ruas')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a lista
          </Button>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Editar Demanda</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Protocolo: #{demanda.numero_protocolo?.toString().padStart(6, '0') || '--'}
              </p>
            </div>

            <DemandaForm
              demanda={demanda}
              onSave={handleSave}
              onCancel={() => navigate('/app/documentos/demandas-ruas')}
              loading={loading}
              empresaUid={company?.uid || ''}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditarDemanda;
