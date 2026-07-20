-- Seed: exemplos de intenções globais de treinamento da GBia
-- Execute no Supabase SQL Editor após criar a tabela gbp_assistente_treinamento.
-- As respostas usam variáveis dinâmicas: {{empresa}}, {{ultimoAtendimento}}, {{ultimaDemanda}}

INSERT INTO public.gbp_assistente_treinamento (pergunta, resposta, palavras_chave, ativo, ordem)
VALUES
  (
    'qual foi o último atendimento registrado?',
    'Na {{empresa}}, {{ultimoAtendimento}}',
    'último atendimento,atendimento registrado,atendimento',
    true,
    1
  ),
  (
    'qual foi a última demanda recebida?',
    'Na {{empresa}}, {{ultimaDemanda}}',
    'última demanda,demanda recebida,demanda',
    true,
    2
  ),
  (
    'qual o nome da empresa?',
    'O nome da empresa atual é {{empresa}}.',
    'nome da empresa,empresa atual',
    true,
    3
  );
