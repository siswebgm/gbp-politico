import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Building2, Users, Plus, Trash2, Save, CheckCircle, Home, Lock, Unlock, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { moradoresService } from '../../services/moradoresService';
import { empreendimentosService, Empreendimento, Bloco, Apartamento } from '../../services/empreendimentosService';
import { cadastroTokensService } from '../../services/cadastroTokensService';

interface Dependente {
  id: string;
  nome: string;
  parentesco: string;
  whatsapp?: string;
}

interface FormData {
  empreendimento_uid: string;
  bloco_uid: string;
  andar: string;
  apartamento_uid: string;
  nome_responsavel: string;
  telefone: string;
  email: string;
  dependentes: Dependente[];
}

export function CadastroMoradores() {
  const [searchParams] = useSearchParams();
  const empreendimentoParam = searchParams.get('empreendimento');
  const tokenParam = searchParams.get('token');
  const empreendimentoUidParam = searchParams.get('empreendimento_uid');
  
  const [formData, setFormData] = useState<FormData>({
    empreendimento_uid: '',
    bloco_uid: '',
    andar: '',
    apartamento_uid: '',
    nome_responsavel: '',
    telefone: '',
    email: '',
    dependentes: []
  });

  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [apartamentos, setApartamentos] = useState<Apartamento[]>([]);
  const [andares, setAndares] = useState<number[]>([]);
  const [empreendimentoBloqueado, setEmpreendimentoBloqueado] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loadingEmpreendimentos, setLoadingEmpreendimentos] = useState(true);
  const [gridExpandido, setGridExpandido] = useState(false);
  
  // Estados para controle de acesso
  const [acessoAutorizado, setAcessoAutorizado] = useState(false);
  const [codigoAcesso, setCodigoAcesso] = useState('');
  const [erroAcesso, setErroAcesso] = useState(false);
  const CODIGO_ACESSO_CORRETO = '8433135';
  
  // Estados para validação de token
  const [tokenValido, setTokenValido] = useState<boolean | null>(null);
  const [tokenMensagem, setTokenMensagem] = useState('');
  const [validandoToken, setValidandoToken] = useState(false);

  // Verificar se precisa de código de acesso
  useEffect(() => {
    // Se tem token na URL, libera acesso automaticamente
    if (tokenParam) {
      setAcessoAutorizado(true);
    }
  }, [tokenParam]);

  // Carregar empreendimentos ao montar o componente
  useEffect(() => {
    if (acessoAutorizado || empreendimentoParam || empreendimentoUidParam) {
      carregarEmpreendimentos();
    }
  }, [acessoAutorizado, empreendimentoParam, empreendimentoUidParam]);

  // Validar token da URL
  useEffect(() => {
    const validarTokenUrl = async () => {
      if (tokenParam) {
        setValidandoToken(true);
        try {
          const resultado = await cadastroTokensService.validarToken(tokenParam);
          setTokenValido(resultado.valido);
          setTokenMensagem(resultado.mensagem);
          
          if (!resultado.valido) {
            console.error('❌ Token inválido:', resultado.mensagem);
          } else {
            console.log('✅ Token válido');
          }
        } catch (error) {
          console.error('Erro ao validar token:', error);
          setTokenValido(false);
          setTokenMensagem('Erro ao validar o link de cadastro.');
        } finally {
          setValidandoToken(false);
        }
      } else {
        // Sem token = acesso livre
        setTokenValido(true);
      }
    };

    validarTokenUrl();
  }, [tokenParam]);

  // Processar parâmetro de empreendimento da URL (nome)
  useEffect(() => {
    if (empreendimentoParam && empreendimentos.length > 0) {
      // Buscar empreendimento pelo nome (case-insensitive)
      const empreendimentoEncontrado = empreendimentos.find(
        emp => emp.nome.toLowerCase().trim() === empreendimentoParam.toLowerCase().trim()
      );
      
      if (empreendimentoEncontrado) {
        setFormData(prev => ({ ...prev, empreendimento_uid: empreendimentoEncontrado.uid }));
        setEmpreendimentoBloqueado(true);
        console.log('🏢 Empreendimento pré-selecionado (nome):', empreendimentoEncontrado.nome);
      }
    }
  }, [empreendimentoParam, empreendimentos]);

  // Processar parâmetro de empreendimento_uid da URL (UID)
  useEffect(() => {
    if (empreendimentoUidParam && empreendimentos.length > 0) {
      const empreendimentoEncontrado = empreendimentos.find(
        emp => emp.uid === empreendimentoUidParam
      );
      
      if (empreendimentoEncontrado) {
        setFormData(prev => ({ ...prev, empreendimento_uid: empreendimentoEncontrado.uid }));
        setEmpreendimentoBloqueado(true);
        console.log('🏢 Empreendimento pré-selecionado (UID):', empreendimentoEncontrado.nome);
      }
    }
  }, [empreendimentoUidParam, empreendimentos]);

  // Carregar blocos quando selecionar empreendimento
  useEffect(() => {
    if (formData.empreendimento_uid) {
      carregarBlocos(formData.empreendimento_uid);
      // Limpar seleções dependentes
      setFormData(prev => ({ ...prev, bloco_uid: '', apartamento_uid: '' }));
      setApartamentos([]);
    } else {
      setBlocos([]);
      setApartamentos([]);
    }
  }, [formData.empreendimento_uid]);

  // Carregar apartamentos quando selecionar bloco
  useEffect(() => {
    if (formData.bloco_uid) {
      carregarApartamentos(formData.bloco_uid);
      // Limpar seleção de apartamento
      setFormData(prev => ({ ...prev, apartamento_uid: '' }));
    } else {
      setApartamentos([]);
    }
  }, [formData.bloco_uid]);

  const carregarEmpreendimentos = async () => {
    try {
      setLoadingEmpreendimentos(true);
      const data = await empreendimentosService.listarEmpreendimentos();
      setEmpreendimentos(data);
    } catch (error) {
      console.error('Erro ao carregar empreendimentos:', error);
      alert('Erro ao carregar empreendimentos');
    } finally {
      setLoadingEmpreendimentos(false);
    }
  };

  const carregarBlocos = async (empreendimento_uid: string) => {
    try {
      const data = await empreendimentosService.listarBlocos(empreendimento_uid);
      setBlocos(data);
    } catch (error) {
      console.error('Erro ao carregar blocos:', error);
      alert('Erro ao carregar blocos');
    }
  };

  const carregarApartamentos = async (bloco_uid: string) => {
    try {
      const data = await empreendimentosService.listarApartamentos(bloco_uid);
      console.log('📦 Total de apartamentos carregados:', data.length);
      console.log('✅ Apartamentos disponíveis (ocupado !== true):', data.filter(apt => apt.ocupado !== true).length);
      console.log('🔒 Apartamentos ocupados (ocupado === true):', data.filter(apt => apt.ocupado === true).length);
      console.log('❓ Apartamentos com status null/undefined:', data.filter(apt => apt.ocupado == null).length);
      
      // Log de exemplo de alguns apartamentos
      if (data.length > 0) {
        console.log('Exemplo de apartamentos:', data.slice(0, 3).map(apt => ({
          numero: apt.numero,
          ocupado: apt.ocupado,
          andar: apt.andar,
          uid: apt.uid
        })));
      }
      
      // Extrair andares únicos e ordenar
      const andaresUnicos = [...new Set(data.map(apt => apt.andar).filter(andar => andar != null))]
        .sort((a, b) => a - b);
      
      console.log('🏢 Andares disponíveis:', andaresUnicos);
      
      setApartamentos(data);
      setAndares(andaresUnicos);
    } catch (error) {
      console.error('Erro ao carregar apartamentos:', error);
      alert('Erro ao carregar apartamentos');
    }
  };

  // Formatar telefone: adiciona máscara (XX) XXXXX-XXXX
  const formatarTelefone = (valor: string): string => {
    const apenasNumeros = valor.replace(/\D/g, '').slice(0, 11); // Limita a 11 dígitos
    if (apenasNumeros.length <= 10) {
      return apenasNumeros.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return apenasNumeros.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };

  // Remover formatação do telefone para salvar
  const limparTelefone = (valor: string): string => {
    return valor.replace(/\D/g, '');
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    let valorFormatado = value;

    // Formatar nome para maiúsculas
    if (field === 'nome_responsavel') {
      valorFormatado = value.toUpperCase();
    }

    // Formatar telefone com máscara
    if (field === 'telefone') {
      valorFormatado = formatarTelefone(value);
    }

    setFormData(prev => ({
      ...prev,
      [field]: valorFormatado
    }));
  };

  const adicionarDependente = () => {
    const novoDependente: Dependente = {
      id: Date.now().toString(),
      nome: '',
      parentesco: '',
      whatsapp: ''
    };
    setFormData(prev => ({
      ...prev,
      dependentes: [...prev.dependentes, novoDependente]
    }));
  };

  const removerDependente = (id: string) => {
    setFormData(prev => ({
      ...prev,
      dependentes: prev.dependentes.filter(dep => dep.id !== id)
    }));
  };

  const atualizarDependente = (id: string, field: keyof Dependente, value: string) => {
    let valorFormatado = value;

    // Formatar nome do dependente para maiúsculas
    if (field === 'nome') {
      valorFormatado = value.toUpperCase();
    }

    // Formatar WhatsApp com máscara
    if (field === 'whatsapp') {
      valorFormatado = formatarTelefone(value);
    }

    setFormData(prev => ({
      ...prev,
      dependentes: prev.dependentes.map(dep =>
        dep.id === id ? { ...dep, [field]: valorFormatado } : dep
      )
    }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Chamar serviço de cadastro
      await moradoresService.cadastrarMorador({
        apartamento_uid: formData.apartamento_uid,
        nome_responsavel: formData.nome_responsavel,
        telefone: limparTelefone(formData.telefone), // Salvar sem máscara
        email: formData.email,
        dependentes: formData.dependentes.map(dep => ({
          nome: dep.nome,
          parentesco: dep.parentesco,
          whatsapp: dep.whatsapp ? limparTelefone(dep.whatsapp) : undefined // Salvar WhatsApp sem máscara
        }))
      });

      // Marcar apartamento como ocupado
      await empreendimentosService.marcarApartamentoComoOcupado(formData.apartamento_uid);
      
      // Marcar token como usado (se houver)
      if (tokenParam) {
        await cadastroTokensService.marcarComoUsado(tokenParam);
        console.log('🔒 Token marcado como usado');
      }
      
      setSuccess(true);
    } catch (error) {
      console.error('Erro ao cadastrar morador:', error);
      alert('Erro ao cadastrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Se não tem acesso autorizado, não tem token e não vierem uid+nome do empreendimento na URL, mostrar tela de código
  if (!acessoAutorizado && !tokenParam && !(empreendimentoParam && empreendimentoUidParam)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4">
        <Card className="w-full max-w-md p-8 dark:bg-gray-800 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <Home className="w-8 h-8 text-white" />
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
              💡 Para cadastrar em um empreendimento específico, use o link fornecido pelo administrador
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Tela de validação de token
  if (validandoToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Validando link...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Aguarde enquanto verificamos seu link de cadastro.
          </p>
        </Card>
      </div>
    );
  }

  // Tela de token inválido
  if (tokenValido === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Link Inválido
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {tokenMensagem}
          </p>
          <button
            onClick={() => window.location.href = 'https://www.google.com'}
            className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Sair
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-4 sm:py-6 md:py-8 px-3 sm:px-4 md:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <Card className="mb-6 sm:mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                  <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
                  Cadastro de Moradores
                </h1>
                <p className="text-sm sm:text-base text-blue-100">
                  Preencha os dados abaixo para registrar os moradores do empreendimento
                </p>
              </div>
            </div>
          </div>
          
          {/* Informações Rápidas */}
          <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Empreendimentos</span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {empreendimentos.length}
              </p>
            </div>
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Home className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Blocos</span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {blocos.length}
              </p>
            </div>
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Apartamentos</span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {apartamentos.length}
              </p>
            </div>
          </div>
        </Card>

        {/* Modal de Sucesso */}
        {success && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in duration-300">
              {/* Ícone de Sucesso */}
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
              </div>
              
              {/* Título com nome do morador */}
              <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-3">
                Parabéns, {formData.nome_responsavel.split(' ')[0]}! 🎉
              </h2>
              
              {/* Mensagem */}
              <p className="text-center text-gray-600 dark:text-gray-400 mb-2">
                Seu cadastro já foi realizado com sucesso!
              </p>
              <p className="text-center text-sm text-gray-500 dark:text-gray-500 mb-6">
                Agradecemos por fazer parte da nossa comunidade.
              </p>
              
              {/* Botão */}
              <button
                onClick={() => window.location.href = 'https://www.google.com'}
                className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Sair
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Seção: Dados do Imóvel */}
          <Card className="p-4 sm:p-5 md:p-6 mb-4 sm:mb-6 dark:bg-gray-800 shadow-md">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Building2 className="w-5 h-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                Dados do Imóvel
              </h2>
            </div>

            {/* Empreendimento - Linha completa */}
            <div className="mb-4">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Empreendimento *
              </label>
              <select
                required
                value={formData.empreendimento_uid}
                onChange={(e) => handleInputChange('empreendimento_uid', e.target.value)}
                disabled={loadingEmpreendimentos || empreendimentoBloqueado}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <option value="">Selecione o empreendimento</option>
                {empreendimentos.map(emp => (
                  <option key={emp.uid} value={emp.uid}>
                    {emp.nome} - {emp.cidade}
                  </option>
                ))}
              </select>
            </div>

            {/* Bloco, Andar e Apartamento - Grid compacto */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Bloco *
                </label>
                <select
                  required
                  value={formData.bloco_uid}
                  onChange={(e) => handleInputChange('bloco_uid', e.target.value)}
                  disabled={!formData.empreendimento_uid || blocos.length === 0}
                  className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 transition-colors"
                >
                  <option value="">Bloco</option>
                  {blocos.map(bloco => (
                    <option key={bloco.uid} value={bloco.uid}>
                      {bloco.nome}
                    </option>
                  ))}
                </select>
                {formData.empreendimento_uid && blocos.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Nenhum bloco
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Andar *
                </label>
                <select
                  required
                  value={formData.andar}
                  onChange={(e) => handleInputChange('andar', e.target.value)}
                  disabled={!formData.bloco_uid || andares.length === 0}
                  className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 transition-colors"
                >
                  <option value="">Andar</option>
                  {andares.map(andar => (
                    <option key={andar} value={andar}>
                      {andar}º
                    </option>
                  ))}
                </select>
                {formData.bloco_uid && andares.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Nenhum andar
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Apartamento *
                </label>
                <select
                  required
                  value={formData.apartamento_uid}
                  onChange={(e) => handleInputChange('apartamento_uid', e.target.value)}
                  disabled={!formData.andar || apartamentos.filter(apt => apt.ocupado !== true && apt.andar?.toString() === formData.andar).length === 0}
                  className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 transition-colors"
                >
                  <option value="">Apto</option>
                  {apartamentos
                    .filter(apt => apt.ocupado !== true && apt.andar?.toString() === formData.andar)
                    .map(apt => (
                      <option key={apt.uid} value={apt.uid}>
                        {apt.numero}
                      </option>
                    ))}
                </select>
                {formData.andar && apartamentos.filter(apt => apt.andar?.toString() === formData.andar).length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Nenhum apto
                  </p>
                )}
                {formData.andar && apartamentos.filter(apt => apt.andar?.toString() === formData.andar && apt.ocupado !== true).length === 0 && apartamentos.filter(apt => apt.andar?.toString() === formData.andar).length > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    ⚠️ Todos ocupados
                  </p>
                )}
              </div>
            </div>

            {/* Painel de Status dos Apartamentos */}
            {formData.bloco_uid && apartamentos.length > 0 && (
              <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Status {formData.andar && `- ${formData.andar}º Andar`}
                    </h3>
                  </div>
                </div>

                {/* Cards de Status */}
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700">
                  {/* Total */}
                  <div className="p-3 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Building2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Total</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formData.andar 
                        ? apartamentos.filter(apt => apt.andar?.toString() === formData.andar).length
                        : apartamentos.length}
                    </p>
                  </div>

                  {/* Disponíveis */}
                  <div className="p-3 text-center hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Unlock className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-400">Disponíveis</span>
                    </div>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formData.andar
                        ? apartamentos.filter(apt => apt.ocupado !== true && apt.andar?.toString() === formData.andar).length
                        : apartamentos.filter(apt => apt.ocupado !== true).length}
                    </p>
                  </div>

                  {/* Ocupados */}
                  <div className="p-3 text-center hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Lock className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      <span className="text-xs font-medium text-red-700 dark:text-red-400">Ocupados</span>
                    </div>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">
                      {formData.andar
                        ? apartamentos.filter(apt => apt.ocupado === true && apt.andar?.toString() === formData.andar).length
                        : apartamentos.filter(apt => apt.ocupado === true).length}
                    </p>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Taxa de Ocupação</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {(() => {
                        const aptsExibidos = formData.andar 
                          ? apartamentos.filter(apt => apt.andar?.toString() === formData.andar)
                          : apartamentos;
                        const ocupados = aptsExibidos.filter(apt => apt.ocupado === true).length;
                        return aptsExibidos.length > 0 ? Math.round((ocupados / aptsExibidos.length) * 100) : 0;
                      })()}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-red-500 h-full transition-all duration-500"
                      style={{
                        width: `${(() => {
                          const aptsExibidos = formData.andar 
                            ? apartamentos.filter(apt => apt.andar?.toString() === formData.andar)
                            : apartamentos;
                          const ocupados = aptsExibidos.filter(apt => apt.ocupado === true).length;
                          return aptsExibidos.length > 0 ? (ocupados / aptsExibidos.length) * 100 : 0;
                        })()}%`
                      }}
                    />
                  </div>
                </div>

                {/* Lista Visual de Apartamentos */}
                <div className="mt-4 px-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Legenda:</span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded-md">
                        <span className="w-3 h-3 bg-green-500 rounded"></span>
                        <span className="text-xs font-medium text-green-700 dark:text-green-400">Disponível</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded-md">
                        <span className="w-3 h-3 bg-red-500 rounded"></span>
                        <span className="text-xs font-medium text-red-700 dark:text-red-400">Ocupado</span>
                      </span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setGridExpandido(!gridExpandido)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md transition-colors text-xs font-medium"
                      title={gridExpandido ? "Modo Compacto" : "Expandir Visualização"}
                    >
                      {gridExpandido ? (
                        <>
                          <Minimize2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Compactar</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Expandir</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className={`relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg p-3 border-2 border-gray-200 dark:border-gray-700 shadow-inner ${!gridExpandido ? 'overflow-auto max-h-80' : ''}`}>
                    <div className={`grid ${gridExpandido ? 'grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14 2xl:grid-cols-16 gap-1.5 sm:gap-2' : 'grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-15 gap-2'}`}>
                      {(formData.andar 
                        ? apartamentos.filter(apt => apt.andar?.toString() === formData.andar)
                        : apartamentos
                      ).map(apt => (
                        <div
                          key={apt.uid}
                          className={`
                            relative group cursor-pointer
                            aspect-square ${gridExpandido ? 'rounded-md' : 'rounded-lg'} flex items-center justify-center
                            ${gridExpandido ? 'text-[10px] sm:text-xs' : 'text-xs'} font-bold transition-all duration-200
                            ${apt.ocupado === true 
                              ? `bg-gradient-to-br from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 ${gridExpandido ? 'shadow-sm hover:shadow-md' : 'shadow-md hover:shadow-lg'}` 
                              : `bg-gradient-to-br from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 ${gridExpandido ? 'shadow-sm hover:shadow-md' : 'shadow-md hover:shadow-lg'}`
                            }
                            ${formData.apartamento_uid === apt.uid 
                              ? `${gridExpandido ? 'ring-2' : 'ring-4'} ring-blue-500 ${gridExpandido ? 'ring-offset-1' : 'ring-offset-2'} scale-110 ${gridExpandido ? 'shadow-xl' : 'shadow-2xl'} z-10` 
                              : 'hover:scale-105'
                            }
                          `}
                          title={`Apto ${apt.numero} - ${apt.ocupado === true ? 'Ocupado' : 'Disponível'}`}
                        >
                          <span className="relative z-10 drop-shadow-sm">{apt.numero}</span>
                          {apt.ocupado === true && (
                            <div className={`absolute ${gridExpandido ? '-top-1 -right-1 w-4 h-4' : '-top-1.5 -right-1.5 w-5 h-5'} bg-white rounded-full flex items-center justify-center ${gridExpandido ? 'shadow-md' : 'shadow-lg'} border border-red-200`}>
                              <Lock className={`${gridExpandido ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-red-600`} />
                            </div>
                          )}
                          {formData.apartamento_uid === apt.uid && (
                            <div className={`absolute inset-0 bg-blue-500/20 ${gridExpandido ? 'rounded-md' : 'rounded-lg'} animate-pulse`}></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Seção: Dados do Responsável */}
          <Card className="p-4 sm:p-5 md:p-6 mb-4 sm:mb-6 dark:bg-gray-800 shadow-md">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Users className="w-5 h-5 flex-shrink-0 text-purple-600 dark:text-purple-400" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                Dados do Responsável
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome_responsavel}
                  onChange={(e) => handleInputChange('nome_responsavel', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white transition-colors"
                  placeholder="Nome do morador responsável"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  Telefone *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.telefone}
                  onChange={(e) => handleInputChange('telefone', e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white transition-colors"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </Card>

          {/* Seção: Dependentes/Residentes */}
          <Card className="p-4 sm:p-5 md:p-6 mb-4 sm:mb-6 dark:bg-gray-800 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                  Dependentes/Residentes
                </h2>
              </div>
              <Button
                type="button"
                onClick={adicionarDependente}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base px-3 sm:px-4 py-2 rounded-lg transition-colors w-full sm:w-auto justify-center"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </Button>
            </div>

            {formData.dependentes.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-gray-500 dark:text-gray-400">
                <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm sm:text-base">Nenhum dependente adicionado</p>
                <p className="text-xs sm:text-sm mt-1">Clique em "Adicionar" para incluir dependentes</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {formData.dependentes.map((dependente, index) => (
                  <div
                    key={dependente.id}
                    className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                        Dependente #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removerDependente(dependente.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        aria-label="Remover dependente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Nome
                        </label>
                        <input
                          type="text"
                          value={dependente.nome}
                          onChange={(e) => atualizarDependente(dependente.id, 'nome', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-600 dark:text-white"
                          placeholder="Nome do dependente"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Parentesco
                        </label>
                        <select
                          value={dependente.parentesco}
                          onChange={(e) => atualizarDependente(dependente.id, 'parentesco', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-600 dark:text-white"
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
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          WhatsApp
                        </label>
                        <input
                          type="tel"
                          value={dependente.whatsapp}
                          onChange={(e) => atualizarDependente(dependente.id, 'whatsapp', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-600 dark:text-white"
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Botão de Envio */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600 flex justify-end gap-3">
              <Button
                type="button"
                onClick={() => window.location.reload()}
                className="ml-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-md transition-all flex items-center gap-2 text-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Limpar</span>
              </Button>
              
              <Button
                type="submit"
                disabled={loading || success}
                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Cadastrando...</span>
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Cadastrado!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span className="whitespace-nowrap">Cadastrar Morador</span>
                  </>
                )}
              </Button>
            </div>
          </Card>
        </form>

      </div>
    </div>
  );
}
