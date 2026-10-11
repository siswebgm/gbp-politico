import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { NewEventPanel } from './components/NewEventPanel';
import { useAuth } from '../../hooks/useAuth';
import { useCompanyStore } from '../../store/useCompanyStore';
import { googleCalendarService } from '../../services/googleCalendar';

// Página dedicada de criação de agenda — só o formulário, sem calendário/sidebar.
// A data inicial pode vir de /app/agenda/novaagenda?data=YYYY-MM-DD
export default function NovaAgendaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const company = useCompanyStore((s) => s.company);
  const storeUser = useCompanyStore((s: any) => s.user);
  const googleUser = storeUser?.uid ? storeUser : user;

  // Data inicial via ?data=YYYY-MM-DD (clique num dia do calendário principal)
  const dataParam = searchParams.get('data');
  const initialDate = (() => {
    if (!dataParam) return null;
    const [y, m, d] = dataParam.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  })();

  // Só precisamos saber se o Google está conectado (badge + espelhamento)
  const [googleConnected, setGoogleConnected] = useState(false);
  useEffect(() => {
    let ativo = true;
    (async () => {
      if (!company?.uid || !googleUser?.uid) return;
      try {
        const st = await googleCalendarService.status(company.uid, googleUser.uid);
        if (ativo) setGoogleConnected(!!st?.connected && !st?.needs_reconnect);
      } catch {
        // push-api sem integração configurada
      }
    })();
    return () => { ativo = false; };
  }, [company?.uid, googleUser?.uid]);

  const voltar = () => navigate('/app/agenda');

  return (
    <div className="bg-gray-50">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto p-2.5">
          <NewEventPanel
            initialDate={initialDate}
            googleConnected={googleConnected}
            onCancel={voltar}
            onSaved={voltar}
            />
        </div>
      </div>
    </div>
  );
}
