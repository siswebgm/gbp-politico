import { supabaseClient } from '../lib/supabase';

// Log da configuração do Supabase
console.log('Configuração do Supabase:', {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? '***' : 'não definida',
  supabaseClient: supabaseClient ? 'Inicializado' : 'Não inicializado'
});

export interface DemandaRuaInput {
  // Dados básicos da demanda
  tipo_de_demanda: string;
  descricao_do_problema: string;
  nivel_de_urgencia: 'baixa' | 'média' | 'alta';
  
  // Referência ao requerente na tabela gbp_requerentes_demanda_rua
  requerente_uid: string;
  empresa_uid: string;
  
  // Dados da demanda
  fotos_do_problema?: string[];
  boletim_ocorrencia: string;
  link_da_demanda?: string;
  observacoes?: string;
  
  // Dados de endereço
  logradouro: string;
  numero?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  referencia?: string;
  
  // Campos para compatibilidade
  anexar_boletim_de_correncia?: string | null;
  aceite_termos?: boolean;
  status?: 'recebido' | 'feito_oficio' | 'protocolado' | 'aguardando' | 'concluido' | 'cancelado';
}

export interface DemandaRua extends DemandaRuaInput {
  uid: string;
  status: 'recebido' | 'feito_oficio' | 'protocolado' | 'aguardando' | 'concluido' | 'cancelado';
  criado_em: string;
  atualizado_em: string;
  numero_protocolo?: number | null;
  anexar_boletim_de_correncia?: string | null;
  favorito?: boolean;
}

export async function createDemandaRua(demanda: DemandaRuaInput): Promise<DemandaRua> {
  try {
    // Validação dos campos obrigatórios
    if (!demanda.requerente_uid) {
      throw new Error('O UID do requerente é obrigatório');
    }

    // Prepara os dados para inserção
    const dadosParaInserir: Record<string, any> = {
      // Dados básicos da demanda
      tipo_de_demanda: demanda.tipo_de_demanda || 'Outros',
      descricao_do_problema: demanda.descricao_do_problema || 'Sem descrição',
      nivel_de_urgencia: demanda.nivel_de_urgencia || 'média',
      
      // Referências
      empresa_uid: demanda.empresa_uid,
      requerente_uid: demanda.requerente_uid,
      
      // Dados de endereço (obrigatórios)
      logradouro: demanda.logradouro || 'Não informado',
      numero: demanda.numero || null,
      bairro: demanda.bairro || 'Não informado',
      cidade: demanda.cidade || 'Não informado',
      uf: demanda.uf || 'PE',
      cep: demanda.cep || '00000-000',
      referencia: demanda.referencia || null,
      
      // Outros campos
      boletim_ocorrencia: demanda.boletim_ocorrencia || 'não',
      link_da_demanda: demanda.link_da_demanda || null,
      fotos_do_problema: demanda.fotos_do_problema || [],
      status: 'recebido',
      observacoes: demanda.observacoes || null,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
      aceite_termos: true,
      anexar_boletim_de_correncia: null
    };

    console.log('Dados da demanda a serem enviados:', JSON.stringify(dadosParaInserir, null, 2));
    
    // Verificar se o cliente Supabase está configurado corretamente
    if (!supabaseClient) {
      throw new Error('Cliente Supabase não está configurado corretamente');
    }

    // Inserir a demanda
    const { data, error } = await supabaseClient
      .from('gbp_demandas_ruas')
      .insert([dadosParaInserir])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar demanda de rua:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        detailsFull: error
      });
      
      // Se a tabela não existir, o erro será capturado aqui
      if (error.code === '42P01') {
        throw new Error('Tabela gbp_demandas_ruas não encontrada. Por favor, execute o script de migração.');
      }
      
      throw error;
    }
    
    console.log('Demanda criada com sucesso:', data);
    return data as DemandaRua;
  } catch (error) {
    console.error('Erro ao criar demanda de rua:', {
      error,
      stack: error instanceof Error ? error.stack : 'No stack trace',
      demanda: JSON.stringify(demanda, null, 2)
    });
    throw error;
  }
}

