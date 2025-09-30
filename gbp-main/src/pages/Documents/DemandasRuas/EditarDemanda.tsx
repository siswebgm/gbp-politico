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
  
  // Estilo para o container principal
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: 'white',
    padding: '2rem',
    width: '100%',
    maxWidth: '100%',
    margin: 0,
    boxSizing: 'border-box' as const
  };

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
      <div style={containerStyle} className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!demanda) {
    return (
      <div style={containerStyle} className="flex flex-col items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Demanda não encontrada.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate('/app/documentos/demandas-ruas')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a lista de demandas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button 
            variant="outline" 
            className="mb-4"
            onClick={() => navigate('/app/documentos/demandas-ruas')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a lista
          </Button>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight">Editar Demanda</h1>
              <p className="text-muted-foreground">
                Protocolo: #{demanda.numero_protocolo?.toString().padStart(6, '0') || '--'}
              </p>
            </div>

            <DemandaForm
              demanda={demanda}
              onSave={handleSave}
              onCancel={() => navigate('/app/documentos/demandas-ruas')}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditarDemanda;
