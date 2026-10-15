-- Limpar todos os planos e inserir apenas os 3 corretos
-- Execute no Supabase SQL Editor

DELETE FROM gbp_planos WHERE empresa_uid IS NULL;

INSERT INTO gbp_planos (id, nome, descricao, valor, periodo_dias, empresa_uid, created_at) VALUES
  (
    gen_random_uuid(),
    'Plano Inter',
    '10.000 Cadastros e Atendimentos, Disparos em massa via WhatsApp, 10 Colaboradores, Ofícios, Projeto de Lei e Requerimentos, Agenda, Suporte, Servidor em Nuvens',
    400.00,
    30,
    NULL,
    now()
  ),
  (
    gen_random_uuid(),
    'Plano Premium',
    'Cadastros e Atendimentos ilimitados, Disparos em massa via WhatsApp, Colaboradores ilimitados, Ofícios, Projeto de Lei e Requerimentos, Agenda, Suporte, Servidor em Nuvens',
    600.00,
    30,
    NULL,
    now()
  ),
  (
    gen_random_uuid(),
    'Plano Personalizado',
    'Sob consulta - Entre em contato para personalização',
    0.00,
    30,
    NULL,
    now()
  );
