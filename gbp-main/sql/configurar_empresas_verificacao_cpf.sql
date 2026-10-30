-- Configura empresas autorizadas para verificação cruzada de CPF
-- Substitua 'uid-da-empresa-atual' pelo UID da empresa que você está configurando
-- Substitua ou adicione mais UIDs no ARRAY conforme necessário

UPDATE gbp_empresas
SET empresas_verificacao_cpf = ARRAY['3f80714e-205d-42f7-b871-f7a7c5a9457f'::uuid]
WHERE uid = 'uid-da-empresa-atual';

-- Para adicionar mais empresas, use vírgula:
-- ARRAY['3f80714e-205d-42f7-b871-f7a7c5a9457f'::uuid, 'outra-uuid'::uuid, 'mais-uma-uuid'::uuid]

-- Para limpar (remover todas as empresas autorizadas):
-- UPDATE gbp_empresas SET empresas_verificacao_cpf = NULL WHERE uid = 'uid-da-empresa-atual';

-- Para verificar a configuração atual:
-- SELECT uid, nome, empresas_verificacao_cpf FROM gbp_empresas WHERE uid = 'uid-da-empresa-atual';
