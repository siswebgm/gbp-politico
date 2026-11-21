import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, ArrowLeft, UserCheck, AlertCircle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/use-toast';
import { supabaseClient } from '@/lib/supabase';
import { useCompanyStore } from '@/store/useCompanyStore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RequerenteComDemanda {
  demanda_uid: string;
  requerente_uid: string;
  requerente_nome: string;
  requerente_cpf: string;
  requerente_whatsapp: string | null;
  requerente_nascimento: string | null;
  requerente_genero: string | null;
  requerente_cep: string | null;
  requerente_logradouro: string | null;
  requerente_numero: string | null;
  requerente_bairro: string | null;
  requerente_cidade: string | null;
  requerente_uf: string | null;
  requerente_referencia: string | null;
  tipo_de_demanda: string;
  nivel_de_urgencia: string;
  criado_em: string;
  logradouro: string | null;
  bairro: string | null;
  cidade: string | null;
  cadastrado_em_pessoas: boolean;
}

export function RequerentesNaoCadastrados() {
  const navigate = useNavigate();
  const { company } = useCompanyStore();
  const [requerentes, setRequerentes] = useState<RequerenteComDemanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [mostrarApenasNaoCadastrados, setMostrarApenasNaoCadastrados] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [cadastrando, setCadastrando] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Buscar requerentes não cadastrados
  useEffect(() => {
    loadRequerentes();
  }, [company?.uid]);

  const loadRequerentes = async () => {
    if (!company?.uid) return;

    try {
      setLoading(true);

      // Buscar demandas com join em requerentes
      const { data: demandas, error } = await supabaseClient
        .from('gbp_demandas_ruas')
        .select(`
          uid,
          tipo_de_demanda,
          nivel_de_urgencia,
          criado_em,
          logradouro,
          bairro,
          cidade,
          requerente_uid
        `)
        .eq('empresa_uid', company.uid)
        .eq('excluido', false)
        .not('requerente_uid', 'is', null)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      // Buscar dados dos requerentes
      const requerenteUids = (demandas || []).map(d => d.requerente_uid).filter(Boolean);
      
      let requerentesData: any[] = [];
      if (requerenteUids.length > 0) {
        const { data: reqs } = await supabaseClient
          .from('gbp_requerentes_demanda_rua')
          .select('uid, nome, cpf, whatsapp, nascimento, genero, cep, logradouro, numero, bairro, cidade, uf, referencia')
          .in('uid', requerenteUids);
        
        requerentesData = reqs || [];
      }

      // Buscar CPFs já cadastrados em gbp_eleitores
      const { data: eleitores } = await supabaseClient
        .from('gbp_eleitores')
        .select('cpf')
        .eq('empresa_uid', company.uid);

      const cpfsCadastrados = new Set(
        (eleitores || []).map(e => e.cpf?.replace(/\D/g, '')).filter(Boolean)
      );

      // Combinar dados
      const combinados = (demandas || []).map(d => {
        const req = requerentesData.find(r => r.uid === d.requerente_uid);
        const cpfLimpo = req?.cpf?.replace(/\D/g, '');
        return {
          demanda_uid: d.uid,
          requerente_uid: d.requerente_uid || '',
          requerente_nome: req?.nome || '',
          requerente_cpf: req?.cpf || '',
          requerente_whatsapp: req?.whatsapp || null,
          requerente_nascimento: req?.nascimento || null,
          requerente_genero: req?.genero || null,
          requerente_cep: req?.cep || null,
          requerente_logradouro: req?.logradouro || null,
          requerente_numero: req?.numero || null,
          requerente_bairro: req?.bairro || null,
          requerente_cidade: req?.cidade || null,
          requerente_uf: req?.uf || null,
          requerente_referencia: req?.referencia || null,
          tipo_de_demanda: d.tipo_de_demanda,
          nivel_de_urgencia: d.nivel_de_urgencia,
          criado_em: d.criado_em,
          logradouro: d.logradouro,
          bairro: d.bairro,
          cidade: d.cidade,
          cadastrado_em_pessoas: cpfLimpo ? cpfsCadastrados.has(cpfLimpo) : false,
        };
      }).filter(r => r.requerente_cpf && r.requerente_cpf.trim() !== '');

      setRequerentes(combinados);
    } catch (error) {
      console.error('Erro ao carregar requerentes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar por busca e checkbox
  const filteredRequerentes = requerentes.filter(r => {
    const search = searchTerm.toLowerCase();
    const matchSearch = (
      r.requerente_nome?.toLowerCase().includes(search) ||
      r.requerente_cpf?.includes(search) ||
      r.tipo_de_demanda?.toLowerCase().includes(search) ||
      r.cidade?.toLowerCase().includes(search)
    );
    const matchCadastro = mostrarApenasNaoCadastrados ? !r.cadastrado_em_pessoas : true;
    return matchSearch && matchCadastro;
  });

  // Paginação
  const totalPages = Math.ceil(filteredRequerentes.length / itemsPerPage);
  const paginatedRequerentes = filteredRequerentes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  };

  const handleNavigateToDemanda = (uid: string) => {
    navigate(`/app/documentos/demandas-ruas/${uid}/detalhes`);
  };

  // Obter ou criar categoria "Requerente de Demanda"
  const obterCategoriaRequerente = async (empresaUid: string): Promise<string> => {
    const NOME_CATEGORIA = 'Requerente de Demanda';
    try {
      const { data: categorias } = await supabaseClient
        .from('gbp_categorias')
        .select('uid, nome')
        .eq('empresa_uid', empresaUid);
      
      const categoriaExistente = (categorias || []).find(c => c.nome === NOME_CATEGORIA);
      if (categoriaExistente) {
        return categoriaExistente.uid;
      }
      
      const { data: novaCategoria } = await supabaseClient
        .from('gbp_categorias')
        .insert([{
          nome: NOME_CATEGORIA,
          tipo_uid: null,
          empresa_uid: empresaUid
        }])
        .select('uid')
        .single();
      
      return novaCategoria?.uid || '';
    } catch (error) {
      console.error('Erro ao obter/criar categoria:', error);
      throw new Error('Não foi possível obter ou criar a categoria para o requerente.');
    }
  };

  // Cadastrar requerente como pessoa
  const cadastrarRequerente = async (requerente: RequerenteComDemanda) => {
    if (!company?.uid) return;
    
    try {
      const cpfLimpo = requerente.requerente_cpf.replace(/\D/g, '');
      const whatsappLimpo = requerente.requerente_whatsapp?.replace(/\D/g, '') || null;
      const cepLimpo = requerente.requerente_cep?.replace(/\D/g, '') || null;
      const generoFormatado = requerente.requerente_genero
        ? requerente.requerente_genero.charAt(0).toUpperCase() + requerente.requerente_genero.slice(1).toLowerCase()
        : null;
      
      const categoriaUid = await obterCategoriaRequerente(company.uid);
      
      const { error } = await supabaseClient
        .from('gbp_eleitores')
        .insert([{
          nome: requerente.requerente_nome,
          cpf: cpfLimpo,
          whatsapp: whatsappLimpo,
          nascimento: requerente.requerente_nascimento,
          genero: generoFormatado,
          cep: cepLimpo,
          logradouro: requerente.requerente_logradouro,
          numero: requerente.requerente_numero,
          bairro: requerente.requerente_bairro,
          cidade: requerente.requerente_cidade,
          uf: requerente.requerente_uf,
          complemento: requerente.requerente_referencia,
          empresa_uid: company.uid,
          categoria_uid: categoriaUid,
          responsavel: 'Demanda',
        }]);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Erro ao cadastrar requerente:', error);
      return false;
    }
  };

  // Cadastrar em massa
  const handleCadastrarSelecionados = async () => {
    if (!company?.uid || selectedIds.size === 0) return;
    
    setCadastrando(true);
    let sucesso = 0;
    let falha = 0;
    
    const selecionados = paginatedRequerentes.filter(r => selectedIds.has(r.demanda_uid));
    
    for (const requerente of selecionados) {
      const result = await cadastrarRequerente(requerente);
      if (result) {
        sucesso++;
      } else {
        falha++;
      }
    }
    
    setShowConfirmModal(false);
    setSelectedIds(new Set());
    setSelectAll(false);
    
    toast({
      title: 'Cadastro concluído',
      description: `${sucesso} requerente(s) cadastrado(s) com sucesso${falha > 0 ? `, ${falha} falhou(s)` : ''}.`,
      variant: sucesso > 0 ? 'success' : 'destructive',
    });
    
    // Recarregar lista
    await loadRequerentes();
    setCadastrando(false);
  };

  // Toggle seleção individual
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setSelectAll(newSelected.size === paginatedRequerentes.length);
  };

  // Toggle selecionar todos
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedRequerentes.map(r => r.demanda_uid)));
    }
    setSelectAll(!selectAll);
  };

  const naoCadastradosDisponiveis = filteredRequerentes.filter(r => !r.cadastrado_em_pessoas);
  const podeCadastrar = selectedIds.size > 0 && !cadastrando;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/app/documentos/demandas-ruas')}
                className="flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white break-words">
                  Requerentes de Demandas
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 break-words">
                  Lista de requerentes com CPF
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-1.5">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  {filteredRequerentes.length}
                </span>
              </div>
              {mostrarApenasNaoCadastrados && naoCadastradosDisponiveis.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={!podeCadastrar}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Cadastrar</span>
                  <span className="sm:hidden">{selectedIds.size}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Filtros */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, CPF, tipo de demanda ou cidade..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Checkbox
              id="nao-cadastrados"
              checked={mostrarApenasNaoCadastrados}
              onCheckedChange={(checked) => {
                setMostrarApenasNaoCadastrados(checked as boolean);
                setCurrentPage(1);
              }}
            />
            <label
              htmlFor="nao-cadastrados"
              className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              Mostrar apenas não cadastrados em Pessoas
            </label>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredRequerentes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Nenhum requerente encontrado com os filtros atuais.' : 'Nenhum requerente encontrado.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Header da lista com seleção */}
            {mostrarApenasNaoCadastrados && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <Checkbox
                  id="select-all"
                  checked={selectAll && paginatedRequerentes.length > 0}
                  onCheckedChange={toggleSelectAll}
                  disabled={paginatedRequerentes.length === 0}
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Selecionar todos ({paginatedRequerentes.length})
                </label>
              </div>
            )}

            <div className="space-y-4">
              {paginatedRequerentes.map((requerente) => (
                <Card key={requerente.demanda_uid} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4">
                      {/* Header do card com checkbox e info */}
                      <div className="flex items-start gap-3">
                        {mostrarApenasNaoCadastrados && !requerente.cadastrado_em_pessoas && (
                          <Checkbox
                            checked={selectedIds.has(requerente.demanda_uid)}
                            onCheckedChange={() => toggleSelection(requerente.demanda_uid)}
                            className="mt-1 flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full flex-shrink-0 ${requerente.cadastrado_em_pessoas ? 'bg-green-100 dark:bg-green-900/40' : 'bg-amber-100 dark:bg-amber-900/40'}`}>
                              {requerente.cadastrado_em_pessoas ? (
                                <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                              ) : (
                                <UserPlus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white break-words">
                                {requerente.requerente_nome}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 break-all">
                                CPF: {requerente.requerente_cpf}
                              </p>
                              {requerente.cadastrado_em_pessoas && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                                  ✓ Cadastrado em Pessoas
                                </p>
                              )}
                              {requerente.requerente_whatsapp && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 break-all">
                                  WhatsApp: {requerente.requerente_whatsapp}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div className="flex flex-col sm:flex-row">
                              <span className="text-gray-500 dark:text-gray-400">Tipo:</span>
                              <span className="ml-0 sm:ml-2 text-gray-900 dark:text-white break-words">{requerente.tipo_de_demanda}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row">
                              <span className="text-gray-500 dark:text-gray-400">Urgência:</span>
                              <span className="ml-0 sm:ml-2 text-gray-900 dark:text-white">{requerente.nivel_de_urgencia}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row">
                              <span className="text-gray-500 dark:text-gray-400">Cidade:</span>
                              <span className="ml-0 sm:ml-2 text-gray-900 dark:text-white break-words">{requerente.cidade || '-'}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row">
                              <span className="text-gray-500 dark:text-gray-400">Data:</span>
                              <span className="ml-0 sm:ml-2 text-gray-900 dark:text-white">{formatDate(requerente.criado_em)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Botão de ação */}
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleNavigateToDemanda(requerente.demanda_uid)}
                          className="w-full sm:w-auto"
                        >
                          Ver demanda
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de confirmação de cadastro em massa */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent className="w-[95%] sm:max-w-[450px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg flex-shrink-0">
                <UserPlus className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <AlertDialogTitle className="text-lg sm:text-xl break-words">Cadastrar Requerentes</AlertDialogTitle>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogDescription className="text-sm">
            Cadastrar {selectedIds.size} requerente(s) em Pessoas?
          </AlertDialogDescription>
          <AlertDialogFooter className="flex flex-row items-center justify-end gap-3">
            <AlertDialogCancel disabled={cadastrando} className="mt-0 h-10">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCadastrarSelecionados}
              disabled={cadastrando}
              className="bg-green-600 hover:bg-green-700 h-10"
            >
              {cadastrando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                'Confirmar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
