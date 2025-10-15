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
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-2xl overflow-hidden max-w-md">
        {/* Barra de destaque no topo */}
        <div className="h-1 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500"></div>
        
        <div className="p-5">
          <div className="flex items-start gap-4">
            {/* Ícone animado */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
                <div className="relative bg-white/10 backdrop-blur-sm p-3 rounded-full">
                  <Sparkles className="w-6 h-6 text-yellow-300" />
                </div>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                Nova Versão Disponível!
              </h3>
              <p className="text-blue-100 text-sm mb-4">
                Uma atualização está pronta com melhorias e correções.
              </p>

              {/* Botões */}
              <div className="flex items-center gap-3">
                <button
                  onClick={forceUpdate}
                  className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2.5 rounded-lg font-medium hover:bg-blue-50 active:scale-95 transition-all shadow-lg hover:shadow-xl"
                >
                  <RefreshCw className="w-4 h-4" />
                  Atualizar Agora
                </button>
                <button
                  onClick={() => setIsVisible(false)}
                  className="text-blue-100 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm"
                >
                  Mais tarde
                </button>
              </div>
            </div>

            {/* Botão fechar */}
            <button
              onClick={() => setIsVisible(false)}
              className="flex-shrink-0 text-blue-100 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
