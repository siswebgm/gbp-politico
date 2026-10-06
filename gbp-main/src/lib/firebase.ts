import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, deleteToken, onMessage, isSupported, Messaging } from 'firebase/messaging';

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

// Converte a applicationServerKey (ArrayBuffer) da push subscription para
// base64url, para comparar com a VAPID_KEY configurada
function applicationServerKeyToBase64Url(key: ArrayBuffer): string {
  const bytes = new Uint8Array(key);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Se a push subscription existente foi criada com outra VAPID (trocamos a
// chave), o fcmregistrations rejeita com 401. Faz unsubscribe para o
// getToken criar uma subscription nova com a VAPID atual.
async function resetSubscriptionIfVapidChanged(
  registration: ServiceWorkerRegistration
): Promise<void> {
  try {
    const sub = await registration.pushManager.getSubscription();
    if (!sub?.options?.applicationServerKey) return;
    const current = applicationServerKeyToBase64Url(sub.options.applicationServerKey);
    if (current !== VAPID_KEY) {
      console.log('Push subscription usa VAPID antiga — removendo para recriar');
      await sub.unsubscribe();
    }
  } catch (error) {
    console.warn('Falha ao verificar push subscription:', error);
  }
}

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

// Chamada única em voo — chamadas paralelas (efeito React duplicado,
// transição de permissão default→granted) esperam a mesma Promise em vez
// de gerar tokens concorrentes que se invalidam mutuamente
let pendingTokenRequest: Promise<string | null> | null = null;

// Solicita permissão e retorna o token FCM (ou null se não for possível)
export function requestNotificationPermission(): Promise<string | null> {
  if (!pendingTokenRequest) {
    pendingTokenRequest = requestNotificationPermissionInternal().finally(() => {
      pendingTokenRequest = null;
    });
  }
  return pendingTokenRequest;
}

async function requestNotificationPermissionInternal(): Promise<string | null> {
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

    // Subscription antiga presa a outra VAPID causa 401 no fcmregistrations
    await resetSubscriptionIfVapidChanged(registration);

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

// Remove o token FCM local caso seja o mesmo informado — força o próximo
// getToken a gerar um token novo (usado quando o servidor FCM rejeita o token)
export async function deleteTokenIfMatches(token: string): Promise<void> {
  try {
    if (!VAPID_KEY) return;
    const instance = await getMessagingInstance();
    if (!instance) return;

    // Sem registration explícita — o SDK usa a registration padrão
    const current = await getToken(instance, { vapidKey: VAPID_KEY });

    if (current && current === token) {
      await deleteToken(instance);
      console.log('Token FCM local removido — próximo getToken gerará um novo');
    }
  } catch (error) {
    console.error('Erro ao remover token FCM local:', error);
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