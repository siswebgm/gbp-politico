import { supabaseClient } from '../lib/supabase';

export interface DependenteData {
  nome: string;
  parentesco: string;
  whatsapp?: string;
  add_grupo?: boolean;
}

export interface MoradorData {
  apartamento_uid: string;
  nome_responsavel: string;
  telefone: string;
  email?: string;
  dependentes: DependenteData[];
  empreendimento_uid: string;
  add_grupo: boolean;
  bloco?: string;
  apartamento?: string;
  nome_empreendimento?: string;
}

export const moradoresService = {
  async cadastrarMorador(data: MoradorData) {
    try {
      // 1. Inserir dados do responsável
      const { data: moradorInserido, error: moradorError } = await supabaseClient
        .from('gbp_moradores')
        .insert({
          apartamento_uid: data.apartamento_uid,
          nome_responsavel: data.nome_responsavel,
          telefone: data.telefone,
          email: data.email || null,
          gbp_empreendimentos: data.empreendimento_uid,
          add_grupo: data.add_grupo,
          bloco: data.bloco || null,
          apartamento: data.apartamento || null,
          nome_empreendimento: data.nome_empreendimento || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (moradorError) throw moradorError;

      // 2. Inserir dependentes (se houver)
      if (data.dependentes.length > 0) {
        const dependentesParaInserir = data.dependentes
          .filter(dep => dep.nome.trim() !== '') // Apenas dependentes com nome preenchido
          .map(dep => ({
            morador_uid: moradorInserido.uid,
            nome: dep.nome,
            parentesco: dep.parentesco,
            whatsapp: dep.whatsapp || null,
            gbp_empreendimentos: data.empreendimento_uid,
            add_grupo: dep.add_grupo ?? false,
            created_at: new Date().toISOString()
          }));

        if (dependentesParaInserir.length > 0) {
          const { error: dependentesError } = await supabaseClient
            .from('gbp_dependentes')
            .insert(dependentesParaInserir);

          if (dependentesError) throw dependentesError;
        }
      }

      return { success: true, data: moradorInserido };
    } catch (error) {
      console.error('Erro ao cadastrar morador:', error);
      throw error;
    }
  },

  async atualizarMorador(uid: string, data: { nome_responsavel: string; telefone: string }) {
    try {
      const { error } = await supabaseClient
        .from('gbp_moradores')
        .update({
          nome_responsavel: data.nome_responsavel,
          telefone: data.telefone
        })
        .eq('uid', uid);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar morador:', error);
      throw error;
    }
  },

  async listarMoradores(empreendimento?: string) {
    try {
      let query = supabaseClient
        .from('gbp_moradores')
        .select(`
          *,
          dependentes:gbp_dependentes(*)
        `)
        .order('created_at', { ascending: false });

      if (empreendimento) {
        query = query.eq('empreendimento', empreendimento);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Erro ao listar moradores:', error);
      throw error;
    }
  },

  async buscarMoradorPorApartamento(empreendimento: string, bloco: string, apartamento: string) {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_moradores')
        .select(`
          *,
          dependentes:gbp_dependentes(*)
        `)
        .eq('empreendimento', empreendimento)
        .eq('bloco', bloco)
        .eq('apartamento', apartamento)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

      return data;
    } catch (error) {
      console.error('Erro ao buscar morador:', error);
      throw error;
    }
  },

  async listarTodosMoradores() {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_moradores')
        .select(`
          uid,
          nome_responsavel,
          telefone,
          created_at,
          apartamento:apartamento_uid (
            uid,
            numero,
            bloco:bloco_uid (
              uid,
              nome,
              empreendimento:empreendimento_uid (
                uid,
                nome,
                cidade
              )
            )
          ),
          dependentes:gbp_dependentes!morador_uid(
            uid,
            nome,
            parentesco,
            whatsapp
          )
        `)
        .order('created_at', { ascending: false })
        .limit(200); // evita trazer volume excessivo para o grid

      if (error) {
        console.error('Erro na query de moradores:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao listar moradores:', error);
      throw error;
    }
  },

  async adicionarDependente(morador_uid: string, empreendimento_uid: string, dependente: DependenteData) {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_dependentes')
        .insert({
          morador_uid,
          nome: dependente.nome,
          parentesco: dependente.parentesco,
          whatsapp: dependente.whatsapp || null,
          gbp_empreendimentos: empreendimento_uid || null,
          add_grupo: dependente.add_grupo ?? false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao adicionar dependente:', error);
      throw error;
    }
  },

  async removerDependente(dependente_uid: string) {
    try {
      const { error } = await supabaseClient
        .from('gbp_dependentes')
        .delete()
        .eq('uid', dependente_uid);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Erro ao remover dependente:', error);
      throw error;
    }
  }
};
