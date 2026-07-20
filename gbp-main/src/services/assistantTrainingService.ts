import { supabaseClient } from '../lib/supabase';
import { normalize } from '../components/AppAssistant/utils';
import type { AssistantIntent } from '../components/AppAssistant/types';

export type { AssistantIntent };

class AssistantTrainingService {
  async listar(): Promise<AssistantIntent[]> {
    const { data, error } = await supabaseClient
      .from('gbp_assistente_treinamento')
      .select('*')
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AssistantTraining] Erro ao listar:', error);
      throw new Error('Erro ao carregar treinamento do assistente');
    }

    return (data as AssistantIntent[]) || [];
  }

  async buscar(texto: string): Promise<AssistantIntent | null> {
    const normTexto = normalize(texto);
    const intents = await this.listar();

    for (const intent of intents) {
      if (!intent.ativo) continue;

      const chaves = intent.palavras_chave
        .split(',')
        .map((k) => normalize(k))
        .filter(Boolean);

      const perguntaNorm = normalize(intent.pergunta);

      const matchChave = chaves.some((chave) => normTexto.includes(chave));
      const matchPergunta = perguntaNorm && normTexto.includes(perguntaNorm);

      if (matchChave || matchPergunta) {
        return intent;
      }
    }

    return null;
  }

  async criar(intent: Omit<AssistantIntent, 'uid'>): Promise<AssistantIntent> {
    const { data, error } = await supabaseClient
      .from('gbp_assistente_treinamento')
      .insert(intent)
      .select()
      .single();

    if (error) {
      console.error('[AssistantTraining] Erro ao criar:', error);
      throw new Error('Erro ao salvar intenção');
    }

    return data as AssistantIntent;
  }

  async atualizar(uid: string, intent: Partial<AssistantIntent>): Promise<AssistantIntent> {
    const { data, error } = await supabaseClient
      .from('gbp_assistente_treinamento')
      .update(intent)
      .eq('uid', uid)
      .select()
      .single();

    if (error) {
      console.error('[AssistantTraining] Erro ao atualizar:', error);
      throw new Error('Erro ao atualizar intenção');
    }

    return data as AssistantIntent;
  }

  async excluir(uid: string): Promise<void> {
    const { error } = await supabaseClient
      .from('gbp_assistente_treinamento')
      .delete()
      .eq('uid', uid);

    if (error) {
      console.error('[AssistantTraining] Erro ao excluir:', error);
      throw new Error('Erro ao excluir intenção');
    }
  }
}

export const assistantTrainingService = new AssistantTrainingService();
