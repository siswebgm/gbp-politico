-- Dropa a sequência se ela existir
DROP SEQUENCE IF EXISTS gbp_upload_history_seq;

-- Cria a sequência começando do maior valor atual + 1
CREATE SEQUENCE gbp_upload_history_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Atualiza o valor inicial da sequência para o maior valor atual + 1
SELECT setval('gbp_upload_history_seq', COALESCE((SELECT MAX(upload_history_uid) FROM gbp_upload_history), 0) + 1);

-- Atualiza a coluna para usar a sequência como default
ALTER TABLE gbp_upload_history
ALTER COLUMN upload_history_uid SET DEFAULT nextval('gbp_upload_history_seq');
