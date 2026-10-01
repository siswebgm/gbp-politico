-- Tabela para logs de notificações push
-- Armazena histórico de envios, status e métricas

CREATE TABLE IF NOT EXISTS gbp_notificacoes_log (
    uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_uid UUID NOT NULL,
    usuario_uid UUID NOT NULL,
    
    -- Conteúdo da notificação
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    imagem_url TEXT,
    link_direcionar TEXT,
    tipo_midia TEXT, -- 'imagem', 'video', 'audio', 'pdf', 'texto'
    url_midia TEXT,
    
    -- Status da notificação
    enviada BOOLEAN DEFAULT false,
    entregue BOOLEAN DEFAULT false,
    visualizada BOOLEAN DEFAULT false,
    clicada BOOLEAN DEFAULT false,
    erro TEXT,
    
    -- Timestamps
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_envio TIMESTAMP WITH TIME ZONE,
    data_entrega TIMESTAMP WITH TIME ZONE,
    data_visualizacao TIMESTAMP WITH TIME ZONE,
    data_clique TIMESTAMP WITH TIME ZONE,
    
    -- Metadados
    plataforma TEXT, -- 'android', 'ios', 'web'
    dispositivo_modelo TEXT,
    versao_app TEXT,
    
    -- Foreign Keys
    CONSTRAINT fk_notificacoes_empresa 
        FOREIGN KEY (empresa_uid) 
        REFERENCES gbp_empresas(uid) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_notificacoes_usuario 
        FOREIGN KEY (usuario_uid) 
        REFERENCES gbp_usuarios(uid) 
        ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notificacoes_empresa 
    ON gbp_notificacoes_log(empresa_uid);

CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario 
    ON gbp_notificacoes_log(usuario_uid);

CREATE INDEX IF NOT EXISTS idx_notificacoes_data_criacao 
    ON gbp_notificacoes_log(data_criacao DESC);

CREATE INDEX IF NOT EXISTS idx_notificacoes_status 
    ON gbp_notificacoes_log(enviada, entregue, visualizada);

-- Comentários
COMMENT ON TABLE gbp_notificacoes_log IS 'Logs de notificações push enviadas pelo sistema';
COMMENT ON COLUMN gbp_notificacoes_log.uid IS 'Identificador único da notificação';
COMMENT ON COLUMN gbp_notificacoes_log.empresa_uid IS 'UID da empresa que enviou a notificação';
COMMENT ON COLUMN gbp_notificacoes_log.usuario_uid IS 'UID do usuário destinatário';
COMMENT ON COLUMN gbp_notificacoes_log.titulo IS 'Título da notificação';
COMMENT ON COLUMN gbp_notificacoes_log.mensagem IS 'Corpo da mensagem da notificação';
COMMENT ON COLUMN gbp_notificacoes_log.imagem_url IS 'URL da imagem anexada na notificação';
COMMENT ON COLUMN gbp_notificacoes_log.link_direcionar IS 'URL para redirecionar ao clicar';
COMMENT ON COLUMN gbp_notificacoes_log.tipo_midia IS 'Tipo de mídia anexada (imagem, video, audio, pdf, texto)';
COMMENT ON COLUMN gbp_notificacoes_log.url_midia IS 'URL da mídia anexada';
COMMENT ON COLUMN gbp_notificacoes_log.enviada IS 'Indica se a notificação foi enviada ao FCM';
COMMENT ON COLUMN gbp_notificacoes_log.entregue IS 'Indica se a notificação foi entregue ao dispositivo';
COMMENT ON COLUMN gbp_notificacoes_log.visualizada IS 'Indica se o usuário visualizou a notificação';
COMMENT ON COLUMN gbp_notificacoes_log.clicada IS 'Indica se o usuário clicou na notificação';
COMMENT ON COLUMN gbp_notificacoes_log.erro IS 'Mensagem de erro caso o envio falhe';
COMMENT ON COLUMN gbp_notificacoes_log.plataforma IS 'Plataforma do usuário (android, ios, web)';
