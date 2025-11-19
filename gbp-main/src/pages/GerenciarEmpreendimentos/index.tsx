import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useToast } from '../../components/ui/use-toast';
import { Building2, Plus, Users, Eye, Edit, Trash2, Home, MapPin, Phone, Mail, FileSpreadsheet, FileText, Link, Copy, CheckCircle, AlertCircle, Grid, List } from 'lucide-react';
import { empreendimentosService, Empreendimento, Bloco, Apartamento } from '../../services/empreendimentosService';
import { moradoresService } from '../../services/moradoresService';
import { cadastroTokensService } from '../../services/cadastroTokensService';

type Tab = 'moradores' | 'cadastro';

interface Morador {
  uid: string;
  nome_responsavel: string;
  telefone: string;
  email?: string;
  created_at: string;
  apartamento?: {
    uid: string;
    numero: string;
    bloco?: {
      uid: string;
      nome: string;
      empreendimento?: {
        uid: string;
        nome: string;
        cidade: string;
      };
    };
  };
  dependentes?: Array<{
    uid: string;
    nome: string;
    parentesco: string;
    whatsapp?: string;
  }>;
}

export function GerenciarEmpreendimentos() {
  const { empreendimentoSlug } = useParams<{ empreendimentoSlug?: string }>();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('moradores');
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [apartamentos, setApartamentos] = useState<Apartamento[]>([]);
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados para controle de acesso
  const [acessoAutorizado, setAcessoAutorizado] = useState(false);
  const [codigoAcesso, setCodigoAcesso] = useState('');
  const [erroAcesso, setErroAcesso] = useState(false);
  
  // Código de acesso fixo (pode ser alterado ou vir de variável de ambiente)
  const CODIGO_ACESSO_CORRETO = '8433135';

  // Estado para controlar visualização (grid ou lista)
  const [visualizacao, setVisualizacao] = useState<'grid' | 'lista'>('grid');

  // Estados para formulários
  const [showEmpreendimentoForm, setShowEmpreendimentoForm] = useState(false);
  const [showBlocoForm, setShowBlocoForm] = useState(false);
  const [showApartamentoForm, setShowApartamentoForm] = useState(false);

  const [novoEmpreendimento, setNovoEmpreendimento] = useState({
    nome: '',
    cidade: '',
    endereco: '',
    cep: ''
  });

  const [novoBloco, setNovoBloco] = useState({
    empreendimento_uid: '',
    nome: '',
    total_andares: 0,
    apartamentos_por_andar: 0
  });

  const [novoApartamento, setNovoApartamento] = useState({
    bloco_uid: '',
    numero: '',
    andar: 0,
    quartos: 0
  });

  // Estados para filtros de moradores
  const [filtros, setFiltros] = useState({
    empreendimento: '',
    bloco: '',
    apartamento: '',
    nome: '',
    whatsapp: ''
  });

  // Estados para geração de link
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkGerado, setLinkGerado] = useState('');
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [gerandoLink, setGerandoLink] = useState(false);

  // Estados para cadastro completo
  interface BlocoComApartamentos {
    id: string;
    nome: string;
    bloco_existente_uid?: string;
    usar_existente: boolean;
    apartamentos: string;
  }
  
  const [cadastroCompleto, setCadastroCompleto] = useState({
    empreendimento_existente: '',
    nome: '',
    cidade: '',
    endereco: '',
    cep: ''
  });
  const [blocosComApartamentos, setBlocosComApartamentos] = useState<BlocoComApartamentos[]>([
    { id: '1', nome: '', usar_existente: false, apartamentos: '' }
  ]);
  const [loadingCadastro, setLoadingCadastro] = useState(false);
  const [usarEmpreendimentoExistente, setUsarEmpreendimentoExistente] = useState(false);

  // Estados de paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 12;

  // Estados para modal de dependentes
  const [modalDependentes, setModalDependentes] = useState(false);
  const [moradorSelecionado, setMoradorSelecionado] = useState<Morador | null>(null);
  const [novoDependente, setNovoDependente] = useState({ nome: '', parentesco: '', whatsapp: '' });
  const [loadingDependente, setLoadingDependente] = useState(false);

  // Estados para edição de morador
  const [modalEditarMorador, setModalEditarMorador] = useState(false);
  const [moradorEmEdicao, setMoradorEmEdicao] = useState<Morador | null>(null);
  const [loadingEditarMorador, setLoadingEditarMorador] = useState(false);

  // Verificar se precisa de código de acesso
  useEffect(() => {
    // Se tem slug na URL, libera acesso automaticamente
    if (empreendimentoSlug) {
      setAcessoAutorizado(true);
    }
  }, [empreendimentoSlug]);

  useEffect(() => {
    if (acessoAutorizado) {
      carregarDados();
    }
  }, [activeTab, acessoAutorizado]);

  // Aplicar filtro de empreendimento pela URL
  useEffect(() => {
    if (empreendimentoSlug && empreendimentos.length > 0) {
      console.log('🔍 Slug da URL:', empreendimentoSlug);
      
      // Extrair UID do slug (formato: uid-nome-do-empreendimento)
      const uidFromSlug = empreendimentoSlug.split('-')[0];
      console.log('🔑 UID extraído:', uidFromSlug);
      console.log('📋 Empreendimentos disponíveis:', empreendimentos.map(e => ({ uid: e.uid, nome: e.nome })));
      
      // Tentar encontrar por UID exato
      let empreendimento = empreendimentos.find(emp => emp.uid === uidFromSlug);
      
      // Se não encontrar, tentar por UID que começa com o slug
      if (!empreendimento) {
        empreendimento = empreendimentos.find(emp => emp.uid.startsWith(uidFromSlug));
      }
      
      // Se ainda não encontrar, tentar match parcial do UID
      if (!empreendimento) {
        empreendimento = empreendimentos.find(emp => emp.uid.includes(uidFromSlug));
      }
      
      console.log('✅ Empreendimento encontrado:', empreendimento);
      
      if (empreendimento) {
        console.log('🎯 Aplicando filtro para:', empreendimento.nome);
        setFiltros(prev => ({
          ...prev,
          empreendimento: empreendimento.uid
        }));
      } else {
        console.warn('⚠️ Empreendimento não encontrado com UID:', uidFromSlug);
      }
    }
  }, [empreendimentoSlug, empreendimentos]);

  // Resetar página ao mudar filtros
  useEffect(() => {
    setPaginaAtual(1);
  }, [filtros]);

  // Otimizar filtragem e ordenação com useMemo
  const moradoresFiltradosOrdenados = useMemo(() => {
    return moradores
      .filter(m => {
        const nomeMatch = !filtros.nome || m.nome_responsavel.toLowerCase().includes(filtros.nome.toLowerCase());
        const whatsappMatch = !filtros.whatsapp || 
          m.telefone?.includes(filtros.whatsapp) || 
          m.dependentes?.some(d => d.whatsapp?.includes(filtros.whatsapp));
        const empMatch = !filtros.empreendimento || m.apartamento?.bloco?.empreendimento?.uid === filtros.empreendimento;
        const blocoMatch = !filtros.bloco || m.apartamento?.bloco?.uid === filtros.bloco;
        const aptMatch = !filtros.apartamento || m.apartamento?.uid === filtros.apartamento;
        return nomeMatch && whatsappMatch && empMatch && blocoMatch && aptMatch;
      })
      .sort((a, b) => {
        // Primeiro ordenar por empreendimento
        const empA = a.apartamento?.bloco?.empreendimento?.nome || 'Sem Empreendimento';
        const empB = b.apartamento?.bloco?.empreendimento?.nome || 'Sem Empreendimento';
        const empCompare = empA.localeCompare(empB);
        
        // Se forem do mesmo empreendimento, ordenar por nome
        if (empCompare === 0) {
          return a.nome_responsavel.localeCompare(b.nome_responsavel);
        }
        
        return empCompare;
      });
  }, [moradores, filtros]);

  // Calcular paginação
  const moradoresPaginados = useMemo(() => {
    const indiceInicio = (paginaAtual - 1) * itensPorPagina;
    const indiceFim = indiceInicio + itensPorPagina;
    return moradoresFiltradosOrdenados.slice(indiceInicio, indiceFim);
  }, [moradoresFiltradosOrdenados, paginaAtual, itensPorPagina]);

  const totalPaginas = Math.ceil(moradoresFiltradosOrdenados.length / itensPorPagina);

  const carregarDados = async () => {
    setLoading(true);
    try {
      if (activeTab === 'empreendimentos') {
        const data = await empreendimentosService.listarEmpreendimentos();
        setEmpreendimentos(data);
      } else if (activeTab === 'cadastro') {
        // Carregar empreendimentos e blocos para o cadastro completo
        const emps = await empreendimentosService.listarEmpreendimentos();
        setEmpreendimentos(emps);
        
        const todosBlocos: Bloco[] = [];
        for (const emp of emps) {
          const b = await empreendimentosService.listarBlocos(emp.uid);
          todosBlocos.push(...b);
        }
        setBlocos(todosBlocos);
      } else if (activeTab === 'blocos') {
        // Carregar todos os blocos de todos empreendimentos
        const emps = await empreendimentosService.listarEmpreendimentos();
        const todosBlocos: Bloco[] = [];
        for (const emp of emps) {
          const b = await empreendimentosService.listarBlocos(emp.uid);
          todosBlocos.push(...b);
        }
        setBlocos(todosBlocos);
      } else if (activeTab === 'apartamentos') {
        // Carregar todos apartamentos
        const emps = await empreendimentosService.listarEmpreendimentos();
        const todosApartamentos: Apartamento[] = [];
        for (const emp of emps) {
          const blocos = await empreendimentosService.listarBlocos(emp.uid);
          for (const bloco of blocos) {
            const apts = await empreendimentosService.listarApartamentos(bloco.uid);
            todosApartamentos.push(...apts);
          }
        }
        setApartamentos(todosApartamentos);
      } else if (activeTab === 'moradores') {
        // Carregar empreendimentos, blocos e apartamentos para os filtros
        const emps = await empreendimentosService.listarEmpreendimentos();
        setEmpreendimentos(emps);
        
        const todosBlocos: Bloco[] = [];
        const todosApartamentos: Apartamento[] = [];
        
        for (const emp of emps) {
          const b = await empreendimentosService.listarBlocos(emp.uid);
          todosBlocos.push(...b);
          
          for (const bloco of b) {
            const apts = await empreendimentosService.listarApartamentos(bloco.uid);
            todosApartamentos.push(...apts);
          }
        }
        
        setBlocos(todosBlocos);
        setApartamentos(todosApartamentos);
        
        // Carregar todos moradores
        const data = await moradoresService.listarTodosMoradores();
        console.log('Moradores carregados:', data);
        console.log('Primeiro morador com dependentes:', data[0]?.dependentes);
        setMoradores(data as any);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatarTelefoneEdicao = (valor: string) => {
    const apenasDigitos = valor.replace(/\D/g, '').slice(0, 11); // limita a 11 dígitos

    if (apenasDigitos.length <= 10) {
      return apenasDigitos.replace(/(\d{0,2})(\d{0,4})(\d{0,4})/, (match, d1, d2, d3) => {
        if (!d1) return '';
        if (!d2) return `(${d1}`;
        if (!d3) return `(${d1}) ${d2}`;
        return `(${d1}) ${d2}-${d3}`;
      });
    }

    // 11 dígitos (celular)
    return apenasDigitos.replace(/(\d{0,2})(\d{0,5})(\d{0,4})/, (match, d1, d2, d3) => {
      if (!d1) return '';
      if (!d2) return `(${d1}`;
      if (!d3) return `(${d1}) ${d2}`;
      return `(${d1}) ${d2}-${d3}`;
    });
  };

  const handleCriarEmpreendimento = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await empreendimentosService.criarEmpreendimento({
        ...novoEmpreendimento,
        total_blocos: 0,
        total_apartamentos: 0,
        ativo: true
      });
      setNovoEmpreendimento({ nome: '', cidade: '', endereco: '', cep: '' });
      setShowEmpreendimentoForm(false);
      carregarDados();
      alert('Empreendimento cadastrado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar empreendimento:', error);
      alert('Erro ao cadastrar empreendimento');
    }
  };

  const handleCriarBloco = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await empreendimentosService.criarBloco(novoBloco);
      setNovoBloco({ empreendimento_uid: '', nome: '', total_andares: 0, apartamentos_por_andar: 0 });
      setShowBlocoForm(false);
      carregarDados();
      alert('Bloco cadastrado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar bloco:', error);
      alert('Erro ao cadastrar bloco');
    }
  };

  const handleCriarApartamento = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await empreendimentosService.criarApartamento({
        ...novoApartamento,
        ocupado: false
      });
      setNovoApartamento({ bloco_uid: '', numero: '', andar: 0, quartos: 0 });
      setShowApartamentoForm(false);
      carregarDados();
      alert('Apartamento cadastrado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar apartamento:', error);
      alert('Erro ao cadastrar apartamento');
    }
  };

  const adicionarBloco = () => {
    setBlocosComApartamentos([
      ...blocosComApartamentos,
      { id: Date.now().toString(), nome: '', usar_existente: false, apartamentos: '' }
    ]);
  };

  const removerBloco = (id: string) => {
    if (blocosComApartamentos.length > 1) {
      setBlocosComApartamentos(blocosComApartamentos.filter(b => b.id !== id));
    }
  };

  const atualizarBloco = (id: string, campo: 'nome' | 'apartamentos' | 'usar_existente' | 'bloco_existente_uid', valor: string | boolean) => {
    setBlocosComApartamentos(blocosComApartamentos.map(b => 
      b.id === id ? { ...b, [campo]: valor } : b
    ));
  };

  const handleCadastroCompleto = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingCadastro(true);

    try {
      let empreendimento;
      
      // 1. Usar empreendimento existente ou criar novo
      if (usarEmpreendimentoExistente && cadastroCompleto.empreendimento_existente) {
        // Buscar empreendimento existente
        const empExistente = empreendimentos.find(e => e.uid === cadastroCompleto.empreendimento_existente);
        if (!empExistente) throw new Error('Empreendimento não encontrado');
        empreendimento = empExistente;
      } else {
        // Criar novo empreendimento
        const empData = {
          nome: cadastroCompleto.nome,
          cidade: cadastroCompleto.cidade,
          endereco: cadastroCompleto.endereco || '',
          cep: cadastroCompleto.cep || '',
          total_blocos: 0,
          total_apartamentos: 0,
          ativo: true
        };

        empreendimento = await empreendimentosService.criarEmpreendimento(empData);
        if (!empreendimento) throw new Error('Erro ao criar empreendimento');
      }

      let totalApartamentos = 0;
      
      // 2. Processar cada bloco com seus apartamentos
      for (const blocoItem of blocosComApartamentos) {
        let bloco;

        // 2.1. Usar bloco existente ou criar novo
        if (blocoItem.usar_existente && blocoItem.bloco_existente_uid) {
          // Buscar bloco existente
          const blocoExistente = blocos.find(b => b.uid === blocoItem.bloco_existente_uid);
          if (!blocoExistente) throw new Error('Bloco não encontrado');
          bloco = blocoExistente;
        } else {
          // Criar novo bloco
          if (!blocoItem.nome.trim()) continue;
          
          const blocoData = {
            empreendimento_uid: empreendimento.uid,
            nome: blocoItem.nome.trim(),
            total_andares: 0,
            apartamentos_por_andar: 0
          };

          bloco = await empreendimentosService.criarBloco(blocoData);
          if (!bloco) throw new Error('Erro ao criar bloco');
        }

        // 2.2. Processar apartamentos deste bloco
        const apartamentosArray = blocoItem.apartamentos
          .split(',')
          .map(a => a.trim())
          .filter(a => a);

        // 2.3. Criar apartamentos
        for (const numeroApt of apartamentosArray) {
          try {
            // Extrair andar do número do apartamento
            const andar = parseInt(numeroApt.substring(0, numeroApt.length - 2)) || 0;
            
            await empreendimentosService.criarApartamento({
              bloco_uid: bloco.uid,
              numero: numeroApt,
              andar: andar,
              quartos: 0,
              ocupado: false
            });
            totalApartamentos++;
          } catch (aptError: any) {
            // Se for erro de duplicação, apenas avisa mas continua
            if (aptError?.code === '23505') {
              console.warn(`Apartamento ${numeroApt} já existe no bloco ${blocoItem.nome}, pulando...`);
            } else {
              throw aptError;
            }
          }
        }
      }

      // 3. Limpar formulário e mostrar sucesso
      const nomeEmp = usarEmpreendimentoExistente 
        ? empreendimentos.find(e => e.uid === cadastroCompleto.empreendimento_existente)?.nome 
        : cadastroCompleto.nome;
      
      setCadastroCompleto({
        empreendimento_existente: '',
        nome: '',
        cidade: '',
        endereco: '',
        cep: ''
      });
      setBlocosComApartamentos([{ id: '1', nome: '', usar_existente: false, apartamentos: '' }]);
      setUsarEmpreendimentoExistente(false);

      alert(`✅ Sucesso!\n\nEmpreendimento: ${nomeEmp}\nBlocos adicionados: ${blocosComApartamentos.filter(b => b.nome.trim()).length}\nTotal de apartamentos criados: ${totalApartamentos}`);
      
      // Recarregar dados
      carregarDados();
    } catch (error: any) {
      console.error('Erro no cadastro completo:', error);
      
      let mensagemErro = '❌ Erro ao cadastrar:\n\n';
      
      if (error?.code === '23505') {
        mensagemErro += 'Já existe um apartamento com este número neste bloco.\n\nVerifique se você não está tentando cadastrar apartamentos duplicados.';
      } else if (error?.message) {
        mensagemErro += error.message;
      } else {
        mensagemErro += 'Erro desconhecido. Verifique o console para mais detalhes.';
      }
      
      alert(mensagemErro);
    } finally {
      setLoadingCadastro(false);
    }
  };

  const handleLimparCadastro = () => {
    setCadastroCompleto({
      empreendimento_existente: '',
      nome: '',
      cidade: '',
      endereco: '',
      cep: ''
    });
    setBlocosComApartamentos([{ id: '1', nome: '', usar_existente: false, apartamentos: '' }]);
    setUsarEmpreendimentoExistente(false);
  };

  // Clique para editar morador
  const abrirModalEditarMorador = (morador: Morador) => {
    setMoradorEmEdicao({
      ...morador,
      telefone: formatarTelefoneEdicao(morador.telefone || ''),
    });
    setModalEditarMorador(true);
  };

  const fecharModalEditarMorador = () => {
    setModalEditarMorador(false);
    setMoradorEmEdicao(null);
  };

  const abrirModalDependentes = (morador: Morador) => {
    setMoradorSelecionado(morador);
    setModalDependentes(true);
  };

  const fecharModalDependentes = () => {
    setModalDependentes(false);
    setMoradorSelecionado(null);
    setNovoDependente({ nome: '', parentesco: '', whatsapp: '' });
  };

  const handleAdicionarDependente = async () => {
    if (!moradorSelecionado || !novoDependente.nome || !novoDependente.parentesco) {
      alert('Preencha nome e parentesco do dependente');
      return;
    }

    setLoadingDependente(true);
    try {
      await moradoresService.adicionarDependente(moradorSelecionado.uid, {
        nome: novoDependente.nome.toUpperCase(),
        parentesco: novoDependente.parentesco,
        whatsapp: novoDependente.whatsapp ? novoDependente.whatsapp.replace(/\D/g, '') : undefined
      });

      alert('✅ Dependente adicionado com sucesso!');
      setNovoDependente({ nome: '', parentesco: '', whatsapp: '' });
      
      // Recarregar moradores
      carregarDados();
    } catch (error) {
      console.error('Erro ao adicionar dependente:', error);
      alert('❌ Erro ao adicionar dependente');
    } finally {
      setLoadingDependente(false);
    }
  };

  const handleRemoverDependente = async (dependente_uid: string, nomeDependente: string) => {
    if (!confirm(`Deseja realmente remover o dependente ${nomeDependente}?`)) {
      return;
    }

    try {
      await moradoresService.removerDependente(dependente_uid);
      alert('✅ Dependente removido com sucesso!');
      
      // Recarregar moradores
      carregarDados();
    } catch (error) {
      console.error('Erro ao remover dependente:', error);
      alert('❌ Erro ao remover dependente');
    }
  };

  const handleSalvarEdicaoMorador = async () => {
    if (!moradorEmEdicao) return;

    setLoadingEditarMorador(true);
    try {
      await moradoresService.atualizarMorador(moradorEmEdicao.uid, {
        nome_responsavel: moradorEmEdicao.nome_responsavel,
        telefone: moradorEmEdicao.telefone.replace(/\D/g, ''),
      });

      toast({
        title: 'Morador atualizado',
        description: 'Os dados foram salvos com sucesso.',
        variant: 'success',
      });
      setModalEditarMorador(false);
      setMoradorEmEdicao(null);
      carregarDados();
    } catch (err) {
      console.error('Erro ao atualizar morador:', err);
      toast({
        title: 'Erro ao atualizar morador',
        description: 'Não foi possível salvar as alterações. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoadingEditarMorador(false);
    }
  };

  const handleGerarLink = async () => {
    if (!filtros.empreendimento) {
      alert('Selecione um empreendimento primeiro!');
      return;
    }

    setGerandoLink(true);
    try {
      // Criar token
      const token = await cadastroTokensService.criarToken(filtros.empreendimento, 30);
      
      // Buscar nome do empreendimento
      const emp = empreendimentos.find(e => e.uid === filtros.empreendimento);
      
      // Gerar URL
      const url = cadastroTokensService.gerarUrlCadastro(token.token, emp?.nome || '');
      
      setLinkGerado(url);
      setShowLinkModal(true);
      setLinkCopiado(false);
    } catch (error) {
      console.error('Erro ao gerar link:', error);
      alert('Erro ao gerar link de cadastro');
    } finally {
      setGerandoLink(false);
    }
  };

  const handleCopiarLink = () => {
    navigator.clipboard.writeText(linkGerado);
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 3000);
  };

  // Função para gerar slug do empreendimento
  const gerarSlugEmpreendimento = (emp: Empreendimento) => {
    const nomeSlug = emp.nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .trim()
      .replace(/\s+/g, '-'); // Substitui espaços por hífen
    
    return `${emp.uid}-${nomeSlug}`;
  };

  // Função para copiar link direto do empreendimento
  const copiarLinkEmpreendimento = (emp: Empreendimento) => {
    const slug = gerarSlugEmpreendimento(emp);
    const url = `${window.location.origin}/gerenciar-empreendimentos/${slug}`;
    navigator.clipboard.writeText(url);
    alert(`Link copiado: ${url}`);
  };

  // Função para validar código de acesso
  const handleValidarCodigo = (e: React.FormEvent) => {
    e.preventDefault();
    if (codigoAcesso === CODIGO_ACESSO_CORRETO) {
      setAcessoAutorizado(true);
      setErroAcesso(false);
    } else {
      setErroAcesso(true);
      setCodigoAcesso('');
    }
  };

  const exportarParaExcel = () => {
    const moradoresFiltrados = moradores.filter(m => {
      const nomeMatch = !filtros.nome || m.nome_responsavel.toLowerCase().includes(filtros.nome.toLowerCase());
      const whatsappMatch = !filtros.whatsapp || 
        m.telefone?.includes(filtros.whatsapp) || 
        m.dependentes?.some(d => d.whatsapp?.includes(filtros.whatsapp));
      const empMatch = !filtros.empreendimento || m.apartamento?.bloco?.empreendimento?.uid === filtros.empreendimento;
      const blocoMatch = !filtros.bloco || m.apartamento?.bloco?.uid === filtros.bloco;
      const aptMatch = !filtros.apartamento || m.apartamento?.uid === filtros.apartamento;
      return nomeMatch && whatsappMatch && empMatch && blocoMatch && aptMatch;
    });

    // Criar arquivo Excel usando HTML table (compatível com Excel)
    const excelContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; }
          td, th { white-space: nowrap; vertical-align: top; }
        </style>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Moradores</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <table border="1">
          <thead>
            <tr style="background-color: #2563eb; color: white; font-weight: bold;">
              <th style="white-space: nowrap;">Nome</th>
              <th style="white-space: nowrap;">Telefone</th>
              <th style="white-space: nowrap;">Empreendimento</th>
              <th style="white-space: nowrap;">Bloco</th>
              <th style="white-space: nowrap;">Apartamento</th>
              <th style="white-space: nowrap;">Cidade</th>
              <th style="white-space: nowrap;">Dependentes</th>
              <th style="white-space: nowrap;">Data Cadastro</th>
            </tr>
          </thead>
          <tbody>
            ${moradoresFiltrados.map(m => `
              <tr>
                <td style="white-space: nowrap;">${m.nome_responsavel}</td>
                <td style="white-space: nowrap;">${m.telefone}</td>
                <td style="white-space: nowrap;">${m.apartamento?.bloco?.empreendimento?.nome || ''}</td>
                <td style="white-space: nowrap;">${m.apartamento?.bloco?.nome || ''}</td>
                <td style="white-space: nowrap;">${m.apartamento?.numero || ''}</td>
                <td style="white-space: nowrap;">${m.apartamento?.bloco?.empreendimento?.cidade || ''}</td>
                <td style="white-space: nowrap;">${m.dependentes && m.dependentes.length > 0 
                  ? m.dependentes.map(d => `${d.nome} (${d.parentesco})${d.whatsapp ? ' - ' + d.whatsapp : ''}`).join('; ') 
                  : 'Nenhum'}</td>
                <td style="white-space: nowrap;">${new Date(m.created_at).toLocaleDateString('pt-BR')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `moradores_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
  };

  const exportarParaPDF = async () => {
    const moradoresFiltrados = moradores.filter(m => {
      const nomeMatch = !filtros.nome || m.nome_responsavel.toLowerCase().includes(filtros.nome.toLowerCase());
      const whatsappMatch = !filtros.whatsapp || 
        m.telefone?.includes(filtros.whatsapp) || 
        m.dependentes?.some(d => d.whatsapp?.includes(filtros.whatsapp));
      const empMatch = !filtros.empreendimento || m.apartamento?.bloco?.empreendimento?.uid === filtros.empreendimento;
      const blocoMatch = !filtros.bloco || m.apartamento?.bloco?.uid === filtros.bloco;
      const aptMatch = !filtros.apartamento || m.apartamento?.uid === filtros.apartamento;
      return nomeMatch && whatsappMatch && empMatch && blocoMatch && aptMatch;
    });

    // Criar conteúdo HTML para PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          h1 { color: #2563eb; text-align: center; font-size: 20px; margin-bottom: 5px; }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
          .date { color: #666; font-size: 11px; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9px; }
          th, td { border: 1px solid #ddd; padding: 6px 4px; text-align: left; }
          th { background-color: #2563eb; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .footer { margin-top: 15px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📋 Relatório de Moradores</h1>
          <p class="date">Gerado em: ${new Date().toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <p class="date"><strong>Total de moradores: ${moradoresFiltrados.length}</strong></p>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 18%;">Nome</th>
              <th style="width: 11%;">Telefone</th>
              <th style="width: 18%;">Empreendimento</th>
              <th style="width: 8%;">Bloco</th>
              <th style="width: 6%;">Apto</th>
              <th style="width: 11%;">Cidade</th>
              <th style="width: 20%;">Dependentes</th>
              <th style="width: 8%;">Cadastro</th>
            </tr>
          </thead>
          <tbody>
            ${moradoresFiltrados.map(m => `
              <tr>
                <td>${m.nome_responsavel}</td>
                <td>${m.telefone}</td>
                <td>${m.apartamento?.bloco?.empreendimento?.nome || '-'}</td>
                <td>${m.apartamento?.bloco?.nome || '-'}</td>
                <td>${m.apartamento?.numero || '-'}</td>
                <td>${m.apartamento?.bloco?.empreendimento?.cidade || '-'}</td>
                <td style="font-size: 8px;">${m.dependentes && m.dependentes.length > 0 
                  ? m.dependentes.map(d => `${d.nome} (${d.parentesco})`).join('; ') 
                  : 'Nenhum'}</td>
                <td>${new Date(m.created_at).toLocaleDateString('pt-BR')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          Sistema de Gerenciamento de Moradores
        </div>
      </body>
      </html>
    `;

    // Criar iframe oculto para impressão
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) return;

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Aguardar carregamento e imprimir
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print();
        // Remover iframe após impressão
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 250);
    };
  };

  // Se não tem acesso autorizado e não tem slug na URL, mostrar tela de código
  if (!acessoAutorizado && !empreendimentoSlug) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4">
        <Card className="w-full max-w-md p-8 dark:bg-gray-800 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Acesso Restrito
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Digite o código de acesso para continuar
            </p>
          </div>

          <form onSubmit={handleValidarCodigo} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Código de Acesso
              </label>
              <input
                type="password"
                value={codigoAcesso}
                onChange={(e) => {
                  setCodigoAcesso(e.target.value);
                  setErroAcesso(false);
                }}
                placeholder="Digite o código"
                className={`w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  erroAcesso ? 'border-red-500' : 'border-gray-300'
                }`}
                autoFocus
              />
              {erroAcesso && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Código incorreto. Tente novamente.
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
            >
              Acessar
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-800 dark:text-blue-300 text-center">
              💡 Para acessar um empreendimento específico, use o link direto fornecido pelo administrador
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-4 sm:py-6 md:py-8 px-3 sm:px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header + Tabs */}
        <div className="mb-6 sm:mb-8">
          <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-gray-900/70 shadow-lg border border-blue-100/70 dark:border-gray-700 px-4 sm:px-8 pt-5 sm:pt-6 pb-4 flex flex-col gap-4 sm:gap-5">
            {/* Ícone + título */}
            <div className="flex items-center gap-4 w-full">
              <div className="relative">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Building2 className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
                <span className="absolute -bottom-1 -right-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-semibold shadow-md">
                  GM
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                  Gerenciar Empreendimentos
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Cadastre e visualize empreendimentos, blocos, apartamentos e moradores em um único painel organizado.
                </p>
              </div>
            </div>

            {/* Badges + Tabs */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full mt-1">
              {/* Badges de contexto */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 text-xs sm:text-sm">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 border border-blue-100 dark:border-blue-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Gestão de moradores
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200 border border-purple-100 dark:border-purple-700">
                  Blocos & apartamentos
                </span>
              </div>

              {/* Tabs integradas ao header */}
              <div className="grid grid-cols-2 sm:flex sm:flex-nowrap gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab('moradores')}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm sm:text-base shadow-sm border ${
                    activeTab === 'moradores'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span>Moradores</span>
                </button>
                <button
                  onClick={() => setActiveTab('cadastro')}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm sm:text-base shadow-sm border ${
                    activeTab === 'cadastro'
                      ? 'bg-green-600 text-white border-green-600 shadow-md'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Cadastro Completo</span>
                  <span className="sm:hidden">Cadastro</span>
                </button>
              </div>
            </div>

            {/* Glow de fundo */}
            <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 blur-3xl" />
          </div>
        </div>

        {/* Content */}
        <Card className="p-4 sm:p-6 dark:bg-gray-800">
          {/* Cadastro Completo */}
          {activeTab === 'cadastro' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Cadastro Completo
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Cadastre um empreendimento com seus blocos e apartamentos de uma vez
                </p>
              </div>

              <form onSubmit={handleCadastroCompleto} className="space-y-6">
                {/* Dados do Empreendimento */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Dados do Empreendimento
                    </h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={usarEmpreendimentoExistente}
                        onChange={(e) => setUsarEmpreendimentoExistente(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Usar existente</span>
                    </label>
                  </div>
                  
                  {usarEmpreendimentoExistente ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Selecione o Empreendimento *
                      </label>
                      <select
                        required
                        value={cadastroCompleto.empreendimento_existente}
                        onChange={(e) => setCadastroCompleto({ ...cadastroCompleto, empreendimento_existente: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600"
                      >
                        <option value="">Selecione...</option>
                        {empreendimentos.map(emp => (
                          <option key={emp.uid} value={emp.uid}>
                            {emp.nome} - {emp.cidade}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Você irá adicionar novos blocos e apartamentos a este empreendimento
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Nome do Empreendimento *"
                        value={cadastroCompleto.nome}
                        onChange={(e) => setCadastroCompleto({ ...cadastroCompleto, nome: e.target.value })}
                        className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Cidade *"
                        value={cadastroCompleto.cidade}
                        onChange={(e) => setCadastroCompleto({ ...cadastroCompleto, cidade: e.target.value })}
                        className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600"
                      />
                      <input
                        type="text"
                        placeholder="Endereço"
                        value={cadastroCompleto.endereco}
                        onChange={(e) => setCadastroCompleto({ ...cadastroCompleto, endereco: e.target.value })}
                        className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600"
                      />
                      <input
                        type="text"
                        placeholder="CEP"
                        value={cadastroCompleto.cep}
                        onChange={(e) => setCadastroCompleto({ ...cadastroCompleto, cep: e.target.value })}
                        className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600"
                      />
                    </div>
                  )}
                </div>

                {/* Configuração de Blocos e Apartamentos */}
                <div className="p-4 sm:p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                        <Home className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                          Blocos e Apartamentos
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          Adicione os blocos e seus apartamentos
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={adicionarBloco}
                      className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 px-4 py-2.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="font-medium">Adicionar Bloco</span>
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {blocosComApartamentos.map((bloco, index) => (
                      <div key={bloco.id} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Bloco {index + 1}</span>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={bloco.usar_existente}
                              onChange={(e) => atualizarBloco(bloco.id, 'usar_existente', e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-xs text-gray-600 dark:text-gray-400">Usar existente</span>
                          </label>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {bloco.usar_existente ? (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Selecione o Bloco *
                                </label>
                                <select
                                  required
                                  value={bloco.bloco_existente_uid || ''}
                                  onChange={(e) => atualizarBloco(bloco.id, 'bloco_existente_uid', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                >
                                  <option value="">Selecione...</option>
                                  {blocos
                                    .filter(b => {
                                      if (usarEmpreendimentoExistente && cadastroCompleto.empreendimento_existente) {
                                        return b.empreendimento_uid === cadastroCompleto.empreendimento_existente;
                                      }
                                      return false;
                                    })
                                    .map(b => (
                                      <option key={b.uid} value={b.uid}>
                                        Bloco {b.nome}
                                      </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Adicionar apartamentos a este bloco
                                </p>
                              </div>
                            ) : (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Nome do Bloco *
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="A"
                                  value={bloco.nome}
                                  onChange={(e) => atualizarBloco(bloco.id, 'nome', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                />
                              </div>
                            )}
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Apartamentos *
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="101,102,201,202,301,302"
                                value={bloco.apartamentos}
                                onChange={(e) => atualizarBloco(bloco.id, 'apartamentos', e.target.value)}
                                className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600"
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Separe por vírgula
                              </p>
                            </div>
                          </div>
                          
                          {blocosComApartamentos.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removerBloco(bloco.id)}
                              className="mt-6 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Remover bloco"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 mt-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      <strong>📝 Como funciona:</strong>
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                      <li>Cada bloco tem seus próprios apartamentos</li>
                      <li>Clique em "Adicionar Bloco" para cadastrar mais blocos</li>
                      <li>Digite os números dos apartamentos separados por vírgula</li>
                    </ul>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-3">
                      <strong>Exemplo:</strong> Bloco A com apartamentos "101,102,201,202" e Bloco B com "101,102,103"
                    </p>
                  </div>
                </div>

                {/* Botões */}
                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    onClick={handleLimparCadastro}
                    className="bg-gray-500 hover:bg-gray-600 text-white"
                    disabled={loadingCadastro}
                  >
                    Limpar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                    disabled={loadingCadastro}
                  >
                    {loadingCadastro ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Cadastrando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Cadastrar Tudo
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Moradores */}
          {activeTab === 'moradores' && (
            <div>
              {/* Alerta quando empreendimento da URL não é encontrado */}
              {empreendimentoSlug && !filtros.empreendimento && empreendimentos.length > 0 && (
                <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                        Empreendimento não encontrado
                      </h3>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        O empreendimento da URL "<span className="font-mono">{empreendimentoSlug}</span>" não foi encontrado.
                        Verifique se o link está correto ou selecione um empreendimento manualmente.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                  Moradores Cadastrados ({moradoresFiltradosOrdenados.length})
                </h2>
                <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                  {/* Botões de visualização */}
                  <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => setVisualizacao('grid')}
                      className={`p-2 rounded transition-all ${
                        visualizacao === 'grid'
                          ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                      title="Visualização em Grid"
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setVisualizacao('lista')}
                      className={`p-2 rounded transition-all ${
                        visualizacao === 'lista'
                          ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                      title="Visualização em Lista"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                  <Button
                    onClick={exportarParaExcel}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2"
                    disabled={moradores.length === 0}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="hidden sm:inline">Excel</span>
                  </Button>
                  <Button
                    onClick={exportarParaPDF}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-2"
                    disabled={moradores.length === 0}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">PDF</span>
                  </Button>
                </div>
              </div>

              {/* Filtros */}
              <div className="mb-6 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filtros
                </h3>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <div className="flex-1 min-w-[200px] flex gap-2">
                    <select
                      value={filtros.empreendimento}
                      onChange={(e) => setFiltros({ ...filtros, empreendimento: e.target.value, bloco: '', apartamento: '' })}
                      disabled={!!empreendimentoSlug}
                      className="flex-1 px-3 py-2 text-sm border rounded-lg dark:bg-gray-600 dark:text-white dark:border-gray-500 focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      <option value="">Todos Empreendimentos</option>
                      {empreendimentos.map(emp => (
                        <option key={emp.uid} value={emp.uid}>{emp.nome}</option>
                      ))}
                    </select>
                    {filtros.empreendimento && !empreendimentoSlug && (
                      <button
                        type="button"
                        onClick={() => {
                          const emp = empreendimentos.find(e => e.uid === filtros.empreendimento);
                          if (emp) copiarLinkEmpreendimento(emp);
                        }}
                        className="p-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg transition-colors"
                        title="Copiar link direto deste empreendimento"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <select
                    value={filtros.bloco}
                    onChange={(e) => setFiltros({ ...filtros, bloco: e.target.value, apartamento: '' })}
                    disabled={!filtros.empreendimento}
                    className="flex-1 min-w-[150px] px-3 py-2 text-sm border rounded-lg dark:bg-gray-600 dark:text-white dark:border-gray-500 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">Todos Blocos</option>
                    {blocos
                      .filter(b => !filtros.empreendimento || b.empreendimento_uid === filtros.empreendimento)
                      .map(bloco => (
                        <option key={bloco.uid} value={bloco.uid}>Bloco {bloco.nome}</option>
                      ))}
                  </select>

                  <select
                    value={filtros.apartamento}
                    onChange={(e) => setFiltros({ ...filtros, apartamento: e.target.value })}
                    disabled={!filtros.bloco}
                    className="flex-1 min-w-[150px] px-3 py-2 text-sm border rounded-lg dark:bg-gray-600 dark:text-white dark:border-gray-500 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">Todos Apartamentos</option>
                    {apartamentos
                      .filter(a => !filtros.bloco || a.bloco_uid === filtros.bloco)
                      .map(apt => (
                        <option key={apt.uid} value={apt.uid}>Apto {apt.numero}</option>
                      ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={filtros.nome}
                    onChange={(e) => setFiltros({ ...filtros, nome: e.target.value })}
                    className="flex-1 min-w-[150px] px-3 py-2 text-sm border rounded-lg dark:bg-gray-600 dark:text-white dark:border-gray-500 focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                  />

                  <input
                    type="text"
                    placeholder="Buscar por WhatsApp..."
                    value={filtros.whatsapp}
                    onChange={(e) => setFiltros({ ...filtros, whatsapp: e.target.value })}
                    className="flex-1 min-w-[150px] px-3 py-2 text-sm border rounded-lg dark:bg-gray-600 dark:text-white dark:border-gray-500 focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                  />

                  <button
                    onClick={handleGerarLink}
                    disabled={!filtros.empreendimento || gerandoLink}
                    title="Gerar Link de Cadastro"
                    className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-600 dark:text-gray-300 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {gerandoLink ? (
                      <div className="animate-spin w-5 h-5 border-2 border-gray-600 dark:border-gray-300 border-t-transparent rounded-full"></div>
                    ) : (
                      <Link className="w-5 h-5" />
                    )}
                  </button>
                </div>
                
                {(filtros.empreendimento || filtros.bloco || filtros.apartamento || filtros.nome || filtros.whatsapp) && (
                  <button
                    onClick={() => setFiltros({ empreendimento: '', bloco: '', apartamento: '', nome: '', whatsapp: '' })}
                    className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Limpar filtros
                  </button>
                )}
              </div>

              {moradoresFiltradosOrdenados.length === 0 && !loading ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-50" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                    Nenhum morador cadastrado
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Use a rota /cadastro-moradores para cadastrar novos moradores
                  </p>
                </div>
              ) : (
                <>
                  {/* Visualização em Grid */}
                  {visualizacao === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {moradoresPaginados.map((morador) => (
                        <Card key={morador.uid} className="p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                          {/* Header do Card */}
                          <div className="flex items-start justify-between gap-3 mb-5">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                                {morador.nome_responsavel.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight mb-1 truncate">
                                  {morador.nome_responsavel}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                                  {morador.apartamento?.bloco?.empreendimento?.cidade || 'N/A'}
                                </p>
                              </div>
                            </div>

                            {/* Ícone discreto para editar morador */}
                            <button
                              type="button"
                              onClick={() => abrirModalEditarMorador(morador)}
                              className="p-1.5 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                              title="Editar morador (nome e telefone)"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Informações de Contato */}
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <Phone className="w-4 h-4 text-blue-500" />
                              <span className="font-medium">{morador.telefone}</span>
                            </div>
                            {morador.email && (
                              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <Mail className="w-4 h-4 text-blue-500" />
                                <span className="truncate">{morador.email}</span>
                              </div>
                            )}
                          </div>

                          {/* Localização */}
                          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl mb-4 border border-gray-100 dark:border-gray-600">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1 truncate">
                                  {morador.apartamento?.bloco?.empreendimento?.nome || 'N/A'}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  Bloco {morador.apartamento?.bloco?.nome || 'N/A'} • Apto {morador.apartamento?.numero || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Dependentes */}
                          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  Dependentes ({morador.dependentes?.length || 0})
                                </span>
                              </div>
                              <button
                                onClick={() => abrirModalDependentes(morador)}
                                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all hover:scale-105 shadow-sm"
                                title="Adicionar dependente"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            
                            {morador.dependentes && morador.dependentes.length > 0 ? (
                              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                {morador.dependentes.map((dep) => (
                                  <div
                                    key={dep.uid}
                                    className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{dep.nome}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{dep.parentesco}</p>
                                      </div>
                                      {dep.whatsapp && (
                                        <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                                          <Phone className="w-3 h-3 text-green-600 dark:text-green-400" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                                  Nenhum dependente cadastrado
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Footer */}
                          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              📅 {new Date(morador.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    /* Visualização em Lista */
                    <div className="space-y-3">
                      {moradoresPaginados.map((morador, index) => {
                        // Verificar se é o primeiro morador ou se mudou de empreendimento
                        const empreendimentoAtual = morador.apartamento?.bloco?.empreendimento?.nome || 'Sem Empreendimento';
                        const empreendimentoAnterior = index > 0 
                          ? moradoresPaginados[index - 1].apartamento?.bloco?.empreendimento?.nome || 'Sem Empreendimento'
                          : null;
                        const mostrarCabecalho = index === 0 || empreendimentoAtual !== empreendimentoAnterior;

                        return (
                          <div key={morador.uid}>
                            {/* Cabeçalho do Empreendimento */}
                            {mostrarCabecalho && (
                              <div className="mb-3 pb-2 border-b-2 border-blue-500 dark:border-blue-400">
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {empreendimentoAtual}
                                  </h3>
                                  {morador.apartamento?.bloco?.empreendimento?.cidade && (
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                      • {morador.apartamento.bloco.empreendimento.cidade}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Card do Morador */}
                            <div className="p-3 sm:p-4 border rounded-lg hover:shadow-md transition-shadow dark:border-gray-600 bg-white dark:bg-gray-700 ml-0 sm:ml-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                        {/* Informações do Responsável */}
                        <div>
                          <div className="flex items-center gap-2 mb-2 sm:mb-3">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-purple-600 dark:text-purple-400" />
                            <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white break-words">
                              {morador.nome_responsavel}
                            </h3>
                          </div>
                          
                          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span>{morador.telefone}</span>
                            </div>
                            
                            {morador.email && (
                              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span>{morador.email}</span>
                              </div>
                            )}
                            
                            {morador.apartamento && (
                              <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5" />
                                <span>
                                  {morador.apartamento.bloco?.empreendimento?.nome || 'N/A'} - 
                                  Bloco {morador.apartamento.bloco?.nome || 'N/A'}, 
                                  Apto {morador.apartamento.numero}
                                </span>
                              </div>
                            )}
                            
                            {morador.apartamento?.bloco?.empreendimento?.cidade && (
                              <div className="text-xs text-gray-500 dark:text-gray-500">
                                {morador.apartamento.bloco.empreendimento.cidade}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Dependentes */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm">
                              Dependentes ({morador.dependentes?.length || 0})
                            </h4>
                            <button
                              onClick={() => abrirModalDependentes(morador)}
                              className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors flex items-center gap-1"
                              title="Adicionar dependente"
                            >
                              <Plus className="w-3 h-3" />
                              <span className="hidden sm:inline">Adicionar</span>
                            </button>
                          </div>
                          
                          {morador.dependentes && morador.dependentes.length > 0 ? (
                            <div className="space-y-1.5 sm:space-y-2">
                              {morador.dependentes.map((dep) => (
                                <div
                                  key={dep.uid}
                                  className="p-2 bg-gray-50 dark:bg-gray-600 rounded text-xs sm:text-sm flex items-start justify-between gap-2"
                                >
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-white break-words">
                                      {dep.nome}
                                    </p>
                                    <div className="flex flex-wrap gap-2 sm:gap-3 text-xs text-gray-600 dark:text-gray-400 mt-1">
                                      <span>{dep.parentesco}</span>
                                      {dep.whatsapp && (
                                        <>
                                          <span>•</span>
                                          <span className="flex items-center gap-1 break-all">
                                            <Phone className="w-3 h-3 flex-shrink-0" />
                                            {dep.whatsapp}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleRemoverDependente(dep.uid, dep.nome)}
                                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                                    title="Remover dependente"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 italic">
                              Nenhum dependente cadastrado
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Data de Cadastro */}
                      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
                        Cadastrado em: {new Date(morador.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                    {/* Controles de Paginação */}
                    {totalPaginas > 1 && (
                      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, moradoresFiltradosOrdenados.length)} de {moradoresFiltradosOrdenados.length} moradores
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPaginaAtual(1)}
                            disabled={paginaAtual === 1}
                            className="px-3 py-2 text-sm rounded-lg border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Primeira página"
                          >
                            ««
                          </button>
                          
                          <button
                            onClick={() => setPaginaAtual(prev => Math.max(1, prev - 1))}
                            disabled={paginaAtual === 1}
                            className="px-3 py-2 text-sm rounded-lg border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Página anterior"
                          >
                            «
                          </button>

                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                              .filter(page => {
                                // Mostrar primeira, última e páginas próximas à atual
                                return page === 1 || 
                                       page === totalPaginas || 
                                       (page >= paginaAtual - 1 && page <= paginaAtual + 1);
                              })
                              .map((page, index, array) => (
                                <div key={page} className="flex items-center gap-1">
                                  {index > 0 && array[index - 1] !== page - 1 && (
                                    <span className="px-2 text-gray-400">...</span>
                                  )}
                                  <button
                                    onClick={() => setPaginaAtual(page)}
                                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                      paginaAtual === page
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-600 dark:border-gray-600'
                                    }`}
                                  >
                                    {page}
                                  </button>
                                </div>
                              ))}
                          </div>

                          <button
                            onClick={() => setPaginaAtual(prev => Math.min(totalPaginas, prev + 1))}
                            disabled={paginaAtual === totalPaginas}
                            className="px-3 py-2 text-sm rounded-lg border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Próxima página"
                          >
                            »
                          </button>

                          <button
                            onClick={() => setPaginaAtual(totalPaginas)}
                            disabled={paginaAtual === totalPaginas}
                            className="px-3 py-2 text-sm rounded-lg border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Última página"
                          >
                            »»
                          </button>
                        </div>
                      </div>
                    )}
                  </>
              )}
            </div>
          )}

          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </Card>

        {/* Modal de Edição de Morador */}
        {modalEditarMorador && moradorEmEdicao && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Editar Morador
                </h3>
                <button
                  type="button"
                  onClick={fecharModalEditarMorador}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome do Responsável
                  </label>
                  <input
                    type="text"
                    value={moradorEmEdicao.nome_responsavel}
                    onChange={e => setMoradorEmEdicao(prev => prev ? { ...prev, nome_responsavel: e.target.value.toUpperCase() } : prev)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={moradorEmEdicao.telefone}
                    onChange={e => {
                      const formatado = formatarTelefoneEdicao(e.target.value);
                      setMoradorEmEdicao(prev => prev ? { ...prev, telefone: formatado } : prev);
                    }}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  onClick={fecharModalEditarMorador}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
                  disabled={loadingEditarMorador}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSalvarEdicaoMorador}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  disabled={loadingEditarMorador}
                >
                  {loadingEditarMorador ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Dependentes */}
        {modalDependentes && moradorSelecionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Adicionar Dependente
                  </h3>
                  <button
                    onClick={fecharModalDependentes}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Morador:</strong> {moradorSelecionado.nome_responsavel}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {moradorSelecionado.apartamento?.bloco?.empreendimento?.nome} - 
                    Bloco {moradorSelecionado.apartamento?.bloco?.nome}, 
                    Apto {moradorSelecionado.apartamento?.numero}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={novoDependente.nome}
                      onChange={(e) => setNovoDependente({ ...novoDependente, nome: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-green-500"
                      placeholder="Nome do dependente"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Parentesco *
                    </label>
                    <select
                      required
                      value={novoDependente.parentesco}
                      onChange={(e) => setNovoDependente({ ...novoDependente, parentesco: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Selecione...</option>
                      <option value="Cônjuge">Cônjuge</option>
                      <option value="Filho(a)">Filho(a)</option>
                      <option value="Pai/Mãe">Pai/Mãe</option>
                      <option value="Irmão(ã)">Irmão(ã)</option>
                      <option value="Avô(ó)">Avô(ó)</option>
                      <option value="Neto(a)">Neto(a)</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      WhatsApp (opcional)
                    </label>
                    <input
                      type="tel"
                      value={novoDependente.whatsapp}
                      onChange={(e) => {
                        const valor = e.target.value.replace(/\D/g, '');
                        const formatado = valor.length <= 10
                          ? valor.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
                          : valor.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
                        setNovoDependente({ ...novoDependente, whatsapp: formatado });
                      }}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-green-500"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    onClick={fecharModalDependentes}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAdicionarDependente}
                    disabled={loadingDependente || !novoDependente.nome || !novoDependente.parentesco}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                  >
                    {loadingDependente ? 'Salvando...' : 'Adicionar'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Link Gerado */}
        {showLinkModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <Link className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Link de Cadastro Gerado!
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Compartilhe este link com o morador
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Link */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Link de Cadastro:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={linkGerado}
                    readOnly
                    className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono"
                  />
                  <button
                    onClick={handleCopiarLink}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {linkCopiado ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Informações */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Informações Importantes:
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• Este link é único e só pode ser usado uma vez</li>
                  <li>• Expira em 30 dias</li>
                  <li>• Após o cadastro, o link ficará inválido</li>
                  <li>• Envie por WhatsApp, Email ou SMS</li>
                </ul>
              </div>

              {/* Botões */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="w-full sm:flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
                >
                  Fechar
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent('Olá! Segue o link para cadastro: ' + linkGerado)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  <span className="whitespace-nowrap">Enviar por WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
