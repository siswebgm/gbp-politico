import { useState } from 'react';
import { Gift, ChevronLeft, ChevronRight, Info, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BirthdayPerson {
  uid: string;
  eleitor_uid: string;
  created_at: string;
  eleitor_nome: string;
  eleitor_whatsapp: string;
  eleitor_bairro: string;
  eleitor_cidade: string;
  eleitor_uf: string;
  categoria: string;
  mensagem_tipo: string;
  mensagem_entregue: string;
  mensagem_comentario: string;
  mensagem_perdida: string;
  indicado: string;
  responsavel: string;
  nascimento: string;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); 
  const itemsPerPage = 7;

  // Ordenar aniversariantes
  const sortedAniversariantes = [...aniversariantes].sort((a, b) => {
    const statusA = a.mensagem_entregue?.toLowerCase() === 'sim' ? 1 : 0;
    const statusB = b.mensagem_entregue?.toLowerCase() === 'sim' ? 1 : 0;
    return sortOrder === 'asc' ? statusB - statusA : statusA - statusB; 
  });

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

  const formatDate = (dateString: string) => {
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

  const formatNome = (nomeCompleto: string) => {
    const partes = nomeCompleto.split(' ');
    if (partes.length >= 2) {
      return `${partes[0]} ${partes[partes.length - 1]}`;
    }
    return nomeCompleto;
  };

  const formatWhatsAppLink = (phone: string) => {
    if (!phone) return null;
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
          
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => onPeriodoChange('dia')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md ${
                periodoSelecionado === 'dia'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => onPeriodoChange('semana')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md ${
                periodoSelecionado === 'semana'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => onPeriodoChange('mes')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md ${
                periodoSelecionado === 'mes'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Mês
            </button>
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
              periodoSelecionado === 'semana' ? 'esta semana' : 'este mês'}</p>
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300">
                      <span className="hidden sm:inline">Nascimento</span>
                      <span className="sm:hidden">Data</span>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300">Nome</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300">WhatsApp</th>
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300">Ações</th>
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
                      <td className="px-4 py-3 text-sm whitespace-nowrap dark:text-gray-300">
                        {formatDate(pessoa.nascimento)}
                      </td>
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
                      <td className="px-4 py-3 text-sm dark:text-gray-300">
                        <button
                          type="button"
                          onClick={() => {}}
                          className={`p-2 rounded-full transition-colors ${
                            pessoa.mensagem_entregue?.toLowerCase() === 'sim'
                              ? 'hover:bg-green-200'
                              : 'hover:bg-red-200'
                          }`}
                        >
                          <Info className="w-4 h-4" />
                        </button>
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
