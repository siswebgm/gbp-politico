import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Search, Loader2, AlertCircle, FileText, Calendar, MapPin, AlertTriangle, Building2, ChevronDown } from 'lucide-react';
import * as Accordion from '@radix-ui/react-accordion';
import { getDemandasPorCpf } from '../../../services/demandasRua';
import { demandasRuasService } from '../../../services/demandasRuasService';
import { getEmpresa } from '../../../services/empresa';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ConsultarDemandas() {
  const { empresa_uid } = useParams<{ empresa_uid?: string }>();

  // Buscar dados da empresa quando o componente for montado
  useEffect(() => {
    const buscarEmpresa = async () => {
      if (!empresa_uid) return;
      
      try {
        setLoadingEmpresa(true);
        const dadosEmpresa = await getEmpresa(empresa_uid);
        if (dadosEmpresa) {
          setEmpresa({
            nome: dadosEmpresa.nome,
            logo_url: dadosEmpresa.logo_url
          });
        }
      } catch (err) {
        console.error('Erro ao buscar dados da empresa:', err);
      } finally {
        setLoadingEmpresa(false);
      }
    };

    buscarEmpresa();
  }, [empresa_uid]);
  const [cpf, setCpf] = useState('');
  const [protocolo, setProtocolo] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingEmpresa, setLoadingEmpresa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [empresa, setEmpresa] = useState<{nome: string; logo_url?: string} | null>(null);
  const [demandas, setDemandas] = useState<any[]>([]);
  const [whatsappMessages, setWhatsappMessages] = useState<Record<string, any[]>>({});
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [cpfConsultado, setCpfConsultado] = useState<string | null>(null);

  const formatarData = (data: string) => {
    try {
      return format(new Date(data), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    } catch (error) {
      return data;
    }
  };

  const formatarStatus = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      aguardando: { label: 'Aguardando', color: 'bg-yellow-100 text-yellow-800' },
      em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800' },
      concluido: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
      cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
      protocolado: { label: 'Protocolado', color: 'bg-purple-100 text-purple-800' },
      recebido: { label: 'Recebido', color: 'bg-gray-100 text-gray-800' },
      feito_oficio: { label: 'Feito Ofício', color: 'bg-blue-100 text-blue-800' },
    };
    
    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Se não tem CPF consultado, só aceita busca por CPF
    if (!cpfConsultado) {
      if (!cpf) {
        setError('Por favor, informe o CPF para consulta');
        return;
      }
      
      const cpfNumerico = cpf.replace(/\D/g, '');
      if (cpfNumerico.length !== 11) {
        setError('CPF inválido. O CPF deve conter 11 dígitos.');
        return;
      }
    } 
    // Se já tem CPF consultado, aceita busca por protocolo
    else if (protocolo) {
      const protocoloNumerico = protocolo.replace(/\D/g, '');
      if (protocoloNumerico.length === 0) {
        setError('Por favor, informe um número de protocolo válido.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    
    try {
      let demandasEncontradas = [];
      
      if (cpf) {
        const cpfNumerico = cpf.replace(/\D/g, '');
        demandasEncontradas = await getDemandasPorCpf(cpfNumerico, empresa_uid);
        
        // Armazena o CPF consultado independente de ter demandas ou não
        setCpfConsultado(cpfNumerico);
        
        if (!demandasEncontradas || demandasEncontradas.length === 0) {
          setError('Nenhuma demanda encontrada para este CPF.');
          return;
        }
      } else if (protocolo && cpfConsultado) {
        // Busca pelo protocolo apenas se já tiver um CPF consultado
        const todasDemandas = await getDemandasPorCpf(cpfConsultado, empresa_uid);
        const protocoloNumerico = protocolo.replace(/\D/g, '');
        demandasEncontradas = todasDemandas.filter((demanda: any) => 
          String(demanda.numero_protocolo).padStart(6, '0') === protocoloNumerico ||
          String(demanda.numero_protocolo) === protocoloNumerico
        );
      }
      
      setDemandas(demandasEncontradas);
      
      if (demandasEncontradas.length === 0) {
        setError('Nenhuma demanda encontrada para os critérios informados.');
      } else {
        // Carrega as mensagens do WhatsApp para as demandas encontradas
        loadWhatsappMessages(demandasEncontradas);
      }
    } catch (err) { 
      console.error('Erro ao buscar demandas:', err);
      setError('Ocorreu um erro ao buscar as demandas. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatarCPF = (value: string) => {
    // Remove tudo que não for dígito
    const cleaned = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const cpfLimpo = cleaned.slice(0, 11);
    
    // Aplica a formatação
    return cpfLimpo
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(\-\d{2})\d+?$/, '$1');
  };

  const formatarProtocolo = (value: string) => {
    // Remove tudo que não for dígito
    const cleaned = value.replace(/\D/g, '');
    
    // Limita a 6 dígitos
    return cleaned.slice(0, 6);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatarCPF(e.target.value);
    setCpf(formatted);
  };

  const handleProtocoloChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatarProtocolo(e.target.value);
    setProtocolo(formatted);
    // Limpa o CPF quando o protocolo for preenchido
    if (formatted) setCpf('');
  };

  const loadWhatsappMessages = async (demandas: any[]) => {
    setLoadingMessages(true);
    const messages: Record<string, any[]> = {};
    for (const demanda of demandas) {
      try {
        const msgs = await demandasRuasService.getWhatsappMessages(demanda.uid);
        messages[demanda.uid] = msgs;
      } catch (error) {
        console.error(`Erro ao buscar mensagens para a demanda ${demanda.uid}:`, error);
        messages[demanda.uid] = [];
      }
    }
    setWhatsappMessages(messages);
    setLoadingMessages(false);
  };

  const handleCpfInputClick = () => {
    // Limpa o protocolo quando o CPF for preenchido
    if (cpf) setProtocolo('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner da Empresa */}
      {empresa_uid && (
        <div className="bg-white shadow-sm w-full">
          <div className="max-w-4xl mx-auto w-full py-3 px-4 sm:px-6 lg:px-8">
            {loadingEmpresa ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="animate-spin h-5 w-5 text-gray-500" />
                <span className="ml-2 text-gray-700">Carregando informações da empresa...</span>
              </div>
            ) : empresa ? (
              <div className="flex items-center">
                {empresa.logo_url ? (
                  <img 
                    src={empresa.logo_url} 
                    alt={`Logo ${empresa.nome}`} 
                    className="h-10 w-auto mr-3"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-medium text-gray-900">{empresa.nome}</h2>
                  <p className="text-sm text-gray-500">Acompanhamento de Demandas</p>
                </div>
              </div>
            ) : (
              <div className="py-2">
                <h2 className="text-lg font-medium text-gray-900">Consultar Minhas Demandas</h2>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">

        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!cpfConsultado ? (
              // Primeiro passo: Buscar por CPF
              <>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Consulte suas Demandas</h2>
                  <p className="text-sm text-gray-500 mt-1">Para começar, digite seu CPF abaixo.</p>
                </div>

                <div className="mt-4">
                  <label htmlFor="cpf" className="sr-only">CPF</label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                      type="text"
                      name="cpf"
                      id="cpf"
                      value={cpf}
                      onChange={handleCpfChange}
                      placeholder="Digite seu CPF"
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-3 border"
                    />
                  </div>
                </div>
              </>
            ) : (
              // Segundo passo: Filtro por protocolo (após buscar por CPF)
              <>
                

                <div className="mb-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">
                    CPF consultado: <span className="font-medium">{cpfConsultado.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</span>
                    <button 
                      type="button" 
                      onClick={() => {
                        setCpf('');
                        setCpfConsultado(null);
                        setDemandas([]);
                        setProtocolo('');
                      }}
                      className="ml-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      (alterar)
                    </button>
                  </p>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  Filtre por número de protocolo (opcional)
                </p>
                
                <div>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FileText className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                      type="text"
                      name="protocolo"
                      id="protocolo"
                      value={protocolo}
                      onChange={handleProtocoloChange}
                      placeholder="Digite o número do protocolo"
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-10 sm:text-sm border-gray-300 rounded-md py-2 border"
                    />
                    {protocolo && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            setProtocolo('');
                            setError(null);
                            // Força uma nova busca sem o filtro de protocolo, usando o CPF já consultado
                            if (cpfConsultado) {
                              try {
                                setLoading(true);
                                const demandasAtualizadas = await getDemandasPorCpf(cpfConsultado, empresa_uid);
                                setDemandas(demandasAtualizadas);
                              } catch (err) {
                                console.error('Erro ao buscar demandas:', err);
                                setError('Ocorreu um erro ao recarregar as demandas. Por favor, tente novamente.');
                              } finally {
                                setLoading(false);
                              }
                            }
                          }}
                          className="text-gray-400 hover:text-gray-500 focus:outline-none"
                        >
                          <span className="sr-only">Limpar filtro</span>
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Deixe em branco para ver todas as demandas</p>
                </div>
              </>
            )}

            <div className="flex flex-col sm:flex-row sm:justify-end gap-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-48 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Buscando...
                  </>
                ) : (
                  'Buscar Demandas'
                )}
              </button>

              {cpfConsultado && (
                <Link
                  to={`/demanda/${empresa_uid}?cpf=${cpfConsultado}`}
                  className="w-full sm:w-48 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Nova Demanda
                </Link>
              )}
            </div>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}
        </div>

        {demandas.length > 0 && (
          <Accordion.Root type="single" collapsible className="w-full space-y-4">
            <h2 className="text-lg font-medium text-gray-900">
              {demandas.length} {demandas.length === 1 ? 'demanda encontrada' : 'demandas encontradas'}
            </h2>

            {demandas.map((demanda) => (
              <Accordion.Item key={demanda.uid} value={demanda.uid} className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                <Accordion.Trigger className="w-full text-left px-4 py-5 sm:px-6 w-full flex justify-between items-center group">
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {demanda.tipo_de_demanda.split('::')[0]}
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {demanda.tipo_de_demanda.split('::')[1] || demanda.tipo_de_demanda}
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                      Protocolo: {String(demanda.numero_protocolo).padStart(6, '0')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    {formatarStatus(demanda.status)}
                    <ChevronDown className="h-5 w-5 text-gray-400 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                  </div>
                </Accordion.Trigger>
                <Accordion.Content className="overflow-hidden transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <div className="border-t border-gray-200">
                    {(whatsappMessages[demanda.uid] || loadingMessages) && (
                      <div className="bg-green-50 px-4 py-3">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 pt-0.5">
                            <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="ml-3 flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-green-800 mb-2">Respostas</h3>
                            {loadingMessages ? (
                              <div className="flex items-center text-sm text-green-700">
                                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                Carregando respostas...
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {whatsappMessages[demanda.uid]?.map((msg, index) => (
                                  <div key={index} className="bg-white/50 p-3 rounded-md border border-green-100">
                                    <p className="text-sm text-green-800 whitespace-pre-wrap break-words">
                                      {msg.mensagem}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Enviado em: {formatarData(msg.data_envio)} por {msg.usuario_nome || 'Sistema'}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {demanda.documento_protocolado && (
                      <div className="bg-blue-50 px-4 py-3 border-t border-blue-100">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 pt-0.5">
                            <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">Documento Protocolado</h3>
                            <div className="mt-1">
                              <a 
                                href={demanda.documento_protocolado} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Visualizar documento
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                    <dl className="sm:divide-y sm:divide-gray-200">
                      <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          Data de abertura
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          {formatarData(demanda.criado_em)}
                        </dd>
                      </div>
                      <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                          Endereço
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          {demanda.logradouro}, {demanda.numero || 'S/N'}
                          <br />
                          {demanda.bairro} - {demanda.cidade}/{demanda.uf}
                          <br />
                          CEP: {demanda.cep}
                          {demanda.referencia && (
                            <>
                              <br />
                              <span className="text-gray-500">Referência: {demanda.referencia}</span>
                            </>
                          )}
                        </dd>
                      </div>
                      <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500 flex items-start">
                          <FileText className="h-4 w-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
                          Descrição
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                          {demanda.descricao_do_problema}
                        </dd>
                      </div>
                      
                      {demanda.anexar_boletim_de_correncia && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-t border-gray-200">
                          <dt className="text-sm font-medium text-gray-500 flex items-start">
                            <FileText className="h-4 w-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
                            Boletim de Ocorrência
                          </dt>
                          <dd className="mt-1 text-sm text-blue-600 hover:text-blue-800 sm:mt-0 sm:col-span-2">
                            <a 
                              href={demanda.anexar_boletim_de_correncia} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center hover:underline"
                            >
                              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              Visualizar boletim de ocorrência
                            </a>
                          </dd>
                        </div>
                      )}
                      
                      {demanda.fotos_do_problema && demanda.fotos_do_problema.length > 0 && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-t border-gray-200">
                          <dt className="text-sm font-medium text-gray-500 flex items-start">
                            <svg className="h-4 w-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Fotos do Problema
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <div className="grid grid-cols-2 gap-4 mt-2">
                              {demanda.fotos_do_problema.map((foto: string, index: number) => (
                                <a 
                                  key={index} 
                                  href={foto} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="block group"
                                >
                                  <img 
                                    src={foto} 
                                    alt={`Foto do problema ${index + 1}`} 
                                    className="w-full h-32 object-cover rounded-md group-hover:opacity-90 transition-opacity"
                                  />
                                </a>
                              ))}
                            </div>
                          </dd>
                        </div>
                      )}
                      
                      {demanda.link_da_demanda && (
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-t border-gray-200">
                          <dt className="text-sm font-medium text-gray-500 flex items-start">
                            <svg className="h-4 w-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            Link da Demanda
                          </dt>
                          <dd className="mt-1 text-sm text-blue-600 hover:text-blue-800 sm:mt-0 sm:col-span-2">
                            <a 
                              href={demanda.link_da_demanda} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:underline break-all"
                            >
                              {demanda.link_da_demanda}
                            </a>
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        )}
        </div>
      </div>
    </div>
  );
}

export default ConsultarDemandas;
