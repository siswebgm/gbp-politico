import { useAppVersion } from '../hooks/useAppVersion';
import { useLocation } from 'react-router-dom';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { useState } from 'react';

export function UpdateAlert() {
  const { needsUpdate, forceUpdate } = useAppVersion();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);

  // Só exibe o alerta na página do Dashboard (/app)
  const isDashboard = location.pathname === '/app';

  if (!needsUpdate || !isDashboard || !isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-2xl overflow-hidden w-full sm:max-w-md md:max-w-lg">
        {/* Barra de destaque no topo */}
        <div className="h-1 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500"></div>
        
        <div className="p-4 sm:p-5">
          <div className="flex items-start">
            {/* Conteúdo */}
            <div className="flex-1 min-w-0 flex flex-col">
              <h3 className="text-base sm:text-lg font-semibold mb-1 flex items-center gap-2">
                {/* Ícone animado inline */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
                    <div className="relative bg-white/10 backdrop-blur-sm p-1.5 sm:p-2 rounded-full">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300" />
                    </div>
                  </div>
                </div>
                <span>Nova Versão Disponível!</span>
              </h3>
              <p className="text-blue-100 text-xs sm:text-sm mb-3 sm:mb-4">
                Atualização disponível com melhorias.
              </p>

              {/* Botões */}
              <div className="flex flex-row items-center gap-2 sm:gap-3">
                <button
                  onClick={forceUpdate}
                  className="flex items-center justify-center gap-2 bg-white text-blue-600 px-4 py-2 sm:py-2.5 rounded-lg font-medium hover:bg-blue-50 active:scale-95 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
                >
                  <RefreshCw className="w-4 h-4" />
                  Atualizar Agora
                </button>
                <button
                  onClick={() => setIsVisible(false)}
                  className="text-blue-100 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm text-center"
                >
                  Mais tarde
                </button>
              </div>
            </div>

            {/* Botão fechar */}
            <button
              onClick={() => setIsVisible(false)}
              className="absolute top-2 right-2 sm:static flex-shrink-0 text-blue-100 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
