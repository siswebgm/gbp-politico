import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '../../../lib/supabase';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { EleitorFormData } from '../../../types/eleitor';
import { voterSchema } from '../schemas/voterSchema';
import { toast } from 'react-hot-toast';

export function useVoterForm(uid?: string) {
  console.log('useVoterForm iniciado com uid:', uid);
  
  const company = useCompanyStore(state => state.company);
  const user = useAuthStore(state => state.user);

  console.log('Estado atual:', { company, user });

  const form = useForm<EleitorFormData>({
    resolver: zodResolver(voterSchema),
    defaultValues: {
      nome: '',
      cpf: '',
      nascimento: '',
      genero: '',
      nome_mae: '',
      whatsapp: '',
      telefone: '',
      titulo: '',
      zona: '',
      secao: '',
      cep: '',
      logradouro: '',
      cidade: '',
      bairro: '',
      numero: '',
      complemento: '',
      uf: '',
      categoria_uid: '',
      indicacao: '',
      upload_id: '',
      upload_url: '',
      responsavel: user?.nome || '',
      usuario_uid: user?.id || '',
      empresa_uid: company?.uid || '',
      numero_do_sus: '',
      instagram: '',
      responsavel_pelo_eleitor: '',
      confiabilidade_do_voto: '',
      quantidade_adultos_residencia: '',
      colegio_eleitoral: '',
      ignoreCpf: false,
      registrarAtendimento: false,
      descricaoAtendimento: '',
      categoriaAtendimento: null,
      statusAtendimento: ''
    }
  });

  const { data: voter, isLoading, error: queryError } = useQuery({
    queryKey: ['eleitor', uid],
    queryFn: async () => {
      console.log('Iniciando busca do eleitor com uid:', uid);
      
      if (!uid) {
        console.log('Nenhum uid fornecido, retornando null');
        return null;
      }

      try {
        const { data, error } = await supabaseClient
          .from('gbp_eleitores')
          .select('*')
          .eq('uid', uid)
          .single();

        if (error) {
          console.error('Erro ao buscar eleitor:', error);
          toast.error(`Erro ao carregar dados do eleitor: ${error.message}`);
          throw error;
        }

        console.log('Dados do eleitor recebidos:', data);
        return data;
      } catch (error) {
        console.error('Erro na query:', error);
        throw error;
      }
    },
    enabled: !!uid
  });

  useEffect(() => {
    console.log('useEffect executado:', { voter, isLoading, queryError });
    
    if (voter) {
      console.log('Resetando formulário com dados:', voter);
      form.reset({
        ...voter,
        usuario_uid: user?.id || '',
        empresa_uid: company?.uid || '',
        responsavel: user?.nome || ''
      });
    }
  }, [voter, form, user, company]);

  if (queryError) {
    console.error('Erro na query:', queryError);
  }

  if (isLoading) {
    console.log('Formulário carregando...');
  }

  return {
    register: form.register,
    handleSubmit: form.handleSubmit,
    formState: form.formState,
    setValue: form.setValue,
    watch: form.watch,
    isLoading
  };
}