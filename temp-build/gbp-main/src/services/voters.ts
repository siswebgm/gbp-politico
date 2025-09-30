import { supabaseClient } from '../lib/supabase';
import { handleSupabaseError } from '../utils/error';
import { VoterFormData, VoterFilters, Voter } from '../types/voter';

type VoterRow = Voter;
type VoterInsert = Omit<VoterRow, 'uid' | 'created_at'>;

const voterService = {
  create: async (voter: Omit<VoterInsert, 'uid' | 'created_at'>): Promise<VoterRow | undefined> => {
    try {
      if (!voter.empresa_uid) {
        throw new Error('Company ID is required');
      }

      if (!voter.usuario_uid) {
        throw new Error('User ID is required');
      }

      const cleanedData = {
        ...voter,
        nome: voter.nome?.toUpperCase(),
        cpf: voter.cpf?.replace(/\D/g, ''),
        nascimento: voter.nascimento ? new Date(voter.nascimento).toISOString() : null,
        whatsapp: voter.whatsapp?.replace(/\D/g, ''),
        telefone: voter.telefone?.replace(/\D/g, ''),
        genero: voter.genero?.toUpperCase(),
        titulo: voter.titulo?.replace(/\D/g, ''),
        zona: voter.zona?.replace(/\D/g, ''),
        secao: voter.secao?.replace(/\D/g, ''),
        cep: voter.cep?.replace(/\D/g, ''),
        logradouro: voter.logradouro?.toUpperCase(),
        cidade: voter.cidade?.toUpperCase(),
        bairro: voter.bairro?.toUpperCase(),
        complemento: voter.complemento?.toUpperCase(),
        indicado: voter.indicado?.toUpperCase(),
        usuario_uid: voter.usuario_uid,
        responsavel: voter.usuario_uid,
      };

      const { data, error } = await supabaseClient
        .from('gbp_eleitores')
        .insert([cleanedData])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('CPF já cadastrado');
        }
        handleSupabaseError(error, 'create voter');
      }

      if (!data) {
        throw new Error('No data returned from Supabase');
      }

      return data;
    } catch (error) {
      handleSupabaseError(error, 'create voter');
      return undefined;
    }
  },

  list: async (companyUid: string, filters?: VoterFilters): Promise<VoterRow[] | undefined> => {
    try {
      if (!companyUid) {
        throw new Error('Company ID is required');
      }

      let query = supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('empresa_uid', companyUid)
        .order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.or(`nome.ilike.%${filters.search}%,cpf.ilike.%${filters.search}%`);
      }

      if (filters?.city) {
        query = query.ilike('cidade', `%${filters.city}%`);
      }

      if (filters?.neighborhood) {
        query = query.ilike('bairro', `%${filters.neighborhood}%`);
      }

      if (filters?.category) {
        query = query.eq('categoria_uid', filters.category);
      }

      if (filters?.indication) {
        query = query.ilike('indicado', `%${filters.indication}%`);
      }

      if (filters?.logradouro) {
        query = query.ilike('logradouro', `%${filters.logradouro}%`);
      }

      if (filters?.cpf) {
        query = query.eq('cpf', filters.cpf.replace(/\D/g, ''));
      }

      const { data, error } = await query;

      if (error) {
        handleSupabaseError(error, 'list voters');
      }

      return data || [];
    } catch (error) {
      handleSupabaseError(error, 'list voters');
      return undefined;
    }
  },

  update: async (uid: string, updates: Partial<VoterInsert>): Promise<VoterRow | undefined> => {
    try {
      if (!updates.empresa_uid) {
        throw new Error('Company ID is required');
      }

      const cleanedData = {
        ...updates,
        nome: updates.nome?.toUpperCase(),
        cpf: updates.cpf?.replace(/\D/g, ''),
        nascimento: updates.nascimento ? new Date(updates.nascimento).toISOString() : null,
        whatsapp: updates.whatsapp?.replace(/\D/g, ''),
        telefone: updates.telefone?.replace(/\D/g, ''),
        genero: updates.genero?.toUpperCase(),
        titulo: updates.titulo?.replace(/\D/g, ''),
        zona: updates.zona?.replace(/\D/g, ''),
        secao: updates.secao?.replace(/\D/g, ''),
        cep: updates.cep?.replace(/\D/g, ''),
        logradouro: updates.logradouro?.toUpperCase(),
        cidade: updates.cidade?.toUpperCase(),
        bairro: updates.bairro?.toUpperCase(),
        complemento: updates.complemento?.toUpperCase(),
        indicado: updates.indicado?.toUpperCase(),
      };

      const { data, error } = await supabaseClient
        .from('gbp_eleitores')
        .update(cleanedData)
        .eq('uid', uid)
        .eq('empresa_uid', updates.empresa_uid)
        .select()
        .single();

      if (error) {
        handleSupabaseError(error, 'update voter');
      }

      if (!data) {
        throw new Error('No data returned from Supabase');
      }

      return data;
    } catch (error) {
      handleSupabaseError(error, 'update voter');
      return undefined;
    }
  },

  delete: async (uid: string, companyUid: string): Promise<void | undefined> => {
    try {
      if (!companyUid) {
        throw new Error('Company ID is required');
      }

      const { error } = await supabaseClient
        .from('gbp_eleitores')
        .delete()
        .eq('uid', uid)
        .eq('empresa_uid', companyUid);

      if (error) {
        handleSupabaseError(error, 'delete voter');
      }
    } catch (error) {
      handleSupabaseError(error, 'delete voter');
      return undefined;
    }
  },

  findByCpf: async (cpf: string, companyUid: string): Promise<VoterRow | null | undefined> => {
    try {
      if (!companyUid) {
        throw new Error('Company ID is required');
      }

      const { data, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('cpf', cpf.replace(/\D/g, ''))
        .eq('empresa_uid', companyUid)
        .single();

      if (error && error.code !== 'PGRST116') {
        handleSupabaseError(error, 'find voter by CPF');
      }

      return data;
    } catch (error) {
      handleSupabaseError(error, 'find voter by CPF');
      return undefined;
    }
  },

  checkCpfExists: async (cpf: string, companyUid: string): Promise<boolean | undefined> => {
    try {
      if (!companyUid) {
        throw new Error('Company ID is required');
      }

      const voter = await voterService.findByCpf(cpf, companyUid);
      return !!voter;
    } catch (error) {
      handleSupabaseError(error, 'check CPF exists');
      return undefined;
    }
  }
};

export default voterService;