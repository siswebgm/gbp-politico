import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar } from "../../components/ui/calendar";
import { ptBR } from 'date-fns/locale';
import { format, isAfter, isBefore, isToday, startOfToday, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isPast } from 'date-fns';
import { Button } from "../../components/ui/button";
import { NewEventPanel } from './components/NewEventPanel';
import { useAgenda } from "../../hooks/useAgenda";
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import { cn } from '../../lib/utils';
import { 
  CalendarIcon, 
  Clock, 
  MapPin, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Menu,
  Calendar as CalendarViewIcon,
  CalendarDays,
  CalendarRange,
  List,
  ArrowRight,
  Pencil,
  Trash2,
  Users,
  MoreVertical,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Filter
} from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useAuth } from "../../hooks/useAuth";
import { useCompanyStore } from "../../store/useCompanyStore";
import { googleCalendarService, GoogleConnectionStatus, GoogleAgendaEvent } from "../../services/googleCalendar";
import { Link2, Unlink, AlertTriangle } from 'lucide-react';

export default function AgendaPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'all' | 'expired' | 'active' | 'year' | 'past-years'>('all');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('calendar');
  const [initialDate, setInitialDate] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(3);
  const selectedEventRef = useRef<HTMLDivElement>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<any>(null);
  const [eventToEdit, setEventToEdit] = useState<any>(null);
  // Painel inline de edição (criação acontece na página /app/agenda/novaagenda)
  const isCreatingEvent = !!eventToEdit;
  const fecharPainelEvento = () => setEventToEdit(null);
  
  const { user } = useAuth();
  const company = useCompanyStore(state => state.company);
  // O usuário da store tem uid+cargo sempre; o do useAuth pode ser
  // um objeto do localStorage sem uid
  const storeUser = useCompanyStore((state: any) => state.user);
  const googleUser = storeUser?.uid ? storeUser : user;
  const isAdmin =
    (googleUser?.nivel_acesso || '').toLowerCase() === 'admin' ||
    (googleUser?.cargo || '').toLowerCase() === 'admin';
  const { events, isLoading, deleteEvent } = useAgenda();

  // ---- Integração Google Calendar (conexão por empresa) ----
  const [googleStatus, setGoogleStatus] = useState<GoogleConnectionStatus | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<GoogleAgendaEvent[]>([]);

  // A sync do Google é incremental: retorna só o que mudou.
  // Mescla no estado por google_id e remove os deletados.
  const aplicarDeltaGoogle = (s: { events?: GoogleAgendaEvent[]; deleted?: string[] }) => {
    setGoogleEvents(prev => {
      const map = new Map(prev.map(g => [g.google_id, g]));
      (s.events || []).forEach(g => map.set(g.google_id, g));
      (s.deleted || []).forEach(id => map.delete(id));
      return [...map.values()];
    });
  };

  const sincronizarGoogle = async (full = false): Promise<boolean> => {
    if (!company?.uid || !googleUser?.uid || !googleStatus?.connected || googleStatus?.needs_reconnect) return false;
    try {
      const s = await googleCalendarService.sync(company.uid, googleUser.uid, full);
      if (full) {
        // Sync completa: a resposta é a janela inteira — substitui
        setGoogleEvents(s.events || []);
      } else {
        aplicarDeltaGoogle(s);
      }
      return true;
    } catch (e: any) {
      console.warn('[agenda] google sync:', e);
      if (/insufficient authentication scopes/i.test(e?.message || '')) {
        marcarNeedsReconnect();
      }
      return false;
    }
  };

  // Fallback: se o push-api ainda não expõe needs_reconnect no /status,
  // o próprio erro 502 do Google revela a falta de escopo → flag local.
  const marcarNeedsReconnect = () => {
    setGoogleStatus(prev => (prev ? { ...prev, needs_reconnect: true } : prev));
    toast.warn(
      'A conexão com o Google Agenda está sem permissão de agenda. Desconecte e conecte novamente marcando a caixa do Google Agenda.',
      { toastId: 'google-needs-reconnect', autoClose: 8000 },
    );
  };

  // Fecha o menu de ações ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setShowActionsMenu(false);
    if (showActionsMenu) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showActionsMenu]);

  // Polling: puxa mudanças do Google a cada 45s e ao voltar pra aba
  useEffect(() => {
    if (!googleStatus?.connected || googleStatus?.needs_reconnect) return;
    const interval = setInterval(sincronizarGoogle, 45_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') sincronizarGoogle();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleStatus?.connected, googleStatus?.needs_reconnect, company?.uid, googleUser?.uid]);

  const carregarStatusGoogle = async () => {
    if (!company?.uid || !googleUser?.uid) {
      console.log('[agenda] google status skip:', { empresa: company?.uid, usuario: googleUser?.uid });
      return;
    }
    try {
      const st = await googleCalendarService.status(company.uid, googleUser.uid);
      setGoogleStatus(st);
      console.log('[agenda] google status OK:', st, '| isAdmin:', isAdmin, '| cargo:', googleUser?.cargo, '| nivel_acesso:', googleUser?.nivel_acesso);
      if (st?.connected && st?.needs_reconnect) {
        toast.warn(
          'A conexão com o Google Agenda está sem permissão de agenda. Desconecte e conecte novamente marcando a caixa do Google Agenda.',
          { toastId: 'google-needs-reconnect', autoClose: 8000 },
        );
      }
      if (st?.connected && !st?.needs_reconnect) {
        try {
          const s = await googleCalendarService.sync(company.uid, googleUser.uid, true);
          setGoogleEvents(s.events || []);
        } catch (e: any) {
          console.warn('[agenda] google sync:', e);
          if (/insufficient authentication scopes/i.test(e?.message || '')) {
            marcarNeedsReconnect();
          }
        }
      } else if (!st?.connected) {
        setGoogleEvents([]);
      }
    } catch (e) {
      console.error('[agenda] google status:', e);
      setGoogleStatus(null); // push-api sem integração configurada
    }
  };

  const conectarGoogle = async () => {
    if (!company?.uid || !googleUser?.uid) return;
    setGoogleLoading(true);
    try {
      const { url } = await googleCalendarService.authUrl(company.uid, googleUser.uid);
      window.location.href = url; // OAuth do Google
    } catch (e: any) {
      alert(e?.message || 'Falha ao iniciar conexão com o Google');
      setGoogleLoading(false);
    }
  };

  const desconectarGoogle = async () => {
    if (!company?.uid || !googleUser?.uid) return;
    setGoogleLoading(true);
    try {
      await googleCalendarService.disconnect(company.uid, googleUser.uid);
      setGoogleStatus({ connected: false, google_email: null, google_name: null, calendar_id: null });
      setGoogleEvents([]);
      setShowDisconnectModal(false);
      toast.success('Google Agenda desconectado.');
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao desconectar');
    } finally {
      setGoogleLoading(false);
    }
  };

  const getEventStatus = (event: any) => {
    const now = new Date();
    const eventDate = new Date(event.start_time);
    return {
      isExpired: eventDate < now,
      isToday: format(eventDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd'),
      isFuture: eventDate > now
    };
  };

  const getEventColor = (event: any) => {
    const eventDate = new Date(event.start_time);
    
    if (isPast(eventDate) && !isToday(eventDate)) {
      return "text-gray-500 text-xs";
    }
    
    if (isToday(eventDate)) {
      return "text-blue-600 text-xs";
    }
    
    return "text-emerald-600 text-xs";
  };

  // Eventos do app + eventos vindos do Google (sem duplicar os já vinculados)
  const mergedEvents = useMemo<any[]>(() => {
    const linkedGoogleIds = new Set(
      (events || []).map((e: any) => e.google_event_id).filter(Boolean)
    );
    const onlyGoogle = googleEvents
      .filter(g => !linkedGoogleIds.has(g.google_id))
      .map(g => {
        // Evento all_day do Google vem como 'YYYY-MM-DD' — força meio-dia
        // local para não cair no dia anterior no fuso -03:00
        const toDate = (v: string) =>
          v && !v.includes('T') ? new Date(`${v}T12:00:00`) : new Date(v);
        return {
          ...g,
          start_time: toDate(g.start_time),
          end_time: toDate(g.end_time),
        };
      });
    return [...events, ...onlyGoogle];
  }, [events, googleEvents]);

  // Dias que têm pelo menos 1 evento (marca bolinha no mini calendário)
  const diasComEvento = useMemo(() => {
    return new Set(mergedEvents.map(e => format(new Date(e.start_time), 'yyyy-MM-dd')));
  }, [mergedEvents]);

  // Estatísticas rápidas e próximos compromissos (sidebar)
  const agendaStats = useMemo(() => {
    const now = new Date();
    const semanaIni = startOfWeek(now, { weekStartsOn: 1 });
    const semanaFim = endOfWeek(now, { weekStartsOn: 1 });
    return {
      hoje: mergedEvents.filter(e => isToday(new Date(e.start_time))).length,
      semana: mergedEvents.filter(e => {
        const d = new Date(e.start_time);
        return d >= semanaIni && d <= semanaFim;
      }).length,
      vencidos: mergedEvents.filter(e => isPast(new Date(e.end_time || e.start_time))).length,
      google: mergedEvents.filter(e => e.origem === 'google').length,
    };
  }, [mergedEvents]);

  const proximosEventos = useMemo(() => {
    const now = new Date();
    return mergedEvents
      .filter(e => new Date(e.start_time) >= now || isToday(new Date(e.start_time)))
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, 5);
  }, [mergedEvents]);

  const filteredEvents = useMemo(() => {
    if (!mergedEvents) return [];

    // Se houver um evento selecionado, mostrar apenas ele
    if (selectedEventId && activeTab === 'list') {
      const selectedEvent = mergedEvents.find(e => e.uid === selectedEventId);
      return selectedEvent ? [selectedEvent] : [];
    }

    let filtered = [...mergedEvents];
    const now = new Date();
    const startOfWeekDate = startOfWeek(now, { weekStartsOn: 1 }); // Segunda-feira
    const endOfWeekDate = endOfWeek(now, { weekStartsOn: 1 });
    const startOfMonthDate = startOfMonth(now);
    const endOfMonthDate = endOfMonth(now);

    switch (selectedPeriod) {
      case 'expired':
        filtered = filtered.filter((event) => {
          const eventDate = new Date(event.start_time);
          const now = new Date();
          return isBefore(eventDate, now);
        });
        break;
      case 'active':
        filtered = filtered.filter((event) => {
          const eventDate = new Date(event.start_time);
          const now = new Date();
          return isAfter(eventDate, now);
        });
        break;
      case 'day':
        filtered = filtered.filter((event) => {
          const eventDate = new Date(event.start_time);
          return isToday(eventDate);
        });
        break;
      case 'week':
        filtered = filtered.filter((event) => {
          const eventDate = new Date(event.start_time);
          return isAfter(eventDate, startOfWeekDate) && isBefore(eventDate, endOfWeekDate);
        });
        break;
      case 'month':
        filtered = filtered.filter((event) => {
          const eventDate = new Date(event.start_time);
          return isAfter(eventDate, startOfMonthDate) && isBefore(eventDate, endOfMonthDate);
        });
        break;
      case 'year':
        filtered = filtered.filter((event) => {
          const eventDate = new Date(event.start_time);
          return eventDate.getFullYear() === now.getFullYear();
        });
        break;
      case 'past-years':
        filtered = filtered.filter((event) => {
          const eventDate = new Date(event.start_time);
          return eventDate.getFullYear() < now.getFullYear();
        });
        break;
      case 'all':
        // Mantém todos os eventos
        break;
    }

    // Ordenar por data, com eventos mais próximos primeiro
    filtered.sort((a, b) => {
      const dateA = new Date(a.start_time);
      const dateB = new Date(b.start_time);
      const now = new Date();

      // Eventos passados vão para o final
      if (dateA < now && dateB >= now) return 1;
      if (dateB < now && dateA >= now) return -1;

      // Entre eventos futuros ou entre eventos passados, ordenar por proximidade
      const diffA = Math.abs(dateA.getTime() - now.getTime());
      const diffB = Math.abs(dateB.getTime() - now.getTime());
      return diffA - diffB;
    });

    return filtered;
  }, [mergedEvents, selectedPeriod, selectedEventId, activeTab]);

  // Paginação
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredEvents.slice(startIndex, endIndex);
  }, [filteredEvents, currentPage, itemsPerPage]);

  // Reset página quando filtro mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPeriod]);

  const exportToExcel = () => {
    const eventsToExport = filteredEvents.map(event => ({
      Título: event.title || '',
      Data: event.start_time ? format(new Date(event.start_time), 'dd/MM/yyyy') : '',
      Horário: event.start_time ? format(new Date(event.start_time), 'HH:mm') : '',
      Local: event.location || '',
      Descrição: event.description || '',
      Prioridade: event.prioridade || '',
      Tipo: event.type || '',
      Status: event.task_status || '',
      Usuário: event.usuario_nome || '',
      Participantes: event.attendees ? event.attendees.map(attendee => attendee.name).join(', ') : '',
      AtualizadoEm: event.updated_at ? format(new Date(event.updated_at), 'dd/MM/yyyy HH:mm') : ''
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Agendamentos');

    // Adicionar cabeçalhos
    worksheet.columns = [
      { header: 'Título', key: 'Título', width: 30 },
      { header: 'Data', key: 'Data', width: 15 },
      { header: 'Horário', key: 'Horário', width: 15 },
      { header: 'Local', key: 'Local', width: 20 },
      { header: 'Descrição', key: 'Descrição', width: 40 },
      { header: 'Prioridade', key: 'Prioridade', width: 15 },
      { header: 'Tipo', key: 'Tipo', width: 15 },
      { header: 'Status', key: 'Status', width: 15 },
      { header: 'Usuário', key: 'Usuário', width: 20 },
      { header: 'Participantes', key: 'Participantes', width: 40 },
      { header: 'Atualizado Em', key: 'AtualizadoEm', width: 20 }
    ];

    // Adicionar dados
    eventsToExport.forEach(event => {
      worksheet.addRow([
        event.Título,
        event.Data,
        event.Horário,
        event.Local,
        event.Descrição,
        event.Prioridade,
        event.Tipo,
        event.Status,
        event.Usuário,
        event.Participantes,
        event.AtualizadoEm
      ]);
    });

    // Formatar a primeira linha (cabeçalhos)
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4F81BD' },
        bgColor: { argb: '4F81BD' }
      };
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { horizontal: 'center' };
    });

    // Auto ajustar colunas
    worksheet.columns.forEach(column => {
      column.autoFilter = true;
    });

    // Gerar arquivo
    workbook.xlsx.writeBuffer().then((data) => {
      const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `agendamentos_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    });
  };

  const exportToPDF = () => {
    const eventsToExport = filteredEvents.map(event => ({
      Título: event.title || '',
      Data: event.start_time ? format(new Date(event.start_time), 'dd/MM/yyyy') : '',
      Horário: event.start_time ? format(new Date(event.start_time), 'HH:mm') : '',
      Local: event.location || '',
      Descrição: event.description || ''
    }));

    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text('Agendamentos', 105, 20, { align: 'center' });
    doc.setFontSize(12);

    const tableData = eventsToExport.map(event => [
      event.Título,
      event.Data,
      event.Horário,
      event.Local,
      event.Descrição
    ]);

    doc.autoTable({
      head: [['Título', 'Data', 'Horário', 'Local', 'Descrição']],
      body: tableData,
      startY: 30,
      styles: {
        fontSize: 8,
        halign: 'left',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 10
      },
      margin: { top: 10, left: 10, right: 10, bottom: 10 },
      columnStyles: {
        0: { cellWidth: 40 },     // Título
        1: { cellWidth: 25 },     // Data
        2: { cellWidth: 20 },     // Horário
        3: { cellWidth: 30 },     // Local
        4: { cellWidth: 80 }      // Descrição (maior espaço)
      }
    });

    // Adiciona rodapé com número de páginas
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    // Salva o arquivo
    doc.save(`agendamentos_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'BAIXA':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
      case 'MEDIA':
        return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200';
      case 'ALTA':
        return 'bg-orange-100 text-orange-700 hover:bg-orange-200';
      case 'URGENTE':
        return 'bg-red-100 text-red-700 hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    }
  };

  const handleEventClick = (event: any) => {
    const eventDate = new Date(event.start_time);
    setSelectedDate(eventDate);
    setSelectedEventId(event.uid);
    setActiveTab('list');
    
    // Definir período como 'all' para mostrar apenas o evento selecionado
    // O filtro será aplicado no useMemo de filteredEvents
    setSelectedPeriod('all');
    setCurrentPage(1);
    
    // Scroll para o evento após renderização
    setTimeout(() => {
      // 'nearest' evita rolar o <main> junto (block:'center' revelava
      // espaço morto no fim da página ao clicar num evento)
      selectedEventRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const handleDateClick = (date: Date) => {
    setEventToEdit(null);
    setInitialDate(date);
    navigate(`/app/agenda/novaagenda?data=${format(date, 'yyyy-MM-dd')}`);
  };

  const handleDeleteClick = (event: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEventToDelete(event);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (eventToDelete) {
      try {
        if (eventToDelete.origem === 'google' && eventToDelete.google_id) {
          // Evento só existe no Google — apaga direto lá
          if (company?.uid && googleUser?.uid) {
            await googleCalendarService.deleteEvent(company.uid, googleUser.uid, eventToDelete.google_id);
          }
          setGoogleEvents(prev => prev.filter(g => g.google_id !== eventToDelete.google_id));
        } else {
          await deleteEvent.mutateAsync(eventToDelete.uid);
        }
        setShowDeleteModal(false);
        setEventToDelete(null);
        setSelectedEventId(null);
      } catch (error) {
        console.error('Erro ao deletar evento:', error);
      }
    }
  };

  const handleEditClick = (event: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEventToEdit(event);
  };

  useEffect(() => {
    if (selectedEventId && activeTab === 'list') {
      selectedEventRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedEventId, activeTab]);

  // Status da conexão Google + trata retorno do OAuth (?google=conectado|erro_*)
  useEffect(() => {
    carregarStatusGoogle();
    const params = new URLSearchParams(window.location.search);
    const g = params.get('google');
    if (g) {
      if (g === 'conectado') {
        carregarStatusGoogle();
      } else if (g.startsWith('erro')) {
        alert('Não foi possível conectar ao Google Agenda. Tente novamente.');
      }
      params.delete('google');
      const qs = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.uid, googleUser?.uid]);

  return (
    <div className="bg-gray-50">
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="pb-1">
            <div className="mx-auto p-2.5">
              {/* Filtros e Ações */}
              <div className="bg-white rounded-lg shadow-sm">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4">
                  {/* Título e Descrição */}
                  <div className="flex items-center gap-4">
                    {/* Botão Voltar */}
                    <Link
                      to="/app"
                      className="inline-flex items-center justify-center w-10 h-10 text-gray-700 hover:text-gray-900"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Link>

                    {/* Ícone + Título e Subtítulo */}
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex items-center justify-center w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
                        <CalendarViewIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          Agenda
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {filteredEvents.length}
                          </span>
                        </h1>
                        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                          Gerencie seus compromissos e eventos
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Grupo de Botões */}
                  <div className="hidden md:flex items-center gap-3">
                    {/* Menu de ações (Google + exportação) */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowActionsMenu(!showActionsMenu);
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors relative"
                        aria-label="Mais opções"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        {/* Bolinha verde quando o Google está conectado */}
                        {googleStatus?.connected && (
                          <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${googleStatus.needs_reconnect ? 'bg-amber-500' : 'bg-green-500'}`} />
                        )}
                      </button>

                      {showActionsMenu && (
                        <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
                          {/* Google Agenda - conexão por empresa */}
                          {googleStatus?.connected ? (
                            <>
                              <div className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                <Link2 className={`w-4 h-4 shrink-0 ${googleStatus.needs_reconnect ? 'text-amber-500' : 'text-green-600'}`} />
                                <span className="truncate">{googleStatus.google_email || 'Google conectado'}</span>
                              </div>
                              {googleStatus.needs_reconnect && (
                                <div className="px-4 py-2 text-xs text-amber-700 bg-amber-50 flex items-center gap-2">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  <span>Sem permissão de agenda — reconecte.</span>
                                </div>
                              )}
                              {isAdmin && googleStatus.needs_reconnect && (
                                <button
                                  onClick={() => { conectarGoogle(); setShowActionsMenu(false); }}
                                  disabled={googleLoading}
                                  className="w-full text-left px-4 py-2.5 text-sm text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <RefreshCw className={`w-4 h-4 ${googleLoading ? 'animate-spin' : ''}`} />
                                  <span>Reconectar Google</span>
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={() => { setShowDisconnectModal(true); setShowActionsMenu(false); }}
                                  disabled={googleLoading}
                                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <Unlink className="w-4 h-4" />
                                  <span>Desconectar Google</span>
                                </button>
                              )}
                            </>
                          ) : (
                            isAdmin && googleStatus !== null && (
                              <button
                                onClick={() => { conectarGoogle(); }}
                                disabled={googleLoading}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <Link2 className="w-4 h-4 text-blue-600" />
                                <span>{googleLoading ? 'Conectando...' : 'Conectar Google'}</span>
                              </button>
                            )
                          )}

                          <div className="border-t border-gray-200 dark:border-gray-700" />

                          {/* Exportação */}
                          <button
                            onClick={() => { exportToExcel(); setShowActionsMenu(false); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-green-600" />
                            <span>Exportar Excel</span>
                          </button>
                          <button
                            onClick={() => { exportToPDF(); setShowActionsMenu(false); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <FileText className="w-4 h-4 text-red-600" />
                            <span>Exportar PDF</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Botão Nova Agenda */}
                    <Button
                      onClick={() => {
                        setEventToEdit(null);
                        setInitialDate(selectedDate);
                        navigate(`/app/agenda/novaagenda?data=${format(selectedDate, 'yyyy-MM-dd')}`);
                      }}
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Agenda
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0 pb-6">
            {!isCreatingEvent && (
            <div className="flex items-center justify-between gap-2 px-2 sm:px-4">
              <TabsList className="h-auto p-1">
                <TabsTrigger value="calendar" className="flex items-center gap-2 data-[state=active]:bg-blue-100">
                  <CalendarViewIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Calendário</span>
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2 data-[state=active]:bg-blue-100">
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">Lista</span>
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                {/* Status da conexão Google Agenda */}
                {googleStatus !== null && (
                  googleStatus.connected ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!isAdmin) return;
                        if (googleStatus.needs_reconnect) conectarGoogle();
                        else setShowDisconnectModal(true);
                      }}
                      title={
                        googleStatus.needs_reconnect
                          ? (isAdmin ? 'Sem permissão de agenda — clique para reconectar' : 'Sem permissão de agenda — peça ao admin para reconectar')
                          : isAdmin
                            ? `Google Agenda conectado${googleStatus.google_email ? ` — ${googleStatus.google_email}` : ''} (clique para desconectar)`
                            : `Google Agenda conectado${googleStatus.google_email ? ` — ${googleStatus.google_email}` : ''}`
                      }
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border shrink-0 ${
                        googleStatus.needs_reconnect
                          ? `bg-amber-50 text-amber-700 border-amber-200 ${isAdmin ? 'hover:bg-amber-100 cursor-pointer' : 'cursor-default'}`
                          : `bg-green-50 text-green-700 border-green-200 ${isAdmin ? 'hover:bg-green-100 cursor-pointer' : 'cursor-default'}`
                      }`}
                    >
                      <Link2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="max-w-[150px] truncate hidden sm:inline">
                        {googleStatus.needs_reconnect ? 'Reconectar Google' : (googleStatus.google_email || 'Google Agenda')}
                      </span>
                      <span className="sm:hidden">Google</span>
                      {googleStatus.needs_reconnect && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ) : (
                    isAdmin ? (
                      <button
                        type="button"
                        onClick={conectarGoogle}
                        disabled={googleLoading}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors shrink-0"
                        title="Conectar Google Agenda"
                      >
                        <Link2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="hidden sm:inline">{googleLoading ? 'Conectando...' : 'Conectar Google'}</span>
                        <span className="sm:hidden">{googleLoading ? '...' : 'Google'}</span>
                      </button>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200 shrink-0"
                        title="Google Agenda não conectado"
                      >
                        <Unlink className="w-3.5 h-3.5 shrink-0" />
                        <span className="hidden sm:inline">Google off</span>
                      </span>
                    )
                  )
                )}

              <Select value={selectedPeriod} onValueChange={(value: any) => {
                setSelectedPeriod(value);
                setSelectedEventId(null); // Limpar seleção ao mudar período
              }}>
                <SelectTrigger className="flex-1 min-w-[120px] sm:w-[180px] border-gray-200 hover:border-gray-300 focus:ring-blue-100 bg-white">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expired">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Agendamentos Vencidos</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4" />
                      <span>Agendamentos Futuros</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="year">
                    <div className="flex items-center gap-2">
                      <CalendarViewIcon className="w-4 h-4" />
                      <span>Ano Atual (2025)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="past-years">
                    <div className="flex items-center gap-2">
                      <CalendarViewIcon className="w-4 h-4" />
                      <span>Anos Passados</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="day">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" />
                      <span>Dia</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="week">
                    <div className="flex items-center gap-2">
                      <CalendarRange className="w-4 h-4" />
                      <span>Semana</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="month">
                    <div className="flex items-center gap-2">
                      <CalendarViewIcon className="w-4 h-4" />
                      <span>Mês</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <List className="w-4 h-4" />
                      <span>Todos</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {googleStatus?.connected && !googleStatus?.needs_reconnect && (
                <button
                  onClick={async () => {
                    const tid = toast.loading('Sincronizando com o Google Agenda...');
                    setGoogleLoading(true);
                    const ok = await sincronizarGoogle(true);
                    setGoogleLoading(false);
                    toast.update(tid, {
                      render: ok ? 'Agenda sincronizada com sucesso!' : 'Falha ao sincronizar. Tente novamente.',
                      type: ok ? 'success' : 'error',
                      isLoading: false,
                      autoClose: 3000,
                    });
                  }}
                  disabled={googleLoading}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50"
                  title="Sincronizar com Google Agenda"
                >
                  <RefreshCw className={`w-4 h-4 ${googleLoading ? 'animate-spin' : ''}`} />
                </button>
              )}
              </div>
            </div>
            )}

            <div className={cn('flex items-stretch flex-1 min-h-0', isCreatingEvent ? 'mt-10' : 'mt-1')}>
              {/* Sidebar esquerda: mini calendário + resumo + próximos */}
              <aside className="hidden lg:block w-72 shrink-0 space-y-3 m-2.5 mr-1.5 sticky top-4 self-start">
                {/* Mini calendário (oculto no modo nova agenda) */}
                {!isCreatingEvent && (
                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                  {/* Cabeçalho próprio: mês centralizado + navegação */}
                  <div className="flex items-center justify-between px-3 pt-3">
                    <button
                      onClick={() => setSelectedDate(d => addMonths(d, -1))}
                      className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
                      title="Mês anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-semibold text-gray-800 capitalize">
                      {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
                    </span>
                    <button
                      onClick={() => setSelectedDate(d => addMonths(d, 1))}
                      className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
                      title="Próximo mês"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { if (d) { setSelectedDate(d); setInitialDate(d); } }}
                    month={selectedDate}
                    onMonthChange={setSelectedDate}
                    locale={ptBR}
                    weekStartsOn={1}
                    modifiers={{
                      hasEvent: (date) => diasComEvento.has(format(date, 'yyyy-MM-dd')),
                    }}
                    modifiersClassNames={{
                      hasEvent: "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-blue-500",
                    }}
                    className="p-2 w-full"
                    classNames={{
                      months: "w-full",
                      month: "w-full space-y-2",
                      month_caption: "hidden",
                      nav: "hidden",
                      month_grid: "w-full",
                      weekdays: "flex",
                      weekday: "flex-1 text-center text-gray-400 font-medium text-[10px] uppercase",
                      weeks: "w-full",
                      week: "flex w-full",
                      day: "flex-1 h-8 flex items-center justify-center p-0 relative",
                      day_button: "h-8 w-8 p-0 text-xs rounded-full hover:bg-blue-50 flex items-center justify-center",
                      selected: "[&>button]:bg-blue-600 [&>button]:text-white [&>button]:font-semibold [&>button]:hover:bg-blue-600",
                      today: "[&>button]:text-blue-600 [&>button]:font-semibold",
                      outside: "[&>button]:text-gray-300",
                    }}
                  />
                </div>
                )}

                {/* Resumo clicável */}
                <div className="bg-white rounded-lg border shadow-sm p-3 space-y-1.5">
                  {[
                    { label: 'Hoje', value: agendaStats.hoje, period: 'day', classes: 'text-blue-700 bg-blue-50 border-blue-200' },
                    { label: 'Esta semana', value: agendaStats.semana, period: 'week', classes: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                    { label: 'Vencidos', value: agendaStats.vencidos, period: 'expired', classes: 'text-red-700 bg-red-50 border-red-200' },
                  ].map((s) => (
                    <button
                      key={s.period}
                      onClick={() => {
                        // Segundo clique no mesmo card desativa o filtro
                        const next = selectedPeriod === s.period ? 'all' : s.period;
                        setSelectedPeriod(next as any);
                        setSelectedEventId(null);
                        setCurrentPage(1);
                        // Garante que o calendário mostre a região do filtro
                        if (next === 'day' || next === 'week') setSelectedDate(new Date());
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition-all hover:shadow-sm',
                        s.classes,
                        selectedPeriod === s.period && 'ring-2 ring-offset-1 ring-blue-400'
                      )}
                    >
                      <span>{s.label}</span>
                      <span className="font-bold">{s.value}</span>
                    </button>
                  ))}
                  {['day', 'week', 'expired'].includes(selectedPeriod) && (
                    <button
                      onClick={() => { setSelectedPeriod('all'); setSelectedEventId(null); }}
                      className="w-full text-center text-xs text-gray-500 hover:text-blue-600 py-1 transition-colors"
                    >
                      Limpar filtro
                    </button>
                  )}
                  {agendaStats.google > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Link2 className="w-3 h-3" /> Do Google</span>
                      <span>{agendaStats.google}</span>
                    </div>
                  )}
                </div>

                {/* Próximos compromissos */}
                <div className="bg-white rounded-lg border shadow-sm p-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Próximos compromissos</h3>
                  {proximosEventos.length === 0 ? (
                    <p className="text-xs text-gray-400">Nenhum compromisso futuro.</p>
                  ) : (
                    <div className="space-y-1">
                      {proximosEventos.map((ev) => (
                        <button
                          key={ev.uid}
                          onClick={() => handleEventClick(ev)}
                          className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex flex-col items-center shrink-0 w-9 text-center">
                              <span className="text-sm font-bold text-blue-600 leading-none">{format(new Date(ev.start_time), 'dd')}</span>
                              <span className="text-[10px] uppercase text-gray-500">{format(new Date(ev.start_time), 'MMM', { locale: ptBR })}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700 flex items-center gap-1">
                                {ev.origem === 'google' && <Link2 className="w-3 h-3 text-sky-500 shrink-0" />}
                                {ev.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                {ev.all_day ? 'Dia inteiro' : format(new Date(ev.start_time), 'HH:mm')}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </aside>

              <div className="flex-1 min-w-0 flex flex-col min-h-0">
              {isCreatingEvent ? (
                <div className="m-2.5 flex-1 flex flex-col min-h-0 overflow-y-auto">
                  <NewEventPanel
                    initialDate={initialDate || selectedDate}
                    eventToEdit={eventToEdit}
                    googleConnected={!!googleStatus?.connected && !googleStatus?.needs_reconnect}
                    onCancel={fecharPainelEvento}
                    onSaved={() => { fecharPainelEvento(); sincronizarGoogle(); }}
                  />
                </div>
              ) : (
              <>
              <TabsContent value="calendar" className="m-0 flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col">
                <div className="bg-white rounded-lg border shadow-sm m-2.5 flex-1 flex flex-col min-h-0">
                  <div className="flex items-center gap-2 p-4 border-b sticky top-0 bg-white z-10">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedDate(prev => addMonths(prev, -1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <h2 className="text-lg font-medium flex-1 text-center">
                      {format(selectedDate, 'MMMM yyyy', { locale: ptBR }).replace(/^./, (str) => str.toUpperCase())}
                    </h2>
                    {selectedPeriod !== 'all' && (
                      <button
                        onClick={() => setSelectedPeriod('all')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                        title="Limpar filtro de período"
                      >
                        <Filter className="w-3 h-3" />
                        Filtro ativo
                        <span className="font-bold">×</span>
                      </button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedDate(prev => addMonths(prev, 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDate(new Date())}
                      disabled={isToday(selectedDate)}
                    >
                      Hoje
                    </Button>
                  </div>
                  <div className="grid grid-cols-7 text-sm shrink-0">
                    {["seg", "ter", "qua", "qui", "sex", "sab", "dom"].map((day) => (
                      <div key={day} className="text-center py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400 border-b bg-white">
                        {day}
                      </div>
                    ))}
                  </div>
                  {(() => {
                      // Ajusta para semana começar na segunda-feira (1)
                      const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                      const dayOfWeek = firstDayOfMonth.getDay();
                      const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                      const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
                      const weeks = Math.ceil((offset + daysInMonth) / 7);
                      return (
                      <div className="grid grid-cols-7 text-sm flex-1 min-h-0" style={{ gridTemplateRows: `repeat(${weeks}, minmax(76px, 1fr))` }}>
                      {Array.from({ length: weeks * 7 }).map((_, index) => {
                      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), index - offset + 1);
                      const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
                      const isSelectedDay = date.toDateString() === selectedDate.toDateString();
                      // Respeita o filtro de período ativo (Hoje/Semana/Vencidos)
                      const dayEvents = filteredEvents?.filter((event: any) =>
                        format(new Date(event.start_time), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                      );

                      return (
                        <div
                          key={index}
                          className={cn(
                            "border-b border-r p-1 cursor-pointer hover:bg-gray-50/80 transition-colors relative group",
                            index % 7 === 0 && "border-l",
                            isCurrentMonth && (date.getDay() === 0 || date.getDay() === 6) && "bg-slate-50",
                            !isCurrentMonth && "bg-gray-50 text-gray-400",
                            isToday(date) && "bg-blue-50",
                            isSelectedDay && !isToday(date) && "bg-blue-50/70 ring-2 ring-inset ring-blue-300",
                          )}
                          onClick={() => handleDateClick(date)}
                        >
                          <div className="flex flex-col h-full">
                            <span className={cn(
                              "inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full",
                              isToday(date) ? "bg-blue-600 text-white shadow-sm"
                                : !isCurrentMonth ? "text-gray-400"
                                : "text-gray-700"
                            )}>
                              {format(date, 'd')}
                            </span>
                            <div className="flex-1 mt-1 space-y-1 overflow-y-auto">
                              {dayEvents?.slice(0, 2).map(event => {
                                const { isExpired: isEventPast, isToday: isEventToday } = getEventStatus(event);
                                return (
                                  <div
                                    key={event.uid}
                                    className={cn(
                                      "px-1.5 py-0.5 rounded text-[11px] font-medium cursor-pointer hover:opacity-90 transition-opacity truncate",
                                      isEventToday
                                        ? "bg-blue-100 text-blue-800"
                                        : isEventPast
                                          ? "bg-red-100 text-red-600"
                                          : "bg-emerald-100 text-emerald-800"
                                    )}
                                    title={`${event.title} - ${format(new Date(event.start_time), "HH:mm")}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTab("list");
                                      handleEventClick(event);
                                    }}
                                  >
                                    {event.origem === 'google' && (
                                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500 mr-1" title="Do Google" />
                                    )}
                                    {event.title}
                                  </div>
                                );
                              })}
                              {dayEvents && dayEvents.length > 2 && (
                                <div className="text-xs text-center text-gray-500 mt-1">
                                  + {dayEvents.length - 2} mais
                                </div>
                              )}
                            </div>
                          </div>
                          {dayEvents?.length > 0 && (
                            <div className="absolute hidden group-hover:block bg-white border rounded-md p-2 z-20 w-48 shadow-lg top-full left-0 mt-1">
                              {dayEvents.map((event, idx) => (
                                <div 
                                  key={idx} 
                                  className="mb-2 last:mb-0 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEventClick(event);
                                  }}
                                >
                                  <p className="font-medium text-sm">{event.title}</p>
                                  <p className="text-gray-600 text-xs">
                                    {format(new Date(event.start_time), "HH:mm")}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    </div>
                    );
                  })()}
                </div>
              </TabsContent>
              <TabsContent value="list" className="m-0 flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col">
                <div className="bg-white rounded-lg border shadow-sm m-2.5 flex-1 flex flex-col min-h-0">
                  <ScrollArea className="flex-1 min-h-0">
                    {isLoading ? (
                      <div className="p-2 sm:p-4 flex flex-col gap-3 sm:gap-4">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="p-4 rounded-lg border bg-gray-50 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className="p-2 sm:p-4 flex flex-col gap-3 sm:gap-4">
                          {paginatedEvents.map((event) => {
                          const eventDate = new Date(event.start_time);
                          const endDate = new Date(event.end_time);
                          const { isExpired: isEventPast, isToday: isEventToday } = getEventStatus(event);
                          
                          return (
                            <div
                              key={event.uid}
                              ref={selectedEventId === event.uid ? selectedEventRef : null}
                              className={cn(
                                "p-5 rounded-xl border-2 transition-all hover:shadow-lg cursor-pointer",
                                isEventToday ? "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300" :
                                isEventPast ? "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300" :
                                "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300",
                                selectedEventId === event.uid && "ring-2 ring-offset-2 ring-primary shadow-xl"
                              )}
                              onClick={() => handleEventClick(event)}
                            >
                              {/* Cabeçalho do Card */}
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-lg sm:text-xl text-gray-800 mb-1 break-words">{event.title}</h3>
                                  {event.usuario_nome && (
                                    <p className="text-xs text-gray-600">
                                      <span className="font-medium">Criado por:</span> {event.usuario_nome}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2 flex-wrap sm:justify-end items-start">
                                  {/* Botões de Ação */}
                                  <div className="flex gap-1">
                                    <button
                                      onClick={(e) => handleEditClick(event, e)}
                                      className="p-2 text-blue-600 hover:bg-blue-100 transition-colors"
                                      title="Editar agendamento"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={(e) => handleDeleteClick(event, e)}
                                      className="p-2 text-red-600 hover:bg-red-100 transition-colors"
                                      title="Deletar agendamento"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                  {event.origem === 'google' && (
                                    <Badge variant="outline" className="font-semibold bg-sky-50 border-sky-300 text-sky-700">
                                      <Link2 className="w-3 h-3 mr-1" />
                                      Google
                                    </Badge>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "font-semibold",
                                      isEventToday ? "bg-blue-200 border-blue-400 text-blue-900" :
                                      isEventPast ? "bg-gray-200 border-gray-400 text-gray-900" :
                                      "bg-emerald-200 border-emerald-400 text-emerald-900"
                                    )}
                                  >
                                    {event.type}
                                  </Badge>
                                  {event.prioridade && (
                                    <Badge
                                      className={cn(
                                        "font-semibold",
                                        getPriorityVariant(event.prioridade)
                                      )}
                                    >
                                      {event.prioridade}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Descrição */}
                              {event.description && (
                                <div className="mb-3 p-3 bg-white/60 rounded-lg border border-gray-200">
                                  <p className="text-sm text-gray-700 line-clamp-2">{event.description}</p>
                                </div>
                              )}

                              {/* Informações Principais */}
                              <div className="flex flex-col sm:grid sm:grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                {/* Data e Hora */}
                                <div className="flex items-start gap-2 text-sm bg-white/60 p-2.5 rounded-lg border border-gray-200">
                                  <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-800">Início:</p>
                                    <p className="text-gray-700">{format(eventDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                    <p className="font-semibold text-gray-800 mt-1">Término:</p>
                                    <p className="text-gray-700">{format(endDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                  </div>
                                </div>

                                {/* Local */}
                                {event.location && (
                                  <div className="flex items-start gap-2 text-sm bg-white/60 p-2.5 rounded-lg border border-gray-200">
                                    <MapPin className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0 break-words">
                                      <p className="font-semibold text-gray-800">Local:</p>
                                      <p className="text-gray-700">{event.location}</p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Informações Adicionais */}
                              <div className="flex flex-col sm:grid sm:grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Status da Tarefa */}
                                {event.task_status && (
                                  <div className="flex items-center gap-2 text-sm bg-white/60 p-2.5 rounded-lg border border-gray-200">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-gray-800">Status:</p>
                                      <Badge className={cn(
                                        "mt-1",
                                        event.task_status === 'PENDENTE' && "bg-yellow-100 text-yellow-800 border-yellow-300",
                                        event.task_status === 'EM_ANDAMENTO' && "bg-blue-100 text-blue-800 border-blue-300",
                                        event.task_status === 'CONCLUIDO' && "bg-green-100 text-green-800 border-green-300"
                                      )}>
                                        {event.task_status.replace(/_/g, ' ')}
                                      </Badge>
                                    </div>
                                  </div>
                                )}

                                {/* Responsável */}
                                {event.task_responsible && (
                                  <div className="flex items-start gap-2 text-sm bg-white/60 p-2.5 rounded-lg border border-gray-200">
                                    <Users className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0 break-words">
                                      <p className="font-semibold text-gray-800">Responsável:</p>
                                      <p className="text-gray-700">{event.task_responsible}</p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Participantes */}
                              {event.attendees && Array.isArray(event.attendees) && event.attendees.length > 0 && (
                                <div className="mt-3 p-3 bg-white/60 rounded-lg border border-gray-200">
                                  <div className="flex items-start gap-2">
                                    <Users className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-800 text-sm mb-2">Participantes:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {event.attendees.map((attendee: any, idx: number) => (
                                          <Badge key={idx} variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-300">
                                            {attendee.name}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {filteredEvents.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <CalendarViewIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                            <p className="text-lg font-medium">Nenhuma agenda encontrada</p>
                            <p className="text-sm">Clique em 'Nova Agenda' para adicionar uma.</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Paginação */}
                      {filteredEvents.length > 0 && totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 px-4 py-2 border-t bg-gray-50">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            
                            <div className="flex items-center gap-1 mx-2">
                              <span className="text-xs text-gray-500">{currentPage}</span>
                              <span className="text-xs text-gray-400">/</span>
                              <span className="text-xs text-gray-500">{totalPages}</span>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                      </>
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>
              </>
              )}
              </div>
            </div>
          </Tabs>
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* A área de conteúdo principal agora é gerenciada pelos Tabs (Calendário/Lista) */}
        </div>
      </div>

      {/* Botão flutuante para mobile */}
      <Button
        onClick={() => { setEventToEdit(null); setInitialDate(selectedDate); navigate(`/app/agenda/novaagenda?data=${format(selectedDate, 'yyyy-MM-dd')}`); }}
        size="icon"
        className="fixed right-4 bottom-4 w-14 h-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 sm:hidden flex items-center justify-center"
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Confirmar Exclusão</h2>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-slate-600">
                Tem certeza que deseja excluir o agendamento <strong>"{eventToDelete?.title}"</strong>?
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Esta ação não poderá ser desfeita.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setEventToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-800 transition-colors"
                disabled={deleteEvent.isPending}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteEvent.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteEvent.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Desconexão do Google */}
      {showDisconnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white shadow-2xl max-w-md w-full p-6 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
                <Unlink className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800">Desconectar Google</h2>
            </div>

            <div className="mb-6">
              <p className="text-slate-600">
                Deseja desconectar a conta <strong>{googleStatus?.google_email}</strong> desta empresa?
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Os eventos do Google deixarão de aparecer na agenda.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDisconnectModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-800 transition-colors"
                disabled={googleLoading}
              >
                Cancelar
              </button>
              <button
                onClick={desconectarGoogle}
                disabled={googleLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 rounded-lg"
              >
                {googleLoading ? 'Desconectando...' : 'Desconectar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
