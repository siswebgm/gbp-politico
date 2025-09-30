import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { EventType, EventPrioridade as EventPriority } from '../../../types/agenda';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Switch } from '../../../components/ui/switch';
import { format, isBefore, startOfToday, addHours, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users, FileText, Bell, X } from 'lucide-react';
import { useToast } from '../../../components/ui/use-toast';
import { useAuthStore } from '../../../store/useAuthStore';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { supabaseClient } from '../../../lib/supabase';

interface NewEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate: Date | null;
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

export function NewEventModal({ open, onOpenChange, initialDate }: NewEventModalProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const { company } = useCompanyStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('REUNIAO');
  const [priority, setPriority] = useState<EventPriority>('MEDIA');
  const [startDate, setStartDate] = useState(initialDate || new Date());
  const [endDate, setEndDate] = useState(initialDate ? addHours(initialDate, 1) : addHours(new Date(), 1));
  const [location, setLocation] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [currentParticipant, setCurrentParticipant] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [reminder, setReminder] = useState(false);
  const [taskResponsible, setTaskResponsible] = useState('');

  useEffect(() => {
    if (initialDate) {
      setStartDate(initialDate);
      setEndDate(addHours(initialDate, 1));
    }
  }, [initialDate]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType('REUNIAO');
    setPriority('MEDIA');
    setStartDate(initialDate || new Date());
    setEndDate(initialDate ? addHours(initialDate, 1) : addHours(new Date(), 1));
    setLocation('');
    setParticipants([]);
    setCurrentParticipant('');
    setIsRecurring(false);
    setReminder(false);
    setTaskResponsible('');
  };

  const handleAddParticipant = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentParticipant.trim()) {
      e.preventDefault();
      if (!participants.includes(currentParticipant.trim())) {
        setParticipants([...participants, currentParticipant.trim()]);
      }
      setCurrentParticipant('');
    }
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
    if (isBefore(endDate, startDate)) {
      toast({ title: 'Erro de Validação', description: 'A data de término não pode ser anterior à data de início.', variant: 'destructive' });
      return;
    }
    if (isBefore(startDate, startOfToday())) {
      toast({ title: 'Erro de Validação', description: 'A data de início não pode ser anterior ao dia atual.', variant: 'destructive' });
      return;
    }

    try {
      if (!company?.uid || !user?.uid) {
        toast({ title: 'Ops! Algo deu errado 😕', description: 'Usuário ou empresa não identificado. Faça login novamente.', variant: 'destructive', duration: 5000 });
        return;
      }

      const newEvent = {
        title: title.trim(),
        description: description?.trim() || null,
        type,
        prioridade: priority,
        start_time: format(startDate, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        end_time: format(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        location: location?.trim() || null,
        attendees: participants.length > 0 ? participants.map(name => ({ name, confirmed: false })) : null,
        all_day: false,
        status: 'PENDENTE',
        created_by: user.uid,
        empresa_uid: company.uid,
        usuario_nome: user.nome,
        usuarios_uid: user.uid,
        // is_recurring: isRecurring, // Coluna não existe na tabela
        // reminder_sent: reminder, // Coluna não existe na tabela
        // task_responsible: taskResponsible.trim() || null, // Coluna não existe na tabela
      };

      const { error } = await supabaseClient.from('gbp_agendamentos').insert([newEvent]);

      if (error) {
        console.error('Erro ao salvar o compromisso:', error);
        toast({ title: 'Erro!', description: `Ocorreu um erro ao salvar: ${error.message}`, variant: 'destructive' });
        return;
      }

      toast({ title: 'Sucesso!', description: 'Agenda salva com sucesso!', variant: 'success' });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast({ title: 'Erro Inesperado!', description: 'Ocorreu um erro inesperado. Tente novamente.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-lg sm:text-xl">Nova Agenda</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {initialDate ? `Criar agenda para ${format(initialDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}` : 'Preencha os dados da nova agenda'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 p-6 overflow-y-auto">
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-sm sm:text-base font-medium mb-2">Título</label>
              <Input placeholder="Título da agenda" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm sm:text-base font-medium mb-2">Descrição</label>
              <Textarea placeholder="Descrição detalhada..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm sm:text-base font-medium mb-2">Tipo de Compromisso</label>
              <div className="flex flex-wrap gap-2">
                {eventTypes.map(({ value, label }) => (
                  <Button key={value} type="button" variant={type === value ? "default" : "outline"} onClick={() => setType(value)} className={`transition-all ${type === value ? 'bg-blue-600 text-white' : ''}`}>{label}</Button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm sm:text-base font-medium mb-2">Prioridade</label>
              <div className="flex flex-wrap gap-2">
                {priorities.map(({ value, label }) => (
                  <Button key={value} type="button" variant={priority === value ? "default" : "outline"} onClick={() => setPriority(value)} className={`transition-all ${priority === value ? 'bg-yellow-500 text-black' : ''}`}>{label}</Button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm sm:text-base font-medium mb-2">Data e Hora de Início</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="date"
                    value={format(startDate, "yyyy-MM-dd")}
                    onChange={(e) => {
                      const newDate = new Date(startDate);
                      newDate.setFullYear(
                        parseInt(e.target.value.split('-')[0]),
                        parseInt(e.target.value.split('-')[1]) - 1,
                        parseInt(e.target.value.split('-')[2])
                      );
                      setStartDate(newDate);
                    }}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="time"
                    value={format(startDate, "HH:mm")}
                    onChange={(e) => {
                      const time = e.target.value;
                      const newDate = new Date(startDate);
                      newDate.setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]));
                      setStartDate(newDate);
                    }}
                  />
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm sm:text-base font-medium mb-2">Data e Hora de Fim</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="date"
                    value={format(endDate, "yyyy-MM-dd")}
                    onChange={(e) => {
                      const newDate = new Date(endDate);
                      newDate.setFullYear(
                        parseInt(e.target.value.split('-')[0]),
                        parseInt(e.target.value.split('-')[1]) - 1,
                        parseInt(e.target.value.split('-')[2])
                      );
                      setEndDate(newDate);
                    }}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="time"
                    value={format(endDate, "HH:mm")}
                    onChange={(e) => {
                      const time = e.target.value;
                      const newDate = new Date(endDate);
                      newDate.setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]));
                      setEndDate(newDate);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="location" className="block text-sm sm:text-base font-medium mb-2">Local</label>
              <Input id="location" placeholder="Local da agenda" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label htmlFor="participants" className="flex items-center gap-2 mb-2 font-medium"><Users className="w-4 h-4" />Participantes</label>
              <div className="relative">
                <div className="w-full min-h-[40px] px-3 py-1.5 flex flex-wrap gap-1.5 items-center border rounded-md focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 bg-white">
                  {participants.map((p, i) => (<span key={i} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md text-sm">{p}<button type="button" onClick={() => handleRemoveParticipant(p)} className="hover:bg-blue-200 rounded-full p-0.5"><X className="w-3 h-3" /></button></span>))}
                  <input type="text" className="flex-1 min-w-[120px] outline-none text-sm" placeholder={participants.length === 0 ? "Digite e pressione Enter" : ""} value={currentParticipant} onChange={(e) => setCurrentParticipant(e.target.value)} onKeyDown={handleAddParticipant} />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm sm:text-base font-medium mb-2">Responsável pela Tarefa</label>
              <Input placeholder="Nome do responsável" value={taskResponsible} onChange={(e) => setTaskResponsible(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch id="reminder" checked={reminder} onCheckedChange={setReminder} />
              <label htmlFor="reminder" className="flex items-center gap-2 cursor-pointer"><Bell className="w-4 h-4" />Lembrete</label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
              <label htmlFor="recurring" className="flex items-center gap-2 cursor-pointer"><FileText className="w-4 h-4" />Recorrente</label>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">Criar Agenda</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
