import { supabaseAdmin } from '../lib/supabase';

export async function checkExpiredSubscriptions() {
  try {
    // Chama a função que verifica assinaturas vencidas
    const { error } = await supabaseAdmin.rpc('verificar_assinaturas_vencidas');

    if (error) {
      console.error('Erro ao verificar assinaturas vencidas:', error);
      throw error;
    }

    console.log('Verificação de assinaturas vencidas concluída com sucesso');
  } catch (error) {
    console.error('Erro ao executar verificação de assinaturas:', error);
    throw error;
  }
} 