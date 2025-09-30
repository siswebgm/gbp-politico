import { useEffect, useState } from 'react';

export function TrialBanner() {
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null);

  useEffect(() => {
    const trialDaysLeft = localStorage.getItem('trial_days_left');
    if (trialDaysLeft) {
      setDiasRestantes(parseInt(trialDaysLeft));
    }
  }, []);

  if (!diasRestantes || diasRestantes > 5) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-blue-50 border-l-4 border-blue-400 p-2 rounded shadow-sm">
        <p className="text-sm text-blue-700 whitespace-nowrap">
          <span className="font-medium">Versão de teste:</span>
          {' '}Restam {diasRestantes} dia(s)
        </p>
      </div>
    </div>
  );
} 