-- Consulta completa de todas as colunas da tabela gbp_demandas_ruas
-- para a empresa específica
SELECT 
    uid,
    empresa_uid,
    tipo_de_demanda,
    descricao_do_problema,
    nivel_de_urgencia,
    logradouro,
    numero,
    bairro,
    cidade,
    uf,
    cep,
    referencia,
    boletim_ocorrencia,
    link_da_demanda,
    fotos_do_problema,
    status,
    observacoes,
    criado_em,
    atualizado_em,
    aceite_termos,
    anexar_boletim_de_correncia,
    numero_protocolo,
    requerente_uid,
    documento_protocolado,
    observação_resposta,
    favorito,
    demanda_concluida,
    demanda_concluida_data
FROM 
    public.gbp_demandas_ruas
WHERE 
    empresa_uid = '9475af96-553b-4a90-accb-39d46aedc6ce'
ORDER BY 
    criado_em DESC;

-- Contagem de registros por status
SELECT 
    status,
    COUNT(*) AS quantidade,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentual
FROM 
    public.gbp_demandas_ruas
WHERE 
    empresa_uid = '9475af96-553b-4a90-accb-39d46aedc6ce'
GROUP BY 
    status
ORDER BY 
    quantidade DESC;
