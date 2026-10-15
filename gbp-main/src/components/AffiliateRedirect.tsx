import { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabaseClient } from '../lib/supabase';

export function AffiliateRedirect() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Prioriza o código da rota, senão usa query param
    const refCode = code || searchParams.get('ref');

    if (refCode) {
      // Valida se o código existe usando Supabase anon
      supabaseClient
        .from('gbp_afiliados')
        .select('*')
        .eq('codigo_afiliado', refCode)
        .eq('status', 'active')
        .single()
        .then(({ data: afiliado, error }) => {
          if (!error && afiliado) {
            // Salva no localStorage com timestamp
            const data = {
              code: refCode,
              timestamp: Date.now()
            };
            localStorage.setItem('affiliate_code', JSON.stringify(data));
            console.log('Código de afiliado salvo:', refCode);
            
            // Redireciona para a página de registro
            navigate('/register');
          } else {
            console.log('Código de afiliado inválido:', refCode);
            // Se código inválido, redireciona para login
            navigate('/login');
          }
        })
        .catch(() => {
          console.log('Erro ao validar código de afiliado:', refCode);
          navigate('/login');
        });
    }
    // Se não tiver refCode, não faz nada (fluxo normal)
  }, [code, searchParams, navigate]);

  return null;
}
