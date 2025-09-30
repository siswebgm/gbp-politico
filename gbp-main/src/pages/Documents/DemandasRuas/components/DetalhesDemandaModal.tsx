import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DemandaRua } from "@/services/demandasRuasService";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DetalhesDemandaModalProps {
  isOpen: boolean;
  onClose: () => void;
  demanda: DemandaRua | null;
}

export function DetalhesDemandaModal({ isOpen, onClose, demanda }: DetalhesDemandaModalProps) {
  if (!demanda) return null;

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return 'Data inválida';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'recebido':
      case 'feito_oficio':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
      case 'protocolado':
      case 'aguardando':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'concluido':
        return 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelado':
        return 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getUrgenciaBadgeVariant = (urgencia: string) => {
    switch (urgencia) {
      case 'alta':
        return 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      case 'média':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'baixa':
        return 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-2xl">Detalhes da Demanda</DialogTitle>
            <div className="flex items-center gap-2">
              <Badge className={getStatusBadgeVariant(demanda.status)}>
                {demanda.status ? demanda.status.replace('_', ' ') : 'Sem status'}
              </Badge>
              <Badge className={getUrgenciaBadgeVariant(demanda.nivel_de_urgencia)}>
                {demanda.nivel_de_urgencia || 'Não especificada'}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-3">Informações da Demanda</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Tipo:</span> {demanda.tipo_de_demanda || 'Não informado'}</p>
                <p><span className="font-medium">Protocolo:</span> #{demanda.numero_protocolo?.toString().padStart(6, '0') || '--'}</p>
                <p><span className="font-medium">Data de abertura:</span> {formatDate(demanda.criado_em)}</p>
                <p><span className="font-medium">Última atualização:</span> {formatDate(demanda.atualizado_em)}</p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-3">Endereço</h3>
              <div className="space-y-2">
                <p>{demanda.logradouro || 'Rua não informada'}, {demanda.numero || 'S/N'}</p>
                <p>{demanda.bairro || 'Bairro não informado'}</p>
                <p>{demanda.cidade || 'Cidade'}/{demanda.uf || 'UF'}</p>
                <p>CEP: {demanda.cep || 'Não informado'}</p>
                {demanda.referencia && (
                  <p><span className="font-medium">Referência:</span> {demanda.referencia}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-3">Descrição do Problema</h3>
              <p className="whitespace-pre-line">{demanda.descricao_do_problema || 'Sem descrição'}</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="font-medium text-lg mb-3">Documentos</h3>
              <div className="space-y-2">
                {demanda.documento_protocolado && (
                  <p>
                    <span className="font-medium">Documento Protocolado:</span>{' '}
                    <a 
                      href={demanda.documento_protocolado} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Visualizar documento
                    </a>
                  </p>
                )}
                {demanda.boletim_ocorrencia === 'sim' && demanda.anexar_boletim_de_correncia && (
                  <p>
                    <span className="font-medium">Boletim de Ocorrência:</span>{' '}
                    <a 
                      href={demanda.anexar_boletim_de_correncia} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Visualizar BO
                    </a>
                  </p>
                )}
              </div>
            </div>

            {demanda.observação_resposta?.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="font-medium text-lg mb-3">Respostas e Observações</h3>
                <div className="space-y-3">
                  {demanda.observação_resposta.map((obs, index) => (
                    <div key={index} className="p-3 bg-white dark:bg-gray-700 rounded border">
                      <p className="whitespace-pre-line">{obs}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {demanda.fotos_do_problema?.length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium text-lg mb-3">Fotos do Problema</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {demanda.fotos_do_problema.map((foto, index) => (
                <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src={foto} 
                    alt={`Foto ${index + 1} da demanda`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
