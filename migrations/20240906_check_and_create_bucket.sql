-- Verificar se o bucket existe
SELECT * FROM storage.buckets WHERE id = 'gbp_demandas_rua';

-- Se não existir, criar o bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('gbp_demandas_rua', 'gbp_demandas_rua', true)
ON CONFLICT (id) DO NOTHING;

-- Verificar se o bucket foi criado
SELECT * FROM storage.buckets WHERE id = 'gbp_demandas_rua';

-- Configurar políticas de segurança
-- 1. Permitir upload de arquivos autenticados
CREATE OR REPLACE POLICY "Permitir upload de arquivos para demandas de rua"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'gbp_demandas_rua' AND
  (storage.foldername(name))[1] = 'demandas_rua' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- 2. Permitir leitura de arquivos públicos
CREATE OR REPLACE POLICY "Permitir leitura de arquivos de demandas de rua"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'gbp_demandas_rua' AND
  (storage.foldername(name))[1] = 'demandas_rua' AND
  (
    -- Permitir leitura pública
    true
    -- Ou apenas para o dono do arquivo
    -- (storage.foldername(name))[2] = auth.uid()::text
  )
);

-- 3. Permitir deleção de arquivos pelo dono
CREATE OR REPLACE POLICY "Permitir exclusão de arquivos de demandas de rua"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'gbp_demandas_rua' AND
  (storage.foldername(name))[1] = 'demandas_rua' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Verificar as políticas criadas
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
