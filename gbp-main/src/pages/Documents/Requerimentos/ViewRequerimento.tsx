import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { requerimentosService, Requerimento } from '../../../services/requerimentos';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { useToast } from '../../../components/ui/use-toast';
import { ChevronLeft, Edit, FileText } from 'lucide-react';

const statusMapping: { [key: string]: string } = {
  protocolado: 'Protocolado',
  em_analise: 'Em Análise',
  deferido: 'Deferido',
  indeferido: 'Indeferido',
  arquivado: 'Arquivado',
};

const prioridadeMapping: { [key: string]: string } = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

export default function ViewRequerimento() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requerimento, setRequerimento] = useState<Requerimento | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      toast({ title: 'Erro', description: 'UID do requerimento não fornecido.', variant: 'destructive' });
      navigate('/app/documentos/requerimentos');
      return;
    }

    const fetchRequerimento = async () => {
      try {
        const data = await requerimentosService.buscarPorId(uid);
        if (data) {
          setRequerimento(data);
        } else {
          toast({ title: 'Erro', description: 'Requerimento não encontrado.', variant: 'destructive' });
          navigate('/app/documentos/requerimentos');
        }
      } catch (error) {
        toast({ title: 'Erro ao buscar dados', description: (error as Error).message, variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequerimento();
  }, [uid, navigate, toast]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  if (!requerimento) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 p-4 sm:p-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/app/documentos/requerimentos')}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
              Detalhes do Requerimento
            </h1>
          </div>
          <Button onClick={() => navigate(`/app/documentos/requerimentos/${uid}/editar`)}>
            <Edit className="mr-2 h-4 w-4" /> Editar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{requerimento.titulo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <p className="font-semibold text-gray-500">Número</p>
                <p>{requerimento.numero}</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-gray-500">Solicitante</p>
                <p>{requerimento.solicitante}</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-gray-500">Data de Emissão</p>
                <p>{formatDate(requerimento.data_emissao)}</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-gray-500">Status</p>
                <p>{statusMapping[requerimento.status] || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-gray-500">Prioridade</p>
                <p>{prioridadeMapping[requerimento.prioridade] || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-gray-500">Tipo</p>
                <p>{requerimento.tipo || 'N/A'}</p>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <h3 className="font-semibold text-gray-600">Descrição</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{requerimento.descricao || 'Nenhuma descrição fornecida.'}</p>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <h3 className="font-semibold text-gray-600">Solicitação Específica</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{requerimento.solicitacao_especifica || 'Nenhuma solicitação específica fornecida.'}</p>
            </div>

            {requerimento.arquivos && requerimento.arquivos.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <h3 className="font-semibold text-gray-600">Arquivos Anexados</h3>
                <div className="space-y-2">
                  {requerimento.arquivos.map((arquivo, index) => (
                    <a
                      key={index}
                      href={arquivo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      <span>{arquivo.nome}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
