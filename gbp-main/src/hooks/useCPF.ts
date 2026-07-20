import { useState } from 'react';
import axios from 'axios';
import { supabaseClient as supabase } from '../lib/supabase';
import { useToast } from "../components/ui/use-toast";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

interface CPFAPIResponse {
  CPF: string;
  NOME: string;
  SEXO: string;
  NASC: string;
  NOME_MAE: string;
  TITULO_ELEITOR: string;
}

interface CPFResponse {
  nome: string;
  data_nascimento?: string;
  genero?: string;
  titulo?: string;
  nome_mae?: string;
  existsInOtherCompany?: boolean;
}

export function useCPF() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const checkExistingVoter = async (cpf: string): Promise<{ existingVoter: any; existsInOtherCompany: boolean }> => {
    if (!user?.empresa_uid) {
      console.error('❌ Empresa não selecionada');
      return { existingVoter: null, existsInOtherCompany: false };
    }

    const cleanCPF = cpf.replace(/\D/g, '');
    
    console.log('=== VERIFICAÇÃO DE CPF ===');
    console.log('🔍 CPF Original:', cpf);
    console.log('🔍 CPF Limpo:', cleanCPF);
    console.log('🔍 Empresa UID:', user.empresa_uid);
    console.log('🔍 Comprimento:', cleanCPF.length);
    
    try {
      // Verifica se existe na empresa atual (busca apenas dígitos)
      // Usando limit(1) para pegar o primeiro caso haja duplicatas
      console.log('📡 Executando query no Supabase...');
      const { data: existingInCompany, error: companyError } = await supabase
        .from('gbp_eleitores')
        .select('uid, nome, cpf')
        .eq('cpf', cleanCPF)
        .eq('empresa_uid', user.empresa_uid)
        .limit(1)
        .single();

      console.log('📊 Resposta do banco:', { 
        encontrado: !!existingInCompany, 
        erro: companyError,
        dados: existingInCompany 
      });

      if (companyError) {
        console.error('❌ Erro ao consultar banco de dados:', companyError);
        return { existingVoter: null, existsInOtherCompany: false };
      }

      if (existingInCompany) {
        console.log('✅ CPF ENCONTRADO!');
        console.log('   - Nome:', existingInCompany.nome);
        console.log('   - CPF no banco:', existingInCompany.cpf);
        console.log('   - CPF buscado:', cleanCPF);
        console.log('   - Match:', existingInCompany.cpf === cleanCPF);
        toast({
          title: "⚠️ Atenção",
          description: "Este CPF já está cadastrado nesta empresa!",
          className: "bg-yellow-50 border-yellow-200 text-yellow-800",
          duration: 3000,
        });
        
        navigate(`/app/pessoas/${existingInCompany.uid}`);
        return { existingVoter: existingInCompany, existsInOtherCompany: false };
      }

      console.log('ℹ️ CPF não encontrado na empresa atual');

      // Verifica se existe em outras empresas
      const { data: existingInOthers, error: othersError } = await supabase
        .from('gbp_eleitores')
        .select('uid, nome, empresa_uid, cpf')
        .eq('cpf', cleanCPF)
        .neq('empresa_uid', user.empresa_uid);
      
      console.log('🔍 CPF em outras empresas:', existingInOthers?.length || 0);

      if (othersError) {
        console.error('Erro ao consultar outras empresas:', othersError);
        return { existingVoter: null, existsInOtherCompany: false };
      }

      const existsInOtherCompany = existingInOthers && existingInOthers.length > 0;

      return { existingVoter: null, existsInOtherCompany };
    } catch (error) {
      console.error('Erro ao verificar CPF:', error);
      return { existingVoter: null, existsInOtherCompany: false };
    }
  };

  const fetchCPFData = async (cpf: string): Promise<CPFResponse | null> => {
    if (!cpf || cpf.length < 11) {
      return null;
    }

    const cleanCPF = cpf.replace(/\D/g, '');
    
    setIsLoading(true);
    setError(null);

    try {
      // Verifica se o CPF já está cadastrado
      const { existingVoter, existsInOtherCompany } = await checkExistingVoter(cleanCPF);
      if (existingVoter) {
        setIsLoading(false);
        return null;
      }

      // Informa que está iniciando a consulta na API
      toast({
        title: "🔍 Consultando...",
        description: "Buscando informações do CPF nos órgãos oficiais",
        className: "bg-blue-50 border-blue-200 text-blue-800",
        duration: 2000,
      });

      // Busca os dados na API
      const response = await axios.post<CPFAPIResponse>(
        'https://whkn8n.guardia.work/webhook/cpf',
        { cpf: cleanCPF },
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Accept': 'application/json; charset=utf-8'
          }
        }
      );

      const data = response.data;
      console.log('Dados recebidos da API CPF:', data);

      // Se não encontrou dados básicos, considera que o CPF não foi encontrado
      if (!data.NOME && !data.NOME_MAE && !data.NASC) {
        toast({
          title: "❌ CPF não encontrado",
          description: "CPF não localizado na base de dados dos órgãos oficiais.",
          className: "bg-red-50 border-red-200 text-red-800",
          duration: 3000,
        });
        return null;
      }

      // Converte o gênero para o formato completo
      let generoCompleto = '';
      if (data.SEXO === 'M') generoCompleto = 'Masculino';
      else if (data.SEXO === 'F') generoCompleto = 'Feminino';
      else if (data.SEXO === 'O') generoCompleto = 'Outro';

      // Informa que os dados foram encontrados
      toast({
        title: "✨ CPF encontrado!",
        description: "Dados localizados nos órgãos oficiais. Preenchendo campos...",
        className: "bg-green-50 border-green-200 text-green-800",
        duration: 3000,
      });

      return {
        nome: data.NOME || '',
        data_nascimento: data.NASC ? data.NASC.split('/').reverse().join('-') : undefined,
        genero: generoCompleto || undefined,
        titulo: data.TITULO_ELEITOR || undefined,
        nome_mae: data.NOME_MAE || undefined,
        existsInOtherCompany
      };
    } catch (err) {
      console.error('Erro ao buscar dados do CPF:', err);
      toast({
        title: "❌ Erro na consulta",
        description: "Erro ao consultar CPF nos órgãos oficiais. Por favor, tente novamente.",
        className: "bg-red-50 border-red-200 text-red-800",
        duration: 3000,
      });
      setError('Erro ao buscar dados do CPF');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchCPFData,
    isLoading,
    error
  };
}
