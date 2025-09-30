-- Remove a restrição de verificação antiga
ALTER TABLE public.gbp_demandas_ruas 
DROP CONSTRAINT IF EXISTS gbp_demandas_ruas_status_check;

-- Adiciona uma nova restrição de verificação com os status atualizados
ALTER TABLE public.gbp_demandas_ruas
ADD CONSTRAINT gbp_demandas_ruas_status_check 
CHECK (status IN ('recebido', 'feito_oficio', 'protocolado', 'aguardando', 'concluido', 'cancelado'));

-- Atualiza o valor padrão para 'recebido'
ALTER TABLE public.gbp_demandas_ruas 
ALTER COLUMN status SET DEFAULT 'recebido';

-- Atualiza registros existentes que possuem status antigos
UPDATE public.gbp_demandas_ruas 
SET status = 'recebido' 
WHERE status = 'pendente' OR status = 'em_andamento';

-- Atualiza o comentário da coluna para refletir os novos valores
COMMENT ON COLUMN public.gbp_demandas_ruas.status IS 'Status atual da demanda (recebido, feito_oficio, protocolado, aguardando, concluido, cancelado)';
