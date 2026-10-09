import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clock, Hourglass, CheckCircle, FileText, Check, User, Users, Bell, BellOff, BellRing } from 'lucide-react';
import { supabaseClient } from '../../../lib/supabase';
import { AlertCircle } from 'lucide-react';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { useAuth } from '../../../providers/AuthProvider';
import { useUserData } from '../../../hooks/useUserData';
import { useIndicados } from '../../../hooks/useIndicados';
import { useToast } from "../../../components/ui/use-toast";
import { useCategories } from '../../../hooks/useCategories';
import { NestedCategoryDropdown } from '../../../components/NestedCategoryDropdown';
import { FileUpload } from '../../../components/ui/file-upload';
import { createAttendanceMessage, replaceMessageTags } from '../../../services/attendanceMessages';

interface AttendanceFormData {
  categoria_uid: string;
  descricao: string;
  status: string;
  indicado: string | undefined;
}

const attendanceSchema = z.object({
  categoria_uid: z.string().min(1, 'Selecione uma categoria'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  status: z.string().min(1, 'Status é obrigatório'),
  indicado: z.string().optional(),
});

// Status options com cores e ícones
const statusOptions = [
  { 
    value: 'Pendente', 
    label: 'Pendente', 
    color: 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-900/30 dark:text-yellow-500',
    icon: <Clock className="w-4 h-4" />
  },
  { 
    value: 'Em Andamento', 
    label: 'Em Andamento', 
    color: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-900/30 dark:text-blue-500',
    icon: <Hourglass className="w-4 h-4" />
  },
  { 
    value: 'Concluído', 
    label: 'Concluído', 
    color: 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-900/30 dark:text-green-500',
    icon: <CheckCircle className="w-4 h-4" />
  }
];

export function AttendanceFormContent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const company = useCompanyStore((state) => state.company);
  const { userData } = useUserData();
  const { data: indicados } = useIndicados();
  const [selectedVoter, setSelectedVoter] = useState<any>(null);
  const [showVoterSearch, setShowVoterSearch] = useState(true);
  const { data: categories } = useCategories();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anexos, setAnexos] = useState<File[]>([]);
  const { toast } = useToast();
  // Inscrição do eleitor em gbp_notificacoes_inscritos (push notifications)
  const [inscricaoEleitor, setInscricaoEleitor] = useState<{
    uid: string;
    permissao: string;
    ativo: boolean;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      status: 'Pendente',
    },
  });

  const onSubmit = async (data: AttendanceFormData) => {
    try {
      setIsLoading(true);
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      if (!company) {
        throw new Error('Empresa não selecionada');
      }

      const now = new Date();

      // Buscar o último número de atendimento específico da empresa atual
      const { data: lastAttendances, error: lastNumberError } = await supabaseClient
        .from('gbp_atendimentos')
        .select('numero')
        .eq('empresa_uid', company.uid)
        .not('numero', 'is', null)
        .order('numero', { ascending: false })
        .limit(1);

      if (lastNumberError) {
        console.error('Erro ao buscar último número:', lastNumberError);
        throw lastNumberError;
      }

      // Definir o próximo número para esta empresa específica
      const lastNumber = lastAttendances && lastAttendances.length > 0 ? Number(lastAttendances[0].numero) : 0;
      const nextNumber = lastNumber + 1;
      
      console.log('Empresa atual:', company.uid);
      console.log('Último número encontrado para esta empresa:', lastNumber);
      console.log('Próximo número será:', nextNumber);

      // Upload dos anexos (máximo 5) se houver
      const anexosUrls: string[] = [];
      if (anexos && anexos.length > 0) {
        const { data: empresaData, error: storageError } = await supabaseClient
          .from('gbp_empresas')
          .select('storage')
          .eq('uid', company.uid)
          .single();

        if (storageError) {
          console.error('Erro ao buscar storage:', storageError);
          throw storageError;
        }

        const storageBucket = empresaData?.storage || 'atendimentos';

        for (const anexo of anexos) {
          const fileExt = anexo.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `atendimentos/${company.uid}/${fileName}`;

          const { error: uploadError } = await supabaseClient
            .storage
            .from(storageBucket)
            .upload(filePath, anexo);

          if (uploadError) {
            console.error('Erro no upload:', uploadError);
            throw uploadError;
          }

          const { data: { publicUrl } } = supabaseClient
            .storage
            .from(storageBucket)
            .getPublicUrl(filePath);

          anexosUrls.push(publicUrl);
        }
      }
      
      // Prepara dados do atendimento
      const newAttendance = {
        eleitor_uid: selectedVoter?.uid,
        usuario_uid: user.uid,
        empresa_uid: company.uid,
        categoria_uid: data.categoria_uid,
        descricao: data.descricao,
        status: data.status,
        indicado: data.indicado,
        data_atendimento: now.toISOString(),
        created_at: now,
        tipo_de_atendimento: 'NORMAL',
        numero: nextNumber,
        responsavel: userData?.nome || user.nome || user.email, // Nome do usuário atual
        // Campos adicionais do eleitor
        whatsapp: selectedVoter?.whatsapp || null,
        cep: selectedVoter?.cep || null,
        uf: selectedVoter?.uf || null,
        logradouro: selectedVoter?.logradouro || null,
        cidade: selectedVoter?.cidade || null,
        bairro: selectedVoter?.bairro || null,
        // Novos campos do eleitor
        eleitor: selectedVoter?.nome || null,
        cpf: selectedVoter?.cpf || null,
        numero_do_sus: selectedVoter?.numero_do_sus || null,
        // Anexos
        anexos: anexosUrls.length > 0 ? anexosUrls : null
      };

      // Verificar se já não existe um atendimento com este número para esta empresa
      const { data: existingNumber, error: existingError } = await supabaseClient
        .from('gbp_atendimentos')
        .select('numero')
        .eq('empresa_uid', company.uid)
        .eq('numero', nextNumber)
        .single();

      if (existingError && existingError.code !== 'PGRST116') { // PGRST116 é o código para nenhum resultado encontrado
        console.error('Erro ao verificar número existente:', existingError);
        throw existingError;
      }

      if (existingNumber) {
        // Se já existe um número igual, busca o maior número novamente e adiciona 1
        const { data: maxNumber } = await supabaseClient
          .from('gbp_atendimentos')
          .select('numero')
          .eq('empresa_uid', company.uid)
          .not('numero', 'is', null)
          .order('numero', { ascending: false })
          .limit(1)
          .single();

        newAttendance.numero = maxNumber ? Number(maxNumber.numero) + 1 : 1;
      }

      console.log('Dados finais do atendimento:', newAttendance);

      // Insere o atendimento
      const { data: createdAttendance, error } = await supabaseClient
        .from('gbp_atendimentos')
        .insert([newAttendance])
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado ao criar atendimento:', error);
        throw error;
      }

      console.log('Atendimento criado:', createdAttendance);

      // Registrar mensagem automática em gbp_mensagens_atendimentos
      // (mesmo padrão do eleitorService: só cria se a empresa tiver
      // mensagens_ativadas e um template mensagem_padrao_atendimento)
      if (selectedVoter?.uid) {
        try {
          const { data: empresaConfig } = await supabaseClient
            .from('gbp_empresas')
            .select('nome, mensagens_ativadas, mensagem_padrao_atendimento, mensagem_delay_minutos')
            .eq('uid', company.uid)
            .single();

          if (empresaConfig?.mensagens_ativadas && empresaConfig?.mensagem_padrao_atendimento) {
            const delayMinutos = empresaConfig.mensagem_delay_minutos ?? 30;
            const dataProgramada = delayMinutos === 0
              ? new Date().toISOString()
              : new Date(Date.now() + delayMinutos * 60 * 1000).toISOString();

            // Nome da categoria para a tag {categoria}
            let categoriaNome = '';
            if (data.categoria_uid) {
              const { data: categoriaData } = await supabaseClient
                .from('gbp_categoria_tipos')
                .select('nome')
                .eq('uid', data.categoria_uid)
                .single();
              categoriaNome = categoriaData?.nome || '';
            }

            const mensagemProcessada = replaceMessageTags(empresaConfig.mensagem_padrao_atendimento, {
              nome: selectedVoter.nome || '',
              categoria: categoriaNome,
              cliente: empresaConfig.nome || '',
              empresa_uid: company.uid,
              eleitor_uid: selectedVoter.uid,
            });

            await createAttendanceMessage({
              atendimento_uid: createdAttendance.uid,
              eleitor_uid: selectedVoter.uid,
              mensagem_texto: mensagemProcessada,
              empresa_uid: company.uid,
              data_programada_envio: dataProgramada,
            });
            console.log('Mensagem de atendimento registrada para:', createdAttendance.uid, 'delay:', delayMinutos, 'min');
          }
        } catch (msgError) {
          // Não interrompe o fluxo principal se a mensagem falhar
          console.error('Erro ao registrar mensagem de atendimento:', msgError);
        }
      }

      toast({
        title: "✨ Atendimento registrado com sucesso!",
        description: `O atendimento #${createdAttendance.numero} foi criado e a pessoa será notificada.`,
        variant: "success",
        duration: 5000,
      });
      
      navigate('/app/atendimentos');
    } catch (error: any) {
      console.error('Erro ao salvar atendimento:', error);
      toast({
        title: 'Erro ao salvar atendimento',
        description: error.message,
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar eleitor pelo ID da URL se disponível
  useEffect(() => {
    const eleitorUid = searchParams.get('eleitor');
    
    if (eleitorUid && company?.uid) {
      const fetchEleitor = async () => {
        setIsLoading(true);
        setError(null);
        try {
          console.log('Buscando eleitor:', eleitorUid);
          const { data: eleitor, error } = await supabaseClient
            .from('gbp_eleitores')
            .select(`
              uid,
              nome,
              cpf,
              whatsapp,
              cidade,
              bairro,
              cep,
              uf,
              logradouro,
              numero_do_sus,
              foto_url
            `)
            .eq('uid', eleitorUid)
            .eq('empresa_uid', company.uid)
            .single();

          if (error) {
            console.error('Erro detalhado:', error);
            throw error;
          }

          if (eleitor) {
            console.log('Eleitor encontrado:', eleitor);
            setSelectedVoter(eleitor);
            setShowVoterSearch(false);

            // Registra o eleitor em gbp_notificacoes_inscritos a cada
            // atendimento (upsert no índice único empresa_uid + eleitor_uid):
            // - não existe → cria (permissao usa o default 'default' e
            //   ativo=true do banco)
            // - já existe → atualiza nome/telefone/atualizado_em sem tocar em
            //   permissao, token ou ativo (não apaga quem já autorizou)
            try {
              const { data: inscricao, error: erroInscricao } = await supabaseClient
                .from('gbp_notificacoes_inscritos')
                .upsert(
                  {
                    empresa_uid: company.uid,
                    eleitor_uid: eleitorUid,
                    nome: eleitor.nome || null,
                    telefone: eleitor.whatsapp || null,
                    atualizado_em: new Date().toISOString()
                  },
                  { onConflict: 'empresa_uid,eleitor_uid' }
                )
                .select('uid, permissao, ativo')
                .single();

              if (erroInscricao) {
                console.error('Erro ao registrar inscrição do eleitor:', erroInscricao);
                // Fallback: ainda exibe o status se o registro já existir
                const { data: existente } = await supabaseClient
                  .from('gbp_notificacoes_inscritos')
                  .select('uid, permissao, ativo')
                  .eq('empresa_uid', company.uid)
                  .eq('eleitor_uid', eleitorUid)
                  .maybeSingle();
                setInscricaoEleitor(existente || null);
              } else {
                setInscricaoEleitor(inscricao);
              }
            } catch (e) {
              console.error('Erro ao registrar inscrição do eleitor:', e);
            }
          } else {
            console.log('Eleitor não encontrado');
            setError('Pessoa não encontrada');
          }
        } catch (error: any) {
          console.error('Erro ao buscar eleitor:', error);
          setError(error.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchEleitor();
    }
  }, [searchParams, company?.uid, setValue]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-gray-800 rounded-lg">
      <div className="p-3 pb-20 sm:pb-4 space-y-4">
        {/* Grupo de campos superior */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {/* Pessoa */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Pessoa
              </label>
              <span className="text-xs text-gray-500 dark:text-gray-400">Selecionada</span>
            </div>
            <div className="flex items-center p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-100 dark:border-primary-800">
              {selectedVoter?.foto_url ? (
                <img
                  src={selectedVoter.foto_url}
                  alt={`Foto de ${selectedVoter.nome || 'pessoa'}`}
                  className="h-12 w-12 rounded-xl object-cover mr-3 flex-shrink-0 shadow-sm ring-1 ring-primary-200 dark:ring-primary-700"
                />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-white/70 dark:bg-gray-800/70 flex items-center justify-center mr-3 flex-shrink-0">
                  <User className="h-5 w-5 text-primary-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-900 dark:text-white font-medium break-words">
                  {selectedVoter ? selectedVoter.nome : 'Nenhuma pessoa selecionada'}
                </span>
                {selectedVoter && (
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <p>CPF: {selectedVoter.cpf}</p>
                    {selectedVoter.whatsapp && <p>WhatsApp: {selectedVoter.whatsapp}</p>}
                    {(selectedVoter.cidade || selectedVoter.bairro) && (
                      <p>
                        {[selectedVoter.cidade, selectedVoter.bairro].filter(Boolean).join(' - ')}
                      </p>
                    )}
                  </div>
                )}
                {/* Status da inscrição em notificações do eleitor */}
                {inscricaoEleitor && (
                  <div className="mt-1.5">
                    {inscricaoEleitor.permissao === 'granted' && inscricaoEleitor.ativo ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <BellRing className="h-3 w-3" />
                        Inscrito e ativo — recebe notificações
                      </span>
                    ) : inscricaoEleitor.permissao === 'denied' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <BellOff className="h-3 w-3" />
                        Notificações bloqueadas pelo eleitor
                      </span>
                    ) : !inscricaoEleitor.ativo ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        <BellOff className="h-3 w-3" />
                        Inscrição inativa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <Bell className="h-3 w-3" />
                        Identificado — aguardando ativação das notificações
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grupo Categoria e Indicado - Em linha no desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
            {/* Categoria — mesma hierarquia de Nova Pessoa: Grupo > Tipo > Categoria
                (sem grupos na empresa, exibe apenas Tipo > Categoria) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Categoria
              </label>
              <NestedCategoryDropdown
                value={watch('categoria_uid')}
                onChange={(uid) => setValue('categoria_uid', uid, { shouldValidate: true })}
                categories={(categories as any) || []}
                placeholder="Selecione uma categoria..."
                error={errors.categoria_uid?.message}
              />
            </div>
          </div>

            {/* Indicado por */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Indicado por
              </label>
              <div className="relative">
                <select
                  {...register('indicado')}
                  className="block w-full h-11 pl-3 pr-10 text-sm border border-gray-300 dark:border-gray-600 focus:ring-0 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors"
                >
                  <option value="">Selecione um indicado</option>
                  {(indicados || []).map((indicado) => (
                    <option key={indicado.uid} value={indicado.nome}>
                      {indicado.nome}
                    </option>
                  ))}
                </select>
                <Users className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Descrição */}
        <div className="col-span-full">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Descrição
          </label>
          <div className="relative">
            <textarea
              {...register('descricao')}
              rows={4}
              className="block w-full px-3 py-3 text-sm border border-gray-300 dark:border-gray-600 focus:ring-0 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors resize-none"
              placeholder="Descreva os detalhes do atendimento..."
            />
            <FileText className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          </div>
          {errors.descricao && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errors.descricao.message}
            </p>
          )}
        </div>

        {/* Status */}
        <div className="col-span-full">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {statusOptions.map((option) => {
              const isSelected = watch('status') === option.value;
              return (
                <label
                  key={option.value}
                  className={`
                    relative flex items-center justify-center gap-2 p-2.5 sm:p-3 border rounded-lg cursor-pointer transition-all
                    ${option.color}
                    ${isSelected ? 'ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-gray-800' : 'opacity-70 hover:opacity-100'}
                  `}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    value={option.value}
                    {...register('status')}
                  />
                  {option.icon}
                  <span className="text-sm font-medium">{option.label}</span>
                  {isSelected && (
                    <span className="absolute top-1 right-1">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* Anexos */}
        <div className="col-span-full">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Anexos (PDF, Imagens)
          </label>
          <FileUpload
            value={anexos}
            onChange={setAnexos}
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            multiple={true}
            maxFiles={5}
            maxSize={50 * 1024 * 1024} // 50MB
          />
        </div>

        {/* Botões */}
        <div className="flex gap-2 justify-end pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 h-11 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 h-11 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Salvando...
              </>
            ) : (
              'Salvar Atendimento'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}