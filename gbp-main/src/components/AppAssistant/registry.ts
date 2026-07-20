import type { AssistantContext, AssistantModule } from './types';
import { pessoasModule } from './modules/pessoas';
import { attendancesModule } from './modules/attendances';
import { demandasModule } from './modules/demandas';
import { oficiosModule } from './modules/oficios';
import { projetosLeiModule } from './modules/projetosLei';
import { requerimentosModule } from './modules/requerimentos';
import { emendasModule } from './modules/emendas';
import { agendamentosModule } from './modules/agendamentos';
import { whatsappModule } from './modules/whatsapp';
import { customIntentsModule } from './modules/customIntents';
import { usuariosModule } from './modules/usuarios';
import { normalize } from './utils';

export const assistantModules: AssistantModule[] = [
  pessoasModule,
  attendancesModule,
  demandasModule,
  oficiosModule,
  projetosLeiModule,
  requerimentosModule,
  emendasModule,
  agendamentosModule,
  whatsappModule,
  usuariosModule,
  customIntentsModule,
];

export function detectModule(text: string, context?: AssistantContext): AssistantModule | null {
  const norm = normalize(text);

  // Primeiro: verifica intenções personalizadas treinadas pelo dono
  if (context?.customIntents && context.customIntents.length > 0) {
    const customQuery = customIntentsModule.parse(text, context);
    if (customQuery) {
      return customIntentsModule;
    }
  }

  // Depois, tenta identificar pela palavra da tabela (pessoas, atendimentos, demandas...)
  for (const module of assistantModules) {
    const primary = module.primaryKeywords || module.keywords;
    if (primary.some((keyword) => norm.includes(normalize(keyword)))) {
      return module;
    }
  }

  // Depois, aceita palavras secundárias (status, tipos, etc.)
  for (const module of assistantModules) {
    if (module.keywords.some((keyword) => norm.includes(normalize(keyword)))) {
      return module;
    }
  }

  return null;
}
