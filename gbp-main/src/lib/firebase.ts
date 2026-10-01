import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyD68oM2v_1zskhGgoHFnUW0REFAf-hyuxE',
  authDomain: 'sistema-para-vereador.firebaseapp.com',
  projectId: 'sistema-para-vereador',
  storageBucket: 'sistema-para-vereador.firebasestorage.app',
  messagingSenderId: '955852815886',
  appId: '1:955852815886:web:a625a99a6d2969b11fc65f'
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

const app = initializeApp(firebaseConfig);

let messaging: Messaging | null = null;

async function getMessagingInstance(): Promise<Messaging | null> {
  if (messaging) return messaging;
  try {
    if (!(await isSupported())) return null;
    messaging = getMessaging(app);
    return messaging;
  } catch (error) {
    console.error('Erro ao inicializar Firebase Messaging:', error);
    return null;
  }
}

// Solicita permissão e retorna o token FCM (ou null se não for possível)
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return null;

    if (!VAPID_KEY) {
      console.warn('VITE_FIREBASE_VAPID_KEY não definida - token FCM não será gerado');
      return null;
    }

    const permission =
      Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission;
    if (permission !== 'granted') return null;

    const instance = await getMessagingInstance();
    if (!instance) return null;

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    const token = await getToken(instance, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });
    return token || null;
  } catch (error) {
    console.error('Erro ao obter token de notificação:', error);
    return null;
  }
}

// Mensagens recebidas com o app em primeiro plano
export function onMessageListener(callback?: (payload: any) => void) {
  let unsubscribe: () => void = () => {};
  getMessagingInstance().then((instance) => {
    if (instance) {
      unsubscribe = onMessage(instance, (payload) => callback?.(payload));
    }
  });
  return () => unsubscribe();
}

export async function sendTestNotification() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  new Notification('GBP Politico', { body: 'Notificação de teste' });
  return true;
}

export { messaging };