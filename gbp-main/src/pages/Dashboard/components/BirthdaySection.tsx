import { useState, useEffect } from 'react';
import { Gift, ChevronLeft, ChevronRight, ChevronUp, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../providers/AuthProvider';
import ExcelJS from 'exceljs';
import { supabaseClient } from '../../../lib/supabase';

interface BirthdayPerson {
  uid: string;
  eleitor_uid: string;
  created_at: string;
  eleitor_nome: string;
  eleitor_whatsapp: string | null;
  eleitor_bairro: string | null;
  eleitor_cidade: string | null;
  eleitor_uf: string | null;
  categoria: string | null;
  mensagem_tipo: string | null;
  mensagem_entregue: string | null;
  mensagem_comentario: string | null;
  mensagem_perdida: string | null;
  indicado: string | null;
  responsavel: string | null;
  nascimento: string | null;
  data_envio: string | null;
}

interface BirthdaySectionProps {
  aniversariantes: BirthdayPerson[];
  isLoading: boolean;
  periodoSelecionado: string;
  onPeriodoChange: (periodo: string) => void;
}

export function BirthdaySection({ 
  aniversariantes, 
  isLoading, 
  periodoSelecionado, 
  onPeriodoChange 
}: BirthdaySectionProps) {
  const { user } = useAuth();
  const isAdmin = user?.nivel_acesso?.toLowerCase() === 'admin';

  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); 
  const itemsPerPage = 7;

  // Se não for admin, força o período para 'dia'
  useEffect(() => {
    if (!isAdmin && periodoSelecionado !== 'dia') {
      onPeriodoChange('dia');
    }
  }, [isAdmin, periodoSelecionado, onPeriodoChange]);

  // Ordenar aniversariantes
  const sortedAniversariantes = [...aniversariantes].sort((a, b) => {
    const statusA = a.mensagem_entregue?.toLowerCase() === 'sim' ? 1 : 0;
    const statusB = b.mensagem_entregue?.toLowerCase() === 'sim' ? 1 : 0;
    return sortOrder === 'asc' ? statusB - statusA : statusA - statusB; 
  });

  // Função para exportar aniversariantes para Excel
  const handleExportExcel = async () => {
    if (!aniversariantes.length) return;

    try {
      // Buscar todas as categorias para mapear UID -> nome
      const categoriaUids = [...new Set(aniversariantes.map(a => a.categoria).filter(Boolean))];
      let categoriaMap: Record<string, string> = {};
      
      if (categoriaUids.length > 0) {
        const { data: categorias } = await supabaseClient
          .from('gbp_categorias')
          .select('uid, nome')
          .in('uid', categoriaUids);
        
        categoriaMap = (categorias || []).reduce((acc, cat) => {
          if (cat.uid) acc[cat.uid] = cat.nome || cat.uid;
          return acc;
        }, {} as Record<string, string>);
      }

      const periodoLabels = {
        dia: 'Hoje',
        ultimos7dias: 'Ultimos_7_Dias',
        mes: 'Este_Mes',
        ano: 'Este_Ano'
      };
      const periodoLabel = periodoLabels[periodoSelecionado as keyof typeof periodoLabels] || periodoSelecionado;
      const today = new Date();
      const fileName = `aniversariantes_${periodoLabel}_${today.getFullYear()}_${today.getMonth() + 1}_${today.getDate()}.xlsx`;

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(`Aniversariantes ${periodoLabel}`);

      sheet.columns = [
        { header: 'Nome', key: 'nome', width: 35 },
        { header: 'WhatsApp', key: 'whatsapp', width: 16 },
        { header: 'Data de Nascimento', key: 'nascimento', width: 18 },
        { header: 'Idade', key: 'idade', width: 8 },
        { header: 'Cidade', key: 'cidade', width: 20 },
        { header: 'Bairro', key: 'bairro', width: 20 },
        { header: 'Mensagem Entregue', key: 'mensagem_entregue', width: 15 },
        { header: 'Categoria', key: 'categoria', width: 15 }
      ];

      sortedAniversariantes.forEach(pessoa => {
        const idade = calcularIdade(pessoa.nascimento);
        const nascimentoFormatado = pessoa.nascimento ? new Date(pessoa.nascimento + 'T12:00:00Z').toLocaleDateString('pt-BR') : '-';
        const categoriaNome = pessoa.categoria ? categoriaMap[pessoa.categoria] || pessoa.categoria : '-';
        
        sheet.addRow({
          nome: pessoa.eleitor_nome || '',
          whatsapp: pessoa.eleitor_whatsapp || '',
          nascimento: nascimentoFormatado,
          idade: idade !== null ? idade : '-',
          cidade: pessoa.eleitor_cidade || '',
          bairro: pessoa.eleitor_bairro || '',
          mensagem_entregue: pessoa.mensagem_entregue || '-',
          categoria: categoriaNome
        });
      });

      // Estilo para o cabeçalho
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F0FF' }
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar aniversariantes Excel:', error);
      alert('Erro ao gerar o arquivo Excel');
    }
  };

  const totalPages = Math.ceil(sortedAniversariantes.length / itemsPerPage);
  
  // Calcular totais e porcentagens
  const totais = sortedAniversariantes.reduce((acc, pessoa) => {
    const status = pessoa.mensagem_entregue?.toLowerCase();
    if (status === 'sim') {
      acc.entregues++;
    } else {
      acc.naoEntregues++;
    }
    return acc;
  }, { entregues: 0, naoEntregues: 0 });

  const total = totais.entregues + totais.naoEntregues;
  const porcentagens = {
    entregues: total > 0 ? ((totais.entregues / total) * 100).toFixed(1) : '0',
    naoEntregues: total > 0 ? ((totais.naoEntregues / total) * 100).toFixed(1) : '0'
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Data inválida';
    try {
      // Criar a data usando UTC para evitar ajustes de timezone
      const date = new Date(dateString + 'T12:00:00Z');

      // Extrair os componentes da data diretamente
      const dia = date.getUTCDate().toString().padStart(2, '0');
      const mes = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const ano = date.getUTCFullYear();

      return `${dia}/${mes}/${ano}`;
    } catch {
      return 'Data inválida';
    }
  };

  const calcularIdade = (nascimento: string | null | undefined): number | null => {
    if (!nascimento) return null;
    try {
      const hoje = new Date();
      const date = new Date(nascimento + 'T12:00:00Z');
      let idade = hoje.getFullYear() - date.getUTCFullYear();
      const mesAtual = hoje.getMonth();
      const diaAtual = hoje.getDate();
      const mesNasc = date.getUTCMonth();
      const diaNasc = date.getUTCDate();
      // Ajusta se o aniversário ainda não ocorreu este ano
      if (mesAtual < mesNasc || (mesAtual === mesNasc && diaAtual < diaNasc)) {
        idade--;
      }
      return idade;
    } catch {
      return null;
    }
  };

  const formatNome = (nomeCompleto: string) => {
    const partes = nomeCompleto.split(' ');
    if (partes.length >= 2) {
      return `${partes[0]} ${partes[partes.length - 1]}`;
    }
    return nomeCompleto;
  };

  const formatWhatsAppLink = (phone: string | null): string | undefined => {
    if (!phone) return undefined;
    // Remove caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    // Adiciona o código do país se não existir
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${fullPhone}`;
  };

  const paginatedData = sortedAniversariantes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-4 pb-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-3 sm:gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-medium dark:text-white">
                Aniversariantes
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  ({aniversariantes.length})
                </span>
              </h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 sm:block hidden">
              Status do envio de mensagens
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            {isAdmin && (
              <button
                onClick={handleExportExcel}
                disabled={!aniversariantes.length}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
            )}
            
            {isAdmin && (
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  onClick={() => onPeriodoChange('dia')}
                  className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                    periodoSelecionado === 'dia'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Hoje
                </button>
                <button
                  onClick={() => onPeriodoChange('ultimos7dias')}
                  className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                    periodoSelecionado === 'ultimos7dias'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  7 dias
                </button>
                <button
                  onClick={() => onPeriodoChange('mes')}
                  className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                    periodoSelecionado === 'mes'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Mês
                </button>
                <button
                  onClick={() => onPeriodoChange('ano')}
                  className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                    periodoSelecionado === 'ano'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Ano
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-2 border-t border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm dark:text-gray-300">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                <span>
                  Sim ({totais.entregues})
                  <span className="sm:hidden text-gray-500 ml-1">
                    {porcentagens.entregues}%
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                <span>
                  Não ({totais.naoEntregues})
                  <span className="sm:hidden text-gray-500 ml-1">
                    {porcentagens.naoEntregues}%
                  </span>
                </span>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-gray-600 pl-4">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>{porcentagens.entregues}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span>{porcentagens.naoEntregues}%</span>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : aniversariantes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Gift className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Nenhum aniversariante {periodoSelecionado === 'dia' ? 'hoje' :
              periodoSelecionado === 'ultimos7dias' ? 'nos últimos 7 dias' :
              periodoSelecionado === 'mes' ? 'este mês' : 'este ano'}</p>
          </div>
        ) : (
          <>
            <div 
              ref={(el) => {
                if (el) {
                  el.style.cssText = 'overflow-x: scroll; overflow-y: visible; -webkit-overflow-scrolling: touch; width: 100%; position: relative;';
                  
                  // Touch event handlers for mobile scroll
                  let startX = 0;
                  let startY = 0;
                  let scrollLeft = 0;
                  let isHorizontalScroll = false;
                  
                  el.addEventListener('touchstart', (e) => {
                    startX = e.touches[0].pageX - el.offsetLeft;
                    startY = e.touches[0].pageY;
                    scrollLeft = el.scrollLeft;
                    isHorizontalScroll = false;
                  });
                  
                  el.addEventListener('touchmove', (e) => {
                    const x = e.touches[0].pageX - el.offsetLeft;
                    const y = e.touches[0].pageY;
                    const deltaX = Math.abs(x - startX);
                    const deltaY = Math.abs(y - startY);
                    
                    if (!isHorizontalScroll && deltaX < 10 && deltaY < 10) {
                      return;
                    }
                    
                    if (!isHorizontalScroll) {
                      isHorizontalScroll = deltaX > deltaY;
                    }
                    
                    if (isHorizontalScroll) {
                      e.preventDefault();
                      const walk = (x - startX) * 2;
                      el.scrollLeft = scrollLeft - walk;
                    }
                  }, { passive: false });
                }
              }}
            >
              <table style={{ minWidth: '700px', width: '100%', borderCollapse: 'collapse', userSelect: 'none' }}>
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300">Nome</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300">WhatsApp</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300">
                      <span className="hidden sm:inline">Nascimento</span>
                      <span className="sm:hidden">Data</span>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                      onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      title="Clique para ordenar"
                    >
                      <div className="flex items-center gap-1">
                        <span>Entregue</span>
                        <ChevronUp 
                          className={`w-4 h-4 transition-transform ${
                            sortOrder === 'desc' ? '' : 'transform rotate-180'
                          }`}
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedData.map((pessoa) => (
                    <tr 
                      key={pessoa.uid}
                      className={`${
                        pessoa.mensagem_entregue?.toLowerCase() === 'sim'
                          ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                          : 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                      } transition-colors`}
                    >
                      <td className="px-4 py-3 text-sm font-medium dark:text-gray-200">
                        <Link
                          to={`/app/eleitores/${pessoa.eleitor_uid}`}
                          className={`truncate max-w-[150px] sm:max-w-none hover:underline ${
                            pessoa.mensagem_entregue?.toLowerCase() === 'sim'
                              ? 'hover:text-green-700'
                              : 'hover:text-red-700'
                          }`}
                        >
                          {formatNome(pessoa.eleitor_nome)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm dark:text-gray-300">
                        {pessoa.eleitor_whatsapp ? (
                          <a
                            href={formatWhatsAppLink(pessoa.eleitor_whatsapp)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`hover:underline ${
                              pessoa.mensagem_entregue?.toLowerCase() === 'sim'
                                ? 'hover:text-green-700'
                                : 'hover:text-red-700'
                            }`}
                          >
                            {pessoa.eleitor_whatsapp}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap dark:text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <span>{formatDate(pessoa.nascimento)}</span>
                          {(() => {
                            const idade = calcularIdade(pessoa.nascimento);
                            if (idade !== null) {
                              return (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                                  {idade} anos
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            pessoa.mensagem_entregue?.toLowerCase() === 'sim'
                              ? 'bg-green-500'
                              : 'bg-red-500'
                          }`}></div>
                          <span className={`${
                            pessoa.mensagem_entregue?.toLowerCase() === 'sim'
                              ? 'text-green-700 dark:text-green-400'
                              : 'text-red-700 dark:text-red-400'
                          }`}>
                            {pessoa.mensagem_entregue?.toLowerCase() === 'sim'
                              ? 'Sim'
                              : 'Não'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 gap-3">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[40px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
