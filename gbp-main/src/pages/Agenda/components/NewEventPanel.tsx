import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { EventType, EventPrioridade as EventPriority } from '../../../types/agenda';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Switch } from '../../../components/ui/switch';
import { format, isBefore, startOfToday, addHours, addMinutes, addDays, subMinutes, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users, Bell, X, ArrowLeft, Link2, Clock, MapPin, AlignLeft, Tag, Flag, Loader2, Plus, AlertTriangle } from 'lucide-react';
import { useToast } from '../../../components/ui/use-toast';
import { useAuthStore } from '../../../store/useAuthStore';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { supabaseClient } from '../../../lib/supabase';
import { googleCalendarService } from '../../../services/googleCalendar';

interface NewEventPanelProps {
  initialDate: Date | null;
  eventToEdit?: any;
  /** true quando a empresa está conectada ao Google Agenda */
  googleConnected?: boolean;
  /** fecha o painel sem salvar */
  onCancel: () => void;
  /** chamado após salvar (para o pai fechar/resyncar) */
  onSaved: () => void;
}

const eventTypes: { value: EventType; label: string }[] = [
  { value: 'REUNIAO', label: 'Reunião' },
  { value: 'AUDIENCIA', label: 'Audiência' },
  { value: 'VISITA', label: 'Visita' },
  { value: 'EVENTO', label: 'Evento' },
  { value: 'OUTROS', label: 'Outros' },
];

const priorities: { value: EventPriority; label: string }[] = [
  { value: 'BAIXA', label: 'Baixa' },
  { value: 'MEDIA', label: 'Média' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'URGENTE', label: 'Urgente' },
];

// Horário inicial inteligente: hoje → próxima hora cheia; outras datas → 09:00
const horarioPadrao = (data: Date): Date => {
  const d = new Date(data);
  if (isToday(d)) {
    const prox = new Date();
    prox.setMinutes(0, 0, 0);
    return addHours(prox, 1);
  }
  d.setHours(9, 0, 0, 0);
  return d;
};

