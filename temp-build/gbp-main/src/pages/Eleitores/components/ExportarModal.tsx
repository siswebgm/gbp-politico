import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '@headlessui/react';
import { 
  X, 
  Download, 
  FileText, 
  Table, 
  File, 
  Users, 
  Phone,
  MapPin, 
  Info,
  CheckSquare,
  type LucideIcon
} from 'lucide-react';
import { useEleitores } from '../../../hooks/useEleitores';
import { toast } from 'react-toastify';
import { eleitorService } from '../../../services/eleitorService';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { supabaseClient } from '../../../lib/supabase';
import * as XLSX from 'xlsx';

interface ExportarModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredData: any[];
  selectedIds: string[];
}

interface FieldGroup {
  label: string;
  icon: LucideIcon;
}

const exportFields = {
  pessoais: [
    { id: 'nome', label: 'Nome' },
    { id: 'cpf', label: 'CPF' },
    { id: 'nascimento', label: 'Data de Nascimento' },
    { id: 'genero', label: 'Gênero' },
    { id: 'nome_mae', label: 'Nome da Mãe' },
  ],
  contato: [
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'telefone', label: 'Telefone' },
  ],
  eleitorais: [
    { id: 'titulo', label: 'Título de Eleitor' },
    { id: 'zona', label: 'Zona' },
    { id: 'secao', label: 'Seção' },
  ],
  endereco: [
    { id: 'cep', label: 'CEP' },
    { id: 'logradouro', label: 'Logradouro' },
    { id: 'numero', label: 'Número' },
    { id: 'complemento', label: 'Complemento' },
    { id: 'bairro', label: 'Bairro' },
    { id: 'cidade', label: 'Cidade' },
    { id: 'uf', label: 'UF' },
    { id: 'latitude', label: 'Latitude' },
    { id: 'longitude', label: 'Longitude' },
  ],
  adicionais: [
    { id: 'categoria', label: 'Categoria' },
    { id: 'gbp_atendimentos', label: 'Atendimentos' },
    { id: 'responsavel', label: 'Responsável' },
    { id: 'indicado', label: 'Indicado por' },
    { id: 'created_at', label: 'Data de Cadastro' },
  ],
};

const fieldGroups: Record<string, FieldGroup> = {
  pessoais: { label: 'Dados Pessoais', icon: Users },
  contato: { label: 'Contato', icon: Phone },
  eleitorais: { label: 'Dados Eleitorais', icon: CheckSquare },
  endereco: { label: 'Endereço', icon: MapPin },
  adicionais: { label: 'Informações Adicionais', icon: Info },
};

