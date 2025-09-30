import { X } from 'lucide-react';
import { Eleitor } from '../../../types/eleitor';

interface EleitorDrawerProps {
  eleitor: Eleitor | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EleitorDrawer({ eleitor, isOpen, onClose }: EleitorDrawerProps) {
  if (!isOpen || !eleitor) return null;

  return (
    <div className="fixed inset-0 overflow-hidden z-50">
      <div className="absolute inset-0 overflow-hidden">
        {/* Overlay de fundo escuro */}
        <div 
          className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose}
        />

        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div className="pointer-events-auto w-screen max-w-md">
            <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
              {/* Cabeçalho */}
              <div className="bg-primary-600 px-4 py-6 sm:px-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-white">Detalhes do Eleitor</h2>
                  <button
                    type="button"
                    className="rounded-md bg-primary-600 text-gray-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                    onClick={onClose}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="relative flex-1 px-4 py-6 sm:px-6">
                {/* Informações Pessoais */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Informações Pessoais</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Nome</label>
                      <p className="mt-1 text-sm text-gray-900">{eleitor.nome || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">CPF</label>
                      <p className="mt-1 text-sm text-gray-900">{eleitor.cpf || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Data de Nascimento</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {eleitor.nascimento ? new Date(eleitor.nascimento).toLocaleDateString() : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Nome da Mãe</label>
                      <p className="mt-1 text-sm text-gray-900">{eleitor.nome_mae || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Contato */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contato</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">WhatsApp</label>
                      <p className="mt-1 text-sm text-gray-900">{eleitor.whatsapp || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Telefone</label>
                      <p className="mt-1 text-sm text-gray-900">{eleitor.telefone || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Endereço</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">CEP</label>
                      <p className="mt-1 text-sm text-gray-900">{eleitor.cep || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Logradouro</label>
                      <p className="mt-1 text-sm text-gray-900">{eleitor.logradouro || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Número</label>
                      <p className="mt-1 text-sm text-gray-900">{eleitor.numero || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Complemento</label>
                      <p className="mt-1 text-sm text-gray-900">{eleitor.complemento || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Bairro</label>
                      <p className="mt-1 text-sm text-gray-900">{eleitor.bairro || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Cidade</label>
                      <p className="mt-1 text-sm text-gray-900">{eleitor.cidade || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Título de Eleitor */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Título de Eleitor</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Número do Título</label>
                      <p className="mt-1 text-sm text-gray-900">{eleitor.titulo || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Zona</label>
                      <p className="mt-1 text-sm text-gray-900">{eleitor.zona || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Seção</label>
                      <p className="mt-1 text-sm text-gray-900">{eleitor.secao || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 