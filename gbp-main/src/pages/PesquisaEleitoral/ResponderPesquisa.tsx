import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { Star, Check, X, ArrowLeft, Loader2 } from 'lucide-react';
import { supabaseClient } from '../../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OpcaoPergunta {
  id: string;
  texto: string;
  ordem?: number;
}

interface Pergunta {
  uid: string;
  pergunta: string;
  tipo_resposta: 'estrelas' | 'nota' | 'votacao' | 'enquete' | 'texto' | 'escolha_unica';
  opcoes?: OpcaoPergunta[];
  multipla_escolha?: boolean;
  obrigatoria: boolean;
  ordem: number;
  permite_comentario?: boolean;
  comentario?: string;
}

interface Candidato {
  uid: string;
  nome: string;
  partido: string | null;
  foto_url: string | null;
  cargo: string | null;
  numero?: string | null;
}

interface Resposta {
  perguntaId: string;
  candidatoId?: string;
  valor: string | number | boolean | string[] | null;
}

interface DadoParticipanteConfig {
  visivel: boolean;
  obrigatorio: boolean;
  ativo?: boolean; // Adicionado para compatibilidade
}

interface DadosParticipante {
  [key: string]: DadoParticipanteConfig | undefined;
  nome?: DadoParticipanteConfig;
  faixaEtaria?: DadoParticipanteConfig;
  telefone?: DadoParticipanteConfig;
  cep?: DadoParticipanteConfig;
  cidade?: DadoParticipanteConfig;
  bairro?: DadoParticipanteConfig;
  numero?: DadoParticipanteConfig;
  complemento?: DadoParticipanteConfig;
  observacoes?: DadoParticipanteConfig;
}

interface NotificacaoWhatsApp {
  ativo: boolean;
  mensagem?: string;
}

interface Pesquisa {
  uid: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string | null;
  ativa: boolean;
  dados_participante: DadosParticipante;
  notificacao_whatsapp?: NotificacaoWhatsApp;
  created_at: string;
  updated_at: string;
}

// Removido tipo não utilizado

