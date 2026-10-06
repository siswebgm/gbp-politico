import { supabaseClient } from '../lib/supabase';
// Firebase desabilitado
// import { messaging } from '../lib/firebase';
// import { getMessaging, getToken } from 'firebase/messaging';
import { notificationLogsService } from './notificationLogs';

interface SendNotificationParams {
  title: string;
  body: string;
  data?: Record<string, string>;
  userIds?: string[];
  empresa_uid?: string;
  imagem_url?: string;
  link_direcionar?: string;
  tipo_midia?: string;
  url_midia?: string;
}

class NotificationService {
  private maxRetries = 3;
  private retryDelay = 1000; // 1 segundo

  private async retryOperation<T>(
    operation: () => Promise<T>,
    retryCount = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.log(`Tentativa ${retryCount + 1} falhou, tentando novamente em ${this.retryDelay * Math.pow(2, retryCount)}ms`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, retryCount)));
        return this.retryOperation(operation, retryCount + 1);
      }
      throw error;
    }
  }

  async handleInvalidToken(token: string, userId: string) {
    console.log('Debug - Removendo token inválido:', { 
      userId, 
      tokenParcial: token?.substring(0, 10) + '...' 
    });

    try {
      // Primeiro, verificamos se o usuário existe
      const { data: user, error: userError } = await supabaseClient
        .from('gbp_usuarios')
        .select('uid, notification_token')
        .eq('uid', userId)
        .single();

      if (userError) {
        console.error('Erro ao verificar usuário:', userError);
        return;
      }

      if (!user) {
        console.log('Usuário não encontrado:', userId);
        return;
      }

      // Formata a data atual no formato ISO 8601 com timezone UTC
      const currentDate = new Date().toISOString();

      // Atualizamos o token
      const { error: updateError } = await supabaseClient
        .from('gbp_usuarios')
        .update({ 
          notification_token: null,
          notification_status: 'invalid_token',
          notification_updated_at: currentDate
        })
        .eq('uid', userId);

      if (updateError) {
        console.error('Erro ao atualizar token do usuário:', {
          error: updateError,
          userId,
          date: currentDate
        });
        return;
      }

      console.log('Token removido com sucesso:', {
        userId,
        date: currentDate
      });
    } catch (error) {
      console.error('Erro ao remover token inválido:', error);
    }
  }

  async sendNotification({ title, body, data = {}, userIds }: SendNotificationParams) {
    console.log('Firebase desabilitado - notificação não enviada:', { title, body, userIds });
    return { success: false, message: 'Firebase desabilitado' };
    
    /* CÓDIGO ORIGINAL COMENTADO:
    try {
      if (!userIds || userIds.length === 0) {
        console.log('Nenhum usuário especificado para enviar notificação');
        return [];
      }

      console.log('Debug - Iniciando envio de notificação:', { 
        title, 
        body, 
        totalUsuarios: userIds.length 
      });

      // Buscar tokens dos usuários com seus IDs
      const { data: users, error } = await supabaseClient
        .from('gbp_usuarios')
        .select('uid, notification_token, nome, email')
        .in('uid', userIds)
        .not('notification_token', 'is', null)
        .neq('notification_status', 'invalid_token');

      if (error) {
        console.error('Erro ao buscar tokens dos usuários:', error);
        throw new Error(`Erro ao buscar tokens: ${error.message}`);
      }

      const validUsers = users.filter(user => 
        user.notification_token && 
        typeof user.notification_token === 'string' && 
        user.notification_token.length > 20 // Token FCM tem tamanho mínimo
      );
      
      console.log('Debug - Usuários válidos para notificação:', {
        total: validUsers.length,
        usuarios: validUsers.map(u => ({ 
          id: u.uid, 
          nome: u.nome || u.email,
          tokenParcial: u.notification_token?.substring(0, 10) + '...'
        }))
      });

      if (validUsers.length === 0) {
        console.log('Nenhum usuário válido encontrado para enviar notificação');
        return [];
      }

      // Garantir que todos os dados sejam strings
      const stringData: Record<string, string> = {};
      Object.entries(data).forEach(([key, value]) => {
        stringData[key] = String(value || '');
      });

      // Enviar notificações com retry
      const results = await Promise.all(
        validUsers.map(async (user) => {
          const messageForToken = {
            message: {
              token: user.notification_token,
              notification: {
                title: title || 'GBP Politico',
                body: body || '',
              },
              data: stringData,
              android: {
                priority: 'high',
                notification: {
                  channelId: 'default',
                  priority: 'high'
                }
              },
              apns: {
                payload: {
                  aps: {
                    alert: {
                      title,
                      body
                    },
                    sound: 'default',
                    badge: 1
                  }
                }
              },
              webpush: {
                notification: {
                  title,
                  body,
                  requireInteraction: true
                },
                headers: {
                  Urgency: 'high',
                  TTL: '86400'
                }
              }
            }
          };

          try {
            const accessToken = await this.getAccessToken();
            
            const response = await fetch('https://fcm.googleapis.com/v1/projects/gbppolitico/messages:send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify(messageForToken)
            });

            if (!response.ok) {
              const errorText = await response.text();
              let errorData;
              try {
                errorData = JSON.parse(errorText);
              } catch {
                errorData = { error: errorText };
              }

              console.error('Erro detalhado da API FCM:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData
              });
              
              // Verificar se o token é inválido
              if (
                response.status === 400 ||
                response.status === 404 ||
                errorData.error?.status === 'INVALID_ARGUMENT' || 
                errorData.error?.status === 'NOT_FOUND' ||
                errorData.error?.message?.includes('token')
              ) {
                await this.handleInvalidToken(user.notification_token, user.uid);
                throw new Error('Token inválido');
              }
              
              throw new Error(JSON.stringify(errorData));
            }

            return { success: true, userId: user.uid };
          } catch (error) {
            console.error('Erro ao enviar notificação para usuário:', {
              userId: user.uid,
              error: error instanceof Error ? error.message : String(error)
            });
            return { 
              success: false, 
              userId: user.uid,
              error: String(error)
            };
          }
        })
      );

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      console.log('Resultados do envio:', {
        total: results.length,
        success: successCount,
        failures: failureCount,
        detalhes: results.filter(r => !r.success).map(r => ({
          userId: r.userId,
          erro: r.error
        }))
      });

      return results;
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      throw error;
    }
    */ // FIM DO CÓDIGO COMENTADO
  }

  async enviarParaTokens(params: {
    tokens: string[];
    title: string;
    body: string;
    imagem_url?: string;
    icon_url?: string;
    badge_url?: string;
    empresa_nome?: string;
    link?: string;
    data?: Record<string, string>;
  }): Promise<Array<{ token: string; success: boolean; invalid_token?: boolean; error?: string }>> {
    const userUid = localStorage.getItem('user_uid');
    if (!userUid) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    const baseUrl = (import.meta.env.VITE_PUSH_API_URL as string | undefined) || 'https://app.gbppolitico.com/push-api';

    const response = await fetch(`${baseUrl}/enviar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-uid': userUid
      },
      body: JSON.stringify(params)
    });

    const corpo = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Erro ao enviar notificações: ${corpo?.error || response.status}`);
    }
    return corpo?.results || [];
  }

  async sendTestNotification(userId: string) {
    return this.sendNotification({
      title: 'GBP Politico',
      body: 'Nova notificação',
      data: {
        id: 'test',
        type: 'test'
      },
      userIds: [userId]
    });
  }
}

export const notificationService = new NotificationService(); 