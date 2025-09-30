-- Adiciona a coluna empresa_uid na tabela gbp_pagamentos
ALTER TABLE public.gbp_pagamentos
ADD COLUMN empresa_uid UUID NOT NULL;

-- Adiciona a chave estrangeira para a tabela de empresas
ALTER TABLE public.gbp_pagamentos
ADD CONSTRAINT gbp_pagamentos_empresa_uid_fkey 
FOREIGN KEY (empresa_uid) 
REFERENCES public.gbp_empresas(id);

-- Atualiza os registros existentes (se houver)
-- IMPORTANTE: Substitua 'ID_DA_EMPRESA_PADRAO' pelo ID de uma empresa válida existente
-- UPDATE public.gbp_pagamentos SET empresa_uid = 'ID_DA_EMPRESA_PADRAO';

-- Cria um índice para melhorar a performance das consultas por empresa
CREATE INDEX idx_gbp_pagamentos_empresa_uid ON public.gbp_pagamentos(empresa_uid);
