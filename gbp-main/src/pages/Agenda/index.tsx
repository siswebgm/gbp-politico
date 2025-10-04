import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar } from "../../components/ui/calendar";
import { ptBR } from 'date-fns/locale';
import { format, isAfter, isBefore, isToday, startOfToday, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isPast } from 'date-fns';
import { Button } from "../../components/ui/button";
import { NewEventModal } from './components/NewEventModal';
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
  Download,
  Calendar as CalendarViewIcon,
  CalendarDays,
  CalendarRange,
  List,
  ArrowRight
} from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
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

export default function AgendaPage() {
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'all' | 'expired' | 'active' | 'year' | 'past-years'>('day');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('calendar');
  const [initialDate, setInitialDate] = useState<Date | null>(null);
  const selectedEventRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { events, isLoading } = useAgenda();

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

  const filteredEvents = useMemo(() => {
    if (!events) return [];

    let filtered = [...events];
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
  }, [events, selectedPeriod]);

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
    setSelectedDate(new Date(event.start_time));
    setSelectedEventId(event.id);
    setActiveTab('list');
    
    // Pequeno delay para garantir que a lista foi renderizada
    setTimeout(() => {
      selectedEventRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleDateClick = (date: Date) => {
    setInitialDate(date);
    setIsNewEventModalOpen(true);
  };

  useEffect(() => {
    if (selectedEventId && activeTab === 'list') {
      selectedEventRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedEventId, activeTab]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="pb-6">
            <div className="mx-auto sm:px-0 md:px-0">
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

                    {/* Título e Subtítulo */}
                    <div>
                      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        Agenda
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {filteredEvents.length}
                        </span>
                      </h1>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Gerencie seus compromissos e eventos
                      </p>
                    </div>
                  </div>

                  {/* Grupo de Botões */}
                  <div className="hidden md:flex items-center gap-3">
                    {/* Botão Exportar */}
                    <div className="flex gap-2">
                      <Button
                        onClick={exportToExcel}
                        variant="outline"
                        size="lg"
                        className="text-green-600 hover:text-green-700"
                      >
                        <div className="flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          <span>Excel</span>
                        </div>
                      </Button>
                      <Button
                        onClick={exportToPDF}
                        variant="outline"
                        size="lg"
                        className="text-red-600 hover:text-red-700"
                      >
                        <div className="flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          <span>PDF</span>
                        </div>
                      </Button>
                    </div>

                    {/* Botão Nova Agenda */}
                    <Button
                      onClick={() => {
                        setInitialDate(selectedDate);
                        setIsNewEventModalOpen(true);
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between gap-2">
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

              <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
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
            </div>

            <div className="mt-4">
              <TabsContent value="calendar" className="m-0">
                <div className="bg-white rounded-lg border shadow-sm">
                  <div className="flex items-center gap-2 p-4 border-b sticky top-0 bg-white z-10">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedDate(prev => addMonths(prev, -1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <h2 className="flex-1 text-center font-medium text-lg capitalize">
                      {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
                    </h2>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedDate(prev => addMonths(prev, 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-7 text-sm">
                    {["seg", "ter", "qua", "qui", "sex", "sab", "dom"].map((day) => (
                      <div key={day} className="text-center py-2 font-medium text-gray-500 border-b sticky top-[73px] bg-white z-10">
                        {day}
                      </div>
                    ))}
                    {Array.from({ length: 35 }).map((_, index) => {
                      // Ajusta para semana começar na segunda-feira (1)
                      const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                      const dayOfWeek = firstDayOfMonth.getDay();
                      const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Ajuste para segunda-feira
                      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), index - offset + 1);
                      const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
                      const dayEvents = events?.filter(event => 
                        format(new Date(event.start_time), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                      );

                      return (
                        <div
                          key={index}
                          className={cn(
                            "border-b border-r p-1 h-[calc((100vh-20rem)/5)] min-h-[60px] cursor-pointer hover:bg-gray-50/80 transition-colors relative group",
                            index % 7 === 0 && "border-l",
                            !isCurrentMonth && "bg-gray-50 text-gray-400",
                            isToday(date) && "bg-blue-50",
                          )}
                          onClick={() => handleDateClick(date)}
                        >
                          <div className="flex flex-col h-full">
                            <span className={cn("font-medium", isToday(date) && "text-blue-600")}>
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
                                <div key={idx} className="mb-2 last:mb-0">
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
                </div>
              </TabsContent>
              <TabsContent value="list" className="m-0">
                <div className="bg-white rounded-lg border shadow-sm">
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    {isLoading ? (
                      <div className="p-4 space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="p-4 rounded-lg border bg-gray-50 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 space-y-4">
                        {filteredEvents.map((event) => {
                          const eventDate = new Date(event.start_time);
                          const { isExpired: isEventPast, isToday: isEventToday } = getEventStatus(event);
                          
                          return (
                            <div
                              key={event.uid}
                              ref={selectedEventId === event.uid ? selectedEventRef : null}
                              className={cn(
                                "p-4 rounded-lg border transition-colors",
                                isEventToday ? "bg-blue-50 border-blue-200" :
                                isEventPast ? "bg-gray-50 border-gray-200" :
                                "bg-emerald-50 border-emerald-200",
                                selectedEventId === event.uid && "ring-2 ring-primary"
                              )}
                              onClick={() => handleEventClick(event)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="font-medium text-lg">{event.title}</h3>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                    <Clock className="h-4 w-4" />
                                    <span>
                                      {format(eventDate, "dd 'de' MMMM', às' HH:mm", { locale: ptBR })}
                                    </span>
                                  </div>
                                  {event.location && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                      <MapPin className="h-4 w-4" />
                                      <span>{event.location}</span>
                                    </div>
                                  )}
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "ml-2",
                                    isEventToday ? "border-blue-200 text-blue-700" :
                                    isEventPast ? "border-gray-200 text-gray-700" :
                                    "border-emerald-200 text-emerald-700"
                                  )}
                                >
                                  {event.type}
                                </Badge>
                              </div>
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
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>
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
        onClick={() => setIsNewEventModalOpen(true)}
        size="icon"
        className="fixed right-4 bottom-4 w-14 h-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 sm:hidden flex items-center justify-center"
      >
        <Plus className="w-6 h-6" />
      </Button>

      <NewEventModal 
        open={isNewEventModalOpen} 
        onOpenChange={setIsNewEventModalOpen}
        initialDate={initialDate}
      />
    </div>
  );
}
