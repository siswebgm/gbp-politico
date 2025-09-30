-- 1. Inserir empresa de teste
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
) 
ON CONFLICT (uid) 
DO UPDATE SET
  nome = EXCLUDED.nome,
  token = EXCLUDED.token,
  instancia = EXCLUDED.instancia,
  porta = EXCLUDED.porta,
  updated_at = NOW()
RETURNING *;

-- 2. Verificar se a empresa foi criada
SELECT * FROM public.gbp_empresas 
WHERE uid = '9475af96-553b-4a90-accb-39d46aedc6ce';

-- 3. Inserir demandas de teste após garantir que a empresa existe
WITH empresa_existente AS (
  SELECT 1 FROM public.gbp_empresas 
  WHERE uid = '9475af96-553b-4a90-accb-39d46aedc6ce'
  LIMIT 1
)
INSERT INTO public.gbp_demandas_ruas (
  empresa_uid,
  tipo_de_demanda,
  descricao_do_problema,
  nivel_de_urgencia,
  logradouro,
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
)
SELECT 
  '9475af96-553b-4a90-accb-39d46aedc6ce',
  'Buraco na via',
  'Buraco grande na rua principal',
  'alta',
  'Rua das Flores',
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
FROM empresa_existente
RETURNING *;
