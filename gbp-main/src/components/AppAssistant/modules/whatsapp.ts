import type { AssistantContext, AssistantModule, AssistantResult } from '../types';
import { normalize } from '../utils';

const KEYWORDS = [
  'whatsapp', 'whats', 'zap', 'wpp',
  'conectado', 'conectar', 'conexao', 'conexão',
  'status do whatsapp', 'status do zap', 'está conectado', 'esta conectado',
  'desconectado', 'desconectado do whatsapp', 'whatsapp conectado', 'whatsapp desconectado',
];

const PRIMARY_KEYWORDS = [
  'whatsapp', 'whats', 'zap', 'status do whatsapp', 'status do zap', 'whatsapp conectado',
];

export const whatsappModule: AssistantModule = {
  name: 'whatsapp',
  title: 'WhatsApp',
  keywords: KEYWORDS,
  primaryKeywords: PRIMARY_KEYWORDS,
  quickQuestions: [
    'WhatsApp está conectado?',
    'Status do WhatsApp',
    'Conectar WhatsApp',
  ],

  parse(text) {
    const norm = normalize(text);
    const matchesKeyword = KEYWORDS.some((keyword) => norm.includes(normalize(keyword)));
    if (!matchesKeyword) return null;

    return {
      module: 'whatsapp',
      action: 'count',
      filters: {},
      description: 'Status do WhatsApp',
      displayTitle: 'WhatsApp',
    };
  },

  async execute(query, context: AssistantContext): Promise<AssistantResult> {
    const isConnected = context.statusWpp === 'open';
    return {
      ...query,
      count: isConnected ? 1 : 0,
      isConnected,
    };
  },

  async export() {
    // Não há exportação para status do WhatsApp.
  },
};
