export type EventType = 'REUNIAO' | 'AUDIENCIA' | 'VISITA' | 'EVENTO' | 'OUTROS';

export type EventStatus = 'AGENDADO' | 'CONFIRMADO' | 'CANCELADO' | 'CONCLUIDO' | 'PENDENTE';

export type EventPrioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';

export interface Attendee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  organization?: string;
  confirmed?: boolean;
}

export interface RecurrenceRule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  endDate?: Date | null;
  daysOfWeek?: number[];
  count?: number;
}

export interface AgendaEvent {
  uid?: string;
  empresa_uid?: string;
  usuarios_uid?: string;
  usuario_nome?: string;
  title: string;
  description?: string | null;
  start_time: Date;
  end_time: Date;
  type: EventType;
  prioridade?: EventPrioridade;
  location?: string | null;
  attendees?: Attendee[] | null;
  status: EventStatus;
  color?: string | null;
  all_day?: boolean;
  recurrence?: RecurrenceRule | null;
  created_at?: Date;
  updated_at?: Date;
  created_by?: string | null;
  updated_by?: string | null;
  // Campos específicos para tarefas
  task_responsible?: string;
  task_progress?: number;
  task_status?: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO';
}