export async function updateDemandaRua(uid: string, updates: Partial<DemandaRua>) {
  try {
    const { data, error } = await supabaseClient
      .from('gbp_demandas_ruas')
      .update({
        ...updates,
        atualizado_em: new Date().toISOString()
      })
      .eq('uid', uid)
      .select()
      .single();

    if (error) throw error;
    return data as DemandaRua;
  } catch (error) {
    console.error('Erro ao atualizar demanda de rua:', error);
    throw error;
  }
}

import { getEmpresa } from './empresa';

// Função para favoritar/desfavoritar uma demanda
export async function toggleFavoritoDemanda(demandaUid: string, favorito: boolean): Promise<boolean> {
  try {
    const { data, error } = await supabaseClient
      .from('gbp_demandas_ruas')
      .update({ favorito, atualizado_em: new Date().toISOString() })
      .eq('uid', demandaUid)
      .select('favorito')
      .single();

    if (error) throw error;
    return data?.favorito ?? false;
  } catch (error) {
    console.error('Erro ao atualizar favorito:', error);
    throw error;
  }
}

// Função para buscar demandas favoritas
export async function getDemandasFavoritas(empresaUid: string): Promise<DemandaRua[]> {
  try {
    const { data, error } = await supabaseClient
      .from('gbp_demandas_ruas')
      .select('*')
      .eq('empresa_uid', empresaUid)
      .eq('favorito', true)
      .order('criado_em', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar demandas favoritas:', error);
    throw error;
  }
}

export async function uploadBoletimOcorrencia(empresaUid: string, demandaUid: string, file: File): Promise<string | null> {
  console.log('Iniciando uploadBoletimOcorrencia com os seguintes parâmetros:', {
    empresaUid,
    demandaUid,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type
  });

  try {
    // Obter o storage da empresa
    console.log('Buscando dados da empresa:', empresaUid);
    const empresa = await getEmpresa(empresaUid);
    console.log('Dados da empresa encontrados:', empresa);
    
    if (!empresa?.storage) {
      const errorMsg = 'Storage da empresa não configurado';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const bucketName = empresa.storage;
    console.log('Usando o bucket de storage:', bucketName);

    const fileExt = file.name.split('.').pop();
    const fileName = `${demandaUid}_boletim_${Date.now()}.${fileExt}`;
    const filePath = `demandas_rua/${demandaUid}/${fileName}`;

    console.log('Iniciando upload do boletim para o Supabase...');
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    console.log('Resposta do upload do boletim:', { uploadData, uploadError });

    if (uploadError) {
      console.error('Erro ao enviar boletim de ocorrência:', uploadError);
      throw uploadError;
    }

    console.log('Upload do boletim de ocorrência concluído com sucesso');
    
    // Construir a URL pública manualmente no formato correto
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!supabaseUrl) {
      console.warn('VITE_SUPABASE_URL não está definido nas variáveis de ambiente');
    }
    
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
    console.log('URL pública gerada para o boletim:', publicUrl);
    
    return publicUrl;
  } catch (error) {
    console.error('Erro ao processar boletim de ocorrência:', {
      error,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Falha ao enviar boletim de ocorrência. Por favor, tente novamente.');
  }
}

export async function getDemandaRua(uid: string): Promise<(DemandaRua & { empresa_uid: string }) | null> {
  try {
    const { data, error } = await supabaseClient
      .from('gbp_demandas_ruas')
      .select('*')
      .eq('uid', uid)
      .single();

    if (error) {
      console.error('Erro ao buscar demanda de rua:', error);
      return null;
    }

    return data as DemandaRua & { empresa_uid: string };
  } catch (error) {
    console.error('Erro inesperado ao buscar demanda:', error);
    return null;
  }
}

export interface DemandaRuaComRequerente extends DemandaRua {
  requerente: {
    nome: string;
    cpf: string;
    whatsapp: string;
    empresa_uid: string | null;
  } | null;
}

export async function getDemandasPorCpf(cpf: string, empresaUid?: string): Promise<DemandaRuaComRequerente[]> {
  try {
    // Primeiro, buscamos todos os requerentes pelo CPF (pode haver mais de um devido a empresas diferentes)
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    let query = supabaseClient
      .from('gbp_requerentes_demanda_rua')
      .select('uid, nome, cpf, whatsapp, empresa_uid')
      .ilike('cpf', `%${cpfLimpo}%`);
      
    // Se empresaUid for fornecido, filtra por empresa
    if (empresaUid) {
      query = query.eq('empresa_uid', empresaUid);
    }
    
    const { data: requerentes, error: errorRequerentes } = await query;

    if (errorRequerentes || !requerentes || requerentes.length === 0) {
      console.error('Requerente não encontrado:', errorRequerentes);
      return [];
    }

    // Para cada requerente, buscamos suas demandas
    const demandasComRequerentes = await Promise.all(
      requerentes.map(async (requerente) => {
        const { data: demandas, error: errorDemandas } = await supabaseClient
          .from('gbp_demandas_ruas')
          .select('*')
          .eq('requerente_uid', requerente.uid)
          .order('criado_em', { ascending: false });

        if (errorDemandas) {
          console.error('Erro ao buscar demandas para o requerente:', requerente.uid, errorDemandas);
          return [];
        }

        // Mapeia as demandas incluindo os dados do requerente
        return demandas.map(demanda => ({
          ...demanda,
          requerente: {
            nome: requerente.nome,
            cpf: requerente.cpf,
            whatsapp: requerente.whatsapp,
            empresa_uid: requerente.empresa_uid
          }
        }));
      })
    );

    // Achata o array de arrays em um único array de demandas
    return demandasComRequerentes.flat();
  } catch (error) {
    console.error('Erro ao buscar demandas por CPF:', error);
    return [];
  }
}

export async function uploadDemandaFiles(empresaUid: string, demandaUid: string, files: File[]) {
  console.log('Iniciando uploadDemandaFiles com os seguintes parâmetros:', {
    empresaUid,
    demandaUid,
    filesCount: files?.length || 0
  });

  try {
    // Verificar se existem arquivos para enviar
    if (!files || files.length === 0) {
      console.log('Nenhum arquivo para enviar');
      return [];
    }

    console.log(`Iniciando upload de ${files.length} arquivos`);
    
    // Obter o storage da empresa
    console.log('Buscando dados da empresa:', empresaUid);
    const empresa = await getEmpresa(empresaUid);
    console.log('Dados da empresa encontrados:', empresa);
    
    if (!empresa?.storage) {
      const errorMsg = 'Storage da empresa não configurado';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const bucketName = empresa.storage;
    console.log('Usando o bucket de storage:', bucketName);

    const uploadPromises = files.map(async (file, index) => {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${demandaUid}_${Date.now()}_${index}.${fileExt}`;
        const filePath = `demandas_rua/${demandaUid}/${fileName}`;

        console.log(`Enviando arquivo ${index + 1}/${files.length}:`, {
          bucket: bucketName,
          path: filePath,
          size: file.size,
          type: file.type,
          fileName: file.name
        });

        // Fazer upload do arquivo
        console.log('Iniciando upload para o Supabase...');
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        console.log('Resposta do upload:', { uploadData, uploadError });

        if (uploadError) {
          console.error(`Erro ao enviar arquivo ${file.name}:`, uploadError);
          throw uploadError;
        }

        console.log(`Upload do arquivo ${file.name} concluído com sucesso`);
        
        // Construir a URL pública manualmente no formato correto
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
        if (!supabaseUrl) {
          console.warn('VITE_SUPABASE_URL não está definido nas variáveis de ambiente');
        }
        
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
        console.log(`URL pública gerada para ${file.name}:`, publicUrl);
        
        return publicUrl;
      } catch (error) {
        console.error(`Erro ao processar arquivo ${file.name}:`, {
          error,
          message: error instanceof Error ? error.message : 'Erro desconhecido',
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    });

    // Executar todos os uploads em paralelo e aguardar a conclusão
    console.log('Aguardando conclusão dos uploads...');
    const urls = await Promise.all(uploadPromises);
    console.log('Todos os arquivos foram processados. URLs geradas:', urls);
    
    const validUrls = urls.filter(url => url);
    console.log(`Upload concluído com sucesso para ${validUrls.length} de ${files.length} arquivos`);
    
    return validUrls; // Remover URLs nulas/vazias
  } catch (error) {
    console.error('Erro ao enviar arquivos da demanda:', {
      error,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Falha ao enviar arquivos. Por favor, tente novamente.');
  }
}
