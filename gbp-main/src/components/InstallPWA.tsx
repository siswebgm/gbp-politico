import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(true);

  useEffect(() => {
    // Detecta se é iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Verifica se o usuário já fechou o prompt no iOS
    if (isIOSDevice) {
      const hasClosedPrompt = localStorage.getItem('iosInstallPromptClosed');
      setShowIOSPrompt(!hasClosedPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Previne o Chrome de mostrar o prompt automático
      e.preventDefault();
      // Armazena o evento para uso posterior
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Mostra nosso prompt customizado
      setIsInstallable(true);
    };

    // Adiciona o listener para o evento beforeinstallprompt
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Verifica se o app já está instalado
    window.addEventListener('appinstalled', () => {
      // Limpa o prompt
      setDeferredPrompt(null);
      setIsInstallable(false);
      console.log('PWA instalado com sucesso!');
    });

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      // Mostra o prompt de instalação
      await deferredPrompt.prompt();
      
      // Espera o usuário responder ao prompt
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('Usuário aceitou a instalação do PWA');
      } else {
        console.log('Usuário recusou a instalação do PWA');
      }
      
      // Limpa o prompt
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (err) {
      console.error('Erro ao tentar instalar o PWA:', err);
    }
  };

  const handleCloseIOSPrompt = () => {
    setShowIOSPrompt(false);
    localStorage.setItem('iosInstallPromptClosed', 'true');
  };

  // Se não for instalável e não for iOS, ou se for iOS mas o prompt já foi fechado
  if ((!isInstallable && !isIOS) || (isIOS && !showIOSPrompt)) return null;

  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg z-50">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Instalar GBP Político
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Para instalar, toque no ícone de compartilhar e selecione "Adicionar à Tela Inicial"
              </p>
            </div>
            <button
              onClick={handleCloseIOSPrompt}
              className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              aria-label="Fechar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg z-50">
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Instalar GBP Político
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Instale nosso app para um acesso mais rápido e melhor experiência
          </p>
        </div>
        
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setIsInstallable(false)}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Depois
          </button>
          <button
            onClick={handleInstallClick}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Instalar Agora
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPWA;
