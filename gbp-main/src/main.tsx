import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import './styles/mobile.css';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { checkForNewVersion } from './utils/versionCheck';

// Adiciona log para debug
console.log('Iniciando aplicação...');

const showFatalError = (title: string, error: unknown) => {
  try {
    const message =
      error instanceof Error
        ? `${error.name}: ${error.message}\n${error.stack || ''}`
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);

    console.error(`[FATAL] ${title}`, error);

    const existing = document.getElementById('__fatal_error__');
    if (existing) {
      existing.textContent = `${title}\n\n${message}`;
      return;
    }

    const el = document.createElement('pre');
    el.id = '__fatal_error__';
    el.style.position = 'fixed';
    el.style.inset = '0';
    el.style.zIndex = '2147483647';
    el.style.padding = '16px';
    el.style.margin = '0';
    el.style.overflow = 'auto';
    el.style.background = '#111827';
    el.style.color = '#F9FAFB';
    el.style.fontSize = '12px';
    el.style.lineHeight = '1.4';
    el.style.whiteSpace = 'pre-wrap';
    el.textContent = `${title}\n\n${message}`;
    document.body.appendChild(el);
  } catch {
    // ignore
  }
};

window.addEventListener('error', (event) => {
  showFatalError('Erro global (window.onerror)', (event as ErrorEvent).error || (event as ErrorEvent).message);
});

window.addEventListener('unhandledrejection', (event) => {
  showFatalError('Promise rejeitada (unhandledrejection)', (event as PromiseRejectionEvent).reason);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

ReactDOM.createRoot(rootElement as HTMLElement).render(
  // StrictMode removido: em desenvolvimento ele monta/desmonta/remonta componentes,
  // o que faz o widget do reCAPTCHA (react-google-recaptcha) renderizar duas vezes
  // sobrepostas no mesmo container, causando o bug visual de texto duplicado.
  <App />
);

// Registra o service worker
serviceWorkerRegistration.unregister();

// Inicia a verificação de nova versão
checkForNewVersion();