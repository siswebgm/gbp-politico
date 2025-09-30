import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Eleitor {
  id: string;
  nome: string;
  cpf: string | null;
  nascimento: string | null;
  whatsapp: string | null;
  telefone: string | null;
  genero: string | null;
  titulo: string | null;
  zona: string | null;
  secao: string | null;
  cep: string | null;
  logradouro: string | null;
  cidade: string | null;
  bairro: string | null;
  numero: string | null;
  complemento: string | null;
  empresa_id: string;
  created_at: string | null;
  indicado: string | null;
  uf: string | null;
  categoria: string | null;
  categoria_nome: string | null;
  indicado_nome: string | null;
}

interface EleitorDetailsModalProps {
  eleitor: Eleitor | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EleitorDetailsModal({ eleitor, isOpen, onClose }: EleitorDetailsModalProps) {
  if (!eleitor) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Detalhes do Eleitor</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Informações Pessoais</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Nome:</span> {eleitor.nome}</p>
                <p><span className="font-medium">CPF:</span> {eleitor.cpf}</p>
                <p><span className="font-medium">Data de Nascimento:</span> {eleitor.nascimento ? format(new Date(eleitor.nascimento), 'dd/MM/yyyy') : '-'}</p>
                <p><span className="font-medium">Gênero:</span> {eleitor.genero || '-'}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Contato</h3>
              <div className="space-y-2">
                <p><span className="font-medium">WhatsApp:</span> {eleitor.whatsapp || '-'}</p>
                <p><span className="font-medium">Telefone:</span> {eleitor.telefone || '-'}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Informações Eleitorais</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Título de Eleitor:</span> {eleitor.titulo || '-'}</p>
                <p><span className="font-medium">Zona:</span> {eleitor.zona || '-'}</p>
                <p><span className="font-medium">Seção:</span> {eleitor.secao || '-'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Endereço</h3>
              <div className="space-y-2">
                <p><span className="font-medium">CEP:</span> {eleitor.cep || '-'}</p>
                <p><span className="font-medium">Logradouro:</span> {eleitor.logradouro || '-'}</p>
                <p><span className="font-medium">Número:</span> {eleitor.numero || '-'}</p>
                <p><span className="font-medium">Complemento:</span> {eleitor.complemento || '-'}</p>
                <p><span className="font-medium">Bairro:</span> {eleitor.bairro || '-'}</p>
                <p><span className="font-medium">Cidade:</span> {eleitor.cidade || '-'}</p>
                <p><span className="font-medium">UF:</span> {eleitor.uf || '-'}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Outras Informações</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Categoria:</span> {eleitor.categoria_nome || '-'}</p>
                <p><span className="font-medium">Indicado por:</span> {eleitor.indicado_nome || '-'}</p>
                <p><span className="font-medium">Data de Cadastro:</span> {eleitor.created_at ? format(new Date(eleitor.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
