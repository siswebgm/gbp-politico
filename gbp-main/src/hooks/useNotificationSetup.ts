import { useEffect, useState } from 'react';
import { supabaseClient } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { requestNotificationPermission } from '../lib/firebase';
import { toast } from 'react-toastify';

interface NotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  token: string | null;
  error: string | null;
}

export function useNotificationSetup() {
  const { user } = useAuth();
  const [state, setState] = useState<NotificationState>({
    isSupported: false,
    permission: 'default',
    token: null,
    error: null
  });

  // Verifica suporte inicial
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isSupported: 'Notification' in window && 'serviceWorker' in navigator
    }));
  }, []);

  // Monitora mudanças na permissão
  useEffect(() => {
    if (!state.isSupported) return;

    const handlePermissionChange = () => {
      setState(prev => ({
        ...prev,
        permission: Notification.permission
      }));
    };

    // Verifica permissão atual
    handlePermissionChange();

    // Tenta registrar para mudanças de permissão (nem todos browsers suportam)
    if ('permissions' in navigator) {
      navigator.permissions
        .query({ name: 'notifications' as PermissionName })
        .then(status => {
          status.onchange = handlePermissionChange;
        })
        .catch(console.error);
    }
  }, [state.isSupported]);

  // Setup principal das notificações
  useEffect(() => {
    let cancelled = false;
    const setupNotifications = async () => {
      console.log('Iniciando setup de notificações...', { 
        user,
        supported: state.isSupported,
        permission: state.permission 
      });
      
      if (!state.isSupported) {
        setState(prev => ({
          ...prev,
          error: 'Seu navegador não suporta notificações'
        }));
        return;
      }

      if (!user?.id) {
        console.log('Usuário não encontrado, abortando setup');
        return;
      }

      try {
        // Primeiro, verificar se o usuário existe e seu token atual
        const { data: userData, error: userError } = await supabaseClient
          .from('gbp_usuarios')
          .select('notification_token, notification_status')
          .eq('id', user.id)
          .single();

        if (userError) {
          console.error('Erro ao buscar usuário:', userError);
          setState(prev => ({
            ...prev,
            error: 'Erro ao buscar dados do usuário'
          }));
          return;
        }

        // Se já tem um token, confere se o navegador ainda usa o mesmo
        // (FCM pode rotacionar o token ou a subscription pode ter sido resetada)
        if (userData?.notification_token) {
          console.log('Token de notificação já existe:', userData.notification_token.substring(0, 20) + '...');

          if (state.permission === 'granted') {
            const tokenAtual = await requestNotificationPermission();
            if (cancelled) return;
            if (tokenAtual && tokenAtual !== userData.notification_token) {
              console.log('Token FCM mudou — atualizando no banco');
              await supabaseClient
                .from('gbp_usuarios')
                .update({
                  notification_token: tokenAtual,
                  notification_status: 'enabled',
                  notification_updated_at: new Date().toISOString()
                })
                .eq('id', user.id);
              setState(prev => ({ ...prev, token: tokenAtual, error: null }));
              return;
            }
          }

          // Se ficou marcado como invalid_token (token novo salvo sem resetar),
          // reabilita para voltar a aparecer na lista de destinatários
          if (userData.notification_status === 'invalid_token') {
            console.log('Status invalid_token com token válido — reativando');
            await supabaseClient
              .from('gbp_usuarios')
              .update({
                notification_status: 'enabled',
                notification_updated_at: new Date().toISOString()
              })
              .eq('id', user.id);
          }

          setState(prev => ({
            ...prev,
            token: userData.notification_token
          }));
          return;
        }

        console.log('Sem token no banco — permissão:', state.permission);

        // Se não tem token: pede permissão (default) ou gera novo token
        // quando já está granted (ex.: token foi invalidado pelo FCM)
        if (state.permission === 'default' || state.permission === 'granted') {
          console.log('Solicitando permissão para notificações...');
          
          // Solicitar permissão e obter token
          const token = await requestNotificationPermission();
          
          // Se não tem token, apenas retorna sem mostrar erro
          if (!token) {
            console.log('Token não disponível - permissão não concedida');
            return;
          }

          console.log('Token obtido:', token);
          
          try {
            // Salvar token no banco de dados e reativar o status
            // (handleInvalidToken marca como 'invalid_token' quando o FCM rejeita)
            const { error: updateError } = await supabaseClient
              .from('gbp_usuarios')
              .update({
                notification_token: token,
                notification_status: 'enabled',
                notification_updated_at: new Date().toISOString()
              })
              .eq('id', user.id);

            if (updateError) {
              console.error('Erro ao salvar token:', updateError);
              // Não mostra mensagem de erro para o usuário
              return;
            }

            // Atualiza o estado sem mensagem de erro
            setState(prev => ({
              ...prev,
              token,
              error: null
            }));

            // Mostra mensagem de sucesso apenas se o token foi salvo
            toast.success('Notificações ativadas com sucesso!');
          } catch (error) {
            console.error('Erro ao salvar token de notificação:', error);
            // Não mostra mensagem de erro para o usuário
          }
        } 
        // Se já negou antes, não faz nada
        else if (state.permission === 'denied') {
          console.log('Usuário já negou permissão para notificações');
          // Não mostra mensagem de aviso
        }
      } catch (error: any) {
        console.error('Erro inesperado ao configurar notificações:', error);
      }
    };

    setupNotifications();
    return () => { cancelled = true; };
  }, [user, state.isSupported, state.permission]);

  return state;
}