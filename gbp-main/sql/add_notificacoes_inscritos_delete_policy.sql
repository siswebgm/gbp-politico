-- Permite excluir inscritos de notificações pela tela de Configuração.
-- Segue o mesmo padrão das demais políticas da tabela (anon/authenticated).
DROP POLICY IF EXISTS notif_inscritos_delete_autenticado ON public.gbp_notificacoes_inscritos;
CREATE POLICY notif_inscritos_delete_autenticado
  ON public.gbp_notificacoes_inscritos
  FOR DELETE
  TO anon, authenticated
  USING (true);
