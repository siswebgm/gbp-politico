-- Cria a sequência se ela não existir
DO $$ 
BEGIN
    -- Verifica se a sequência já existe
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'gbp_upload_history_seq') THEN
        -- Cria a sequência
        CREATE SEQUENCE gbp_upload_history_seq
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1;

        -- Atualiza o valor inicial da sequência para o maior valor atual + 1
        PERFORM setval('gbp_upload_history_seq', COALESCE((SELECT MAX(upload_history_uid) FROM gbp_upload_history), 0) + 1);
    END IF;
END $$;
