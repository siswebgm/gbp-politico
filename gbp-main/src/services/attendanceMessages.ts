import { supabaseClient } from '../lib/supabase';

export interface AttendanceMessage {
  uid?: string;
  atendimento_uid: string;
  eleitor_uid: string;
  mensagem_texto: string;
  mensagem_enviada?: boolean;
  data_envio?: string | null;
  empresa_uid: string;
  data_programada_envio?: string | null;
}

export interface MessageTemplateData {
  nome?: string;
  categoria?: string;
  cliente?: string;
  empresa_uid: string;
  eleitor_uid: string;
}

/**
 * Substitui as tags no texto da mensagem pelos valores correspondentes
 */
export function replaceMessageTags(template: string, data: MessageTemplateData): string {
  let text = template;
  
  // Substituir {nome}
  if (data.nome) {
    text = text.replace(/{nome}/g, data.nome);
  }
  
  // Substituir {categoria}
  if (data.categoria) {
    text = text.replace(/{categoria}/g, data.categoria);
  }
  
  // Substituir {cliente}
  if (data.cliente) {
    text = text.replace(/{cliente}/g, data.cliente);
  }
  
  return text;
}

export async function createAttendanceMessage(data: AttendanceMessage) {
  const { data: result, error } = await supabaseClient
    .from('gbp_mensagens_atendimentos')
    .insert({
      atendimento_uid: data.atendimento_uid,
      eleitor_uid: data.eleitor_uid,
      mensagem_texto: data.mensagem_texto,
      mensagem_enviada: false,
      empresa_uid: data.empresa_uid,
      data_programada_envio: data.data_programada_envio || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar mensagem de atendimento:', error);
    throw error;
  }

  return result;
}

export async function getAttendanceMessage(atendimentoUid: string) {
  const { data, error } = await supabaseClient
    .from('gbp_mensagens_atendimentos')
    .select('*')
    .eq('atendimento_uid', atendimentoUid)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Erro ao buscar mensagem de atendimento:', error);
    throw error;
  }

  return data;
}

export async function markMessageAsSent(uid: string) {
  const { data, error } = await supabaseClient
    .from('gbp_mensagens_atendimentos')
    .update({
      mensagem_enviada: true,
      data_envio: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('uid', uid)
    .select()
    .single();

  if (error) {
    console.error('Erro ao marcar mensagem como enviada:', error);
    throw error;
  }

  return data;
}

export async function updateMessageText(uid: string, mensagem_texto: string) {
  const { data, error } = await supabaseClient
    .from('gbp_mensagens_atendimentos')
    .update({
      mensagem_texto,
      updated_at: new Date().toISOString(),
    })
    .eq('uid', uid)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar texto da mensagem:', error);
    throw error;
  }

  return data;
}

export async function getPendingMessages(empresaUid: string) {
  const { data, error } = await supabaseClient
    .from('gbp_mensagens_atendimentos')
    .select('*')
    .eq('empresa_uid', empresaUid)
    .eq('mensagem_enviada', false)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar mensagens pendentes:', error);
    throw error;
  }

  return data;
}