export function NewEventPanel({ initialDate, eventToEdit, googleConnected, onCancel, onSaved }: NewEventPanelProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const { company } = useCompanyStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('REUNIAO');
  const [priority, setPriority] = useState<EventPriority>('MEDIA');
  const [startDate, setStartDate] = useState<Date>(() => horarioPadrao(initialDate || new Date()));
  const [duration, setDuration] = useState(60); // duração em minutos
  const [endDate, setEndDate] = useState<Date>(() => addMinutes(horarioPadrao(initialDate || new Date()), 60));
  const [location, setLocation] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [currentParticipant, setCurrentParticipant] = useState('');
  const [reminder, setReminder] = useState(false);
  const [reminderOffset, setReminderOffset] = useState(60); // minutos antes do compromisso
  const [taskResponsible, setTaskResponsible] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [locaisRecentes, setLocaisRecentes] = useState<string[]>([]);

  useEffect(() => {
    if (initialDate && !eventToEdit) {
      const s = horarioPadrao(initialDate);
      setStartDate(s);
      setEndDate(addMinutes(s, duration));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDate, eventToEdit]);

  // Preencher campos quando houver evento para editar
  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title || '');
      setDescription(eventToEdit.description || '');
      setType(eventToEdit.type || 'REUNIAO');
      setPriority(eventToEdit.prioridade || 'MEDIA');
      setStartDate(new Date(eventToEdit.start_time));
      setEndDate(new Date(eventToEdit.end_time));
      const diffMin = Math.round(
        (new Date(eventToEdit.end_time).getTime() - new Date(eventToEdit.start_time).getTime()) / 60000
      );
      setDuration(diffMin > 0 ? diffMin : 60);
      setLocation(eventToEdit.location || '');
      setTaskResponsible(eventToEdit.task_responsible || '');

      // Parse attendees se for string JSON
      if (eventToEdit.attendees) {
        try {
          const attendeesData = typeof eventToEdit.attendees === 'string'
            ? JSON.parse(eventToEdit.attendees)
            : eventToEdit.attendees;
          setParticipants(Array.isArray(attendeesData) ? attendeesData.map((a: any) => a.name || a) : []);
        } catch (e) {
          setParticipants([]);
        }
      }

      // Carrega se já existe lembrete vinculado a este agendamento
      if (eventToEdit.uid) {
        supabaseClient
          .from('gbp_lembretes')
          .select('uid')
          .eq('agendamento_uid', eventToEdit.uid)
          .limit(1)
          .then(({ data }) => setReminder(!!data?.length));
      } else {
        setReminder(false);
      }
    }
  }, [eventToEdit]);

  // Aviso de conflito: já existe compromisso no mesmo horário?
  useEffect(() => {
    if (!company?.uid) return;
    const t = setTimeout(async () => {
      const q = supabaseClient
        .from('gbp_agendamentos')
        .select('uid,title,start_time,end_time')
        .eq('empresa_uid', company.uid)
        .lt('start_time', format(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX"))
        .gt('end_time', format(startDate, "yyyy-MM-dd'T'HH:mm:ssXXX"));
      if (eventToEdit?.uid) q.neq('uid', eventToEdit.uid);
      const { data } = await q;
      setConflict(
        data?.length
          ? `Conflito de horário com "${data[0].title}" (${format(new Date(data[0].start_time), 'HH:mm')}–${format(new Date(data[0].end_time), 'HH:mm')})${data.length > 1 ? ` e mais ${data.length - 1}` : ''}.`
          : null
      );
    }, 400);
    return () => clearTimeout(t);
  }, [startDate, endDate, company?.uid, eventToEdit?.uid]);

  // Locais usados recentemente (sugestões no campo Local)
  useEffect(() => {
    if (!company?.uid) return;
    supabaseClient
      .from('gbp_agendamentos')
      .select('location')
      .eq('empresa_uid', company.uid)
      .not('location', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        const unicos = [...new Set((data || []).map((r: any) => r.location).filter(Boolean))];
        setLocaisRecentes(unicos.slice(0, 10) as string[]);
      });
  }, [company?.uid]);

  const addParticipant = () => {
    const p = currentParticipant.trim();
    if (p && !participants.includes(p)) {
      setParticipants([...participants, p]);
    }
    setCurrentParticipant('');
  };

  const handleAddParticipant = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentParticipant.trim()) {
      e.preventDefault();
      addParticipant();
    }
  };

  // Aplica um dia (Hoje/Amanhã) mantendo os horários atuais
  const aplicarData = (d: Date) => {
    const s = new Date(startDate);
    s.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    const e = new Date(endDate);
    e.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    setStartDate(s);
    setEndDate(e);
  };

  const handleRemoveParticipant = (participantToRemove: string) => {
    setParticipants(participants.filter(p => p !== participantToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({ title: 'Erro de Validação', description: 'O título é obrigatório.', variant: 'destructive' });
      return;
    }
    if (!description.trim()) {
      toast({ title: 'Erro de Validação', description: 'A descrição é obrigatória.', variant: 'destructive' });
      return;
    }
    if (!location.trim()) {
      toast({ title: 'Erro de Validação', description: 'O local é obrigatório.', variant: 'destructive' });
      return;
    }
    if (isBefore(endDate, startDate)) {
      toast({ title: 'Erro de Validação', description: 'A data de término não pode ser anterior à data de início.', variant: 'destructive' });
      return;
    }
    if (isBefore(startDate, startOfToday())) {
      toast({ title: 'Erro de Validação', description: 'A data de início não pode ser anterior ao dia atual.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      if (!company?.uid || !user?.uid) {
        setIsSubmitting(false);
        toast({ title: 'Ops! Algo deu errado 😕', description: 'Usuário ou empresa não identificado. Faça login novamente.', variant: 'destructive', duration: 5000 });
        return;
      }

      const eventData = {
        title: title.trim(),
        description: description?.trim() || null,
        type,
        prioridade: priority,
        start_time: format(startDate, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        end_time: format(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        location: location?.trim() || null,
        attendees: participants.length > 0 ? participants.map(name => ({ name, confirmed: false })) : null,
        all_day: false,
        task_responsible: taskResponsible.trim() || null,
      };

      // Evento que veio do Google (não existe em gbp_agendamentos):
      // atualiza direto no Google e sai
      if (eventToEdit?.origem === 'google' && eventToEdit?.google_id) {
        try {
          await googleCalendarService.upsertEvent(company.uid, user.uid, {
            title: eventData.title,
            description: eventData.description,
            location: eventData.location,
            start_time: eventData.start_time,
            end_time: eventData.end_time,
            all_day: eventData.all_day,
          }, eventToEdit.google_id);
        } catch (e) {
          console.warn('[google] falha ao atualizar evento no Google:', e);
          setIsSubmitting(false);
          toast({ title: 'Erro!', description: 'Não foi possível atualizar no Google Agenda.', variant: 'destructive' });
          return;
        }
        toast({ title: 'Sucesso!', description: 'Evento atualizado no Google Agenda!', variant: 'success' });
        onSaved();
        return;
      }

      let error;
      let savedUid: string | undefined;

      if (eventToEdit) {
        // Atualizar evento existente
        const updateData = {
          ...eventData,
          updated_by: user.uid,
          updated_at: new Date().toISOString(),
        };

        const result = await supabaseClient
          .from('gbp_agendamentos')
          .update(updateData)
          .eq('uid', eventToEdit.uid);

        error = result.error;
        savedUid = eventToEdit.uid;
      } else {
        // Criar novo evento
        const newEvent = {
          ...eventData,
          status: 'PENDENTE',
          created_by: user.uid,
          empresa_uid: company.uid,
          usuario_nome: user.nome,
          usuarios_uid: user.uid,
        };

        const result = await supabaseClient
          .from('gbp_agendamentos')
          .insert([newEvent])
          .select('uid')
          .single();

        error = result.error;
        savedUid = result.data?.uid;
      }

      if (error) {
        console.error('Erro ao salvar o compromisso:', error);
        setIsSubmitting(false);
        toast({ title: 'Erro!', description: `Ocorreu um erro ao salvar: ${error.message}`, variant: 'destructive' });
        return;
      }

      // Best-effort: espelha no Google Calendar
      if (googleConnected) {
        try {
          const resp = await googleCalendarService.upsertEvent(company.uid, user.uid, {
            title: eventData.title,
            description: eventData.description,
            location: eventData.location,
            start_time: eventData.start_time,
            end_time: eventData.end_time,
            all_day: eventData.all_day,
          }, eventToEdit?.google_event_id || undefined);

          // Guarda o vínculo no agendamento (edições futuras atualizam o mesmo evento)
          if (resp?.google_id && savedUid && resp.google_id !== eventToEdit?.google_event_id) {
            await supabaseClient
              .from('gbp_agendamentos')
              .update({ google_event_id: resp.google_id })
              .eq('uid', savedUid);
          }
        } catch (e: any) {
          console.warn('[agenda→google] falha ao sincronizar:', e);
          toast({
            title: 'Salvo no app, mas não no Google',
            description: `O agendamento foi criado, mas falhou ao enviar ao Google Agenda: ${e?.message || 'erro desconhecido'}`,
            variant: 'destructive',
            duration: 8000,
          });
        }
      }

      // Lembrete: persiste em gbp_lembretes vinculado ao agendamento.
      // O useNotifications observa a tabela e dispara push quando due_date se aproxima.
      if (savedUid) {
        try {
          if (reminder) {
            const priorityMap: Record<string, string> = {
              BAIXA: 'low', MEDIA: 'medium', ALTA: 'high', URGENTE: 'high',
            };
            const lembreteData = {
              title: `Lembrete: ${eventData.title}`,
              description: eventData.description,
              due_date: format(subMinutes(startDate, reminderOffset), "yyyy-MM-dd'T'HH:mm:ssXXX"),
              priority: priorityMap[priority] || 'medium',
              status: 'pending',
              empresa_uid: company.uid,
              agendamento_uid: savedUid,
              url_direcionar: '/app/agenda',
              created_by: user.uid,
              updated_by: user.uid,
            };
            const { data: existentes } = await supabaseClient
              .from('gbp_lembretes')
              .select('uid')
              .eq('agendamento_uid', savedUid)
              .limit(1);
            if (existentes && existentes.length > 0) {
              // Rearma o lembrete (limpa leitura) com dados atualizados
              const { error: errUpd } = await supabaseClient
                .from('gbp_lembretes')
                .update({
                  title: lembreteData.title,
                  description: lembreteData.description,
                  due_date: lembreteData.due_date,
                  priority: lembreteData.priority,
                  status: 'pending',
                  url_direcionar: lembreteData.url_direcionar,
                  lido_por_uid: null,
                  lido_em: null,
                  updated_by: user.uid,
                })
                .eq('agendamento_uid', savedUid);
              if (errUpd) throw errUpd;
            } else {
              const { error: errIns } = await supabaseClient
                .from('gbp_lembretes')
                .insert(lembreteData);
              if (errIns) throw errIns;
            }
          } else if (eventToEdit?.uid) {
            // Switch desligado na edição: remove lembrete existente
            await supabaseClient
              .from('gbp_lembretes')
              .delete()
              .eq('agendamento_uid', eventToEdit.uid);
          }
        } catch (e) {
          console.warn('[lembrete] falha ao salvar lembrete do agendamento:', e);
          toast({
            title: 'Lembrete não salvo',
            description: 'O compromisso foi salvo, mas o lembrete não pôde ser registrado.',
            variant: 'destructive',
          });
        }
      }

      toast({
        title: 'Sucesso!',
        description: eventToEdit ? 'Agendamento atualizado com sucesso!' : 'Compromisso criado com sucesso!',
        variant: 'success'
      });
      onSaved();
      // Não reseta isSubmitting aqui: o painel desmonta após onSaved
      // (fecha edição ou navega para /app/agenda)
    } catch (error) {
      console.error('Erro inesperado:', error);
      setIsSubmitting(false);
      toast({ title: 'Erro Inesperado!', description: 'Ocorreu um erro inesperado. Tente novamente.', variant: 'destructive' });
    }
  };

  const fieldLabel = 'flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2';
  const quickDateBtn = 'px-2 py-0.5 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors';
  const chipBtn = (active: boolean, activeClasses: string) =>
    `px-3.5 py-2 rounded-lg border text-sm font-medium transition-all ${active ? activeClasses : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`;

  return (
    <div className="flex flex-col gap-3">
      {/* Cabeçalho — grupo separado */}
      <div className="bg-white rounded-lg border shadow-sm flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
          title="Voltar para a agenda"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {eventToEdit ? 'Editar Agendamento' : 'Nova Agenda'}
          </h2>
          <p className="text-sm text-gray-500">
            {eventToEdit
              ? 'Atualize as informações do agendamento'
              : initialDate
                ? `Agendar para ${format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`
                : 'Preencha os dados da nova agenda'}
          </p>
        </div>
        {googleConnected && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
            <Link2 className="w-3 h-3" />
            Sincroniza com o Google
          </span>
        )}
      </div>

      {/* Formulário — grupo separado, sem limite de altura */}
      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.requestSubmit();
          }
        }}
        className="bg-white rounded-lg border shadow-sm flex flex-col"
      >
        <div>
          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5">

            {/* Coluna esquerda */}
            <div className="flex flex-col gap-5">
              <div>
                <label className={fieldLabel}>Título <span className="text-red-500">*</span></label>
                <Input
                  placeholder="Título da agenda"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-base font-medium"
                  autoFocus
                  required
                />
              </div>

              <div className="flex-1 flex flex-col">
                <label className={fieldLabel}><AlignLeft className="w-3.5 h-3.5" /> Descrição <span className="text-red-500">*</span></label>
                <Textarea
                  placeholder="Descrição detalhada..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  required
                  className="flex-1 min-h-[140px] resize-none"
                />
              </div>

              <div>
                <label className={fieldLabel}><MapPin className="w-3.5 h-3.5" /> Local <span className="text-red-500">*</span></label>
                <Input placeholder="Local da agenda" value={location} onChange={(e) => setLocation(e.target.value)} required list="locais-recentes" />
                <datalist id="locais-recentes">
                  {locaisRecentes.map((l) => <option key={l} value={l} />)}
                </datalist>
              </div>

              <div>
                <label className={fieldLabel}><Users className="w-3.5 h-3.5" /> Participantes</label>
                <div className="w-full min-h-[42px] px-3 py-1.5 flex flex-wrap gap-1.5 items-center border rounded-md focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 bg-white">
                  {participants.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md text-sm">
                      {p}
                      <button type="button" onClick={() => handleRemoveParticipant(p)} className="hover:bg-blue-200 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    className="flex-1 min-w-[120px] outline-none text-sm"
                    placeholder={participants.length === 0 ? 'Digite e pressione Enter' : ''}
                    value={currentParticipant}
                    onChange={(e) => setCurrentParticipant(e.target.value)}
                    onKeyDown={handleAddParticipant}
                  />
                  {currentParticipant.trim() && (
                    <button
                      type="button"
                      onClick={addParticipant}
                      className="shrink-0 text-blue-600 hover:bg-blue-50 rounded-md p-1"
                      title="Adicionar participante"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna direita */}
            <div className="space-y-5">
              <div>
                <label className={fieldLabel}><Tag className="w-3.5 h-3.5" /> Tipo de Compromisso</label>
                <div className="flex flex-wrap gap-2">
                  {eventTypes.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setType(value)}
                      className={chipBtn(type === value, 'border-blue-600 bg-blue-600 text-white shadow-sm')}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={fieldLabel}><Flag className="w-3.5 h-3.5" /> Prioridade</label>
                <div className="flex flex-wrap gap-2">
                  {priorities.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPriority(value)}
                      className={chipBtn(priority === value, 'border-amber-500 bg-amber-400 text-amber-950 shadow-sm')}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={fieldLabel}><Clock className="w-3.5 h-3.5" /> Data</label>
                  <Input
                    type="date"
                    value={format(startDate, 'yyyy-MM-dd')}
                    onChange={(e) => {
                      // Uma única data para o agendamento: aplica o dia
                      // escolhido ao início e ao fim, preservando os horários
                      const [y, m, d] = e.target.value.split('-').map(Number);
                      const newStart = new Date(startDate);
                      newStart.setFullYear(y, m - 1, d);
                      const newEnd = new Date(endDate);
                      newEnd.setFullYear(y, m - 1, d);
                      setStartDate(newStart);
                      setEndDate(newEnd);
                    }}
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    <button type="button" onClick={() => aplicarData(new Date())} className={quickDateBtn}>Hoje</button>
                    <button type="button" onClick={() => aplicarData(addDays(new Date(), 1))} className={quickDateBtn}>Amanhã</button>
                  </div>
                </div>
                <div>
                  <label className={fieldLabel}><Clock className="w-3.5 h-3.5" /> Horário</label>
                  <Input
                    type="time"
                    value={format(startDate, 'HH:mm')}
                    onChange={(e) => {
                      const time = e.target.value;
                      const newDate = new Date(startDate);
                      newDate.setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]));
                      setStartDate(newDate);
                      setEndDate(addMinutes(newDate, duration));
                    }}
                  />
                </div>
              </div>

              {conflict && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {conflict}
                </div>
              )}

              <div>
                <label className={fieldLabel}><Clock className="w-3.5 h-3.5" /> Duração</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { min: 30, label: '30 min' },
                    { min: 60, label: '1h' },
                    { min: 120, label: '2h' },
                    { min: 240, label: '4h' },
                  ].map(({ min, label }) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => { setDuration(min); setEndDate(addMinutes(startDate, min)); }}
                      className={chipBtn(duration === min, 'border-blue-600 bg-blue-600 text-white shadow-sm')}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={fieldLabel}>Responsável pela Tarefa</label>
                <Input placeholder="Nome do responsável" value={taskResponsible} onChange={(e) => setTaskResponsible(e.target.value)} />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <label htmlFor="reminder" className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <Switch id="reminder" checked={reminder} onCheckedChange={setReminder} />
                  <Bell className="w-4 h-4" />
                  Lembrete
                </label>
                {reminder && (
                  <select
                    value={reminderOffset}
                    onChange={(e) => setReminderOffset(Number(e.target.value))}
                    className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700"
                  >
                    <option value={0}>No horário</option>
                    <option value={15}>15 min antes</option>
                    <option value={30}>30 min antes</option>
                    <option value={60}>1h antes</option>
                    <option value={1440}>1 dia antes</option>
                  </select>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé fixo */}
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 px-5 py-3.5 border-t bg-gray-50 rounded-b-lg">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700" disabled={isSubmitting} title="Ctrl+Enter também salva">
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isSubmitting ? 'Salvando...' : eventToEdit ? 'Salvar alterações' : 'Criar Agenda'}
          </Button>
        </div>
      </form>
    </div>
  );
}
