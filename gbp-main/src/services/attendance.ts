import { supabaseClient } from '../lib/supabase';
import { api } from '../lib/api';

export async function deleteAttendance(uid: string) {
  const { error } = await supabaseClient
    .from('gbp_atendimentos')
    .delete()
    .eq('uid', uid);

  if (error) {
    console.error('Error deleting attendance:', error);
    throw error;
  }

  return true;
}

export async function updateAttendance(uid: string, data: any) {
  try {
    // Primeiro, busca os dados completos do atendimento
    const { data: currentData, error: fetchError } = await supabaseClient
      .from('gbp_atendimentos')
      .select('*')
      .eq('uid', uid)
      .single();

    if (fetchError) {
      console.error('Error fetching attendance:', fetchError);
      throw fetchError;
    }

    // Separa os dados do usuário dos dados do atendimento
    const { updated_by, updated_by_user, ...attendanceData } = data;

    // Atualiza os dados no Supabase
    const { error: updateError } = await supabaseClient
      .from('gbp_atendimentos')
      .update({
        ...attendanceData,
        updated_at: new Date().toISOString()
      })
      .eq('uid', uid);

    if (updateError) {
      console.error('Error updating attendance:', updateError);
      throw updateError;
    }

    // Se houver mudança de status, envia para o webhook
    if (data.status !== undefined && data.status !== currentData.status) {
      const webhookData = {
        ...currentData,
        ...attendanceData,
        uid,
        updated_at: new Date().toISOString(),
        // Inclui os dados do usuário apenas no webhook
        updated_by,
        updated_by_user,
        old_status: currentData.status,
        new_status: data.status
      };

      console.log('Enviando webhook para status_atendimento:', webhookData);

      const response = await fetch('https://whkn8n.guardia.work/webhook/status_atendimento', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      });

      if (!response.ok) {
        console.error('Erro ao enviar webhook:', await response.text());
      } else {
        console.log('Webhook enviado com sucesso:', await response.json());
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Erro em updateAttendance:', error);
    throw error;
  }
}
