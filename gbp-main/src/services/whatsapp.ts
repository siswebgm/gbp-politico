import axios, { AxiosError } from 'axios';

// Tipos
interface WhatsAppConfig {
  port: string;
  sessionName: string;
  sessionToken: string;
}

interface WhatsAppResponse {
  status: boolean;
  message: string;
  qrcode?: string | {
    pairingCode: string | null;
    code: string;
    base64: string;
    count: number;
  };
  session?: string;
}

interface MessageResponse {
  status: boolean;
  message: string;
  messageId?: string;
}

interface InstanceInfo {
  instanceName: string;
  status: 'connected' | 'disconnected' | 'connecting';
  qrcode?: string;
}

interface WhatsAppStatus {
  status: boolean;
  message: string;
  session?: {
    name: string;
    state: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';
    device?: {
      name: string;
      platform: string;
      battery?: {
        level: number;
        charging: boolean;
      };
    };
    qrCode?: string;
    lastSeen?: string;
    profileName?: string;
    profilePicture?: string;
  };
}

interface WhatsAppSession {
  id: string;
  name: string;
  status: string;
}

// Configuração
const config: WhatsAppConfig = {
  port: '',
  sessionName: '',
  sessionToken: ''
};

// Função para criar instância do axios com headers padrão e tratamento de erros
const createAxiosInstance = (port: string) => {
  // Garante que a porta tem 2 dígitos
  const formattedPort = port.padStart(2, '0');
  const baseURL = `https://api${formattedPort}.jmapps.com.br/api`;
  console.log('Base URL:', baseURL);

  const instance = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'GM_Sistemas'
    },
    timeout: 30000 // 30 segundos
  });

  // Interceptor para tratar erros
  instance.interceptors.response.use(
    (response) => {
      console.log('Successful response:', response);
      return response;
    },
    (error: AxiosError) => {
      console.error('API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      // Trata erros HTTP específicos
      switch (error.response?.status) {
        case 404:
          throw new Error('API não encontrada. Verifique se a porta está correta.');
        case 401:
          throw new Error('Token inválido. Verifique suas credenciais.');
        case 500:
          throw new Error('Erro no servidor. Tente novamente.');
        default:
          throw new Error('Erro ao comunicar com o servidor WhatsApp');
      }
    }
  );

  return instance;
};

