import type { AssistantContext, AssistantModule, AssistantQuery, AssistantResult } from '../types';
import { normalize } from '../utils';
import { supabaseClient } from '../../../lib/supabase';

function formatDate(date: string | null | undefined) {
  if (!date) return 'sem data';
  return new Date(date).toLocaleDateString('pt-BR');
}

async function getLastAttendance(empresaUid: string) {
  const { data, error } = await supabaseClient
    .from('gbp_atendimentos')
    .select('uid, descricao, status, created_at')
    .eq('empresa_uid', empresaUid)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return 'Nenhum atendimento registrado.';
  return `O último atendimento registrado foi em ${formatDate(data.created_at)}: "${data.descricao || 'sem descrição'}" (status: ${data.status || 'não informado'}).`;
}

async function getLastDemand(empresaUid: string) {
  const { data, error } = await supabaseClient
    .from('gbp_demandas_ruas')
    .select('uid, tipo_de_demanda, logradouro, bairro, status, criado_em')
    .eq('empresa_uid', empresaUid)
    .neq('excluido', true)
    .order('criado_em', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return 'Nenhuma demanda recebida.';
  return `A última demanda recebida foi em ${formatDate(data.criado_em)}: ${data.tipo_de_demanda || 'Demanda'} em ${data.logradouro || 'endereço não informado'}${data.bairro ? `, ${data.bairro}` : ''} (status: ${data.status || 'não informado'}).`;
}

async function replaceVariables(text: string, context: AssistantContext): Promise<string> {
  let result = text;

  result = result.replace(/\{\{empresa\}\}/g, context.companyName || 'sua empresa');

  if (result.includes('{{ultimoAtendimento}}')) {
    const value = context.empresaUid ? await getLastAttendance(context.empresaUid) : 'Empresa não identificada.';
    result = result.replace(/\{\{ultimoAtendimento\}\}/g, value);
  }

  if (result.includes('{{ultimaDemanda}}')) {
    const value = context.empresaUid ? await getLastDemand(context.empresaUid) : 'Empresa não identificada.';
    result = result.replace(/\{\{ultimaDemanda\}\}/g, value);
  }

  return result;
}

export const customIntentsModule: AssistantModule = {
  name: 'custom',
  title: 'Respostas Personalizadas',
  keywords: [],
  primaryKeywords: [],
  quickQuestions: [],

  parse(text, context: AssistantContext): AssistantQuery | null {
    const normTexto = normalize(text);

    for (const intent of context.customIntents || []) {
      if (!intent.ativo) continue;

      const chaves = intent.palavras_chave
        .split(',')
        .map((k) => normalize(k))
        .filter(Boolean);

      const perguntaNorm = normalize(intent.pergunta);

      const matchChave = chaves.some((chave) => normTexto.includes(chave));
      const matchPergunta = perguntaNorm && normTexto.includes(perguntaNorm);

      if (matchChave || matchPergunta) {
        return {
          module: 'custom',
          action: 'custom',
          filters: {},
          description: intent.pergunta,
          displayTitle: 'Resposta personalizada',
        };
      }
    }

    return null;
  },

  async execute(query, context: AssistantContext): Promise<AssistantResult> {
    const matched = context.customIntents?.find((i) => normalize(i.pergunta) === normalize(query.description));

    let customResponse = matched?.resposta || 'Desculpe, não encontrei a resposta treinada para essa pergunta.';
    customResponse = await replaceVariables(customResponse, context);

    return {
      ...query,
      customResponse,
    };
  },

  async export() {
    // Respostas personalizadas não possuem exportação.
  },
};
