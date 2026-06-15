-- Alterar constraint de foreign key para permitir deletar usuário mantendo as demandas
-- O campo usuario_uid ficará NULL quando o usuário for deletado

-- 1. Remover constraint atual
ALTER TABLE gbp_whatsapp_demanda 
DROP CONSTRAINT IF EXISTS gbp_whatsapp_demanda_usuario_uid_fkey;

-- 2. Adicionar nova constraint com ON DELETE SET NULL
ALTER TABLE gbp_whatsapp_demanda 
ADD CONSTRAINT gbp_whatsapp_demanda_usuario_uid_fkey 
FOREIGN KEY (usuario_uid) REFERENCES gbp_usuarios(uid) 
ON DELETE SET NULL;

-- Verificar se a alteração foi aplicada
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'gbp_whatsapp_demanda';
