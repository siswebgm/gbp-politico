-- Inserir dados reais de teste na tabela gbp_demandas_ruas
-- Inserir 3 demandas de exemplo para a empresa 9475af96-553b-4a90-accb-39d46aedc6ce

-- Demanda 1: Pendente
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
) VALUES (
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
);

-- Demanda 2: Em andamento
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
) VALUES (
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
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '1 day',
  true,
  false,
  NULL,
  'documento2.pdf'
);

-- Demanda 3: Concluída
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
) VALUES (
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
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '1 day',
  true,
  true,
  NOW() - INTERVAL '1 day',
  'documento3.pdf'
);

-- Verificar os dados inseridos
SELECT 
  uid,
  tipo_de_demanda,
  status,
  demanda_concluida,
  demanda_concluida_data,
  criado_em
FROM 
  public.gbp_demandas_ruas
WHERE 
  empresa_uid = '9475af96-553b-4a90-accb-39d46aedc6ce'
ORDER BY 
  criado_em DESC;
