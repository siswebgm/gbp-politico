import { useState, useEffect } from 'react';
import { CameraCapture } from './components/CameraCapture';
import { FaceDetection } from './components/FaceDetection';
import { ResultDisplay } from './components/ResultDisplay';
import { useFaceRecognition } from './hooks/useFaceRecognition';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../hooks/useToast';
import { useNavigate } from 'react-router-dom';

export default function ReconhecimentoFacial() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Verifica se o usuário está autenticado
  useEffect(() => {
    if (!user) {
      toast.showToast({
        type: 'error',
        title: 'Acesso Negado',
        description: 'Você precisa estar logado para acessar esta página'
      });
      navigate('/login');
    }
  }, [user, navigate, toast]);

  // Se não estiver autenticado, não renderiza nada
  if (!user) {
    return null;
  }
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const { loading, matchedUser, confidence, findSimilarFace } = useFaceRecognition();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 px-2 sm:px-4 md:py-6 md:px-6">
      {/* Header com gradiente */}
      <div className="w-full mb-4 sm:mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-xl overflow-hidden">
          <div className="px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-white/10 rounded-lg p-2">
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-bold text-white sm:text-xl md:text-2xl">
                  Reconhecimento Facial
                </h1>
                <p className="mt-0.5 text-xs sm:text-sm text-blue-100">
                  Identifique eleitores automaticamente usando inteligência artificial
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
          {/* Coluna da Câmera */}
          <div className="h-full">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden h-full flex flex-col">
              <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Câmera
                </h2>
              </div>
              <div className="flex-1 p-6">
                <CameraCapture 
                  onFrame={setCurrentImage} 
                  onDetectingChange={setIsDetecting}
                />
                {isDetecting && (
                  <div className="mt-4">
                    <FaceDetection 
                      imageData={currentImage} 
                      onDetection={findSimilarFace}
                    />
                  </div>
                )}
              </div>
            </div>
            
            {isDetecting && (
              <div className="mt-4">
                <FaceDetection 
                  imageData={currentImage} 
                  onDetection={findSimilarFace}
                />
              </div>
            )}
          </div>

          {/* Coluna do Resultado */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden h-full flex flex-col">
            <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Resultado
                </h2>
                <button
                  onClick={() => {
                    setIsDetecting(false);
                    findSimilarFace(null);
                  }}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 transition-colors"
                  title="Limpar resultado"
                >
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M6 18L18 6M6 6l12 12" 
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <ResultDisplay 
                matchedUser={matchedUser}
                confidence={confidence}
                loading={loading}
                onReset={() => {
                  setIsDetecting(false);
                  findSimilarFace(null);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
