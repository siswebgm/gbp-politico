import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '../lib/supabase';
import { AgendaEvent } from '../types/agenda';
import { useAuth } from '../providers/AuthProvider';
import { useCompanyStore } from '../store/useCompanyStore';

export function useAgenda(filters?: {
  startDate?: Date;
  endDate?: Date;
  type?: string;
  status?: string;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const company = useCompanyStore(state => state.company);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['agenda', filters],
    queryFn: async () => {
      if (!company?.uid) {
        throw new Error('ID da empresa não encontrado');
      }

      const query = supabaseClient
        .from('gbp_agendamentos')
        .select(`
          uid,
          empresa_uid,
          title,
          description,
          start_time,
          end_time,
          type,
          location,
          attendees,
          status,
          all_day,
          recurrence,
          created_at,
          updated_at,
          created_by,
          updated_by,
          prioridade,
          task_responsible,
          task_status,
          usuarios_uid,
          usuario_nome
        `)
        .eq('empresa_uid', company.uid);

      if (filters?.startDate) {
        query.gte('start_time', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query.lte('end_time', filters.endDate.toISOString());
      }
      if (filters?.type) {
        query.eq('type', filters.type);
      }
      if (filters?.status) {
        query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.uid,
  });

  const createEvent = useMutation({
    mutationFn: async (event: Omit<AgendaEvent, 'uid'>) => {
      if (!user?.id || !company?.uid) {
        throw new Error('Dados do usuário ou empresa não encontrados');
      }

      // Gera um UUID para o usuário se não for um UUID válido
      const isValidUUID = (uuid: string) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
      };

      // Se o ID do usuário não for um UUID válido, gera um novo
      const usuarios_uid = isValidUUID(user.id) ? user.id : crypto.randomUUID();

      console.log('Dados do usuário:', { 
        user,
        usuarios_uid,
        isValidUserUUID: isValidUUID(user.id)
      });
      console.log('Dados da empresa:', { 
        company,
        isValidCompanyUUID: isValidUUID(company.uid)
      });

      // Prepare os dados conforme a estrutura da tabela
      const newEvent = {
        empresa_uid: company.uid,
        usuarios_uid,
        usuario_nome: user.nome || user.email?.split('@')[0] || 'Usuário',
        title: event.title,
        description: event.description || null,
        start_time: event.start_time.toISOString(),
        end_time: event.end_time.toISOString(),
        type: event.type,
        prioridade: event.priority?.toUpperCase() || 'MEDIA',
        location: event.location || null,
        attendees: event.attendees ? JSON.stringify(event.attendees) : null,
        status: event.status || 'AGENDADO',
        color: event.color || null,
        all_day: event.all_day || false,
        recurrence: event.recurrence ? JSON.stringify(event.recurrence) : null,
        created_by: usuarios_uid,
        updated_by: usuarios_uid
      };

      console.log('Dados a serem enviados:', newEvent);

      const { data, error } = await supabaseClient
        .from('gbp_agendamentos')
        .insert([newEvent])
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
    },
  });

  const updateEvent = useMutation({
    mutationFn: async (event: AgendaEvent) => {
      if (!user?.id) {
        throw new Error('ID do usuário não encontrado');
      }

      // Gera um UUID para o usuário se não for um UUID válido
      const isValidUUID = (uuid: string) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
      };

      const usuarios_uid = isValidUUID(user.id) ? user.id : crypto.randomUUID();

      const updateData = {
        title: event.title,
        description: event.description || null,
        start_time: event.start_time.toISOString(),
        end_time: event.end_time.toISOString(),
        type: event.type,
        prioridade: event.priority?.toUpperCase() || 'MEDIA',
        location: event.location || null,
        attendees: event.attendees ? JSON.stringify(event.attendees) : null,
        status: event.status,
        color: event.color || null,
        all_day: event.all_day || false,
        recurrence: event.recurrence ? JSON.stringify(event.recurrence) : null,
        updated_at: new Date().toISOString(),
        updated_by: usuarios_uid,
        usuario_nome: user.nome || user.email?.split('@')[0] || 'Usuário'
      };

      const { data, error } = await supabaseClient
        .from('gbp_agendamentos')
        .update(updateData)
        .eq('uid', event.uid)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabaseClient
        .from('gbp_agendamentos')
        .delete()
        .eq('uid', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
    },
  });

  return {
    events,
    isLoading,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
