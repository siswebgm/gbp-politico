import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AffiliateService } from '../services/AffiliateService';

const AFFILIATE_CODE_KEY = 'affiliate_code';
const AFFILIATE_CODE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 dias

export function useAffiliateTracking() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const refCode = searchParams.get('ref');

    if (refCode) {
      // Valida se o código existe
      AffiliateService.getAffiliateByCode(refCode).then((afiliado) => {
        if (afiliado) {
          // Salva no localStorage com timestamp
          const data = {
            code: refCode,
            timestamp: Date.now()
          };
          localStorage.setItem(AFFILIATE_CODE_KEY, JSON.stringify(data));
          console.log('Código de afiliado salvo:', refCode);
        }
      });
    }
  }, [searchParams]);

  // Função para obter o código de afiliado salvo
  const getAffiliateCode = (): string | null => {
    try {
      const saved = localStorage.getItem(AFFILIATE_CODE_KEY);
      if (!saved) return null;

      const data = JSON.parse(saved);
      
      // Verifica se expirou
      if (Date.now() - data.timestamp > AFFILIATE_CODE_EXPIRY) {
        localStorage.removeItem(AFFILIATE_CODE_KEY);
        return null;
      }

      return data.code;
    } catch {
      return null;
    }
  };

  // Função para limpar o código (após vincular)
  const clearAffiliateCode = () => {
    localStorage.removeItem(AFFILIATE_CODE_KEY);
  };

  return {
    getAffiliateCode,
    clearAffiliateCode
  };
}
