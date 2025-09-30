-- Adiciona coluna de template na tabela de empresas
ALTER TABLE public.gbp_empresas
ADD COLUMN template_oficio text;

COMMENT ON COLUMN public.gbp_empresas.template_oficio IS 'URL do template do documento Word para ofícios';

-- Garante que apenas usuários autenticados podem acessar os templates
ALTER TABLE public.gbp_empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de templates para usuários autenticados"
ON public.gbp_empresas
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir atualização de templates apenas para admin"
ON public.gbp_empresas
FOR UPDATE
TO authenticated
USING (auth.uid() IN (
  SELECT uid FROM gbp_usuarios WHERE nivel_acesso = 'admin'
));

-- Adicionar novos campos na tabela gbp_eleitores
ALTER TABLE gbp_eleitores
ADD COLUMN IF NOT EXISTS numero_do_sus text,
ADD COLUMN IF NOT EXISTS mes_nascimento integer,
ADD COLUMN IF NOT EXISTS responsavel text;
