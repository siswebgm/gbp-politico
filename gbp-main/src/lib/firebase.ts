import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyBwIsr-o9tj5noU9EQwR2z3hXRZSZTpHW0",
  authDomain: "gbppolitico.firebaseapp.com",
  projectId: "gbppolitico",
  storageBucket: "gbppolitico.firebasestorage.app",
  messagingSenderId: "48941500586",
  appId: "1:48941500586:web:7eb764b449bdb1292f28d3",
  measurementId: "G-THXVFQBT44"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Função para registrar o service worker
async function registerServiceWorker() {
  try {
    if ('serviceWorker' in navigator) {
      console.log('Service Worker é suportado, tentando registrar...');
      
      // Primeiro, desregistrar qualquer service worker existente
      const existingRegistration = await navigator.serviceWorker.getRegistration();
      if (existingRegistration) {
        console.log('Desregistrando service worker existente...');
        await existingRegistration.unregister();
      }

      console.log('Registrando novo service worker...');
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      console.log('Service Worker registrado com sucesso:', registration);
      
      // Forçar atualização do service worker
      await registration.update();
      
      // Aguardar até que o service worker esteja ativo
      if (registration.installing) {
        console.log('Service Worker está instalando...');
        const worker = registration.installing;
        
        await new Promise((resolve, reject) => {
          worker.addEventListener('statechange', () => {
            console.log('Estado do Service Worker:', worker.state);
            if (worker.state === 'activated') {
              console.log('Service Worker ativado com sucesso!');
              resolve(true);
            } else if (worker.state === 'redundant') {
              console.error('Service Worker se tornou redundante');
              reject(new Error('Service Worker registration failed'));
            }
          });
        });
      }

      return registration;
    }
    throw new Error('Service Worker não suportado');
  } catch (error) {
    console.error('Erro ao registrar Service Worker:', error);
    throw error;
  }
}

// Função para solicitar permissão e obter o token
export async function requestNotificationPermission() {
  console.log('Verificando suporte a notificações...');
  
  if (!('Notification' in window)) {
    console.error('Este navegador não suporta notificações desktop');
    throw new Error('Este navegador não suporta notificações desktop');
  }

  try {
    console.log('Status atual da permissão:', Notification.permission);
    
    // Se já tiver permissão, não precisa solicitar novamente
    if (Notification.permission === 'granted') {
      console.log('Permissão já concedida, obtendo token...');
    } else if (Notification.permission === 'denied') {
      console.log('Permissão para notificações já foi negada anteriormente');
      return null;
    } else {
      console.log('Solicitando permissão ao usuário...');
      const permission = await Notification.requestPermission();
      console.log('Resposta da permissão:', permission);
      
      if (permission !== 'granted') {
        console.log('Usuário negou permissão para notificações');
        return null;
      }
    }

    // Registrar o service worker antes de obter o token
    await registerServiceWorker();

    // Testar uma notificação local
    console.log('Testando notificação local...');
    try {
      const options = {
        body: 'Se você está vendo isso, as notificações estão funcionando!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'test',
        requireInteraction: true,
        vibrate: [200, 100, 200],
        silent: false,
        renotify: true
      };
      
      console.log('Criando notificação com opções:', options);
      
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('Teste de Notificação', options);
      console.log('Notificação mostrada com sucesso');
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
    }

    // Get registration token
    console.log('Gerando token do Firebase...');
    const token = await getToken(messaging, {
      vapidKey: 'BHhWjaFsEUq7V7s9OkmbxPPyDC4FQWNnZyxZJnvteF1VWax1MkgfDi5m49bfUon6CtNHfRRGhuyXCrgbPqYXOCk'
    });
    
    console.log('Token gerado com sucesso:', token);
    return token;
  } catch (error) {
    console.log('Notificações não configuradas:', error instanceof Error ? error.message : 'Erro desconhecido');
    return null;
  }
}

// Função para lidar com mensagens em primeiro plano
export function onMessageListener() {
  return onMessage(messaging, (payload) => {
    console.log('Mensagem recebida em primeiro plano:', payload);
    
    // Criar uma notificação mesmo quando o app está em primeiro plano
    if (Notification.permission === 'granted') {
      const notificationTitle = payload.notification?.title || 'Novo Lembrete';
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.message || 'Você tem um novo lembrete',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: payload.data?.id || 'reminder',
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: payload.data
      };

      console.log('Criando notificação em primeiro plano:', { title: notificationTitle, options: notificationOptions });
      
      new Notification(notificationTitle, notificationOptions);
    }
    
    return payload;
  });
}

export async function sendTestNotification() {
  if (Notification.permission === 'granted') {
    console.log('Enviando notificação de teste...');
    new Notification('Teste de Notificação', {
      body: 'Se você está vendo isso, as notificações estão funcionando!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'test',
      requireInteraction: true
    });
    return true;
  }
  return false;
}

export { messaging }; 