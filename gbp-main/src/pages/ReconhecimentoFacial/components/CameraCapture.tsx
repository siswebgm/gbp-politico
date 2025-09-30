import { useCallback, useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';

interface CameraCaptureProps {
  onFrame: (imageSrc: string) => void;
  onDetectingChange: (isDetecting: boolean) => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onFrame, onDetectingChange }) => {
  const webcamRef = useRef<Webcam>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const intervalRef = useRef<NodeJS.Timer>();

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      onFrame(imageSrc);
    }
  }, [onFrame]);

  // Buscar dispositivos de vídeo disponíveis
  useEffect(() => {
    async function getDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        
        // Seleciona a primeira câmera por padrão
        if (videoDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error('Erro ao buscar dispositivos:', error);
      }
    }

    getDevices();
  }, []);

  // Gerencia a captura automática
  useEffect(() => {
    if (isDetecting) {
      intervalRef.current = setInterval(capture, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [capture, isDetecting]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-gray-900 w-full aspect-[4/3]">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-purple-500/20 z-10" />
      
      {/* Controles de Câmera */}
      <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-[100] flex items-center space-x-2 pointer-events-auto">
        {/* Botão de Alternar Câmera */}
        {devices.length > 1 && (
          <button
            onClick={() => {
              setIsFrontCamera(!isFrontCamera);
              const newDevice = devices.find(d => 
                isFrontCamera 
                  ? !d.label?.toLowerCase().includes('front') 
                  : d.label?.toLowerCase().includes('front')
              );
              if (newDevice) {
                setSelectedDeviceId(newDevice.deviceId);
              }
            }}
            className="bg-black/70 backdrop-blur-sm text-white p-2 rounded-lg border border-white/20 hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title={isFrontCamera ? 'Mudar para câmera traseira' : 'Mudar para câmera frontal'}
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
                d="M3 4v6h6m-6 0l7-7m11 17v-6h-6m6 0l-7 7"
              />
            </svg>
          </button>
        )}

        {/* Seletor de Câmera */}
        {devices.length > 1 && (
          <select
            value={selectedDeviceId}
            onChange={(e) => {
              setSelectedDeviceId(e.target.value);
              const device = devices.find(d => d.deviceId === e.target.value);
              setIsFrontCamera(device?.label?.toLowerCase().includes('front') ?? true);
            }}
            className="
              bg-black/90 backdrop-blur-md text-white text-sm rounded-lg
              px-3 py-2 border border-white/30
              focus:outline-none focus:ring-2 focus:ring-blue-500
              hover:bg-black/100 cursor-pointer
              relative min-w-[120px]
              pointer-events-auto
            "
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Câmera ${devices.indexOf(device) + 1}`}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Câmera */}
      {isDetecting && (
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            aspectRatio: 4/3,
            deviceId: selectedDeviceId
          }}
          className="w-full h-full object-cover"
        />
      )}

      {/* Overlay de Guia */}
      <div className="absolute inset-0 z-10">
        {/* Círculo de guia */}
        <div 
          className={`
            absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
            transition-opacity duration-300
            ${isDetecting ? 'opacity-75' : 'opacity-30'}
          `}
        >
          <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full border border-white/40 flex items-center justify-center">
            <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-full border border-white/20" />
          </div>
          
          {/* Linhas de guia */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-full w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          </div>
        </div>

        {/* Cantos decorativos */}
        <div className="absolute top-4 left-4 w-6 h-6 border-l border-t border-white/20" />
        <div className="absolute top-4 right-4 w-6 h-6 border-r border-t border-white/20" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-l border-b border-white/20" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-r border-b border-white/20" />
      </div>

      {/* Interface de Detecção */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
        {/* Botão Principal */}
        <button
          onClick={() => {
            const newState = !isDetecting;
            setIsDetecting(newState);
            onDetectingChange(newState);
          }}
          className={`
            group relative
            ${isDetecting ? 'bg-white/10' : 'bg-black/40'}
            backdrop-blur-sm
            w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full
            flex flex-col items-center justify-center
            transition-all duration-300
            border-2 ${isDetecting ? 'border-red-500/50' : 'border-blue-500/50'}
            hover:border-opacity-75
            ${isDetecting ? 'animate-pulse' : ''}
          `}
        >
          {/* Ícone */}
          <div className={`
            ${isDetecting ? 'text-red-500' : 'text-blue-500'}
            transition-colors duration-300
          `}>
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isDetecting ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M10 9v6m4-6v6"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              )}
            </svg>
          </div>
          
          {/* Texto */}
          <span className={`
            mt-2 text-sm font-medium
            ${isDetecting ? 'text-red-500' : 'text-blue-500'}
            transition-colors duration-300
          `}>
            {isDetecting ? 'Parar' : 'Iniciar'}
          </span>
        </button>

        {/* Mensagem de Instrução */}
        <div className="
          absolute bottom-4 sm:bottom-6 md:bottom-8
          px-3 py-1.5 sm:px-4 sm:py-2
          bg-black/40 backdrop-blur
          rounded-lg
          transform transition-all duration-300
          ${isDetecting ? 'opacity-50' : 'opacity-100'}
        ">
          <p className="text-white/90 text-sm font-medium">
            {isDetecting ? 'Detectando...' : 'Posicione o rosto no centro'}
          </p>
        </div>
      </div>
    </div>
  );
};
