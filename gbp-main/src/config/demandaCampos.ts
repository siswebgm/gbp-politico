// Configuração dos campos do formulário público de demanda (/demanda/:empresa_uid)
// Usado tanto na tela de configurações (admin) quanto no formulário público.

export interface CampoDemandaConfig {
  id: string;
  label: string;
  secao: 'requerente' | 'endereco' | 'demanda' | 'anexos';
}

export const SECOES_CAMPOS: Record<CampoDemandaConfig['secao'], string> = {
  requerente: 'Dados do Requerente',
  endereco: 'Endereço do Problema',
  demanda: 'Detalhes da Demanda',
  anexos: 'Fotos e Termos',
};

export const CAMPOS_DEMANDA: CampoDemandaConfig[] = [
  // Requerente
  { id: 'requerente_cpf', label: 'CPF', secao: 'requerente' },
  { id: 'requerente_nome', label: 'Nome Completo', secao: 'requerente' },
  { id: 'requerente_whatsapp', label: 'WhatsApp', secao: 'requerente' },
  { id: 'requerente_data_nascimento', label: 'Data de Nascimento', secao: 'requerente' },
  { id: 'genero', label: 'Gênero', secao: 'requerente' },
  // Endereço
  { id: 'cep', label: 'CEP', secao: 'endereco' },
  { id: 'logradouro', label: 'Logradouro', secao: 'endereco' },
  { id: 'numero', label: 'Número', secao: 'endereco' },
  { id: 'bairro', label: 'Bairro', secao: 'endereco' },
  { id: 'referencia', label: 'Referência', secao: 'endereco' },
  { id: 'cidade', label: 'Cidade', secao: 'endereco' },
  { id: 'uf', label: 'UF', secao: 'endereco' },
  // Detalhes da demanda
  { id: 'tipo_de_demanda', label: 'Tipo de Demanda', secao: 'demanda' },
  { id: 'nivel_de_urgencia', label: 'Nível de Urgência', secao: 'demanda' },
  { id: 'indicado', label: 'Indicado (quem indicou)', secao: 'demanda' },
  { id: 'link_da_demanda', label: 'Link da Demanda (redes sociais)', secao: 'demanda' },
  { id: 'descricao_do_problema', label: 'Descrição Detalhada', secao: 'demanda' },
  // Anexos e termos
  { id: 'fotos', label: 'Fotos do Problema', secao: 'anexos' },
  { id: 'aceite_termos', label: 'Aceite de Termos de Uso', secao: 'anexos' },
];

export interface CampoConfig {
  visivel: boolean;
  obrigatorio: boolean;
}

export type CamposConfigDemanda = Record<string, CampoConfig>;

// Configuração de personalização visual do formulário público
export interface CabecalhoConfig {
  titulo: string;
  subtitulo: string;
  descricao: string;
  corCabecalho: string;
  corTexto: string;
  corSubtitulo: string;
  corTitulo: string;
  corDescricao: string;
  logoUrl: string | null;
  corFundo: string;
  corBotao: string;
  corBotaoTexto: string;
}

// Retorna a configuração padrão do cabeçalho
export function getCabecalhoConfigPadrao(): CabecalhoConfig {
  return {
    titulo: 'Formulário de Demanda',
    subtitulo: '',
    descricao: 'Registre ou consulte sua demanda',
    corCabecalho: '#1976d2',
    corTexto: '#1e3a8a',
    corSubtitulo: '#1e3a8a',
    corTitulo: '#1e3a8a',
    corDescricao: '#64748b',
    logoUrl: null,
    corFundo: '#ffffff',
    corBotao: '#1976d2',
    corBotaoTexto: '#ffffff'
  };
}

// Mescla a configuração salva com o padrão
export function mergeCabecalhoConfig(salvo?: CabecalhoConfig | null): CabecalhoConfig {
  const padrao = getCabecalhoConfigPadrao();
  if (!salvo || typeof salvo !== 'object') return padrao;
  return {
    titulo: salvo.titulo || padrao.titulo,
    subtitulo: salvo.subtitulo || padrao.subtitulo,
    descricao: salvo.descricao || padrao.descricao,
    corCabecalho: salvo.corCabecalho || padrao.corCabecalho,
    corTexto: salvo.corTexto || padrao.corTexto,
    corSubtitulo: salvo.corSubtitulo || padrao.corSubtitulo,
    corTitulo: salvo.corTitulo || padrao.corTitulo,
    corDescricao: salvo.corDescricao || padrao.corDescricao,
    logoUrl: salvo.logoUrl || padrao.logoUrl,
    corFundo: salvo.corFundo || padrao.corFundo,
    corBotao: salvo.corBotao || padrao.corBotao,
    corBotaoTexto: salvo.corBotaoTexto || padrao.corBotaoTexto
  };
}

// Retorna a configuração padrão: todos os campos visíveis e obrigatórios
export function getCamposConfigPadrao(): CamposConfigDemanda {
  const config: CamposConfigDemanda = {};
  CAMPOS_DEMANDA.forEach((campo) => {
    config[campo.id] = { visivel: true, obrigatorio: true };
  });
  return config;
}

// Mescla a configuração salva com o padrão (campos ausentes = visível e obrigatório)
export function mergeCamposConfig(salvo?: CamposConfigDemanda | null): CamposConfigDemanda {
  const padrao = getCamposConfigPadrao();
  if (!salvo || typeof salvo !== 'object') return padrao;
  const resultado = { ...padrao };
  CAMPOS_DEMANDA.forEach((campo) => {
    const salvoCampo = salvo[campo.id];
    if (salvoCampo && typeof salvoCampo === 'object') {
      resultado[campo.id] = {
        visivel: typeof salvoCampo.visivel === 'boolean' ? salvoCampo.visivel : true,
        obrigatorio: typeof salvoCampo.obrigatorio === 'boolean' ? salvoCampo.obrigatorio : true,
      };
    }
  });
  return resultado;
}
