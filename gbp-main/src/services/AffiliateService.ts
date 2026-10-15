import { supabaseClient as supabaseAdmin } from "../lib/supabase";

export class AffiliateService {
  // Gera código único de afiliado
  static generateAffiliateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Cria afiliado para um usuário
  static async createAffiliate(usuarioUid: string, comissaoPercentual: number = 10) {
    try {
      // Verifica se já é afiliado
      const { data: existing } = await supabaseAdmin
        .from('gbp_afiliados')
        .select('*')
        .eq('usuario_uid', usuarioUid)
        .single();

      if (existing) {
        return existing;
      }

      // Gera código único
      let codigoAfiliado = this.generateAffiliateCode();
      let isUnique = false;
      
      while (!isUnique) {
        const { data: check } = await supabaseAdmin
          .from('gbp_afiliados')
          .select('id')
          .eq('codigo_afiliado', codigoAfiliado)
          .single();
        
        if (!check) {
          isUnique = true;
        } else {
          codigoAfiliado = this.generateAffiliateCode();
        }
      }

      const { data: afiliado, error } = await supabaseAdmin
        .from('gbp_afiliados')
        .insert({
          usuario_uid: usuarioUid,
          codigo_afiliado: codigoAfiliado,
          comissao_percentual: comissaoPercentual,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      return afiliado;
    } catch (error) {
      console.error('Erro ao criar afiliado:', error);
      throw error;
    }
  }

  // Busca afiliado por código
  static async getAffiliateByCode(codigo: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('gbp_afiliados')
        .select('*')
        .eq('codigo_afiliado', codigo)
        .eq('status', 'active')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar afiliado:', error);
      return null;
    }
  }

  // Registra indicação
  static async registerIndication(afiliadoId: string, empresaUid: string, codigoAfiliado: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('gbp_indicacoes')
        .insert({
          afiliado_id: afiliadoId,
          empresa_uid: empresaUid,
          codigo_afiliado: codigoAfiliado,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao registrar indicação:', error);
      throw error;
    }
  }

  // Confirma indicação e credita comissão
  static async confirmIndication(indicacaoId: string, valorPagamento: number) {
    try {
      // Busca indicação com dados do afiliado
      const { data: indicacao, error: indicacaoError } = await supabaseAdmin
        .from('gbp_indicacoes')
        .select('*, gbp_afiliados(*)')
        .eq('id', indicacaoId)
        .single();

      if (indicacaoError || !indicacao) throw indicacaoError;

      const afiliado = indicacao.gbp_afiliados;
      const comissaoValor = valorPagamento * (afiliado.comissao_percentual / 100);

      // Atualiza saldo do afiliado
      const { error: updateError } = await supabaseAdmin
        .from('gbp_afiliados')
        .update({
          saldo_comissoes: afiliado.saldo_comissoes + comissaoValor,
          total_comissoes: afiliado.total_comissoes + comissaoValor,
          data_atualizacao: new Date().toISOString()
        })
        .eq('id', afiliado.id);

      if (updateError) throw updateError;

      // Atualiza indicação
      const { error: indicacaoUpdateError } = await supabaseAdmin
        .from('gbp_indicacoes')
        .update({
          status: 'confirmed',
          comissao_valor: comissaoValor,
          data_confirmacao: new Date().toISOString()
        })
        .eq('id', indicacaoId);

      if (indicacaoUpdateError) throw indicacaoUpdateError;

      return { comissao: comissaoValor, afiliadoId: afiliado.id };
    } catch (error) {
      console.error('Erro ao confirmar indicação:', error);
      throw error;
    }
  }

  // Busca estatísticas do afiliado
  static async getAffiliateStats(afiliadoId: string) {
    try {
      // Total de indicações
      const { count: totalIndicacoes } = await supabaseAdmin
        .from('gbp_indicacoes')
        .select('*', { count: 'exact', head: true })
        .eq('afiliado_id', afiliadoId);

      // Indicações confirmadas
      const { count: indicacoesConfirmadas } = await supabaseAdmin
        .from('gbp_indicacoes')
        .select('*', { count: 'exact', head: true })
        .eq('afiliado_id', afiliadoId)
        .eq('status', 'confirmed');

      // Total de comissões
      const { data: afiliado } = await supabaseAdmin
        .from('gbp_afiliados')
        .select('total_comissoes, saldo_comissoes')
        .eq('id', afiliadoId)
        .single();

      // Histórico de indicações
      const { data: indicacoes } = await supabaseAdmin
        .from('gbp_indicacoes')
        .select('*, gbp_empresas(nome)')
        .eq('afiliado_id', afiliadoId)
        .order('data_indicacao', { ascending: false })
        .limit(20);

      return {
        totalIndicacoes: totalIndicacoes || 0,
        indicacoesConfirmadas: indicacoesConfirmadas || 0,
        totalComissoes: afiliado?.total_comissoes || 0,
        saldoComissoes: afiliado?.saldo_comissoes || 0,
        indicacoes: indicacoes || []
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw error;
    }
  }

  // Solicita saque de comissão
  static async requestWithdrawal(afiliadoId: string, valor: number, dadosBancarios: any) {
    try {
      // Verifica saldo
      const { data: afiliado } = await supabaseAdmin
        .from('gbp_afiliados')
        .select('saldo_comissoes')
        .eq('id', afiliadoId)
        .single();

      if (!afiliado || afiliado.saldo_comissoes < valor) {
        throw new Error('Saldo insuficiente');
      }

      // Cria solicitação de saque
      const { data, error } = await supabaseAdmin
        .from('gbp_saques_comissoes')
        .insert({
          afiliado_id: afiliadoId,
          valor: valor,
          dados_bancarios: dadosBancarios,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Deduz do saldo (bloqueia temporariamente)
      await supabaseAdmin
        .from('gbp_afiliados')
        .update({
          saldo_comissoes: afiliado.saldo_comissoes - valor
        })
        .eq('id', afiliadoId);

      return data;
    } catch (error) {
      console.error('Erro ao solicitar saque:', error);
      throw error;
    }
  }
}
