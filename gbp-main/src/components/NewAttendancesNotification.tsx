import { useState, useEffect, useCallback, useMemo } from 'react';
import { Bell, X, CheckCircle, XCircle, Clock, Download, ChevronUp, ChevronDown } from 'lucide-react';
import { supabaseClient } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';
import { useAuthStore } from '../store/useAuthStore';
import { generateAtendimentosDiaPDF } from '../utils/pdfGenerator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NewAttendance {
  uid: string;
  eleitor: string | null;
  eleitor_uid?: string | null;
  created_at: string;
  status: string | null;
  data_atendimento: string | null;
  responsavel: string | null;
  observacoes?: string;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  whatsapp?: string | null;
  categoria_uid?: any;
  descricao?: string | null;
  tipo_de_atendimento?: string | null;
  data_agendamento?: string | null;
  data_expiração?: string | null;
  indicado?: string | null;
}

export function NewAttendancesNotification() {
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [newAttendances, setNewAttendances] = useState<NewAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const company = useCompanyStore((state) => state.company);
  const user = useAuthStore((state) => state.user);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Verifica se o usuário tem permissão para exportar PDF
  const canExportPDF = useMemo(() => {
    return user?.nivel_acesso === 'admin' || user?.nivel_acesso === 'coordenador';
  }, [user]);
  
  // Filtrar atendimentos pelo status
  const filteredAttendances = useMemo(() => {
    if (!statusFilter) return newAttendances;
    return newAttendances.filter(att => att.status?.toLowerCase() === statusFilter.toLowerCase());
  }, [newAttendances, statusFilter]);

  // Alternar filtro de status
  const toggleStatusFilter = useCallback((status: string | null) => {
    setStatusFilter(prev => prev === status ? null : status);
  }, []);

  // Contar atendimentos por status
  const statusCounts = useMemo(() => {
    return newAttendances.reduce((acc, { status }) => {
      const statusKey = status?.toLowerCase() || 'pendente';
      acc[statusKey] = (acc[statusKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [newAttendances]);
  
  // Obter contagem para um status específico
  const getStatusCount = (status: string) => statusCounts[status.toLowerCase()] || 0;
  
  // Alternar estado de minimização
  const handleMinimizeToggle = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);
  
  // Fechar o componente
  const onClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Função para verificar se a data é de hoje
  const isTodayDate = (dateString: string | null) => {
    if (!dateString) return false;
    try {
      const date = new Date(dateString);
      const today = new Date();
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear();
    } catch (error) {
      console.error('Erro ao verificar data:', error);
      return false;
    }
  };

  // Função para formatar o status
  const formatStatus = (status: string | null) => {
    if (!status) return 'Pendente';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  // Carregar atendimentos do dia
  const fetchTodayAttendances = useCallback(async () => {
    if (!company?.uid) return;

    try {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      // Converter para o fuso horário local
      const startISO = startOfDay.toISOString();
      const endISO = endOfDay.toISOString();

      const { data, error } = await supabaseClient
        .from('gbp_atendimentos')
        .select('uid, eleitor, created_at, status, data_atendimento, responsavel')
        .eq('empresa_uid', company.uid)
        .gte('data_atendimento', startISO)
        .lte('data_atendimento', endISO)
        .order('data_atendimento', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      setNewAttendances(data || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Erro ao buscar atendimentos recentes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [company?.uid]);

  // Carregar atendimentos iniciais
  useEffect(() => {
    fetchTodayAttendances();
    
    // Atualizar a cada minuto para garantir sincronização
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      fetchTodayAttendances();
    }, 60000); // 1 minuto

    return () => clearInterval(interval);
  }, [fetchTodayAttendances]);

  // Inscrever para novas atualizações em tempo real
  useEffect(() => {
    if (!company?.uid) return;

    const subscription = supabaseClient
      .channel('new_attendances')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gbp_atendimentos',
          filter: `empresa_uid=eq.${company.uid}`
        },
        async (payload) => {
          const newAttendance = payload.new as NewAttendance;
          if (isTodayDate(newAttendance.data_atendimento || newAttendance.created_at)) {
            // Buscar os dados completos do atendimento para garantir que temos todos os campos
            const { data } = await supabaseClient
              .from('gbp_atendimentos')
              .select('uid, eleitor, created_at, status, data_atendimento, responsavel')
              .eq('uid', newAttendance.uid)
              .single();
              
            if (data) {
              setNewAttendances(prev => [data, ...prev].slice(0, 50));
              setLastUpdate(new Date());
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [company?.uid]);

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleExportPDF = async () => {
    try {
      // Buscar dados completos dos atendimentos
      const atendimentosCompletos = await Promise.all(
        newAttendances.map(async (atend) => {
          // Buscar dados adicionais do atendimento
          const { data: atendimentoCompleto } = await supabaseClient
            .from('gbp_atendimentos')
            .select(`
              *,
              categoria:categoria_uid (nome)
            `)
            .eq('uid', atend.uid)
            .single();

          // Buscar dados do eleitor se tiver o UID
          let eleitorData: { 
            whatsapp?: string; 
            telefone?: string; 
            endereco?: string;
            logradouro?: string;
            bairro?: string;
            cidade?: string;
            uf?: string;
            cep?: string;
            numero_do_sus?: string;
            cpf?: string;
          } = {};
          
          if (atend.eleitor_uid) {
            const { data } = await supabaseClient
              .from('gbp_eleitores')
              .select('*')
              .eq('uid', atend.eleitor_uid)
              .single();
            if (data) eleitorData = data;
          }

          // Formatar endereço completo
          const enderecoCompleto = [
            atendimentoCompleto?.logradouro,
            atendimentoCompleto?.numero,
            atendimentoCompleto?.complemento,
            atendimentoCompleto?.bairro,
            atendimentoCompleto?.cidade,
            atendimentoCompleto?.uf,
            atendimentoCompleto?.cep
          ]
            .filter(Boolean)
            .join(', ');

          return {
            nome: atend.eleitor || 'N/A',
            categoria: atendimentoCompleto?.categoria?.nome || 'Sem categoria',
            data: atendimentoCompleto?.data_atendimento || atend.created_at,
            status: atend.status || 'Pendente',
            telefone: atendimentoCompleto?.whatsapp || 
                     eleitorData?.whatsapp || 
                     eleitorData?.telefone || 
                     'Não informado',
            endereco: enderecoCompleto || 'Não informado',
            observacoes: atendimentoCompleto?.descricao || 'Sem observações',
            // Dados adicionais do eleitor
            logradouro: atendimentoCompleto?.logradouro || eleitorData?.logradouro || '',
            bairro: atendimentoCompleto?.bairro || eleitorData?.bairro || '',
            cidade: atendimentoCompleto?.cidade || eleitorData?.cidade || '',
            uf: atendimentoCompleto?.uf || eleitorData?.uf || '',
            cep: atendimentoCompleto?.cep || eleitorData?.cep || '',
            numero_do_sus: eleitorData?.numero_do_sus || '',
            cpf: eleitorData?.cpf || '',
            // Campos adicionais da tabela
            data_agendamento: atendimentoCompleto?.data_agendamento || null,
            data_expiração: atendimentoCompleto?.data_expiração || null,
            responsavel: atendimentoCompleto?.responsavel || 'Não informado',
            indicado: atendimentoCompleto?.indicado || 'Não informado',
            tipo_atendimento: atendimentoCompleto?.tipo_de_atendimento || 'Não especificado'
          };
        })
      );

      generateAtendimentosDiaPDF(atendimentosCompletos);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      // Se der erro, gera o PDF apenas com os dados básicos
      const dadosBasicos = newAttendances.map(atend => ({
        nome: atend.eleitor || 'N/A',
        categoria: 'Atendimento',
        data: atend.created_at,
        status: atend.status || 'Pendente',
        telefone: 'Erro ao carregar',
        endereco: 'Erro ao carregar',
        observacoes: 'Não foi possível carregar os detalhes completos',
        data_agendamento: null,
        data_expiração: null,
        responsavel: 'Não informado',
        indicado: 'Não informado',
        tipo_atendimento: 'Não especificado'
      }));
      generateAtendimentosDiaPDF(dadosBasicos);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 right-0 left-0 sm:left-auto sm:bottom-4 sm:right-4 z-50 w-full sm:w-auto sm:max-w-md lg:max-w-lg xl:max-w-xl px-2 sm:px-0">
      <div className="bg-white rounded-t-lg sm:rounded-lg shadow-xl overflow-hidden border border-b-0 sm:border-b border-gray-200 w-full">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-3 sm:px-4 py-2 sm:py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center min-w-0 flex-1">
              <div className="relative">
                <div className="relative bg-white/20 p-1.5 rounded-full flex-shrink-0 mr-2">
                  <Bell className="h-4 w-4 text-white" />
                  {newAttendances.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-sm border border-white">
                      {newAttendances.length}
                    </span>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 overflow-hidden">
                  <h2 className="text-white font-semibold text-base truncate">Atendimentos do Dia</h2>
                  <span className="text-blue-100 text-xs font-medium whitespace-nowrap">
                    {format(new Date(), 'dd/MM/yyyy')}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {canExportPDF && newAttendances.length > 0 && (
                <button
                  onClick={handleExportPDF}
                  className="text-white hover:bg-blue-700 focus:outline-none p-1.5 rounded transition-colors flex items-center justify-center w-8 h-8"
                  aria-label="Exportar PDF"
                  title="Exportar PDF"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={handleMinimizeToggle}
                className="text-white hover:bg-blue-700 focus:outline-none p-1.5 rounded transition-colors flex items-center justify-center w-8 h-8"
                aria-label={isMinimized ? 'Expandir' : 'Minimizar'}
                title={isMinimized ? 'Expandir' : 'Minimizar'}
              >
                {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <button
                onClick={onClose}
                className="text-white hover:bg-blue-700 focus:outline-none p-1.5 rounded transition-colors flex items-center justify-center w-8 h-8"
                aria-label="Fechar"
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        
        {!isMinimized && (
          <div className="bg-gray-50 p-2 border-b border-gray-200">
            <div className="grid grid-cols-3 gap-3">
              <div 
                onClick={() => toggleStatusFilter('concluído')}
                className={`border rounded-md p-1.5 text-center cursor-pointer transition-colors ${
                  statusFilter === 'concluído' 
                    ? 'bg-green-100 border-green-300 shadow-sm' 
                    : 'bg-green-50 border-green-100 hover:bg-green-50/80'
                }`}
              >
                <div className="text-green-800 font-bold text-sm sm:text-base">{getStatusCount('concluído')}</div>
                <div className="text-green-600 text-xs leading-tight mt-0.5">Concluídos</div>
              </div>
              <div 
                onClick={() => toggleStatusFilter('em andamento')}
                className={`border rounded-md p-1.5 text-center cursor-pointer transition-colors ${
                  statusFilter === 'em andamento' 
                    ? 'bg-blue-100 border-blue-300 shadow-sm' 
                    : 'bg-blue-50 border-blue-100 hover:bg-blue-50/80'
                }`}
              >
                <div className="text-blue-800 font-bold text-sm sm:text-base">{getStatusCount('em andamento')}</div>
                <div className="text-blue-600 text-xs leading-tight mt-0.5">Em Andamento</div>
              </div>
              <div 
                onClick={() => toggleStatusFilter('pendente')}
                className={`border rounded-md p-1.5 text-center cursor-pointer transition-colors ${
                  statusFilter === 'pendente' 
                    ? 'bg-yellow-100 border-yellow-300 shadow-sm' 
                    : 'bg-yellow-50 border-yellow-100 hover:bg-yellow-50/80'
                }`}
              >
                <div className="text-yellow-800 font-bold text-sm sm:text-base">{getStatusCount('pendente')}</div>
                <div className="text-yellow-600 text-xs leading-tight mt-0.5">Pendentes</div>
              </div>
            </div>
          </div>
        )}
        
        {!isMinimized && (
          <div className="bg-white max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Carregando...</div>
            ) : filteredAttendances.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>Nenhum atendimento hoje</p>
                <p className="text-xs mt-1">Atualizado às {format(lastUpdate, 'HH:mm')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredAttendances.length === 0 ? (
                  <div className="p-3 text-center text-gray-500 text-sm">
                    Nenhum atendimento {statusFilter ? `com status "${statusFilter}"` : 'encontrado'}
                  </div>
                ) : (
                  filteredAttendances.map((attendance) => (
                  <li key={attendance.uid} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center ${
                        attendance.status?.toLowerCase() === 'concluído' 
                          ? 'bg-green-100 text-green-600' 
                          : attendance.status?.toLowerCase() === 'em andamento'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-yellow-100 text-yellow-600'
                      }`}>
                        {attendance.status?.toLowerCase() === 'concluído' ? (
                          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {attendance.eleitor || 'Atendimento sem nome'}
                        </p>
                        <p className="text-xs text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis mt-1">
                          {format(new Date(attendance.data_atendimento || attendance.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5 overflow-hidden">
                          <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                            attendance.status?.toLowerCase() === 'concluído'
                              ? 'bg-green-100 text-green-800'
                              : attendance.status?.toLowerCase() === 'em andamento'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {formatStatus(attendance.status)}
                          </span>
                          {attendance.responsavel && (
                            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-purple-100 text-purple-800 truncate max-w-[120px] sm:max-w-none">
                              {attendance.responsavel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                )))}
              </ul>
            )}
            <div className="bg-gray-50 px-3 sm:px-4 py-2 sm:py-3 text-right">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  Atualizado {format(lastUpdate, 'HH:mm')}
                </span>
              <a 
                href="/app/atendimentos" 
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Ver todos os atendimentos →
              </a>
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
