import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import './styles/mobile.css';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { checkForNewVersion } from './utils/versionCheck';

// Adiciona log para debug
console.log('Iniciando aplicação...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

ReactDOM.createRoot(rootElement as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registra o service worker
serviceWorkerRegistration.register();

// Inicia a verificação de nova versão
checkForNewVersion();