export function ResponderPesquisa() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [perguntasComErro, setPerguntasComErro] = useState<Set<string>>(new Set());
  const [pesquisa, setPesquisa] = useState<Pesquisa | null>(null);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  
  // Dados do participante
  const [opiniaoSincera, setOpiniaoSincera] = useState('');
  const [nome, setNome] = useState('');
  const [faixaEtaria, setFaixaEtaria] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cep, setCep] = useState('');
  const [cidade, setCidade] = useState('');
  const [bairro, setBairro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  // Função para formatar o telefone no formato (00) 0 0000-0000
  const formatarTelefone = (value: string) => {
    // Remove tudo que não for dígito
    const numeros = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos (tamanho máximo para celular com DDD)
    const numerosLimitados = numeros.slice(0, 11);
    
    // Aplica a formatação com base no tamanho
    if (numerosLimitados.length <= 2) {
      return numerosLimitados;
    } else if (numerosLimitados.length <= 6) {
      return `(${numerosLimitados.slice(0, 2)}) ${numerosLimitados.slice(2)}`;
    } else if (numerosLimitados.length <= 10) {
      return `(${numerosLimitados.slice(0, 2)}) ${numerosLimitados[2]} ${numerosLimitados.slice(3, 10)}`;
    } else {
      return `(${numerosLimitados.slice(0, 2)}) ${numerosLimitados[2]} ${numerosLimitados.slice(3, 7)}-${numerosLimitados.slice(7, 11)}`;
    }
  };

  // Manipulador para o campo de telefone
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarTelefone(e.target.value);
    setTelefone(valorFormatado);
  };

  // Estado para controlar o carregamento do CEP
  const [buscandoCep, setBuscandoCep] = useState(false);
  
  // Estado para armazenar os dados completos do endereço
  const [enderecoCompleto, setEnderecoCompleto] = useState<{
    cep: string;
    logradouro: string;
    bairro: string;
    cidade: string;
    estado: string;
    latitude: string;
    longitude: string;
  } | null>(null);

  // Função para buscar endereço pelo CEP
  const buscarEnderecoPorCep = async (cepDigitado: string) => {
    // Remove caracteres não numéricos
    const cepLimpo = cepDigitado.replace(/\D/g, '');
    
    // Verifica se o CEP tem 8 dígitos
    if (cepLimpo.length !== 8) return;
    
    setBuscandoCep(true);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        // Tenta obter as coordenadas geográficas
        let latitude = '';
        let longitude = '';
        
        try {
          const geoResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${data.localidade},${data.uf},Brasil&limit=1`
          );
          const geoData = await geoResponse.json();
          
          if (geoData && geoData.length > 0) {
            latitude = geoData[0].lat;
            longitude = geoData[0].lon;
          }
        } catch (geoError) {
          console.error('Erro ao buscar coordenadas:', geoError);
        }
        
        // Atualiza os campos do formulário
        if (data.bairro) setBairro(data.bairro);
        if (data.localidade) setCidade(data.localidade);
        
        // Cria o objeto com os dados completos do endereço
        const endereco = {
          cep: cepLimpo,
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
          latitude,
          longitude
        };
        
        setEnderecoCompleto(endereco);
        return endereco;
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Não foi possível buscar o endereço. Por favor, preencha manualmente.');
    } finally {
      setBuscandoCep(false);
    }
    
    return null;
  };
  
  // Manipulador para o campo de CEP
  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    // Aplica a máscara de CEP (99999-999)
    const valorFormatado = valor.replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1');
    
    setCep(valorFormatado);
    
    // Se o CEP estiver completo (8 dígitos), busca o endereço
    if (valorFormatado.length === 9) { // 8 dígitos + hífen
      buscarEnderecoPorCep(valorFormatado)
        .then(endereco => {
          if (endereco) {
            toast.success('Endereço encontrado com sucesso!');
          }
        });
    }
  };

  // Verificar se o usuário já respondeu a pesquisa
  useEffect(() => {
    const verificarResposta = async () => {
      try {
        await supabaseClient
          .from('ps_gbp_respostas')
          .select('id')
          .eq('pesquisa_uid', id)
          .single();
      } catch (error) {
        console.error('Erro ao verificar resposta:', error);
      }
    };
    
    if (id) {
      verificarResposta();
    }
  }, [id]);

  // Log para verificar a configuração do campo de observações
  useEffect(() => {
    if (pesquisa) {
      console.log('Configuração do campo observações:', pesquisa.dados_participante.observacoes);
      console.log('Todos os campos de dados do participante:', Object.keys(pesquisa.dados_participante));
    }
  }, [pesquisa]);

  // Carregar dados da pesquisa
  useEffect(() => {
    if (!id) return;

    const carregarPesquisa = async () => {
      try {
        setLoading(true);
        setErro(null);

        console.log('Iniciando carregamento da pesquisa:', id);

        // Carregar dados da pesquisa
        const { data: pesquisaCarregada, error: pesquisaError } = await supabaseClient
          .from('ps_gbp_pesquisas')
          .select('*')
          .eq('uid', id)
          .single();

        console.log('Dados da pesquisa carregados:', pesquisaCarregada);
        console.log('Erro ao carregar pesquisa:', pesquisaError);

        if (pesquisaError) {
          console.error('Erro ao carregar pesquisa:', pesquisaError);
          throw new Error('Erro ao carregar os dados da pesquisa');
        }

        if (!pesquisaCarregada) {
          setErro('Pesquisa não encontrada');
          setLoading(false);
          return;
        }

        // Verificar se a pesquisa está ativa
        if (!pesquisaCarregada.ativa) {
          setErro('Esta pesquisa não está mais ativa');
          setLoading(false);
          return;
        }

        // Verificar datas da pesquisa
        const hoje = new Date();
        const dataInicio = new Date(pesquisaCarregada.data_inicio);
        const dataFim = pesquisaCarregada.data_fim ? new Date(pesquisaCarregada.data_fim) : null;

        console.log('Datas da pesquisa:', {
          hoje,
          dataInicio,
          dataFim,
          dataInicioStr: pesquisaCarregada.data_inicio,
          dataFimStr: pesquisaCarregada.data_fim
        });

        if (hoje < dataInicio) {
          const mensagem = `Esta pesquisa estará disponível a partir de ${format(dataInicio, 'dd/MM/yyyy \à\s HH:mm')}`;
          console.log(mensagem);
          setErro(mensagem);
          setLoading(false);
          return;
        }

        if (dataFim && hoje > dataFim) {
          const mensagem = `O prazo para responder esta pesquisa encerrou em ${format(dataFim, 'dd/MM/yyyy \à\s HH:mm')}`;
          console.log(mensagem);
          setErro(mensagem);
          setLoading(false);
          return;
        }

        // Processar dados_participante se for uma string JSON
        const dadosProcessados = {
          ...pesquisaCarregada,
          dados_participante: (() => {
            try {
              const dados = typeof pesquisaCarregada.dados_participante === 'string' 
                ? JSON.parse(pesquisaCarregada.dados_participante) 
                : (pesquisaCarregada.dados_participante || {});
              
              // Converter 'ativo' para 'visivel' se necessário
              const converterCampos = (obj: Record<string, any>): DadosParticipante => {
                if (!obj) return {};
                const result: DadosParticipante = {};
                
                // Campos padrão que devem existir
                const camposPadrao: Record<string, DadoParticipanteConfig> = {
                  observacoes: {
                    visivel: true,
                    obrigatorio: false,
                    ativo: true
                  }
                };
                
                // Adicionar campos existentes
                for (const [key, value] of Object.entries(obj)) {
                  if (value && typeof value === 'object') {
                    const config: DadoParticipanteConfig = {
                      visivel: value.visivel !== undefined ? value.visivel : value.ativo,
                      obrigatorio: value.obrigatorio || false,
                      ativo: value.ativo
                    };
                    result[key] = config;
                  }
                }
                
                // Garantir que os campos padrão existam
                for (const [key, config] of Object.entries(camposPadrao)) {
                  if (!result[key]) {
                    result[key] = config;
                  }
                }
                
                return result;
              };
              
              return converterCampos(dados);
            } catch (error) {
              console.error('Erro ao processar dados do participante:', error);
              return {};
            }
          })()
        };
        
        console.log('Dados do participante processados:', dadosProcessados.dados_participante);
        setPesquisa(dadosProcessados);

        // Carregar perguntas da pesquisa
        const { data: perguntasData, error: perguntasError } = await supabaseClient
          .from('ps_gbp_perguntas')
          .select('*')
          .eq('pesquisa_uid', id)
          .order('ordem', { ascending: true });

        if (perguntasError) throw perguntasError;

        console.log('Perguntas carregadas:', perguntasData);

        // Processar opções das perguntas
        const perguntasProcessadas = (perguntasData || []).map(pergunta => {
          // Processar opcoes_enquete ou opcoes, dependendo do que estiver disponível
          let opcoes = [];
          
          // Verificar se existe opcoes_enquete (formato JSONB)
          if (pergunta.opcoes_enquete) {
            try {
              opcoes = Array.isArray(pergunta.opcoes_enquete) 
                ? pergunta.opcoes_enquete 
                : (typeof pergunta.opcoes_enquete === 'string' 
                    ? JSON.parse(pergunta.opcoes_enquete) 
                    : []);
            } catch (e) {
              console.error('Erro ao processar opções da enquete:', e);
              opcoes = [];
            }
          } 
          // Se não tiver opcoes_enquete, verificar o campo opcoes (JSONB)
          else if (pergunta.opcoes) {
            try {
              opcoes = Array.isArray(pergunta.opcoes)
                ? pergunta.opcoes
                : (typeof pergunta.opcoes === 'string'
                    ? JSON.parse(pergunta.opcoes)
                    : []);
            } catch (e) {
              console.error('Erro ao processar opções da pergunta:', e);
              opcoes = [];
            }
          }

          // Garantir que as opções tenham o formato correto
          const opcoesFormatadas = opcoes.map((op: any, index: number) => ({
            id: op.id || `opcao-${index}`,
            texto: op.texto || op || `Opção ${index + 1}`,
            ordem: op.ordem || index
          }));

          return {
            ...pergunta,
            opcoes: opcoesFormatadas,
            multipla_escolha: pergunta.multipla_escolha || false,
            obrigatoria: pergunta.obrigatoria !== false, // Padrão para true se não definido
            tipo_resposta: pergunta.tipo_resposta || 'texto', // Valor padrão caso não tenha
            permite_comentario: pergunta.permite_comentario === true, // Garantir que é booleano
            comentario: '' // Inicializar campo de comentário vazio
          };
        });

        console.log('Perguntas processadas:', perguntasProcessadas);
        setPerguntas(perguntasProcessadas);

        // Carregar candidatos, se necessário
        const temPerguntasComCandidatos = perguntasProcessadas.some(p => 
          ['estrelas', 'nota', 'votacao'].includes(p.tipo_resposta)
        );

        if (temPerguntasComCandidatos) {
          const { data: candidatosData, error: candidatosError } = await supabaseClient
            .from('ps_gbp_candidatos')
            .select('*')
            .or(`pesquisa_uid.eq.${id},pesquisa_uid.is.null`)
            .eq('empresa_uid', pesquisaCarregada.empresa_uid);

          if (candidatosError) throw candidatosError;
          setCandidatos(candidatosData || []);
        } else {
          setCandidatos([]);
        }

        // Inicializar respostas vazias
        const respostasIniciais: Resposta[] = [];
        
        // Se houver candidatos, criar respostas para cada pergunta por candidato
        if (candidatos.length > 0) {
          candidatos.forEach(candidato => {
            perguntasProcessadas.forEach(pergunta => {
              // Definir valor padrão com base no tipo de pergunta
              let valorPadrao: any = null;
              
              switch (pergunta.tipo_resposta) {
                case 'votacao':
                  valorPadrao = null;
                  break;
                case 'enquete':
                  valorPadrao = pergunta.multipla_escolha ? [] : null;
                  break;
                case 'nota':
                case 'estrelas':
                  valorPadrao = 0;
                  break;
                case 'escolha_unica':
                  valorPadrao = null;
                  break;
                case 'texto':
                default:
                  valorPadrao = '';
                  break;
              }
              
              respostasIniciais.push({
                perguntaId: pergunta.uid,
                candidatoId: candidato.uid,
                valor: valorPadrao
              });
            });
          });
        } else {
          // Se não houver candidatos, criar respostas apenas para as perguntas
          perguntasProcessadas.forEach(pergunta => {
            // Definir valor padrão com base no tipo de pergunta
            let valorPadrao: any = null;
            
            switch (pergunta.tipo_resposta) {
              case 'votacao':
                valorPadrao = null;
                break;
              case 'enquete':
                valorPadrao = pergunta.multipla_escolha ? [] : null;
                break;
              case 'nota':
              case 'estrelas':
                valorPadrao = 0;
                break;
              case 'escolha_unica':
                valorPadrao = null;
                break;
              case 'texto':
              default:
                valorPadrao = '';
                break;
            }
            
            respostasIniciais.push({
              perguntaId: pergunta.uid,
              valor: valorPadrao
            });
          });
        }
        
        console.log('Respostas iniciais:', respostasIniciais);
        setRespostas(respostasIniciais);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar pesquisa:', error);
        let mensagemErro = 'Erro ao carregar a pesquisa. Por favor, tente novamente.';
        
        if (error instanceof Error) {
          console.error('Detalhes do erro:', {
            message: error.message,
            name: error.name,
            stack: error.stack
          });
          
          if (error.message.includes('JWT')) {
            mensagemErro = 'Erro de autenticação. Por favor, verifique sua conexão.';
          } else if (error.message.includes('network')) {
            mensagemErro = 'Erro de conexão. Verifique sua internet e tente novamente.';
          }
        }
        
        setErro(mensagemErro);
      } finally {
        setLoading(false);
      }
    };

    carregarPesquisa();
  }, [id]);

  const handleComentarioChange = (perguntaId: string, comentario: string, candidatoId?: string) => {
    setRespostas(prev => {
      // Encontrar a resposta existente
      const respostaExistente = prev.find(r => 
        r.perguntaId === perguntaId && 
        (candidatoId ? r.candidatoId === candidatoId : !r.candidatoId)
      );

      if (respostaExistente) {
        // Atualizar a resposta existente
        return prev.map(r => 
          r.perguntaId === perguntaId && 
          (candidatoId ? r.candidatoId === candidatoId : !r.candidatoId)
            ? { ...r, comentario }
            : r
        );
      }
      
      // Se não existir, adicionar nova resposta
      return [
        ...prev,
        {
          perguntaId,
          ...(candidatoId && { candidatoId }),
          valor: null,
          comentario
        }
      ];
    });
  };
  
  // Função auxiliar para renderizar o campo de comentário
  const renderComentarioField = (pergunta: Pergunta, candidatoId?: string) => {
    if (!pergunta.permite_comentario) return null;
    
    const inputId = `comentario-${pergunta.uid}${candidatoId ? `-${candidatoId}` : ''}`;
    
    // Encontrar a resposta correspondente para obter o comentário
    const resposta = respostas.find(r => 
      r.perguntaId === pergunta.uid && 
      (candidatoId ? r.candidatoId === candidatoId : !r.candidatoId)
    );
    
    const valorComentario = resposta?.comentario || '';
    
    return (
      <div className="mt-4">
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Comentário (opcional)
        </label>
        <textarea
          id={inputId}
          value={valorComentario}
          onChange={(e) => handleComentarioChange(pergunta.uid, e.target.value, candidatoId)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          rows={3}
          placeholder="Adicione um comentário (opcional)"
        />
      </div>
    );
  };

  const handleResposta = (perguntaId: string, valor: string | number | boolean | string[], candidatoId: string | undefined = undefined) => {
    setRespostas(prev => {
      // Encontrar a pergunta para verificar o tipo
      const pergunta = perguntas.find(p => p.uid === perguntaId);
      const isEnqueteMultipla = pergunta?.tipo_resposta === 'enquete' && pergunta.multipla_escolha;
      const isVotacao = pergunta?.tipo_resposta === 'votacao';
      
      // Encontrar a resposta existente
      const respostaExistente = prev.find(r => 
        r.perguntaId === perguntaId && 
        (candidatoId ? r.candidatoId === candidatoId : !r.candidatoId)
      );
      
      // Para enquetes de múltipla escolha
      if (isEnqueteMultipla) {
        const valoresAtuais = respostaExistente?.valor || [];
        const valorAtual = Array.isArray(valoresAtuais) ? valoresAtuais : [];
        
        // Garantir que o valor é uma string para comparação
        const valorStr = String(valor);
        
        const novoValor = valorAtual.includes(valorStr)
          ? valorAtual.filter((v: string) => v !== valorStr) // Remove se já existir
          : [...valorAtual, valorStr]; // Adiciona se não existir
          
        if (respostaExistente) {
          return prev.map(r => 
            r.perguntaId === perguntaId && 
            (candidatoId ? r.candidatoId === candidatoId : !r.candidatoId)
              ? { ...r, valor: novoValor }
              : r
          );
        }
        
        return [...prev, { 
          perguntaId, 
          ...(candidatoId && { candidatoId }),
          valor: novoValor 
        }];
      } 
      // Para votações Sim/Não
      else if (isVotacao) {
        // Garantir que o valor seja um booleano
        const valorBooleano = valor === 'true' || valor === true;
        
        if (respostaExistente) {
          // Se clicar na mesma opção novamente, desmarca (opcional)
          const novoValor = respostaExistente.valor === valorBooleano ? null : valorBooleano;
          
          return prev.map(r => 
            r.perguntaId === perguntaId && 
            (candidatoId ? r.candidatoId === candidatoId : !r.candidatoId)
              ? { ...r, valor: novoValor }
              : r
          );
        }
        
        return [...prev, { 
          perguntaId, 
          ...(candidatoId && { candidatoId }),
          valor: valorBooleano 
        }];
      }
      // Para outros tipos de pergunta, substitui o valor diretamente
      else {
        // Converter para o tipo apropriado com base no tipo de pergunta
        let valorConvertido = valor;
        
        // Se for uma pergunta de nota, garantir que é um número
        if (pergunta?.tipo_resposta === 'nota' && typeof valor === 'string') {
          valorConvertido = parseInt(valor, 10) || 0;
        }
        
        if (respostaExistente) {
          return prev.map(r => 
            r.perguntaId === perguntaId && 
            (candidatoId ? r.candidatoId === candidatoId : !r.candidatoId)
              ? { ...r, valor: valorConvertido }
              : r
          );
        }
        
        return [...prev, { 
          perguntaId, 
          ...(candidatoId && { candidatoId }),
          valor: valorConvertido 
        }];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErro(null);
    
    // A opinião sincera será adicionada diretamente no objeto de envio
    // Não precisamos mais adicioná-la ao estado de respostas
    
    // Array para armazenar mensagens de erro
    const erros: string[] = [];
    
    // Validar dados do participante com base em dados_participante
    if (!pesquisa) {
      setErro('Pesquisa não encontrada');
      setSubmitting(false);
      return;
    }
    
    // Type assertion to ensure TypeScript knows pesquisa is not null after the check
    const pesquisaAtual = pesquisa as Pesquisa;
    const dadosParticipante = pesquisaAtual.dados_participante || {};
    
    if (dadosParticipante.nome?.obrigatorio && !nome?.trim()) {
      erros.push('• Nome é obrigatório');
    }
    
    if (dadosParticipante.faixaEtaria?.obrigatorio && !faixaEtaria?.trim()) {
      erros.push('• Faixa etária é obrigatória');
    }
    
    if (dadosParticipante.telefone?.obrigatorio && !telefone?.trim()) {
      erros.push('• Telefone é obrigatório');
    }
    
    if (dadosParticipante.cep?.obrigatorio && !cep?.trim()) {
      erros.push('• CEP é obrigatório');
    }
    
    if (dadosParticipante.cidade?.obrigatorio && !cidade?.trim()) {
      erros.push('• Cidade é obrigatória');
    }
    
    if (dadosParticipante.bairro?.obrigatorio && !bairro?.trim()) {
      erros.push('• Bairro é obrigatório');
    }
    
    if (dadosParticipante.numero?.obrigatorio && !numero?.trim()) {
      erros.push('• Número é obrigatório');
    }
    
    // Verificar se todas as perguntas obrigatórias foram respondidas
    const perguntasObrigatorias = perguntas.filter(p => p.obrigatoria);
    
    for (const pergunta of perguntasObrigatorias) {
      // Para perguntas com candidatos, verificar cada candidato
      if (candidatos.length > 0) {
        for (const candidato of candidatos) {
          const resposta = respostas.find(r => 
            r.perguntaId === pergunta.uid && 
            r.candidatoId === candidato.uid
          );
          
          const valorResposta = resposta?.valor;
          if (!resposta || 
              valorResposta === null || 
              valorResposta === '' || 
              (Array.isArray(valorResposta) && valorResposta.length === 0) ||
              (typeof valorResposta === 'number' && isNaN(valorResposta))) {
            erros.push(`• "${pergunta.pergunta}" sobre ${candidato.nome}`);
          }
        }
      } 
      // Para perguntas sem candidatos
      else {
        const resposta = respostas.find(r => 
          r.perguntaId === pergunta.uid && 
          !r.candidatoId
        );
        const valorResposta = resposta?.valor;
        if (!resposta || 
            valorResposta === null || 
            valorResposta === '' || 
            (Array.isArray(valorResposta) && valorResposta.length === 0) ||
            (typeof valorResposta === 'number' && isNaN(valorResposta))) {
          erros.push(`• "${pergunta.pergunta}"`);
        }
      }
    }
    
    // Se houver erros, exibir todos de uma vez
    if (erros.length > 0) {
      // Atualizar estado com as perguntas que têm erros
      const novasPerguntasComErro = new Set<string>();
      
      // Mapear erros para IDs de perguntas
      perguntasObrigatorias.forEach(pergunta => {
        if (erros.some(erro => erro.includes(`"${pergunta.pergunta}"`))) {
          novasPerguntasComErro.add(pergunta.uid);
        }
      });
      
      setPerguntasComErro(novasPerguntasComErro);
      
      // Rolar até o primeiro erro
      if (novasPerguntasComErro.size > 0) {
        const primeiraPerguntaComErro = document.querySelector('[data-pergunta-uid]');
        primeiraPerguntaComErro?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      toast.error(
        <div className="space-y-2">
          <p className="font-bold">Por favor, preencha os seguintes campos obrigatórios:</p>
          <ul className="list-disc pl-5 space-y-1">
            {erros.map((erro, index) => (
              <li key={index}>{erro}</li>
            ))}
          </ul>
        </div>,
        { 
          duration: 10000, // 10 segundos
          style: { maxWidth: '500px' } 
        }
      );
      setSubmitting(false);
      return;
    }
    
    // Limpar erros de validação se não houver mais erros
    if (perguntasComErro.size > 0) {
      setPerguntasComErro(new Set());
    }
    
    setSubmitting(true);
    
    try {
      // Preparar dados para envio
      const dadosParticipanteEnvio = {
        nome: pesquisaAtual.dados_participante.nome?.visivel ? nome : '',
        telefone: pesquisaAtual.dados_participante.telefone?.visivel ? telefone : '',
        faixa_etaria: pesquisaAtual.dados_participante.faixaEtaria?.visivel ? faixaEtaria : '',
        cep: pesquisaAtual.dados_participante.cep?.visivel ? cep : '',
        cidade: pesquisaAtual.dados_participante.cidade?.visivel ? cidade : '',
        bairro: pesquisaAtual.dados_participante.bairro?.visivel ? bairro : '',
        numero: pesquisaAtual.dados_participante.numero?.visivel ? numero : '',
        complemento: pesquisaAtual.dados_participante.complemento?.visivel ? complemento : '',
        observacoes: pesquisaAtual.dados_participante.observacoes?.visivel ? observacoes : '',
        data_resposta: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      // Adicionar a opinião sincera aos dados do participante
      if (opiniaoSincera.trim()) {
        dadosParticipanteEnvio.opiniao_sincera = opiniaoSincera.trim();
      }

      // Criar um objeto com todos os dados do participante para armazenar uma única vez
      const dadosCompletosParticipante = {
        ...dadosParticipanteEnvio,
        endereco_completo: enderecoCompleto || {
          cep: cep.replace(/\D/g, ''),
          logradouro: '',
          bairro: bairro,
          cidade: cidade,
          estado: '',
          latitude: '',
          longitude: ''
        },
        navegador: {
          user_agent: navigator.userAgent,
          ip_address: '',
          linguagem: navigator.language,
          plataforma: navigator.platform,
          cookies_habilitados: navigator.cookieEnabled,
          tela: {
            altura: window.screen.height,
            largura: window.screen.width,
            profundidade: window.screen.colorDepth,
          },
          janela: {
            altura: window.innerHeight,
            largura: window.innerWidth,
          },
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          data_hora: new Date().toISOString(),
        },
        localizacao: {
          url: window.location.href,
          origem: document.referrer || 'Acesso direto',
        }
      };

      // Formatar telefone para conter apenas números
      const telefoneApenasNumeros = dadosParticipanteEnvio.telefone ? dadosParticipanteEnvio.telefone.replace(/\D/g, '') : '';
      
      // Verificar se já existe um participante com o mesmo telefone na mesma empresa
      let participanteUid: string | null = null;
      let participanteJaRespondeu = false;
      
      if (telefoneApenasNumeros) {
        // Buscar participante existente
        const { data: participanteExistente, error: erroBusca } = await supabaseClient
          .from('ps_gbp_participantes')
          .select('uid')
          .eq('telefone', telefoneApenasNumeros)
          .eq('empresa_uid', pesquisa.empresa_uid || '')
          .maybeSingle();
          
        if (erroBusca) {
          console.error('Erro ao buscar participante existente:', erroBusca);
        } else if (participanteExistente) {
          participanteUid = participanteExistente.uid;
          
          try {
            // Verificar se já existe alguma resposta para este telefone nesta pesquisa
            const { data: respostaExistente, error: erroResposta } = await supabaseClient
              .from('ps_gbp_respostas')
              .select('uid')
              .eq('participante_telefone', telefoneApenasNumeros)
              .eq('pesquisa_uid', id)
              .limit(1)
              .maybeSingle();
              
            if (erroResposta) {
              console.error('Erro ao verificar respostas existentes:', erroResposta);
              // Se houver erro na consulta, não impedir o envio por segurança
              participanteJaRespondeu = false;
            } else if (respostaExistente) {
              console.log('Participante já respondeu esta pesquisa:', respostaExistente);
              participanteJaRespondeu = true;
            }
          } catch (error) {
            console.error('Erro ao verificar respostas existentes:', error);
            // Em caso de erro, não impedir o envio por segurança
            participanteJaRespondeu = false;
          }
        }
      }
      
      // Se o participante já respondeu, não continuar
      if (participanteJaRespondeu) {
        toast.error(
          <div className="flex flex-col gap-2 p-2">
            <div className="font-bold text-red-600">Atenção!</div>
            <div>Este número de telefone já respondeu a esta pesquisa.</div>
            <div className="text-sm text-gray-600">Cada número pode responder apenas uma vez por pesquisa.</div>
          </div>,
          {
            duration: 10000, // 10 segundos
            position: 'top-center',
            className: 'border-l-4 border-red-500 bg-red-50',
          }
        );
        setSubmitting(false);
        return;
      }
      
      // Se não encontrou um participante existente, cria um novo
      if (!participanteUid) {
        const { data: novoParticipante, error: participanteError } = await supabaseClient
          .from('ps_gbp_participantes')
          .insert([{
            nome: dadosParticipanteEnvio.nome,
            telefone: telefoneApenasNumeros,
            faixa_etaria: dadosParticipanteEnvio.faixa_etaria,
            cep: dadosParticipanteEnvio.cep,
            cidade: dadosParticipanteEnvio.cidade,
            bairro: dadosParticipanteEnvio.bairro,
            numero: dadosParticipanteEnvio.numero,
            complemento: dadosParticipanteEnvio.complemento,
            observacoes: dadosParticipanteEnvio.observacoes,
            dados_completos: {
              ...dadosCompletosParticipante,
              telefone: telefoneApenasNumeros
            },
            empresa_uid: pesquisaAtual.empresa_uid || null,
            created_at: new Date().toISOString()
          }])
          .select('uid')
          .single();

        if (participanteError) {
          console.error('Erro ao salvar participante:', participanteError);
          throw participanteError;
        }
        
        participanteUid = novoParticipante.uid;
      }

      // Para cada resposta, criar um registro na tabela ps_gbp_respostas
      const respostasParaEnvio = respostas.map(r => {
        const pergunta = perguntas.find(p => p.uid === r.perguntaId);
        
        // Para as demais respostas
        let respostaFormatada: any = r.valor;
        
        if (pergunta?.tipo_resposta === 'votacao') {
          respostaFormatada = r.valor === 'true' || r.valor === true;
        }
        else if (pergunta?.tipo_resposta === 'enquete' && pergunta.multipla_escolha) {
          respostaFormatada = Array.isArray(r.valor) ? r.valor : [r.valor].filter(Boolean);
        }
        
        // Incluir o comentário da pergunta, se existir
        const respostaComComentario = {
          ...respostaFormatada,
          comentario: pergunta?.comentario || null
        };
        
        return {
          pesquisa_uid: id,
          pergunta_uid: r.perguntaId,
          participante_uid: participanteUid, // Referência ao participante
          empresa_uid: pesquisa.empresa_uid || null,
          resposta: {
            tipo: pergunta?.tipo_resposta || 'texto',
            valor: respostaFormatada,
            pergunta: pergunta?.pergunta || '',
            opcoes: pergunta?.opcoes || [],
            data_resposta: new Date().toISOString(),
            candidato_id: r.candidatoId || null,
            comentario: pergunta?.comentario || null // Incluindo o comentário na resposta
          },
          // Campos básicos para consultas rápidas (opcional, podem ser removidos posteriormente)
          participante_nome: dadosParticipanteEnvio.nome,
          created_at: new Date().toISOString()
        };
      });

      // Se houver opinião sincera, adicionar como uma resposta especial
      if (opiniaoSincera.trim()) {
        // Usa o ID da primeira pergunta disponível ou um UUID válido
        const perguntaPadraoId = perguntas.length > 0 ? perguntas[0].uid : '00000000-0000-0000-0000-000000000000';
        
        respostasParaEnvio.push({
          pesquisa_uid: id,
          pergunta_uid: perguntaPadraoId, // Usa um ID de pergunta válido
          participante_uid: participanteUid,
          empresa_uid: pesquisa.empresa_uid || null,
          resposta: {
            tipo: 'texto',
            valor: opiniaoSincera.trim(),
            pergunta: 'Opinião Sincera',
            opcoes: [],
            data_resposta: new Date().toISOString(),
            candidato_id: null,
            comentario: null
          },
          opiniao_sincera: opiniaoSincera.trim(), // Campo dedicado para a opinião sincera
          participante_nome: dadosParticipanteEnvio.nome,
          created_at: new Date().toISOString()
        });
      }

      // Se não houver respostas, criar pelo menos um registro com os dados do participante
      const dadosParaEnvio = respostasParaEnvio.length > 0 
        ? respostasParaEnvio 
        : [{
            pesquisa_uid: id,
            pergunta_uid: perguntas[0]?.uid || null,
            empresa_uid: pesquisa.empresa_uid || null,
            candidato_uid: null,
            resposta: {  // Campo resposta como JSONB vazio
              tipo: 'nenhuma_resposta',
              valor: null,
              data_resposta: new Date().toISOString()
            },
            // Referência ao participante
            participante_uid: participanteUid,
            // Campos básicos para compatibilidade (podem ser removidos após migração)
            participante_nome: dadosParticipanteEnvio.nome,
            created_at: new Date().toISOString(),
            // Inclui a opinião sincera mesmo no registro vazio, se existir
            ...(opiniaoSincera.trim() ? { opiniao_sincera: opiniaoSincera.trim() } : {})
          }];
      
      // Enviar para o banco de dados em lotes para evitar problemas com muitas requisições
      const BATCH_SIZE = 50; // Tamanho do lote para inserção
      const totalBatches = Math.ceil(dadosParaEnvio.length / BATCH_SIZE);
      
      for (let i = 0; i < totalBatches; i++) {
        const start = i * BATCH_SIZE;
        const end = start + BATCH_SIZE;
        const batch = dadosParaEnvio.slice(start, end);
        
        // Inserir o lote atual
        const { error } = await supabaseClient
          .from('ps_gbp_respostas')
          .insert(batch)
          .select();
        
        if (error) {
          console.error('Erro ao inserir lote de respostas:', error);
          throw error;
        }
        
        console.log(`Lote ${i + 1}/${totalBatches} inserido com sucesso`);
      }
      
      // Se a pesquisa tiver notificação por WhatsApp ativada
      if (pesquisa.notificacao_whatsapp?.ativo && dadosParticipante.telefone?.visivel && telefone) {
        try {
          // Aqui você pode implementar o envio da notificação por WhatsApp
          console.log('Enviando notificação para:', telefone);
          // Exemplo de implementação:
          // await enviarNotificacaoWhatsApp(telefone, pesquisa.notificacao_whatsapp.mensagem);
        } catch (error) {
          console.error('Erro ao enviar notificação por WhatsApp:', error);
          // Não interrompe o fluxo se falhar o envio da notificação
        }
      }
      
      // Redirecionar para página de agradecimento
      navigate(`/pesquisa/${id}/obrigado`);
    } catch (error) {
      console.error('Erro ao enviar respostas:', error);
      toast.error('Erro ao enviar as respostas. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 pt-12 pb-12">
        <div className="max-w-3xl mx-auto">
          <Card className="text-center py-8">
            <CardHeader>
              <CardTitle className="text-2xl text-red-600">
                Não foi possível carregar a pesquisa
              </CardTitle>
              <p className="text-gray-600 mt-2">
                {erro}
              </p>
            </CardHeader>
            <CardContent className="mt-4">
              <Button 
                onClick={() => navigate('/')}
                variant="outline"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para o início
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!pesquisa) {
    return null;
  }

  // Função para formatar a data
  const formatarData = (dataString: string) => {
    try {
      return format(new Date(dataString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return dataString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 pt-2.5 pb-2.5">
      <div className="max-w-3xl mx-auto">
        <Card className="mb-8 border-t-4 border-blue-600 shadow-lg">
          <CardHeader className="text-center py-8">
            <div className="space-y-4">
              <div className="inline-block mx-auto px-4 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full mb-2">
                Pesquisa de Opinião
              </div>
              <CardTitle className="text-3xl md:text-4xl font-bold text-gray-800 leading-tight">
                {pesquisa.titulo}
              </CardTitle>
              
              {pesquisa.descricao && (
                <p className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto leading-relaxed">
                  {pesquisa.descricao}
                </p>
              )}
              
              {pesquisa.data_fim && (
                <div className="mt-6 text-sm font-medium text-gray-500 bg-gray-50 inline-block px-4 py-2 rounded-lg">
                  <span className="text-blue-600">⏳</span> Disponível até: {formatarData(pesquisa.data_fim)}
                </div>
              )}
            </div>
          </CardHeader>
        </Card>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(e);
        }}>
          {/* Se houver candidatos, renderiza um card para cada um */}
          {candidatos.length > 0 ? (
            candidatos.map((candidato) => (
              <Card key={candidato.uid} className="mb-8">
                <CardHeader className="bg-gray-50 border-b">
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                      {candidato.foto_url ? (
                        <img 
                          src={candidato.foto_url} 
                          alt={candidato.nome} 
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl text-gray-500">
                          {candidato.nome.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{candidato.nome}</h3>
                      {candidato.partido && (
                        <p className="text-gray-600">{candidato.partido}</p>
                      )}
                      {candidato.cargo && (
                        <p className="text-sm text-gray-500">{candidato.cargo}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {perguntas
                    .filter(p => ['estrelas', 'nota', 'votacao', 'enquete'].includes(p.tipo_resposta))
                    .sort((a, b) => a.ordem - b.ordem)
                    .map((pergunta) => {
                      const respostaAtual = respostas.find(
                        r => r.candidatoId === candidato.uid && r.perguntaId === pergunta.uid
                      );
                      
                      return (
                        <div 
                          key={`${candidato.uid}-${pergunta.uid}`} 
                          className="space-y-3"
                          data-pergunta-uid={pergunta.uid}
                        >
                          <p className={`font-medium ${perguntasComErro.has(pergunta.uid) ? 'text-red-600' : ''}`}>
                            {pergunta.pergunta}
                            {pergunta.obrigatoria && <span className="text-red-500 ml-1">*</span>}
                            {perguntasComErro.has(pergunta.uid) && (
                              <span className="ml-2 text-sm font-normal text-red-500">
                                (Campo obrigatório)
                              </span>
                            )}
                          </p>
                          
                          {pergunta.tipo_resposta === 'estrelas' && (
                            <div className="flex space-x-1">
                              {[1, 2, 3, 4, 5].map((estrela) => (
                                <button
                                  key={estrela}
                                  type="button"
                                  className={`p-1 ${Number(respostaAtual?.valor || 0) >= estrela ? 'text-yellow-400' : 'text-gray-300'}`}
                                  onClick={() => handleResposta(pergunta.uid, estrela.toString(), candidato.uid)}
                                >
                                  <Star 
                                    className="h-8 w-8 fill-current"
                                  />
                                </button>
                              ))}
                              <span className="ml-2 text-sm text-gray-500 self-center">
                                {Number(respostaAtual?.valor || 0)} de 5 estrelas
                              </span>
                              {renderComentarioField(pergunta, candidato.uid)}
                            </div>
                          )}
                          
                          {pergunta.tipo_resposta === 'nota' && (
                            <div className="flex flex-wrap gap-2">
                              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((nota) => (
                                <button
                                  key={nota}
                                  type="button"
                                  className={`w-10 h-10 flex items-center justify-center rounded-full border ${
                                    Number(respostaAtual?.valor) === nota 
                                      ? 'bg-blue-600 text-white border-blue-600' 
                                      : 'border-gray-300 hover:bg-gray-50'
                                  }`}
                                  onClick={() => handleResposta(pergunta.uid, nota.toString(), candidato.uid)}
                                >
                                  {nota}
                                </button>
                              ))}
                              {renderComentarioField(pergunta, candidato.uid)}
                            </div>
                          )}
                          
                          {pergunta.tipo_resposta === 'votacao' && (
                            <div className="flex space-x-4">
                              <Button
                                type="button"
                                variant={respostaAtual?.valor === true ? 'default' : 'outline'}
                                className={`flex-1 ${respostaAtual?.valor === true ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                onClick={() => handleResposta(pergunta.uid, 'true', candidato.uid)}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Sim
                              </Button>
                              <Button
                                type="button"
                                variant={respostaAtual?.valor === false ? 'destructive' : 'outline'}
                                className="flex-1"
                                onClick={() => handleResposta(pergunta.uid, 'false', candidato.uid)}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Não
                              </Button>
                              {renderComentarioField(pergunta, candidato.uid)}
                            </div>
                          )}
                          
                          {pergunta.tipo_resposta === 'enquete' && pergunta.opcoes && pergunta.opcoes.length > 0 && (
                            <div className="space-y-2">
                              {pergunta.opcoes.map((opcao) => {
                                const valorResposta = respostaAtual?.valor;
                                const valorOpcao = opcao.id || String(opcao.texto);
                                const isSelected = Array.isArray(valorResposta) 
                                  ? valorResposta.includes(valorOpcao)
                                  : valorResposta === valorOpcao;
                                return (
                                  <div 
                                    key={valorOpcao}
                                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                      isSelected 
                                        ? 'bg-blue-50 border-blue-300' 
                                        : 'border-gray-200 hover:bg-gray-50'
                                    }`}
                                    onClick={() => handleResposta(pergunta.uid, valorOpcao, candidato.uid)}
                                  >
                                    <div className="flex items-center">
                                      {pergunta.multipla_escolha ? (
                                        <div className={`flex items-center justify-center h-5 w-5 rounded border mr-3 ${
                                          isSelected 
                                            ? 'bg-blue-600 border-blue-600 text-white' 
                                            : 'border-gray-400'
                                        }`}>
                                          {isSelected && <Check className="h-3 w-3" />}
                                        </div>
                                      ) : (
                                        <div className={`h-5 w-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                                          isSelected 
                                            ? 'border-blue-600' 
                                            : 'border-gray-400'
                                        }`}>
                                          {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-blue-600"></div>}
                                        </div>
                                      )}
                                      <span className={isSelected ? 'font-medium text-blue-800' : ''}>
                                        {opcao.texto}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                              {pergunta.multipla_escolha && (
                                <p className="text-xs text-gray-500 mt-2">
                                  Selecione uma ou mais opções
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </CardContent>
              </Card>
            ))
          ) : (
            // Se não houver candidatos, renderiza as perguntas diretamente
            <Card className="mb-8">
              <CardContent className="p-6 space-y-6">
                {perguntas
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((pergunta) => {
                  const respostaAtual = respostas.find(
                    r => r.perguntaId === pergunta.uid && !r.candidatoId
                  );
                  
                  return (
                    <div 
                      key={pergunta.uid} 
                      className="space-y-3"
                      data-pergunta-uid={pergunta.uid}
                    >
                      <p className={`font-medium ${perguntasComErro.has(pergunta.uid) ? 'text-red-600' : ''}`}>
                        {pergunta.pergunta}
                        {pergunta.obrigatoria && <span className="text-red-500 ml-1">*</span>}
                        {perguntasComErro.has(pergunta.uid) && (
                          <span className="ml-2 text-sm font-normal text-red-500">
                            (Campo obrigatório)
                          </span>
                        )}
                      </p>
                      
                      {/* Campo de texto simples */}
                      {pergunta.tipo_resposta === 'texto' && (
                        <div className="space-y-2">
                          <Input
                            value={respostaAtual?.valor?.toString() || ''}
                            onChange={(e) => handleResposta(pergunta.uid, e.target.value)}
                            placeholder="Digite sua resposta"
                            required={pergunta.obrigatoria}
                          />
                          {renderComentarioField(pergunta)}
                        </div>
                      )}
                      
                      {/* Escolha única */}
                      {pergunta.tipo_resposta === 'escolha_unica' && pergunta.opcoes && pergunta.opcoes.length > 0 && (
                        <div className="space-y-2">
                          {pergunta.opcoes.map((opcao) => (
                            <div 
                              key={opcao.id}
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                respostaAtual?.valor === opcao.id
                                  ? 'bg-blue-50 border-blue-300' 
                                  : 'border-gray-200 hover:bg-gray-50'
                              }`}
                              onClick={() => handleResposta(pergunta.uid, opcao.id)}
                            >
                              <div className="flex items-center">
                                <div className={`h-5 w-5 rounded-full border-2 mr-3 flex-shrink-0 ${
                                  respostaAtual?.valor === opcao.id 
                                    ? 'border-blue-500 bg-blue-500' 
                                    : 'border-gray-400'
                                }`}></div>
                                <span>{opcao.texto}</span>
                              </div>
                            </div>
                          ))}
                          {renderComentarioField(pergunta)}
                        </div>
                      )}
                      
                      {/* Enquete com múltipla escolha */}
                      {pergunta.tipo_resposta === 'enquete' && pergunta.opcoes && pergunta.opcoes.length > 0 && (
                        <div className="space-y-2">
                          {pergunta.opcoes.map((opcao) => {
                            const valorOpcao = opcao.id || String(opcao.texto);
                            const isSelected = Array.isArray(respostaAtual?.valor) 
                              ? respostaAtual?.valor.includes(valorOpcao)
                              : respostaAtual?.valor === valorOpcao;
                              
                            return (
                              <div 
                                key={valorOpcao}
                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-blue-50 border-blue-300' 
                                    : 'border-gray-200 hover:bg-gray-50'
                                }`}
                                onClick={() => handleResposta(pergunta.uid, valorOpcao)}
                              >
                                <div className="flex items-center">
                                  {pergunta.multipla_escolha ? (
                                    <div className={`h-5 w-5 border-2 rounded mr-3 flex-shrink-0 flex items-center justify-center ${
                                      isSelected 
                                        ? 'bg-blue-500 border-blue-500 text-white' 
                                        : 'border-gray-400'
                                    }`}>
                                      {isSelected && <Check className="h-3 w-3" />}
                                    </div>
                                  ) : (
                                    <div className={`h-5 w-5 rounded-full border-2 mr-3 flex-shrink-0 ${
                                      isSelected 
                                        ? 'border-blue-500 bg-blue-500' 
                                        : 'border-gray-400'
                                    }`}></div>
                                  )}
                                  <span>{opcao.texto}</span>
                                </div>
                              </div>
                            );
                          })}
                          {pergunta.multipla_escolha && (
                            <p className="text-xs text-gray-500 mt-2">
                              Selecione uma ou mais opções
                            </p>
                          )}
                          {renderComentarioField(pergunta)}
                        </div>
                      )}
                      
                      {/* Avaliação por estrelas */}
                      {pergunta.tipo_resposta === 'estrelas' && (
                        <div className="space-y-2">
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((estrela) => (
                              <button
                                key={estrela}
                                type="button"
                                className={`p-1 ${Number(respostaAtual?.valor || 0) >= estrela ? 'text-yellow-400' : 'text-gray-300'}`}
                                onClick={() => handleResposta(pergunta.uid, estrela.toString())}
                              >
                                <Star 
                                  className="h-8 w-8 fill-current"
                                />
                              </button>
                            ))}
                            <span className="ml-2 text-sm text-gray-500">
                              {Number(respostaAtual?.valor || 0)} de 5 estrelas
                            </span>
                          </div>
                          {renderComentarioField(pergunta)}
                        </div>
                      )}
                      
                      {/* Nota de 1 a 10 */}
                      {pergunta.tipo_resposta === 'nota' && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((nota) => (
                              <button
                                key={nota}
                                type="button"
                                className={`w-10 h-10 flex items-center justify-center rounded-full border ${
                                  Number(respostaAtual?.valor) === nota 
                                    ? 'bg-blue-600 text-white border-blue-600' 
                                    : 'border-gray-300 hover:bg-gray-50'
                                }`}
                                onClick={() => handleResposta(pergunta.uid, nota.toString())}
                              >
                                {nota}
                              </button>
                            ))}
                          </div>
                          <div className="flex justify-between text-sm text-gray-500">
                            <span>Péssimo</span>
                            <span>Ótimo</span>
                          </div>
                          {renderComentarioField(pergunta)}
                        </div>
                      )}
                      
                      {/* Votação Sim/Não */}
                      {pergunta.tipo_resposta === 'votacao' && (
                        <div className="space-y-4">
                          <div className="flex space-x-4">
                            <Button
                              type="button"
                              variant={respostaAtual?.valor === true || respostaAtual?.valor === 'true' ? 'default' : 'outline'}
                              className={`flex-1 ${respostaAtual?.valor === true || respostaAtual?.valor === 'true' ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:bg-green-50'}`}
                              onClick={() => handleResposta(pergunta.uid, true)}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Sim
                            </Button>
                            <Button
                              type="button"
                              variant={respostaAtual?.valor === false || respostaAtual?.valor === 'false' ? 'destructive' : 'outline'}
                              className={`flex-1 ${respostaAtual?.valor === false || respostaAtual?.valor === 'false' ? 'bg-red-600 hover:bg-red-700 text-white' : 'hover:bg-red-50'}`}
                              onClick={() => handleResposta(pergunta.uid, false)}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Não
                            </Button>
                          </div>
                          {renderComentarioField(pergunta)}
                        </div>
                      )}
                      {pergunta.tipo_resposta === 'escolha_unica' && pergunta.opcoes && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            {pergunta.opcoes.map((opcao) => (
                              <div 
                                key={opcao.id}
                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                  respostaAtual?.valor === opcao.id
                                    ? 'bg-blue-50 border-blue-300' 
                                    : 'border-gray-200 hover:bg-gray-50'
                                }`}
                                onClick={() => handleResposta(pergunta.uid, opcao.id)}
                              >
                                <div className="flex items-center">
                                  <div className={`h-5 w-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                                    respostaAtual?.valor === opcao.id 
                                      ? 'border-blue-600' 
                                      : 'border-gray-400'
                                  }`}>
                                    {respostaAtual?.valor === opcao.id && (
                                      <div className="h-2.5 w-2.5 rounded-full bg-blue-600"></div>
                                    )}
                                  </div>
                                  <span className={respostaAtual?.valor === opcao.id ? 'font-medium text-blue-800' : ''}>
                                    {opcao.texto}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                          {renderComentarioField(pergunta)}
                        </div>
                      )}
                      
                      {pergunta.tipo_resposta === 'enquete' && pergunta.opcoes && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            {pergunta.opcoes.map((opcao) => {
                              const valorResposta = respostaAtual?.valor;
                              const isSelected = Array.isArray(valorResposta) 
                                ? valorResposta.includes(opcao.id)
                                : valorResposta === opcao.id;
                              return (
                                <div 
                                  key={opcao.id}
                                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                    isSelected 
                                      ? 'bg-blue-50 border-blue-300' 
                                      : 'border-gray-200 hover:bg-gray-50'
                                  }`}
                                  onClick={() => handleResposta(pergunta.uid, opcao.id)}
                                >
                                  <div className="flex items-center">
                                    {pergunta.multipla_escolha ? (
                                      <div className={`flex items-center justify-center h-5 w-5 rounded border mr-3 ${
                                        isSelected 
                                          ? 'bg-blue-600 border-blue-600 text-white' 
                                          : 'border-gray-400'
                                      }`}>
                                        {isSelected && <Check className="h-3 w-3" />}
                                      </div>
                                    ) : (
                                      <div className={`h-5 w-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                                        isSelected 
                                          ? 'border-blue-600' 
                                          : 'border-gray-400'
                                      }`}>
                                        {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-blue-600"></div>}
                                      </div>
                                    )}
                                    <span className={isSelected ? 'font-medium text-blue-800' : ''}>
                                      {opcao.texto}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                            {pergunta.multipla_escolha && (
                              <p className="text-xs text-gray-500 mt-2">
                                Selecione uma ou mais opções
                              </p>
                            )}
                            
                            {/* Campo de comentário */}
                            {renderComentarioField(pergunta, candidato.uid)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
          
          {/* Campo de Observações como um card separado */}
          {pesquisa.dados_participante.observacoes?.visivel && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Observações Adicionais</CardTitle>
                <p className="text-sm text-gray-500">
                  Adicione quaisquer observações ou comentários adicionais que julgar necessários.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="observacoes">
                    Observações
                    {pesquisa.dados_participante.observacoes.obrigatorio && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </Label>
                  <textarea
                    id="observacoes"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Digite suas observações aqui..."
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required={pesquisa.dados_participante.observacoes.obrigatorio}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Seção de Opinião Sincera */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800">Sua opinião Sincera</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <textarea
                  id="opiniao-sincera"
                  value={opiniaoSincera}
                  onChange={(e) => setOpiniaoSincera(e.target.value)}
                  placeholder="Digite sua opinião sincera aqui..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </CardContent>
          </Card>
          
          {pesquisa.dados_participante && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Seus Dados</CardTitle>
                <p className="text-sm text-gray-500">
                  Preencha as informações abaixo para concluir a pesquisa.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {pesquisa.dados_participante.nome?.visivel && (
                  <div className="space-y-2">
                    <Label htmlFor="nome">
                      Nome Completo
                      {pesquisa.dados_participante.nome.obrigatorio && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </Label>
                    <Input
                      id="nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Digite seu nome completo"
                      required={pesquisa.dados_participante.nome.obrigatorio}
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pesquisa.dados_participante.faixaEtaria?.visivel && (
                    <div className="space-y-2">
                      <Label htmlFor="faixa-etaria">
                        Faixa Etária
                        {pesquisa.dados_participante.faixaEtaria.obrigatorio && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </Label>
                      <Select 
                        value={faixaEtaria} 
                        onValueChange={setFaixaEtaria}
                        required={pesquisa.dados_participante.faixaEtaria.obrigatorio}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione sua faixa etária" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="18-24">18-24 anos</SelectItem>
                          <SelectItem value="25-34">25-34 anos</SelectItem>
                          <SelectItem value="35-44">35-44 anos</SelectItem>
                          <SelectItem value="45-54">45-54 anos</SelectItem>
                          <SelectItem value="55-64">55-64 anos</SelectItem>
                          <SelectItem value="65+">65+ anos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {pesquisa.dados_participante.telefone?.visivel && (
                    <div className="space-y-2">
                      <Label htmlFor="telefone">
                        Telefone
                        {pesquisa.dados_participante.telefone.obrigatorio && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </Label>
                      <Input
                        id="telefone"
                        type="tel"
                        value={telefone}
                        onChange={handleTelefoneChange}
                        onPaste={(e) => {
                          const texto = e.clipboardData.getData('text/plain');
                          if (!/^\d*$/.test(texto)) {
                            e.preventDefault();
                          }
                        }}
                        placeholder="(00) 0 0000-0000"
                        inputMode="numeric"
                        required={pesquisa.dados_participante.telefone.obrigatorio}
                      />
                    </div>
                  )}
                </div>
                
                {pesquisa.dados_participante.telefone?.visivel && (
                  <p className="text-xs text-gray-500 -mt-2">
                    Seu telefone não será compartilhado e será usado apenas para contato, se necessário.
                  </p>
                )}

                {/* Campos de Endereço */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pesquisa.dados_participante.cep?.visivel && (
                    <div className="space-y-2">
                      <Label htmlFor="cep">
                        CEP
                        {pesquisa.dados_participante.cep.obrigatorio && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </Label>
                      <div className="relative">
                        <Input
                          id="cep"
                          value={cep}
                          onChange={handleCepChange}
                          placeholder="00000-000"
                          maxLength={9}
                          required={pesquisa.dados_participante.cep.obrigatorio}
                        />
                        {buscandoCep && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {pesquisa.dados_participante.cidade?.visivel && (
                    <div className="space-y-2">
                      <Label htmlFor="cidade">
                        Cidade
                        {pesquisa.dados_participante.cidade.obrigatorio && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </Label>
                      <Input
                        id="cidade"
                        value={cidade}
                        onChange={(e) => setCidade(e.target.value)}
                        placeholder="Sua cidade"
                        required={pesquisa.dados_participante.cidade.obrigatorio}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {pesquisa.dados_participante.bairro?.visivel && (
                    <div className="space-y-2">
                      <Label htmlFor="bairro">
                        Bairro
                        {pesquisa.dados_participante.bairro.obrigatorio && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </Label>
                      <Input
                        id="bairro"
                        value={bairro}
                        onChange={(e) => setBairro(e.target.value)}
                        placeholder="Seu bairro"
                        required={pesquisa.dados_participante.bairro.obrigatorio}
                      />
                    </div>
                  )}

                  {pesquisa.dados_participante.numero?.visivel && (
                    <div className="space-y-2">
                      <Label htmlFor="numero">
                        Número
                        {pesquisa.dados_participante.numero.obrigatorio && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </Label>
                      <Input
                        id="numero"
                        type="number"
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        placeholder="Nº"
                        required={pesquisa.dados_participante.numero.obrigatorio}
                      />
                    </div>
                  )}

                  {pesquisa.dados_participante.complemento?.visivel && (
                    <div className="space-y-2">
                      <Label htmlFor="complemento">
                        Complemento
                        {pesquisa.dados_participante.complemento.obrigatorio && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </Label>
                      <Input
                        id="complemento"
                        value={complemento}
                        onChange={(e) => setComplemento(e.target.value)}
                        placeholder="Complemento"
                        required={pesquisa.dados_participante.complemento.obrigatorio}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          

          
          <div className="mt-6 mb-4 px-3 py-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="max-w-md mx-auto text-center space-y-4">
              <Button 
                type="submit" 
                size="lg"
                disabled={submitting}
                className={`
                  min-w-[200px] py-3 text-sm font-medium
                  bg-gradient-to-r from-blue-600 to-blue-700
                  hover:from-blue-700 hover:to-blue-800
                  transform hover:scale-105 transition-all duration-200
                  shadow-sm hover:shadow
                  ${submitting ? 'opacity-80 cursor-not-allowed' : ''}
                `}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    Enviar Minhas Respostas
                  </>
                )}
              </Button>
              <p className="text-[10px] text-gray-400 mt-2">
                Processamento seguro
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResponderPesquisa;
