import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { demandasRuasService, DemandaRua } from '@/services/demandasRuasService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { DemandaForm } from '../../Documents/DemandasRuas/components/DemandaForm';

export function DemandaPublica() {
  const { empresaUid } = useParams<{ empresaUid: string }>();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const cpfFromQuery = queryParams.get('cpf');
  const [demandas, setDemandas] = useState<DemandaRua[]>([]);
  const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

  const handleSaveNewDemanda = async (data: Partial<DemandaRua>) => {
    if (!empresaUid) return;

    try {
      // Garante que todos os campos obrigatórios tenham um valor
      const novaDemanda = {
        cpf: (data as any).cpf || '',
        tipo_de_demanda: data.tipo_de_demanda || '',
        descricao_do_problema: data.descricao_do_problema || '',
        nivel_de_urgencia: data.nivel_de_urgencia || 'média',
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        uf: data.uf || '',
        cep: data.cep || '',
        boletim_ocorrencia: data.boletim_ocorrencia || 'não',
        status: 'pendente',
        empresa_uid: empresaUid,
        aceite_termos: (data as any).aceite_termos || false,
        // Campos opcionais
        numero: data.numero,
        referencia: data.referencia,
        link_da_demanda: data.link_da_demanda,
        observacoes: data.observacoes,
        anexar_boletim_de_correncia: data.anexar_boletim_de_correncia,
        documento_protocolado: data.documento_protocolado,
        observação_resposta: data.observação_resposta,
      };

      await demandasRuasService.createDemanda(novaDemanda);
      
      // Recarregar a lista de demandas após a criação
      const demandasAtualizadas = await demandasRuasService.getDemandas(empresaUid);
      setDemandas(demandasAtualizadas);

    } catch (err) {
      console.error('Erro ao criar demanda:', err);
      throw err; // Propaga o erro para o formulário tratar
    }
  };

  useEffect(() => {
    const loadDemandas = async () => {
      if (!empresaUid) return;
      
      setLoading(true);
      try {
        const data = await demandasRuasService.getDemandas(empresaUid);
        setDemandas(data);
        setError(null);
      } catch (err) {
        console.error('Erro ao carregar demandas:', err);
        setError('Não foi possível carregar as demandas. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    loadDemandas();
  }, [empresaUid]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'em_andamento':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'concluido':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelado':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return 'Data inválida';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="w-full">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Erro ao carregar</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <DemandaForm 
            key={cpfFromQuery} // Força a remontagem quando o CPF muda
            empresaUid={empresaUid!} 
            cpfInicial={cpfFromQuery} 
            onSave={handleSaveNewDemanda} 
          />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Demandas Abertas
        </h1>
        
        {demandas.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">Nenhuma demanda encontrada.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {demandas.map((demanda) => (
              <Card key={demanda.uid} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                      {demanda.tipo_de_demanda || 'Demanda sem título'}
                    </CardTitle>
                    <Badge className={getStatusBadgeVariant(demanda.status)}>
                      {demanda.status ? demanda.status.replace('_', ' ') : 'Sem status'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Protocolo: #{demanda.numero_protocolo?.toString().padStart(6, '0') || '--'}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="mb-2">
                    <span className="font-medium">Endereço:</span> {demanda.logradouro || 'Rua não informada'}, 
                    {demanda.numero ? ` ${demanda.numero}` : ' S/N'} - {demanda.bairro || 'Bairro não informado'}
                  </p>
                  <p className="mb-2">
                    <span className="font-medium">Criado em:</span> {formatDate(demanda.criado_em)}
                  </p>
                  {demanda.descricao_do_problema && (
                    <div className="mt-2">
                      <p className="font-medium mb-1">Descrição:</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {demanda.descricao_do_problema}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DemandaPublica;
