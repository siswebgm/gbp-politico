-- Inserir a empresa de teste se não existir
INSERT INTO public.gbp_empresas (
  uid,
  nome,
  token,
  instancia,
  porta,
  created_at,
  updated_at
) VALUES (
  '9475af96-553b-4a90-accb-39d46aedc6ce',
  'Empresa de Teste',
  'teste_token',
  'teste_instancia',
  '01',
  NOW(),
  NOW()
) ON CONFLICT (uid) DO NOTHING;

-- Inserir demandas de teste
INSERT INTO public.gbp_demandas_ruas (
  empresa_uid,
  tipo_de_demanda,
  descricao_do_problema,
  nivel_de_urgencia,
  logradouro,
  numero,
  bairro,
  cidade,
  uf,
  cep,
  status,
  criado_em,
  atualizado_em,
  aceite_termos,
  demanda_concluida,
  demanda_concluida_data,
  documento_protocolado
) VALUES 
-- Demanda 1: Pendente
(
  '9475af96-553b-4a90-accb-39d46aedc6ce',
  'Buraco na via',
  'Buraco grande na rua principal',
  'alta',
  'Rua das Flores',
  '123',
  'Centro',
  'São Paulo',
  'SP',
  '01001000',
  'pendente',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days',
  true,
  false,
  NULL,
  'documento1.pdf'
),
-- Demanda 2: Em andamento
(
  '9475af96-553b-4a90-accb-39d46aedc6ce',
  'Iluminação pública',
  'Poste de luz queimado',
  'média',
  'Avenida Paulista',
  '1000',
  'Bela Vista',
  'São Paulo',
  'SP',
  '01311000',
  'em_andamento',
  NOW() - INTERVAL '35 days',
  NOW() - INTERVAL '30 days',
  true,
  false,
  NULL,
  'documento2.pdf'
),
-- Demanda 3: Concluída
(
  '9475af96-553b-4a90-accb-39d46aedc6ce',
  'Limpeza urbana',
  'Lixo acumulado na calçada',
  'baixa',
  'Rua Augusta',
  '500',
  'Consolação',
  'São Paulo',
  'SP',
  '01304000',
  'concluido',
  NOW() - INTERVAL '65 days',
  NOW() - INTERVAL '60 days',
  true,
  true,
  NOW() - INTERVAL '40 days',
  'documento3.pdf'
),
-- Demanda 4: Concluída recentemente
(
  '9475af96-553b-4a90-accb-39d46aedc6ce',
  'Água na rua',
  'Vazamento de água na via',
  'alta',
  'Rua Oscar Freire',
  '800',
  'Jardins',
  'São Paulo',
  'SP',
  '01426000',
  'concluido',
  NOW() - INTERVAL '25 days',
  NOW() - INTERVAL '10 days',
  true,
  true,
  NOW() - INTERVAL '10 days',
  'documento4.pdf'
);

-- Atualizar a sequência do número de protocolo
SELECT setval('public.numero_protocolo_seq', COALESCE((SELECT MAX(numero_protocolo) FROM public.gbp_demandas_ruas), 1));

-- Verificar os dados inseridos
SELECT 
  uid,
  empresa_uid,
  tipo_de_demanda,
  status,
  criado_em,
  demanda_concluida,
  demanda_concluida_data
FROM public.gbp_demandas_ruas
WHERE empresa_uid = '9475af96-553b-4a90-accb-39d46aedc6ce'
ORDER BY criado_em DESC;
