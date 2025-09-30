import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

// WhatsApp API integration
const whatsappApi = axios.create({
  baseURL: 'https://api02.jmapps.com.br',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_WHATSAPP_TOKEN}`,
  },
});

export const whatsappService = {
  createSession: async () => {
    return whatsappApi.post('/instance/create', {
      instanceName: 'gbp-politico',
      token: import.meta.env.VITE_WHATSAPP_TOKEN,
      qrcode: true,
    });
  },

  connectSession: async () => {
    return whatsappApi.get('/instance/connect/gbp-politico');
  },

  sendTextMessage: async (number: string, text: string) => {
    return whatsappApi.post('/message/sendText/gbp-politico', {
      number,
      options: {
        delay: 0,
        presence: 'composing',
        linkPreview: false,
      },
      textMessage: {
        text,
      },
    });
  },

  sendMediaMessage: async (number: string, mediaUrl: string, caption: string) => {
    return whatsappApi.post('/message/sendMedia/gbp-politico', {
      number,
      options: {
        delay: 0,
        presence: 'composing',
      },
      mediaMessage: {
        mediatype: 'image',
        caption,
        media: mediaUrl,
      },
    });
  },
};