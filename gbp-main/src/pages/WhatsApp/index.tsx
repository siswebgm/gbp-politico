import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { useCompanyStore } from '../../store/useCompanyStore';
import { supabaseClient } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function WhatsAppPage() {
  const { company } = useCompanyStore();
  const [whatsappStatus, setWhatsappStatus] = useState<'open' | 'close' | 'qrcode' | 'sincronizando'>('close');
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  // Função para buscar dados atuais
  const fetchCurrentState = useCallback(async () => {
    if (!company?.uid) return;

    try {
      setIsLoadingStatus(true);
      console.log('Buscando estado atual...');
      const { data, error } = await supabaseClient
        .from('gbp_empresas')
        .select('status_wpp, qr_code')
        .eq('uid', company.uid)
        .single();

      if (error) throw error;

      console.log('Estado atual recebido:', {
        status: data?.status_wpp,
        hasQrCode: !!data?.qr_code
      });

      if (data) {
        setWhatsappStatus(data.status_wpp as any);
        setQrCodeBase64(data.qr_code);
      }
    } catch (error) {
      console.error('Erro ao buscar estado:', error);
      toast.error('Erro ao buscar estado do WhatsApp');
    } finally {
      setIsLoadingStatus(false);
    }
  }, [company?.uid]);

  // Função para criar um novo canal de subscription
  const createChannel = useCallback((companyUid: string) => {
    console.log('Criando novo canal para:', companyUid);
    return supabaseClient
      .channel(`whatsapp-status-${companyUid}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gbp_empresas',
          filter: `uid=eq.${companyUid}`,
        },
        async (payload) => {
          console.log('Payload recebido:', {
            event: payload.eventType,
            old_status: payload.old?.status_wpp,
            new_status: payload.new?.status_wpp,
            has_qr_code: !!payload.new?.qr_code,
            qr_code_length: payload.new?.qr_code?.length,
            timestamp: new Date().toISOString()
          });

          if (!payload.new) {
            console.log('Payload inválido, buscando dados atualizados...');
            await fetchCurrentState();
            return;
          }

          // Atualizar estado com os valores das colunas corretas
          if (payload.new.status_wpp) {
            console.log('Atualizando status para:', payload.new.status_wpp);
            setWhatsappStatus(payload.new.status_wpp as any);
          }
          
          if (payload.new.qr_code) {
            console.log('Atualizando QR code, tamanho:', payload.new.qr_code.length);
            setQrCodeBase64(payload.new.qr_code);
          }

          if (payload.new.status_wpp === 'open') {
            toast.success('WhatsApp conectado com sucesso!');
          } else if (payload.new.status_wpp === 'close') {
            toast.error('WhatsApp desconectado');
          }
        }
      );
  }, [fetchCurrentState]);

  // Função para reconectar usando um novo canal
  const reconnectSubscription = useCallback(async (oldChannel: any) => {
    console.log('Tentando reconectar subscription...');
    try {
      await oldChannel.unsubscribe();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (company?.uid) {
        const newChannel = createChannel(company.uid);
        await newChannel.subscribe();
        console.log('Nova subscription criada com sucesso');
        await fetchCurrentState();
        return newChannel;
      }
    } catch (error) {
      console.error('Erro ao reconectar:', error);
      return null;
    }
  }, [company?.uid, createChannel, fetchCurrentState]);

  // Configurar realtime subscription
  useEffect(() => {
    if (!company?.uid) return;

    console.log('Configurando nova subscription para:', company.uid);
    fetchCurrentState();

    let retryCount = 0;
    const maxRetries = 3;
    let currentChannel = createChannel(company.uid);

    const setupSubscription = async () => {
      try {
        await currentChannel.subscribe(async (status) => {
          console.log('Status da subscription:', status, 'Tentativa:', retryCount);

          if (status === 'SUBSCRIBED') {
            console.log('Subscription ativa para:', company.uid);
            retryCount = 0;
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.warn('Problema na subscription:', status);
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`Tentando reconectar (${retryCount}/${maxRetries})...`);
              const newChannel = await reconnectSubscription(currentChannel);
              if (newChannel) {
                currentChannel = newChannel;
              }
            } else {
              console.error('Número máximo de tentativas atingido');
            }
          }
        });
      } catch (error) {
        console.error('Erro ao configurar subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      console.log('Limpando subscription...');
      currentChannel.unsubscribe();
    };
  }, [company?.uid, createChannel, reconnectSubscription, fetchCurrentState]);

  // Função para sincronizar
  const handleSincronizar = async () => {
    if (!company?.uid) {
      toast.error('Empresa não encontrada');
      return;
    }

    try {
      setIsGenerating(true);
      await axios.post('https://whkn8n.guardia.work/webhook/gbp_sincronizar', {
        acao: 'sincronizar',
        empresaUid: company.uid
      });
      
      // Buscar estado atual após sincronização
      await fetchCurrentState();
      
      toast.success('Sincronização iniciada');
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      toast.error('Erro ao sincronizar com WhatsApp');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDisconnect = async () => {
    if (!company?.uid) {
      toast.error('Empresa não encontrada');
      return;
    }

    try {
      setIsGenerating(true);
      await axios.post('https://whkn8n.guardia.work/webhook/gbpdesconectar', {
        instancia: company.nome,
        empresa: company.uid,
        acao: 'desconectar'
      });
      
      // Buscar estado atual após desconexão
      await fetchCurrentState();
      
      toast.success('WhatsApp desconectado com sucesso');
      setShowDisconnectModal(false);
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      toast.error('Erro ao desconectar WhatsApp');
    } finally {
      setIsGenerating(false);
    }
  };

  // Debug: Mostrar estado atual
  useEffect(() => {
    console.log('Estado atual do WhatsApp:', {
      status: whatsappStatus,
      hasQRCode: !!qrCodeBase64,
      companyUid: company?.uid
    });
  }, [whatsappStatus, qrCodeBase64, company?.uid]);

  const handleGenerateQRCode = async () => {
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setQrCode("https://example.com/whatsapp-connection");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header com Logo */}
      <div className="bg-[#00a884] h-[127px]">
        <div className="p-6 flex items-center">
          <div className="flex items-center text-white gap-2">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/512px-WhatsApp.svg.png"
              alt="WhatsApp"
              className="w-7 h-7"
            />
            <span className="text-sm font-normal">WHATSAPP WEB</span>
          </div>
        </div>
      </div>

      {/* Área cinza clara */}
      <div className="flex-1 bg-[#f0f2f5]">
        {/* Conteúdo Principal */}
        <div className="flex justify-center px-4 -mt-16">
          <div className="bg-white rounded shadow-lg w-full p-6 md:p-12">
            <h1 className="text-[#41525d] text-[1.2rem] md:text-[1.35rem] font-light mb-8 md:mb-12">
              USE O WHATSAPP NO SEU COMPUTADOR
            </h1>

            <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-20">
              <div className="flex-[1.4]">
                <ol className="list-decimal pl-4 md:pl-5 space-y-4 md:space-y-6 text-[#41525d] text-[15px] md:text-base">
                  <li>Abra o WhatsApp no seu celular.</li>
                  <li>
                    Toque em <strong>Mais opções</strong> ou <strong>Configurações</strong> e selecione{" "}
                    <strong>Aparelhos conectados</strong>.
                  </li>
                  <li>Toque em <strong>Conectar um aparelho</strong>.</li>
                  <li>Aponte seu celular para esta tela para capturar o QR code.</li>
                </ol>

                <div className="mt-8 md:mt-12">
                  {whatsappStatus === 'open' ? (
                    <a 
                      href="#" 
                      className="text-red-500 text-sm hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowDisconnectModal(true);
                      }}
                    >
                      Desconectar WhatsApp
                    </a>
                  ) : (
                    <a 
                      href="#" 
                      className="text-[#008069] text-sm hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        handleSincronizar();
                      }}
                    >
                      Conectar com número de telefone
                    </a>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center gap-4 md:gap-6 min-h-[300px] md:min-h-[400px]">
                {isGenerating ? (
                  <div className="w-[240px] h-[240px] md:w-[264px] md:h-[264px] border-2 border-[#00a884] rounded flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-[#00a884] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-[#41525d]">Gerando QR Code...</p>
                    </div>
                  </div>
                ) : whatsappStatus === 'open' ? (
                  <div className="flex flex-col items-center gap-3 md:gap-4 mt-8 md:mt-16">
                    <div className="bg-[#00a884]/10 p-4 md:p-6 rounded-lg">
                      <Wifi className="w-12 h-12 md:w-16 md:h-16 text-[#00a884]" />
                    </div>
                    <p className="text-[#00a884] font-medium text-center">WhatsApp Conectado</p>
                    <p className="text-sm text-gray-500 text-center px-4">
                      Seu WhatsApp está conectado e pronto para uso
                    </p>
                  </div>
                ) : whatsappStatus === 'sincronizando' ? (
                  <div className="flex flex-col items-center gap-3 md:gap-4 mt-8 md:mt-16">
                    <div className="bg-blue-100 p-4 md:p-6 rounded-lg">
                      <Loader2 className="w-12 h-12 md:w-16 md:h-16 text-blue-500 animate-spin" />
                    </div>
                    <p className="text-blue-500 font-medium text-center">Sincronizando WhatsApp</p>
                    <p className="text-sm text-gray-500 text-center px-4">
                      Aguarde enquanto conectamos seu WhatsApp
                    </p>
                  </div>
                ) : whatsappStatus === 'qrcode' && qrCodeBase64 ? (
                  <img src={qrCodeBase64} alt="QR Code" className="w-[240px] h-[240px] md:w-[264px] md:h-[264px] mx-auto mt-8 md:mt-16" />
                ) : (
                  <div 
                    className="flex flex-col items-center gap-3 md:gap-4 cursor-pointer hover:opacity-80 transition-opacity mt-8 md:mt-16"
                    onClick={handleSincronizar}
                  >
                    <div className="bg-red-100 p-4 md:p-6 rounded-lg">
                      <WifiOff className="w-12 h-12 md:w-16 md:h-16 text-red-500" />
                    </div>
                    <p className="text-red-500 font-medium text-center">WhatsApp Desconectado</p>
                    <p className="text-sm text-gray-500 text-center px-4">
                      Clique para gerar o QR Code
                    </p>
                  </div>
                )}

                <p className="mt-3 md:mt-4 text-sm text-gray-500 text-center px-4">
                  {whatsappStatus === 'open' 
                    ? 'Você pode usar o WhatsApp normalmente'
                    : 'Necessário para conectar ao WhatsApp'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação */}
      <Dialog
        open={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        PaperProps={{
          style: {
            borderRadius: '12px',
            padding: '8px',
            maxWidth: '400px',
            width: '90%'
          }
        }}
      >
        <DialogTitle 
          id="alert-dialog-title"
          sx={{
            fontSize: '1.1rem',
            fontWeight: 600,
            color: '#41525d',
            textAlign: 'center',
            pt: 3,
            pb: 1
          }}
        >
          Confirmar Desconexão
        </DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          <p className="text-[#667781] text-center text-[15px] leading-relaxed px-4">
            Tem certeza que deseja desconectar o WhatsApp? Você precisará escanear o QR Code novamente para reconectar.
          </p>
        </DialogContent>
        <DialogActions sx={{ 
          justifyContent: 'center',
          gap: 1,
          pb: 3,
          px: 3
        }}>
          <Button 
            onClick={() => setShowDisconnectModal(false)} 
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.95rem',
              minWidth: '120px',
              borderRadius: '24px',
              color: '#008069'
            }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleDisconnect} 
            variant="contained"
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.95rem',
              minWidth: '120px',
              borderRadius: '24px',
              backgroundColor: '#dc2626',
              '&:hover': {
                backgroundColor: '#b91c1c'
              }
            }}
          >
            Desconectar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
