import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Loader2, Edit2, Trash2, Search, X, DollarSign, ChevronDown, FileSpreadsheet } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useCompany } from '../../../providers/CompanyProvider';
import { useAuth } from '../../../providers/AuthProvider';
import { emendasParlamentaresService, EmendaParlamentar } from '../../../services/emendasParlamentares';
import { useToast } from '../../../components/ui/use-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
import { Input } from '../../../components/ui/input';

interface EmendasPorAno {
  [ano: string]: EmendaParlamentar[];
}

const statusConfig: { [key: string]: { label: string; className: string; } } = {
  'Aguardando Empenho': {
    label: 'Aguardando Empenho',
    className: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-300',
  },
  'Empenhado': {
    label: 'Empenhado',
    className: 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300',
  },
  'Pago': {
    label: 'Pago',
    className: 'bg-green-50 text-green-600 dark:bg-green-900/50 dark:text-green-300',
  },
  'Cancelado': {
    label: 'Cancelado',
    className: 'bg-red-50 text-red-600 dark:bg-red-900/50 dark:text-red-300',
  }
};

export default function EmendasParlamentares() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [emendas, setEmendas] = React.useState<EmendasPorAno>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [emendaParaDeletar, setEmendaParaDeletar] = React.useState<EmendaParlamentar | null>(null);
  const [expandedAnos, setExpandedAnos] = React.useState<{ [key: string]: boolean }>({});

  const carregarEmendas = React.useCallback(async () => {
    if (!company?.uid) return;

    try {
      setIsLoading(true);
      const data = await emendasParlamentaresService.listar(company.uid);
      
      const emendasPorAno: EmendasPorAno = {};
      data.forEach(emenda => {
        const ano = emenda.ano.toString();
        if (!emendasPorAno[ano]) {
          emendasPorAno[ano] = [];
        }
        emendasPorAno[ano].push(emenda);
      });
      
      setEmendas(emendasPorAno);

      const anos = Object.keys(emendasPorAno);
      if (anos.length > 0) {
        const ultimoAno = anos.sort((a, b) => Number(b) - Number(a))[0];
        setExpandedAnos(prev => ({ ...prev, [ultimoAno]: true }));
      }
    } catch (error) {
      toast({ title: 'Erro ao carregar emendas', description: 'Tente novamente mais tarde.', variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [company?.uid, toast]);

  React.useEffect(() => {
    carregarEmendas();
  }, [carregarEmendas]);

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    Object.keys(filteredEmendas).sort((a, b) => Number(b) - Number(a)).forEach(ano => {
      const emendasDoAno = filteredEmendas[ano];

      const header = [
        'Número',
        'Ano',
        'Tipo',
        'Descrição/Objeto',
        'Valor Total',
        'Status',
        'Beneficiário',
        'CNPJ',
        'Município',
        'Estado',
        'Data Empenho',
        'Valor Empenhado',
        'Data Liberação',
        'Data Pagamento',
        'Valor Pago',
        'Observações',
      ];

      const dataToExport = emendasDoAno.map(e => ({
        'Número': e.numero_emenda,
        'Ano': e.ano,
        'Tipo': e.tipo,
        'Descrição/Objeto': e.descricao,
        'Valor Total': e.valor_total,
        'Status': e.status,
        'Beneficiário': e.beneficiario,
        'CNPJ': e.beneficiario_cnpj,
        'Município': e.beneficiario_municipio,
        'Estado': e.beneficiario_estado,
        'Data Empenho': e.data_empenho ? new Date(e.data_empenho) : '',
        'Valor Empenhado': e.valor_empenhado,
        'Data Liberação': e.data_liberacao ? new Date(e.data_liberacao) : '',
        'Data Pagamento': e.data_pagamento ? new Date(e.data_pagamento) : '',
        'Valor Pago': e.valor_pago,
        'Observações': e.observacoes,
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport, { header, cellDates: true });

      // Auto-ajuste da largura das colunas
      const columnWidths = header.map((h, i) => {
        const col = XLSX.utils.encode_col(i);
        const allValues = [h, ...dataToExport.map(row => row[h])];
        const maxLength = allValues.reduce((max, val) => {
          const len = val ? val.toString().length : 0;
          return Math.max(max, len);
        }, 0);
        return { wch: maxLength + 2 }; // +2 para um pouco de padding
      });
      ws['!cols'] = columnWidths;

      // Estilo do cabeçalho
      const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "FFF0F0F0" } } };
      header.forEach((h, i) => {
        const cellRef = XLSX.utils.encode_cell({ c: i, r: 0 });
        if (ws[cellRef]) {
          ws[cellRef].s = headerStyle;
        }
      });

      // Formatação de moeda
      const currencyFormat = 'R$ #,##0.00';
      dataToExport.forEach((row, rowIndex) => {
        ['Valor Total', 'Valor Empenhado', 'Valor Pago'].forEach(colName => {
          const colIndex = header.indexOf(colName);
          const cellRef = XLSX.utils.encode_cell({ c: colIndex, r: rowIndex + 1 });
          if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
            ws[cellRef].z = currencyFormat;
          }
        });
      });

      XLSX.utils.book_append_sheet(wb, ws, ano);
    });

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'emendas_parlamentares.xlsx');

    toast({ title: 'Exportação concluída', description: 'O arquivo Excel foi gerado com sucesso.', variant: 'success' });
  };

  const handleDelete = async () => {
    if (!emendaParaDeletar || !user?.uid) return;
    try {
      await emendasParlamentaresService.deletar(emendaParaDeletar.uid, user.uid);
      toast({ title: 'Emenda excluída com sucesso!', variant: 'success' });
      setEmendaParaDeletar(null);
      carregarEmendas();
    } catch (error) {
      toast({ title: 'Erro ao excluir emenda', description: 'Tente novamente mais tarde.', variant: 'error' });
    }
  };

  const toggleAno = (ano: string) => {
    setExpandedAnos(prev => ({ ...prev, [ano]: !prev[ano] }));
  };

  const filteredEmendas = React.useMemo(() => {
    if (!searchQuery) return emendas;
    const query = searchQuery.toLowerCase();
    const result: EmendasPorAno = {};

    for (const ano in emendas) {
      const emendasDoAno = emendas[ano].filter(emenda => 
        emenda.numero_emenda.toLowerCase().includes(query) ||
        emenda.descricao?.toLowerCase().includes(query) ||
        emenda.beneficiario?.toLowerCase().includes(query)
      );
      if (emendasDoAno.length > 0) {
        result[ano] = emendasDoAno;
      }
    }
    return result;
  }, [emendas, searchQuery]);

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white dark:bg-gray-900/50 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => navigate('/app/documentos')} aria-label="Voltar para Documentos">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white ml-2">Emendas Parlamentares</h1>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="-ml-1 mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
            <Button onClick={() => navigate('/app/documentos/emendas-parlamentares/novo')}>
              <Plus className="-ml-1 mr-2 h-4 w-4" />
              Nova Emenda
            </Button>
          </div>
        </div>
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input 
            placeholder="Buscar por número, descrição ou beneficiário..."
            className="pl-10 w-full max-w-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button variant="ghost" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearchQuery('')}>
              <X className="w-5 h-5 text-gray-400" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 dark:bg-gray-900">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="space-y-0">
            {Object.keys(filteredEmendas).sort((a, b) => Number(b) - Number(a)).map(ano => (
              <div key={ano} className="bg-white dark:bg-gray-800/50 shadow-sm border-b border-gray-200 dark:border-gray-700/50 overflow-hidden">
                <button 
                  onClick={() => toggleAno(ano)} 
                  className="w-full flex justify-between items-center p-4 text-xl font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <span>{ano}</span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${expandedAnos[ano] ? 'rotate-180' : ''}`} />
                </button>
                {expandedAnos[ano] && (
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700/50 border-t border-gray-200 dark:border-gray-700/50">
                    {filteredEmendas[ano].map(emenda => (
                      <li key={emenda.uid} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-md font-semibold text-blue-600 dark:text-blue-400 truncate">Emenda nº {emenda.numero_emenda}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Beneficiário: {emenda.beneficiario || 'Não informado'}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Valor: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(emenda.valor_total)}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig[emenda.status]?.className || ''}`}>
                              {statusConfig[emenda.status]?.label || emenda.status}
                            </span>
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/app/documentos/emendas-parlamentares/${emenda.uid}/editar`)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setEmendaParaDeletar(emenda)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {Object.keys(filteredEmendas).length === 0 && !isLoading && (
              <div className="text-center py-12">
                <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhuma emenda encontrada</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Tente ajustar sua busca ou crie uma nova emenda.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="md:hidden fixed bottom-6 right-6">
        <Button onClick={() => navigate('/app/documentos/emendas-parlamentares/novo')} size="icon" className="w-14 h-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      <AlertDialog open={!!emendaParaDeletar} onOpenChange={(isOpen) => !isOpen && setEmendaParaDeletar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir esta emenda?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A emenda <strong>nº {emendaParaDeletar?.numero_emenda}</strong> será marcada como excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Confirmar Exclusão</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
