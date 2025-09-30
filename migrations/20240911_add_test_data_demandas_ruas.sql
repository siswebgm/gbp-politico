-- Insert test data for gbp_demandas_ruas
-- This will add sample demandas for testing the reports

-- First, ensure the company exists
INSERT INTO gbp_empresas (uid, nome, token, instancia, porta)
VALUES ('9475af96-553b-4a90-accb-39d46aedc6ce', 'Empresa de Teste', 'TOKEN_TESTE', 'teste', '01')
ON CONFLICT (uid) DO NOTHING;

-- Insert test demandas with different statuses and dates
INSERT INTO gbp_demandas_ruas (
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
  demanda_concluida,
  demanda_concluida_data,
  documento_protocolado
) VALUES 
-- Pending demand (current month)
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
  false,
  NULL,
  'documento1.pdf'
),
-- In progress demand (last month)
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
  false,
  NULL,
  'documento2.pdf'
),
-- Completed demand (2 months ago)
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
  true,
  NOW() - INTERVAL '40 days',
  'documento3.pdf'
),
-- Another completed demand (last month)
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
  true,
  NOW() - INTERVAL '10 days',
  'documento4.pdf'
);

-- Update the sequence to avoid conflicts with existing data
SELECT setval('public.numero_protocolo_seq', (SELECT COALESCE(MAX(numero_protocolo::bigint), 0)::bigint FROM gbp_demandas_ruas) + 1, true);
