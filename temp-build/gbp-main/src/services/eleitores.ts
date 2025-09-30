import { useGeocoding } from "../hooks/useGeocoding";
import { supabaseClient } from "../lib/supabase";

interface UpdateElectorCoordinatesParams {
  id: number;
  address: string;
}

interface Eleitor {
  id: number;
  nome: string | null;
  cpf: string | null;
  nascimento: string | null;
  whatsapp: string | null;
  telefone: string | null;
  genero: string | null;
  titulo: string | null;
  zona: string | null;
  secao: string | null;
  cep: string | null;
  logradouro: string | null;
  cidade: string | null;
  bairro: string | null;
  numero: string | null;
  complemento: string | null;
  uf: string | null;
  responsavel: string | null;
  nome_mae: string | null;
  empresa_id: number | null;
  created_at: string | null;
  latitude: string | null;
  longitude: string | null;
  categoria: number | null;
  gbp_atendimentos: number | null;
  indicado: number | null;
  usuario_id: number | null; // ID do usuário que cadastrou o eleitor
}

export const eleitoresService = {
  async updateCoordinates({ id, address }: UpdateElectorCoordinatesParams) {
    const { geocodeAddress } = useGeocoding();
    
    try {
      const coordinates = await geocodeAddress(address);
      
      if (coordinates) {
        const { error } = await supabaseClient
          .from('gbp_eleitores')
          .update({
            latitude: coordinates.lat,
            longitude: coordinates.lng
          })
          .eq('id', id);

        if (error) throw error;
        
        return { success: true };
      }
      
      return { success: false, error: 'Não foi possível obter as coordenadas do endereço' };
    } catch (error) {
      console.error('Erro ao atualizar coordenadas:', error);
      return { success: false, error: 'Erro ao atualizar coordenadas' };
    }
  },

  async updateAllCoordinates() {
    const { geocodeAddress } = useGeocoding();
    
    try {
      const { data: eleitores, error: fetchError } = await supabaseClient
        .from('gbp_eleitores')
        .select('id, logradouro, numero, bairro, cidade, estado, cep')
        .or(`latitude.is.null,longitude.is.null`);

      if (fetchError) throw fetchError;

      let updated = 0;
      let failed = 0;

      for (const eleitor of eleitores) {
        // Monta o endereço completo
        const address = `${eleitor.logradouro}, ${eleitor.numero} - ${eleitor.bairro}, ${eleitor.cidade} - ${eleitor.estado}, ${eleitor.cep}`;
        
        // Adiciona um delay para respeitar o limite de requisições da API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const coordinates = await geocodeAddress(address);
        
        if (coordinates) {
          const { error: updateError } = await supabaseClient
            .from('gbp_eleitores')
            .update({
              latitude: coordinates.lat,
              longitude: coordinates.lng
            })
            .eq('id', eleitor.id);

          if (updateError) throw updateError;
          updated++;
        } else {
          failed++;
        }
      }

      return {
        success: true,
        stats: {
          total: eleitores.length,
          updated,
          failed
        }
      };
    } catch (error) {
      console.error('Erro ao atualizar coordenadas em massa:', error);
      return { success: false, error: 'Erro ao atualizar coordenadas em massa' };
    }
  },

  async list(empresa_id: number) {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_eleitores')
        .select(`
          *,
          categoria:gbp_categorias(id, nome),
          indicado:gbp_indicado(id, nome)
        `)
        .eq('empresa_id', empresa_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error in list:', error);
      throw new Error('Erro ao listar eleitores');
    }
  },

  async create(eleitor: Partial<Eleitor>) {
    try {
      // Garantir que o usuario_id seja enviado
      if (!eleitor.usuario_id) {
        throw new Error('ID do usuário é obrigatório');
      }

      const { data, error } = await supabaseClient
        .from('gbp_eleitores')
        .insert([eleitor])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error in create:', error);
      throw new Error('Erro ao criar eleitor');
    }
  },

  async update(id: number, eleitor: Partial<Eleitor>) {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_eleitores')
        .update(eleitor)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error in update:', error);
      throw new Error('Erro ao atualizar eleitor');
    }
  },

  async delete(id: number) {
    try {
      const { error } = await supabaseClient
        .from('gbp_eleitores')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error in delete:', error);
      throw new Error('Erro ao deletar eleitor');
    }
  },

  async deleteInBatches(empresa_id: number, onProgress?: (progress: number) => void) {
    try {
      let deletedCount = 0;
      let hasMore = true;
      const batchSize = 1000;

      while (hasMore) {
        // Buscar IDs do próximo lote
        const { data: batch, error: fetchError } = await supabaseClient
          .from('gbp_eleitores')
          .select('id')
          .eq('empresa_id', empresa_id)
          .limit(batchSize);

        if (fetchError) throw fetchError;
        
        if (!batch || batch.length === 0) {
          hasMore = false;
          break;
        }

        // Deletar o lote atual
        const ids = batch.map(item => item.id);
        const { error: deleteError } = await supabaseClient
          .from('gbp_eleitores')
          .delete()
          .in('id', ids);

        if (deleteError) throw deleteError;

        deletedCount += batch.length;
        
        if (onProgress) {
          onProgress(deletedCount);
        }
      }

      return deletedCount;
    } catch (error: any) {
      console.error('Erro ao deletar eleitores:', error);
      throw new Error('Erro ao deletar eleitores');
    }
  },

  async importCSV(file: File, empresa_id: number, onProgress?: (progress: number) => void) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const rows = text.split('\n').slice(1); // Pular cabeçalho
          const total = rows.length;
          let processed = 0;

          for (let i = 0; i < rows.length; i += 100) {
            const batch = rows.slice(i, Math.min(i + 100, rows.length))
              .map(row => {
                const [
                  nome,
                  cpf,
                  nascimento,
                  whatsapp,
                  telefone,
                  genero,
                  titulo,
                  zona,
                  secao,
                  cep,
                  logradouro,
                  cidade,
                  bairro,
                  numero,
                  complemento,
                  uf,
                  responsavel,
                  nome_mae
                ] = row.split(',').map(field => field.trim());

                return {
                  nome,
                  cpf,
                  nascimento: nascimento ? new Date(nascimento) : null,
                  whatsapp,
                  telefone,
                  genero,
                  titulo,
                  zona,
                  secao,
                  cep,
                  logradouro,
                  cidade,
                  bairro,
                  numero,
                  complemento,
                  empresa_id,
                  uf,
                  responsavel,
                  nome_mae,
                  created_at: new Date().toISOString()
                };
              })
              .filter(eleitor => eleitor.nome && eleitor.nome.length > 0); // Filtrar linhas vazias

            const { error } = await supabaseClient
              .from('gbp_eleitores')
              .insert(batch);

            if (error) throw error;

            processed += batch.length;
            if (onProgress) {
              onProgress((processed / total) * 100);
            }
          }

          resolve(total);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsText(file);
    });
  }
};
