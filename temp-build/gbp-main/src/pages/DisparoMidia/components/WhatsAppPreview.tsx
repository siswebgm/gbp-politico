import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Wifi, Play, FileText, User } from 'lucide-react';

interface WhatsAppPreviewProps {
  message: string;
  files: Array<{
    type: 'image' | 'video' | 'audio' | 'pdf';
    previewUrl: string;
  }>;
  includeSaudacao?: boolean;
}

export function WhatsAppPreview({ message, files, includeSaudacao }: WhatsAppPreviewProps) {
  const currentTime = format(new Date(), 'HH:mm', { locale: ptBR });

  const formattedMessage = includeSaudacao 
    ? `Olá, Fulano. Tudo bem?\n${message}`
    : message;

  return (
    <div className="w-[280px] h-[580px] bg-gray-100 rounded-[3rem] p-2 shadow-xl border-8 border-gray-800 relative mx-auto">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-gray-800 rounded-b-xl" />

      {/* Screen */}
      <div className="h-full rounded-[2.5rem] overflow-hidden bg-[#E5DDD5] relative flex flex-col">
        {/* Status Bar */}
        <div className="h-6 bg-[#075E54] flex items-center justify-between px-4">
          <span className="text-white text-xs">{currentTime}</span>
          <div className="flex items-center space-x-1">
            <Wifi className="w-3 h-3 text-white" />
            <div className="w-4 h-2 bg-white rounded-sm" />
          </div>
        </div>

        {/* Header */}
        <div className="bg-[#075E54] px-4 py-2 flex items-center gap-3 flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
            <User className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <h3 className="text-white font-medium">Destinatário</h3>
            <span className="text-xs text-green-300">online</span>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent hover:scrollbar-thumb-gray-500">
          <div className="min-h-full p-4 space-y-2">
            {/* Message Bubble */}
            <div className="flex justify-end">
              <div className="max-w-[85%] bg-[#DCF8C6] rounded-lg p-2 shadow relative">
                {files.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {files.map((file, index) => (
                      <div key={index} className="rounded-lg overflow-hidden bg-white">
                        {file.type === 'image' && (
                          <div className="relative">
                            <img
                              src={file.previewUrl}
                              alt="Preview"
                              className="w-full h-48 object-cover"
                            />
                          </div>
                        )}
                        {file.type === 'video' && (
                          <div className="relative">
                            <div className="w-[240px] h-48 bg-black flex items-center justify-center text-white">
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center mb-2">
                                  <Play className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-sm text-white/90">Prévia do vídeo</span>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/70 to-transparent flex items-center px-3">
                                <div className="w-full flex items-center justify-between text-xs">
                                  <span>0:00</span>
                                  <span>1:30</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {file.type === 'audio' && (
                          <div className="w-full h-16 bg-[#075E54] flex items-center px-4 text-white rounded-lg">
                            <div className="flex items-center gap-4 w-full">
                              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                <Play className="w-5 h-5 flex-shrink-0" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between text-xs mb-1.5">
                                  <span>Prévia do áudio</span>
                                  <span>1:30</span>
                                </div>
                                <div className="w-full h-1 bg-white/30 rounded-full">
                                  <div className="w-1/3 h-full bg-white rounded-full" />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {file.type === 'pdf' && (
                          <div className="w-full bg-white border rounded-lg overflow-hidden">
                            <div className="h-14 bg-red-500 flex items-center px-4 text-white">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5" />
                                <span className="font-medium">PDF</span>
                              </div>
                            </div>
                            <div className="px-4 py-2 text-sm text-gray-600">
                              Documento PDF
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {formattedMessage && (
                  <p className="text-sm break-words whitespace-pre-line">{formattedMessage}</p>
                )}
                <div className="flex items-center justify-end space-x-1 mt-1">
                  <span className="text-[10px] text-gray-500">{currentTime}</span>
                  <Check className="w-3 h-3 text-gray-500" />
                  <Check className="w-3 h-3 text-gray-500 -ml-2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
