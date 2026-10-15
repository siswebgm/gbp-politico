import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Smartphone, WifiOff } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { supabaseClient } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';
import { useAuth } from '../providers/AuthProvider';

// Intervalo mínimo entre exibições do modal (6 horas)
const SNOOZE_MS = 6 * 60 * 60 * 1000;
const snoozeKey = (companyUid: string) => `wpp_modal_snoozed_until_${companyUid}`;

/**
 * Monitora status_wpp da empresa (gbp_empresas) e exibe um modal
 * quando o WhatsApp estiver desconectado — com snooze para não
 * incomodar a cada carregamento de página. Apenas para admins.
 */
export function WhatsAppStatusAlert() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const company = useCompanyStore((state) => state.company);
  const setCompany = useCompanyStore((state) => state.setCompany);

  const isAdmin =
    (user?.nivel_acesso || '').toLowerCase() === 'admin' ||
    (user?.cargo || '').toLowerCase() === 'admin';

  const [open, setOpen] = useState(false);

  // Ref para que callbacks de subscription leiam a rota atual
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  const snooze = useCallback(() => {
    if (!company?.uid) return;
    localStorage.setItem(snoozeKey(company.uid), String(Date.now() + SNOOZE_MS));
    setOpen(false);
  }, [company?.uid]);

  // Decide se o modal deve abrir conforme o status atual
  const evaluate = useCallback(
    (status: string | null | undefined) => {
      if (!company?.uid || !isAdmin) return;

      if (status === 'open') {
        // Reconectou: reseta o snooze para a próxima queda avisar na hora
        localStorage.removeItem(snoozeKey(company.uid));
        setOpen(false);
        return;
      }

      if (status !== 'close') {
        // 'qrcode' (conectando) ou indefinido: não mostra modal
        setOpen(false);
        return;
      }

      // Não atrapalha quem já está na página de conexão
      if (pathnameRef.current.startsWith('/app/whatsapp')) {
        setOpen(false);
        return;
      }

      const snoozedUntil = Number(localStorage.getItem(snoozeKey(company.uid)) || 0);
      if (Date.now() >= snoozedUntil) {
        setOpen(true);
      }
    },
    [company?.uid, isAdmin]
  );

  // Estado inicial + subscription realtime no gbp_empresas
  useEffect(() => {
    if (!company?.uid || !isAdmin) return;

    let cancelled = false;

    const fetchStatus = async () => {
      const { data } = await supabaseClient
        .from('gbp_empresas')
        .select('status_wpp')
        .eq('uid', company.uid)
        .single();

      if (cancelled || !data) return;

      // Mantém o store em sincronia (usado pelo AppAssistant, etc.)
      if (data.status_wpp !== company.status_wpp) {
        setCompany({ ...company, status_wpp: data.status_wpp });
      }
      evaluate(data.status_wpp);
    };

    fetchStatus();

    const channel = supabaseClient
      .channel(`wpp-status-alert-${company.uid}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gbp_empresas',
          filter: `uid=eq.${company.uid}`,
        },
        (payload) => {
          const status = payload.new?.status_wpp as string | undefined;
          if (!status) return;

          const current = useCompanyStore.getState().company;
          if (current) setCompany({ ...current, status_wpp: status });
          evaluate(status);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabaseClient.removeChannel(channel);
    };
    // evaluate depende de location.pathname — reexecutar a subscription
    // a cada navegação seria excessivo; o pathname entra via closure abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.uid, isAdmin]);

  // Reavalia ao trocar de rota (ex.: saiu de /app/whatsapp ainda desconectado)
  useEffect(() => {
    evaluate(company?.status_wpp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (!isAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) snooze(); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl p-5 sm:p-6 dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-full bg-red-50 border border-red-100 dark:bg-red-900/30 dark:border-red-800 shrink-0">
              <WifiOff className="w-5 h-5 text-red-500 dark:text-red-400" />
            </div>
            <DialogTitle className="dark:text-white">WhatsApp desconectado</DialogTitle>
          </div>
          <DialogDescription className="dark:text-gray-300">
            Enquanto estiver offline, as mensagens automáticas não serão enviadas.
          </DialogDescription>
        </DialogHeader>
        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          Tenha o celular em mãos para ler o QR Code.
        </p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={snooze}>
            Avisar depois
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={() => {
              snooze();
              navigate('/app/whatsapp');
            }}
          >
            <Smartphone className="w-4 h-4 mr-2" />
            Reconectar agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
