// Firebase desabilitado temporariamente para resolver problemas de build
// import { initializeApp } from 'firebase/app';
// import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// const firebaseConfig = {
//   apiKey: "AIzaSyBwIsr-o9tj5noU9EQwR2z3hXRZSZTpHW0",
//   authDomain: "gbppolitico.firebaseapp.com",
//   projectId: "gbppolitico",
//   storageBucket: "gbppolitico.firebasestorage.app",
//   messagingSenderId: "48941500586",
//   appId: "1:48941500586:web:7eb764b449bdb1292f28d3",
//   measurementId: "G-THXVFQBT44"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const messaging = getMessaging(app);

// Mock Firebase para evitar erros
const messaging = null;

// Service Worker desabilitado junto com Firebase

// Função para solicitar permissão e obter o token (DESABILITADA)
export async function requestNotificationPermission() {
  console.log('Firebase desabilitado - notificações não disponíveis');
  return null;
}

// Função para lidar com mensagens em primeiro plano (DESABILITADA)
export function onMessageListener() {
  console.log('Firebase desabilitado - listener de mensagens não disponível');
  return () => {};
}

export async function sendTestNotification() {
  console.log('Firebase desabilitado - notificação de teste não disponível');
  return false;
}

export { messaging }; 