export const whatsappService = {
  // Gerar token e QR code para conexão
  generateToken: async (port: string, session: string, token: string): Promise<WhatsAppResponse> => {
    if (!port || !session || !token) {
      throw new Error('Nome da sessão e token são obrigatórios');
    }

    try {
      console.log('Generating token for:', { port, session });
      const api = createAxiosInstance(port);
      
      // Primeiro, tenta criar a sessão
      const startResponse = await api.post('/instance/init', {
        key: session,
        webhook_url: null,
        webhook_enabled: false
      });
      
      console.log('Start session response:', startResponse.data);

      if (startResponse.data?.error) {
        throw new Error(startResponse.data.error);
      }

      // Se o QR code já veio na resposta
      if (startResponse.data?.qr) {
        return {
          pairingCode: null,
          code: '',
          base64: startResponse.data.qr,
          count: 1
        };
      }

      // Se não veio, aguarda um momento e tenta obter o QR code
      await new Promise(resolve => setTimeout(resolve, 1000));

      const qrResponse = await api.get(`/instance/qr?key=${session}`);
      console.log('QR code response:', qrResponse.data);

      if (qrResponse.data?.error) {
        throw new Error(qrResponse.data.error);
      }

      if (!qrResponse.data || !qrResponse.data.qr) {
        throw new Error('Erro ao gerar QR Code');
      }

      // Formata a resposta para o padrão esperado
      return {
        pairingCode: null,
        code: '',
        base64: qrResponse.data.qr,
        count: 1
      };

    } catch (error) {
      console.error('Error generating token:', error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Erro ao comunicar com o servidor WhatsApp');
    }
  },

  // Conectar à instância
  connectInstance: async (port: string, session: string): Promise<boolean> => {
    try {
      console.log('Connecting to instance:', { port, session });
      const api = createAxiosInstance(port);
      const response = await api.get(`/connect/${session}`);
      console.log('Connect instance response:', response.data);
      return response.data?.success || false;
    } catch (error) {
      console.error('Error connecting to instance:', error);
      return false;
    }
  },

  // Enviar mensagem de texto
  sendTextMessage: async (port: string, session: string, number: string, text: string): Promise<MessageResponse> => {
    try {
      if (!number || !text) {
        throw new Error('Número e texto são obrigatórios');
      }

      const api = createAxiosInstance(port);
      const formattedNumber = number.replace(/\D/g, '');
      const fullNumber = formattedNumber.startsWith('55') ? formattedNumber : `55${formattedNumber}`;

      const payload = {
        number: fullNumber,
        options: {
          delay: 1200,
          presence: 'composing',
          linkPreview: false
        },
        textMessage: {
          text,
        }
      };

      console.log('Sending message with payload:', payload);

      const response = await api.post(`/send-text/${session}`, payload);

      console.log('Send message response:', response.data);

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erro ao enviar mensagem');
      }

      return {
        status: true,
        message: 'Mensagem enviada com sucesso',
        messageId: response.data?.messageId
      };
    } catch (error) {
      console.error('Error sending message:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao enviar mensagem');
    }
  },

  // Verificar status da conexão com informações detalhadas
  checkConnection: async (port: string, session: string): Promise<WhatsAppStatus> => {
    try {
      console.log('Checking connection status for:', { port, session });
      const api = createAxiosInstance(port);
      
      const response = await api.get(`/instance/info?key=${session}`);
      console.log('Connection status response:', response.data);

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // Verifica se está conectado
      const isConnected = response.data?.instance_data?.connected === true;

      if (isConnected) {
        return {
          status: true,
          message: 'WhatsApp conectado',
          session: {
            name: session,
            state: 'CONNECTED',
            device: {
              name: response.data.instance_data?.phone_connected || 'WhatsApp Web',
              platform: 'Web'
            },
            profileName: response.data.instance_data?.user?.name || session,
            lastSeen: new Date().toISOString()
          }
        };
      }

      // Se não estiver conectado, retorna o status apropriado
      return {
        status: false,
        message: 'WhatsApp desconectado',
        session: {
          name: session,
          state: 'DISCONNECTED'
        }
      };

    } catch (error) {
      console.error('Error checking connection:', error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Erro ao verificar status da conexão');
    }
  },

  listSessions: async (port: string): Promise<WhatsAppSession[]> => {
    try {
      console.log('Listing sessions for port:', port);
      const api = createAxiosInstance(port);
      
      const response = await api.get('/instances');
      console.log('List sessions response:', response.data);

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return (response.data?.instances || []).map((instance: any) => ({
        id: instance.key,
        name: instance.key,
        status: instance.status
      }));
    } catch (error) {
      console.error('Error listing sessions:', error);
      throw new Error('Erro ao listar sessões');
    }
  },

  deleteSession: async (port: string, session: string): Promise<boolean> => {
    try {
      console.log('Deleting session:', { port, session });
      const api = createAxiosInstance(port);
      
      const response = await api.delete(`/instance/delete?key=${session}`);
      console.log('Delete session response:', response.data);

      return response.data?.success || false;
    } catch (error) {
      console.error('Error deleting session:', error);
      throw new Error('Erro ao deletar sessão');
    }
  },

  logout: async (port: string, session: string): Promise<boolean> => {
    try {
      console.log('Logging out session:', { port, session });
      const api = createAxiosInstance(port);
      
      const response = await api.post(`/instance/logout?key=${session}`);
      console.log('Logout response:', response.data);

      return response.data?.success || false;
    } catch (error) {
      console.error('Error logging out:', error);
      throw new Error('Erro ao desconectar sessão');
    }
  }
};