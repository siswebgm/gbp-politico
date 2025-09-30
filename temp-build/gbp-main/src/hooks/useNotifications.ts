import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';
import { format, isAfter, isBefore, addHours } from 'date-fns';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../providers/AuthProvider';
import { toast } from 'react-toastify';

interface Reminder {
  uid: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'cancelled';
  atendimento_uid: string;
  created_at: string;
  updated_at: string;
  url_direcionar: string | null;
  lido_por_uid: string | null;
  lido_em: string | null;
}

interface NotificationState {
  notifications: Reminder[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  lastUpdate: string | null;
}

export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    isLoading: true,
    error: null,
    lastUpdate: null
  });
  
  const { company } = useCompanyStore();
  const { user } = useAuth();

  const loadNotifications = useCallback(async () => {
    if (!company?.uid || !user?.uid) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const now = new Date();
      const fourHoursAgo = addHours(now, -4);
      const fourHoursAhead = addHours(now, 4);

      // Função auxiliar para formatar a URL
      const formatUrl = (url: string | null) => {
        if (!url) return null;
        // Se a URL não começar com '/', adiciona
        return url.startsWith('/') ? url : `/${url}`;
      };

      const { data: reminders, error } = await supabaseClient
        .from('gbp_lembretes')
        .select(`
          uid,
          title,
          description,
          due_date,
          priority,
          status,
          url_direcionar,
          atendimento_uid,
          created_at,
          updated_at,
          lido_por_uid,
          lido_em
        `)
        .eq('empresa_uid', company.uid)
        .eq('status', 'pending')
        .is('lido_por_uid', null)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar notificações:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'Erro ao carregar notificações',
          isLoading: false 
        }));
        return;
      }

      const upcomingReminders = reminders?.map(reminder => ({
        ...reminder,
        url_direcionar: formatUrl(reminder.url_direcionar)
      })).filter(reminder => {
        const dueDate = new Date(reminder.due_date);
        const isUpcoming = isAfter(dueDate, fourHoursAgo) && 
                         isBefore(dueDate, fourHoursAhead) &&
                         reminder.status === 'pending';
        
        if (isUpcoming && user?.uid) {
          notificationService.sendNotification({
            title: 'Lembrete Próximo',
            body: `${reminder.title} - Vence em ${format(dueDate, 'dd/MM/yyyy HH:mm')}`,
            data: {
              id: reminder.uid,
              type: 'reminder',
              dueDate: reminder.due_date,
              url: reminder.url_direcionar
            },
            userIds: [user.uid]
          }).catch(error => {
            console.error('Erro ao enviar notificação push:', error);
          });
        }

        return isUpcoming;
      }) || [];

      setState(prev => ({
        ...prev,
        notifications: upcomingReminders,
        unreadCount: upcomingReminders.length,
        isLoading: false,
        lastUpdate: new Date().toISOString(),
        error: null
      }));
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Erro ao carregar notificações',
        isLoading: false 
      }));
    }
  }, [company?.uid, user?.uid]);

  const markAsRead = useCallback(async (uid: string) => {
    if (!user?.uid) return;

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const { error } = await supabaseClient
        .from('gbp_lembretes')
        .update({ 
          lido_por_uid: user.uid,
          lido_em: new Date().toISOString()
        })
        .eq('uid', uid);

      if (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        toast.error('Erro ao marcar notificação como lida');
        throw error;
      }

      setState(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.uid !== uid),
        unreadCount: prev.unreadCount - 1,
        isLoading: false
      }));

      toast.success('Notificação marcada como lida');
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user?.uid]);

  // Carrega notificações iniciais
  useEffect(() => {
    if (company?.uid && user?.uid) {
      console.log('Empresa alterada, recarregando notificações...');
      loadNotifications();
    }
  }, [company?.uid, user?.uid, loadNotifications]);

  // Setup do canal de tempo real
  useEffect(() => {
    if (!company?.uid || !user?.uid) return;

    console.log('Configurando canal de tempo real para notificações...');
    
    const channel = supabaseClient
      .channel('public:gbp_lembretes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gbp_lembretes',
          filter: `empresa_uid=eq.${company.uid}`
        },
        (payload) => {
          console.log('Mudança em notificações detectada:', payload);
          loadNotifications();
        }
      )
      .subscribe((status) => {
        console.log('Status da inscrição:', status);
      });

    return () => {
      console.log('Limpando inscrição de tempo real...');
      channel.unsubscribe();
    };
  }, [company?.uid, user?.uid, loadNotifications]);

  // Atualiza periodicamente
  useEffect(() => {
    if (!company?.uid || !user?.uid) return;

    const interval = setInterval(loadNotifications, 5 * 60 * 1000); // 5 minutos
    return () => clearInterval(interval);
  }, [company?.uid, user?.uid, loadNotifications]);

  return {
    ...state,
    markAsRead,
    refresh: loadNotifications
  };
} 