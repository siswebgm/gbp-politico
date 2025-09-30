-- Recria a sequência
DROP SEQUENCE IF EXISTS gbp_upload_history_seq CASCADE;
CREATE SEQUENCE gbp_upload_history_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Recria a tabela com a estrutura correta
DROP TABLE IF EXISTS gbp_upload_history CASCADE;
CREATE TABLE public.gbp_upload_history (
    upload_history_uid bigint NOT NULL DEFAULT nextval('gbp_upload_history_seq'::regclass),
    empresa_uid uuid NOT NULL DEFAULT gen_random_uuid(),
    arquivo_nome text NOT NULL,
    registros_total integer NOT NULL DEFAULT 0,
    registros_processados integer NOT NULL DEFAULT 0,
    status text NOT NULL,
    erro_mensagem text NULL,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    uid uuid NOT NULL DEFAULT gen_random_uuid(),
    registros_erro text NULL,
    CONSTRAINT gbp_upload_history_pkey PRIMARY KEY (uid),
    CONSTRAINT gbp_upload_history_empresa_uid_fkey FOREIGN KEY (empresa_uid) REFERENCES gbp_empresas(uid) ON DELETE CASCADE
) TABLESPACE pg_default;
