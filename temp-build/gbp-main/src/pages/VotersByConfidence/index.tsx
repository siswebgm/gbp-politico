import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabaseClient } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { ArrowLeft, User } from 'lucide-react';

interface Eleitor {
  uid: string;
  nome: string;
  telefone: string;
  bairro: string;
}

export function VotersByConfidence() {
  const { confidenceLevel } = useParams<{ confidenceLevel: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [eleitores, setEleitores] = useState<Eleitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEleitores = async () => {
      if (!user?.empresa_uid || !confidenceLevel) {
        setLoading(false);
        setError("Informações insuficientes para carregar os eleitores.");
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabaseClient
          .from('gbp_eleitores')
          .select('uid, nome, telefone, bairro')
          .eq('empresa_uid', user.empresa_uid)
          .eq('confiabilidade_voto', decodeURIComponent(confidenceLevel));

        if (error) {
          throw error;
        }

        setEleitores(data || []);
      } catch (err: any) {
        console.error("Erro ao buscar eleitores:", err);
        setError(err.message || "Ocorreu um erro ao buscar os eleitores.");
      } finally {
        setLoading(false);
      }
    };

    fetchEleitores();
  }, [user, confidenceLevel]);

  return (
    <div className="p-4 sm:p-6">
      <header className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Eleitores</h1>
          <p className="text-gray-500">
            Nível de confiança: <strong>{decodeURIComponent(confidenceLevel || '')}</strong>
          </p>
        </div>
      </header>

      {loading && <p>Carregando...</p>}
      {error && <p className="text-red-500">{error}</p>}
      
      {!loading && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {eleitores.length > 0 ? (
              eleitores.map(eleitor => (
                <li key={eleitor.uid} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-semibold">{eleitor.nome}</p>
                      <p className="text-sm text-gray-500">{eleitor.bairro || 'Bairro não informado'}</p>
                    </div>
                  </div>
                  <a href={`tel:${eleitor.telefone}`} className="text-sm text-blue-500 hover:underline">
                    {eleitor.telefone}
                  </a>
                </li>
              ))
            ) : (
              <li className="p-4 text-center text-gray-500">Nenhum eleitor encontrado para este nível de confiança.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
