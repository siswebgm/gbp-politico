-- Adicionar/alterar colunas de atribuição na tabela gbp_demandas_ruas
-- Script para adicionar funcionalidade de atribuição de demandas

-- 1. Remover políticas existentes antes de alterar coluna
DROP POLICY IF EXISTS "Permitir leitura de demandas atribuídas" ON public.gbp_demandas_ruas;
DROP POLICY IF EXISTS "Permitir atribuição de demandas" ON public.gbp_demandas_ruas;

-- 2. Remover coluna existente se houver (para recriar com tipo correto)
DO $$ 
BEGIN
    -- Verificar se a coluna existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'gbp_demandas_ruas' 
        AND column_name = 'atribuido_para_uid'
    ) THEN
        -- Fazer backup dos dados existentes
        CREATE TEMP TABLE backup_atribuicoes AS 
        SELECT uid, atribuido_para_uid, atribuido_por_uid, data_atribuicao 
        FROM public.gbp_demandas_ruas;
        
        -- Remover coluna antiga com CASCADE para remover dependências
        ALTER TABLE public.gbp_demandas_ruas DROP COLUMN atribuido_para_uid CASCADE;
    END IF;
END $$;

-- 2. Adicionar colunas para atribuição com tipos corretos
ALTER TABLE public.gbp_demandas_ruas 
ADD COLUMN IF NOT EXISTS atribuido_para_uid UUID[],
ADD COLUMN IF NOT EXISTS atribuido_por_uid UUID,
ADD COLUMN IF NOT EXISTS data_atribuicao TIMESTAMP WITH TIME ZONE;

-- 3. Restaurar dados do backup se existia
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_atribuicoes') THEN
        -- Converter dados antigos (string) para array
        UPDATE public.gbp_demandas_ruas d 
        SET 
            atribuido_para_uid = CASE 
                WHEN b.atribuido_para_uid IS NOT NULL THEN 
                    ARRAY[b.atribuido_para_uid]::uuid]
                ELSE NULL 
            END
        FROM backup_atribuicoes b 
        WHERE d.uid = b.uid;
        
        -- Remover tabela temporária
        DROP TABLE backup_atribuicoes;
    END IF;
END $$;

-- 2. Adicionar comentários para documentação
COMMENT ON COLUMN public.gbp_demandas_ruas.atribuido_para_uid IS 'Array de UIDs dos usuários para quem a demanda foi atribuída';
COMMENT ON COLUMN public.gbp_demandas_ruas.atribuido_por_uid IS 'UID do usuário que fez a atribuição';
COMMENT ON COLUMN public.gbp_demandas_ruas.data_atribuicao IS 'Data e hora em que a demanda foi atribuída';

-- 3. Criar índices para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_gbp_demandas_ruas_atribuido_para ON public.gbp_demandas_ruas(atribuido_para_uid);
CREATE INDEX IF NOT EXISTS idx_gbp_demandas_ruas_atribuido_por ON public.gbp_demandas_ruas(atribuido_por_uid);
CREATE INDEX IF NOT EXISTS idx_gbp_demandas_ruas_data_atribuicao ON public.gbp_demandas_ruas(data_atribuicao);

-- 4. Adicionar constraints opcionais (comentados para não quebrar se houver dados)
-- ALTER TABLE public.gbp_demandas_ruas 
-- ADD CONSTRAINT chk_atribuicao_consistente 
-- CHECK (
--   (atribuido_para_uid IS NULL AND atribuido_por_uid IS NULL AND data_atribuicao IS NULL) OR
--   (atribuido_para_uid IS NOT NULL AND atribuido_por_uid IS NOT NULL AND data_atribuicao IS NOT NULL)
-- );

-- 4. Recriar políticas para RLS (para permitir leitura de demandas atribuídas)
-- Esta policy permite que usuários vejam demandas atribuídas a eles
CREATE POLICY "Permitir leitura de demandas atribuídas" 
ON public.gbp_demandas_ruas
FOR SELECT 
TO authenticated
USING (
  -- Dono da empresa (admin) pode ver tudo
  auth.uid() = empresa_uid OR 
  -- Usuários podem ver demandas atribuídas a eles
  auth.uid() = ANY(atribuido_para_uid) OR
  -- Quem atribuiu pode ver as demandas que atribuiu
  auth.uid() = atribuido_por_uid
);

-- 5. Policy para permitir atualização de atribuições
CREATE POLICY "Permitir atribuição de demandas" 
ON public.gbp_demandas_ruas
FOR UPDATE 
TO authenticated
USING (auth.uid() = empresa_uid OR auth.uid() = atribuido_por_uid)
WITH CHECK (
  -- Permitir atualizar apenas para donos da empresa ou quem atribuiu
  auth.uid() = empresa_uid OR auth.uid() = atribuido_por_uid
);

-- 6. Garantir permissões
GRANT ALL ON TABLE public.gbp_demandas_ruas TO authenticated, service_role;