export function ExportarModal({ isOpen, onClose, filteredData, selectedIds }: ExportarModalProps) {
  const [formato, setFormato] = useState('xlsx');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const allFields = Object.values(exportFields).flat();
  const [campos, setCampos] = useState<string[]>(allFields.map((f: { id: string }) => f.id));
  const company = useCompanyStore((state) => state.company);
  const { eleitores } = useEleitores();

  // Calcula a quantidade de eleitores a serem exportados
  const quantidadeExportar = selectedIds.length > 0 ? selectedIds.length : eleitores?.length || 0;

  const formatData = (data: any, field: string) => {
    if (data === null || data === undefined) return '';
    
    switch (field) {
      case 'nascimento':
        return data ? new Date(data).toLocaleDateString('pt-BR') : '';
      case 'created_at':
        return data ? new Date(data).toLocaleString('pt-BR') : '';
      case 'cpf':
        return data ? data.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '';
      case 'telefone':
      case 'whatsapp':
        return data ? data.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : '';
      case 'categoria':
      case 'gbp_atendimentos':
      case 'indicado':
        return data ? String(data) : '';
      default:
        return String(data || '');
    }
  };

  const handleExport = async () => {
    try {
      if (!company?.uid) {
        toast.error('Empresa não encontrada');
        return;
      }

      if (campos.length === 0) {
        toast.error('Selecione pelo menos um campo para exportar');
        return;
      }

      setIsLoading(true);
      setLoadingMessage('Iniciando exportação...');

      // Busca os dados completos dos eleitores selecionados
      let eleitoresData = [];
      if (selectedIds.length > 0) {
        setLoadingMessage(`Buscando dados de ${quantidadeExportar} eleitores...`);
        
        try {
          console.log('[DEBUG] IDs selecionados:', selectedIds);
          
          // Remove duplicados e valida os UUIDs
          const validUuids = [...new Set(
            selectedIds
              .map(id => typeof id === 'string' ? id.trim() : String(id))
              .filter(id => id && id.length > 0)
          )];
          
          console.log('[DEBUG] UUIDs válidos:', validUuids);
          
          if (validUuids.length === 0) {
            throw new Error('IDs de eleitores inválidos');
          }

          // Busca os dados usando o serviço de eleitores
          console.log('[DEBUG] Buscando eleitores com empresa_uid:', company.uid);
          const response = await eleitorService.getByIds(company.uid, validUuids);
          
          console.log('[DEBUG] Resposta do servidor:', response);
          
          if (!response || !response.data) {
            throw new Error('Resposta inválida do servidor');
          }

          eleitoresData = response.data;
          console.log('[DEBUG] Dados dos eleitores:', eleitoresData);

          if (eleitoresData.length === 0) {
            throw new Error('Nenhum eleitor encontrado com os IDs fornecidos');
          }

        } catch (error) {
          console.error('Erro ao buscar eleitores:', error);
          toast.error(error instanceof Error ? error.message : 'Erro ao buscar dados dos eleitores');
          return;
        }
      } else {
        // Se não houver seleção, usa todos os eleitores filtrados
        eleitoresData = filteredData;
      }

      if (eleitoresData.length === 0) {
        toast.error('Nenhum eleitor encontrado para exportação');
        setIsLoading(false);
        return;
      }

      setLoadingMessage('Preparando dados para exportação...');

      // Ordena os dados por nome antes de exportar
      const sortedData = [...eleitoresData]
        .filter(eleitor => eleitor && eleitor.nome)
        .sort((a, b) => {
          const nomeA = (a.nome || '').toLowerCase();
          const nomeB = (b.nome || '').toLowerCase();
          return nomeA.localeCompare(nomeB);
        });

      // Prepara os dados para exportação
      const exportData = sortedData.map(eleitor => {
        const row: any = {};
        campos.forEach(campo => {
          const field = allFields.find(f => f.id === campo);
          if (field) {
            let value = eleitor[campo];
            
            // Tratamento especial para campos relacionados
            if (campo === 'categoria' && eleitor.gbp_categorias) {
              value = eleitor.gbp_categorias.nome;
            } else if (campo === 'responsavel') {
              if (eleitor.gbp_usuarios) {
                value = eleitor.gbp_usuarios.nome;
              } else if (eleitor.responsavel) {
                value = eleitor.responsavel;
              }
            } else if (campo === 'indicado' && eleitor.gbp_indicado) {
              value = eleitor.gbp_indicado.nome;
            }
            
            row[field.label] = formatData(value, campo);
          }
        });
        return row;
      });

      // Exporta no formato selecionado
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const companyPrefix = company.nome.toLowerCase().replace(/[^a-z0-9]/g, '_');
      let fileName = `${companyPrefix}_eleitores_${timestamp}`;

      setLoadingMessage(`Gerando arquivo ${formato.toUpperCase()}...`);
      
      try {
        switch (formato) {
          case 'csv': {
            const headers = campos.map(campo => {
              const field = allFields.find(f => f.id === campo);
              return field ? field.label : campo;
            }).join(',');
            
            const rows = exportData.map(row => 
              Object.values(row).map(value => 
                `"${String(value || '').replace(/"/g, '""')}"`
              ).join(',')
            );
            
            const content = [headers, ...rows].join('\n');
            const blob = new Blob(["\ufeff" + content], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${fileName}.csv`;
            link.click();
            window.URL.revokeObjectURL(url);
            break;
          }
          case 'xlsx': {
            try {
              setLoadingMessage('Gerando arquivo XLSX...');
              
              // Cria um novo workbook
              const wb = XLSX.utils.book_new();
              
              // Define os headers
              const headers = campos.map(campo => {
                const field = allFields.find(f => f.id === campo);
                return field ? field.label : campo;
              });

              // Cria a worksheet com os dados
              const wsData = [headers];
              exportData.forEach(row => {
                wsData.push(headers.map(header => row[header] || ''));
              });

              // Converte para worksheet
              const ws = XLSX.utils.aoa_to_sheet(wsData);

              // Adiciona filtros nas colunas
              ws['!autofilter'] = {
                ref: XLSX.utils.encode_range(
                  { r: 0, c: 0 },
                  { r: exportData.length, c: campos.length - 1 }
                )
              };

              // Ajusta a largura das colunas
              const colWidths = headers.map(header => {
                // Calcula a largura baseada no conteúdo
                const maxLength = Math.max(
                  header.length,
                  ...exportData.map(row => String(row[header] || '').length)
                );
                return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
              });
              ws['!cols'] = colWidths;

              // Adiciona a worksheet ao workbook
              XLSX.utils.book_append_sheet(wb, ws, 'Eleitores');
              
              // Salva o arquivo
              try {
                XLSX.writeFile(wb, `${fileName}.xlsx`);
              } catch (error) {
                console.error('Erro ao salvar arquivo XLSX:', error);
                throw new Error('Não foi possível salvar o arquivo XLSX. Verifique se você tem permissão para salvar arquivos neste local.');
              }
            } catch (error) {
              console.error('Erro ao gerar XLSX:', error);
              throw new Error('Erro ao gerar arquivo XLSX');
            }
            break;
          }
          case 'pdf': {
            // Implementação para exportar em PDF
            break;
          }
          default:
            throw new Error('Formato não suportado');
        }

        toast.success('Exportação concluída com sucesso!');
        onClose();
      } catch (error) {
        console.error('Erro ao gerar arquivo:', error);
        toast.error('Erro ao gerar arquivo de exportação');
      }
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar eleitores. Tente novamente.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                Exportar Eleitores
              </Dialog.Title>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quantidade de eleitores */}
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-blue-400 mr-2" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {quantidadeExportar === 0 ? (
                  'Nenhum eleitor selecionado para exportação'
                ) : (
                  `${quantidadeExportar} eleitor${quantidadeExportar > 1 ? 'es' : ''} ${selectedIds.length > 0 ? 'selecionado' : 'encontrado'}${quantidadeExportar > 1 ? 's' : ''} para exportação`
                )}
              </span>
            </div>
          </div>

          {isLoading && (
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-600">{loadingMessage}</p>
              </div>
              <div className="mt-2">
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-2 bg-blue-600 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar">
            {/* Formato de exportação */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Formato de exportação</h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormato('xlsx')}
                  className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-colors ${
                    formato === 'xlsx'
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Table className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">XLSX</span>
                  <span className="text-[10px] text-gray-500">Planilha do Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormato('csv')}
                  className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-colors ${
                    formato === 'csv'
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <FileText className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">CSV</span>
                  <span className="text-[10px] text-gray-500">Texto separado por vírgulas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormato('pdf')}
                  className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-colors ${
                    formato === 'pdf'
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <File className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">PDF</span>
                  <span className="text-[10px] text-gray-500">Documento portátil</span>
                </button>
              </div>
            </div>

            {/* Campos para exportar */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Campos para exportar
                </h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      if (campos.length === allFields.length) {
                        setCampos([]);
                      } else {
                        setCampos(allFields.map((f: { id: string }) => f.id));
                      }
                    }}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700"
                  >
                    {campos.length === allFields.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {campos.length} de {allFields.length} campos
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {Object.entries(fieldGroups).map(([key, group]) => {
                  const GroupIcon = group.icon;
                  const fields = exportFields[key];
                  const selectedCount = fields.filter((f: { id: string }) => campos.includes(f.id)).length;
                  
                  return (
                    <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <GroupIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {group.label}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            const groupFields = fields.map((f: { id: string }) => f.id);
                            if (selectedCount === fields.length) {
                              setCampos(prev => prev.filter(id => !groupFields.includes(id)));
                            } else {
                              setCampos(prev => [...new Set([...prev, ...groupFields])]);
                            }
                          }}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700"
                        >
                          {selectedCount === fields.length ? 'Desmarcar todos' : 'Selecionar todos'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {fields.map((field) => (
                          <label
                            key={field.id}
                            className={`
                              flex items-center gap-2 p-2 rounded-lg cursor-pointer
                              ${campos.includes(field.id)
                                ? 'bg-blue-50 dark:bg-blue-900/30'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                              }
                            `}
                          >
                            <input
                              type="checkbox"
                              checked={campos.includes(field.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCampos(prev => [...prev, field.id]);
                                } else {
                                  setCampos(prev => prev.filter(id => id !== field.id));
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {field.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-200"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={campos.length === 0 || isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Exportando...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Exportar</span>
                </>
              )}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

<style>{`
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #666;
  }
`}</style>
