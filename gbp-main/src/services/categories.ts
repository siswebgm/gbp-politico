import { supabaseClient } from '../lib/supabase';

export interface Category {
  uid: string;
  id: number;
  nome: string;
  tipo_uid: string | null;
  empresa_uid: string;
  created_at: string;
  cor?: string; // Cor hexadecimal para o mapa (ex: #FF5733)
}

export interface CategoriaTipo {
  id: number;
  uid: string;
  nome: string;
  empresa_uid: string;
  grupo_uid?: string | null;
  grupo?: { uid: string; nome: string } | null;
  created_at: string;
}

export interface CategoriaGrupo {
  id: number;
  uid: string;
  nome: string;
  empresa_uid: string;
  created_at: string;
}

export interface CategoryWithType extends Category {
  tipo: CategoriaTipo | null;
}

export const categoryService = {
  list: async (companyUid: string): Promise<CategoryWithType[]> => {
    console.log('Iniciando busca de categorias para empresa:', companyUid);

    const { data, error } = await supabaseClient
      .from('gbp_categorias')
      .select(`
        *,
        tipo:gbp_categoria_tipos!gbp_categorias_tipo_uid_fkey(
          id,
          uid,
          nome,
          empresa_uid,
          grupo_uid,
          grupo:gbp_categoria_grupos!gbp_categoria_tipos_grupo_uid_fkey(
            uid,
            nome
          ),
          created_at
        )
      `)
      .eq('empresa_uid', companyUid)
      .order('nome');

    if (error) {
      console.error('Erro ao buscar categorias:', error);
      throw error;
    }

    console.log('Categorias encontradas:', data);
    return data || [];
  },

  create: async (category: Omit<Category, 'uid' | 'id' | 'created_at'>): Promise<Category> => {
    console.log('Iniciando criação de categoria:', category);

    if (!category.nome?.trim()) {
      throw new Error('Nome é obrigatório');
    }

    if (!category.empresa_uid) {
      throw new Error('Empresa não encontrada');
    }

    const { data, error } = await supabaseClient
      .from('gbp_categorias')
      .insert([{
        nome: category.nome.trim(),
        tipo_uid: category.tipo_uid || null,
        empresa_uid: category.empresa_uid
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao criar categoria:', error);
      throw error;
    }

    console.log('Categoria criada:', data);
    return data;
  },

  update: async (uid: string, updates: Partial<Omit<Category, 'uid' | 'id' | 'created_at' | 'empresa_uid'>>): Promise<Category> => {
    console.log('Iniciando atualização de categoria:', { uid, updates });

    if (!updates) {
      throw new Error('Dados de atualização não fornecidos');
    }

    const updateData: any = {};
    if (updates.nome !== undefined) {
      updateData.nome = updates.nome.trim();
    }
    if (updates.tipo_uid !== undefined) {
      updateData.tipo_uid = updates.tipo_uid;
    }
    if (updates.cor !== undefined) {
      updateData.cor = updates.cor;
    }

    const { data, error } = await supabaseClient
      .from('gbp_categorias')
      .update(updateData)
      .eq('uid', uid)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao atualizar categoria:', error);
      throw error;
    }

    console.log('Categoria atualizada:', data);
    return data;
  },

  delete: async (uid: string) => {
    // Primeiro verifica se existem eleitores vinculados
    const hasVoters = await checkCategoryHasVoters(uid);
    if (hasVoters) {
      throw new Error('Não é possível excluir esta categoria pois existem eleitores vinculados a ela.');
    }

    const { error } = await supabaseClient
      .from('gbp_categorias')
      .delete()
      .eq('uid', uid);

    if (error) throw error;
  }
};

export const checkCategoryHasVoters = async (categoryId: string): Promise<boolean> => {
  const { data, error } = await supabaseClient
    .from('gbp_eleitores')
    .select('id')
    .eq('categoria_uid', categoryId)
    .limit(1);

  if (error) {
    console.error('Erro ao verificar eleitores da categoria:', error);
    throw error;
  }

  return data.length > 0;
};

export const categoriaTipoService = {
  update: async (uid: string, updates: Partial<Omit<CategoriaTipo, 'uid' | 'id' | 'created_at' | 'empresa_uid' | 'grupo'>>): Promise<CategoriaTipo> => {
    console.log('Iniciando atualização de tipo:', { uid, updates });

    const updateData: Record<string, unknown> = {};
    if (updates.nome !== undefined) {
      updateData.nome = updates.nome.trim();
    }
    if (updates.grupo_uid !== undefined) {
      updateData.grupo_uid = updates.grupo_uid;
    }

    const { data, error } = await supabaseClient
      .from('gbp_categoria_tipos')
      .update(updateData)
      .eq('uid', uid)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao atualizar tipo:', error);
      throw error;
    }

    console.log('Tipo atualizado:', data);
    return data;
  },

  create: async (tipo: Omit<CategoriaTipo, 'uid' | 'id' | 'created_at'>): Promise<CategoriaTipo> => {
    console.log('Iniciando criação de tipo:', tipo);

    if (!tipo.nome?.trim()) {
      throw new Error('Nome é obrigatório');
    }

    if (!tipo.empresa_uid) {
      throw new Error('Empresa não encontrada');
    }

    const { data, error } = await supabaseClient
      .from('gbp_categoria_tipos')
      .insert([{
        nome: tipo.nome.trim(),
        empresa_uid: tipo.empresa_uid
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao criar tipo:', error);
      throw error;
    }

    console.log('Tipo criado:', data);
    return data;
  },

  delete: async (uid: string): Promise<void> => {
    console.log('Iniciando exclusão de tipo:', uid);

    const { error } = await supabaseClient
      .from('gbp_categoria_tipos')
      .delete()
      .eq('uid', uid);

    if (error) {
      console.error('Erro ao excluir tipo:', error);
      throw error;
    }

    console.log('Tipo excluído com sucesso');
  }
};

export const categoriaGrupoService = {
  list: async (companyUid: string): Promise<CategoriaGrupo[]> => {
    const { data, error } = await supabaseClient
      .from('gbp_categoria_grupos')
      .select('*')
      .eq('empresa_uid', companyUid)
      .order('nome');

    if (error) {
      console.error('Erro ao buscar grupos de categoria:', error);
      throw error;
    }

    return data || [];
  },

  create: async (grupo: { nome: string; empresa_uid: string }): Promise<CategoriaGrupo> => {
    if (!grupo.nome?.trim()) {
      throw new Error('Nome é obrigatório');
    }

    if (!grupo.empresa_uid) {
      throw new Error('Empresa não encontrada');
    }

    const { data, error } = await supabaseClient
      .from('gbp_categoria_grupos')
      .insert([{
        nome: grupo.nome.trim(),
        empresa_uid: grupo.empresa_uid
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao criar grupo de categoria:', error);
      throw error;
    }

    return data;
  },

  update: async (uid: string, updates: { nome?: string }): Promise<CategoriaGrupo> => {
    const { data, error } = await supabaseClient
      .from('gbp_categoria_grupos')
      .update({ nome: updates.nome?.trim() })
      .eq('uid', uid)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao atualizar grupo de categoria:', error);
      throw error;
    }

    return data;
  },

  delete: async (uid: string): Promise<void> => {
    // Tipos vinculados ficam com grupo_uid = null (ON DELETE SET NULL)
    const { error } = await supabaseClient
      .from('gbp_categoria_grupos')
      .delete()
      .eq('uid', uid);

    if (error) {
      console.error('Erro ao excluir grupo de categoria:', error);
      throw error;
    }
  }
};