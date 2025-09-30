import { supabaseClient } from '../../../lib/supabase';

interface FilterOption {
  id: string;
  label: string;
  value: string;
  type: 'cidade' | 'bairro' | 'categoria' | 'genero';
}

interface SendMessageParams {
  message: string;
  mediaUrls: string[];
  filters: FilterOption[];
  companyId: string;
  userId: string;
}

export const disparoService = {
  async sendMessage({ message, mediaUrls, filters, companyId, userId }: SendMessageParams) {
    if (!companyId || !userId) {
      throw new Error('Empresa ou usuário não identificados');
    }

    // Construir query base
    let query = supabaseClient
      .from('gbp_eleitores')
      .select('*')
      .eq('empresa_uid', companyId);

    // Aplicar filtros
    filters.forEach(filter => {
      switch (filter.type) {
        case 'cidade':
          query = query.eq('cidade', filter.value);
          break;
        case 'bairro':
          query = query.eq('bairro', filter.value);
          break;
        case 'categoria':
          query = query.eq('categoria_uid', filter.value);
          break;
        case 'genero':
          query = query.eq('genero', filter.value);
          break;
      }
    });

    // Buscar eleitores filtrados
    const { data: eleitores, error } = await query;

    if (error) {
      console.error('Erro ao buscar eleitores:', error);
      throw error;
    }

    // Criar registro do disparo
    const { data: disparo, error: disparoError } = await supabaseClient
      .from('gbp_disparos')
      .insert([
        {
          mensagem: message,
          midias: mediaUrls,
          filtros: filters,
          empresa_uid: companyId,
          usuario_uid: userId,
          total_eleitores: eleitores?.length || 0,
          status: 'pendente'
        }
      ])
      .select()
      .single();

    if (disparoError) {
      console.error('Erro ao criar disparo:', disparoError);
      throw disparoError;
    }

    // Criar registros de envio para cada eleitor
    const envios = eleitores?.map(eleitor => ({
      disparo_uid: disparo.uid,
      eleitor_uid: eleitor.uid,
      status: 'pendente'
    }));

    if (envios && envios.length > 0) {
      const { error: enviosError } = await supabaseClient
        .from('gbp_disparo_envios')
        .insert(envios);

      if (enviosError) {
        console.error('Erro ao criar envios:', enviosError);
        throw enviosError;
      }
    }

    return disparo;
  },

  async getDisparoStatus(disparoId: string) {
    const { data, error } = await supabaseClient
      .from('gbp_disparos')
      .select('*')
      .eq('uid', disparoId)
      .single();

    if (error) {
      console.error('Erro ao buscar status do disparo:', error);
      throw error;
    }

    return data;
  }
};
