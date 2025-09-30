// React e bibliotecas principais
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Papa from 'papaparse';
import * as Dialog from '@radix-ui/react-dialog';

// Serviços e utilitários
import { supabaseClient } from '../../lib/supabase';
import { useCompanyStore } from '../../store/useCompanyStore';
import { eleitoresService } from '../../services/eleitores';

// Ícones
import { Upload, AlertCircle, Info, Clock, FileText, X, Download, Trash2, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';

// Formatação de data
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Excel
import * as ExcelJS from 'exceljs';

// Autenticação e níveis de acesso
import { useAuthStore } from '../../store/useAuthStore';
import { hasRestrictedAccess } from '../../constants/accessLevels';

// Hooks
import { useCategories } from '../../hooks/useCategories';
import { useCategoryTypes } from '../../hooks/useCategoryTypes';

interface ImportProgress {
  total: number;
  processed: number;
  success: number;
  error: number;
  percent: number;
}

interface DeleteProgress {
  deleted: number;
  isDeleting: boolean;
}

interface CSVRow {
  nome: string;
  cpf: string;
  nascimento: string;
  whatsapp: string;
  telefone: string;
  genero: string;
  titulo: string;
  zona: string;
  secao: string;
  cep: string;
  logradouro: string;
  cidade: string;
  bairro: string;
  numero: string;
  complemento: string;
  uf: string;
  nome_mae: string;
}

interface UploadHistory {
  uid: string;
  upload_history_uid: number;
  empresa_uid: string;
  arquivo_nome: string;
  registros_total: number;
  registros_processados: number;
  status: string;
  erro_mensagem: string | null;
  registros_erro: string | null;
  created_at: string;
  updated_at: string;
}

interface Progress {
  total: number;
  processed: number;
  success: number;
  error: number;
  percent: number;
}

export function ImportarEleitores() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  
  // Logs para depuração
  console.log('[ImportarEleitores] Usuário:', user);
  console.log('[ImportarEleitores] Nível de acesso:', user?.nivel_acesso);
  console.log('[ImportarEleitores] Autenticado:', isAuthenticated);
  
  const canAccess = isAuthenticated && hasRestrictedAccess(user?.nivel_acesso);
  console.log('[ImportarEleitores] Acesso permitido?', canAccess);

  useEffect(() => {
    if (!isAuthenticated) {
      console.error('[ImportarEleitores] Usuário não autenticado');
      toast.error('Você precisa estar autenticado para acessar esta página');
      navigate('/login');
      return;
    }
    
    if (!canAccess) {
      console.error('[ImportarEleitores] Acesso negado. Nível de acesso insuficiente:', user?.nivel_acesso);
      toast.error('Você não tem permissão para acessar esta página');
      navigate('/app');
      return;
    }
  }, [canAccess, isAuthenticated, navigate, user?.nivel_acesso]);

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<UploadHistory | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFileBlocked, setIsFileBlocked] = useState(false);
  const [fileExists, setFileExists] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(5);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const startIndex = (paginaAtual - 1) * itensPorPagina;
  const endIndex = startIndex + itensPorPagina;

  const [previewData, setPreviewData] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { company } = useCompanyStore();
  const { data: categories = [] } = useCategories();
  const { data: categoryTypes = [] } = useCategoryTypes();

  // Função para abrir o modal de exclusão
  const handleOpenDeleteModal = (history: UploadHistory) => {
    setSelectedHistory(history);
    setShowDeleteModal(true);
  };

  // Função para excluir registros
  const handleConfirmDelete = async () => {
    if (!selectedHistory || !company?.uid || isDeleting) return;
    
    try {
      setIsDeleting(true);
      console.log('Iniciando exclusão do upload:', {
        upload_id: selectedHistory.upload_history_uid,
        empresa_uid: company.uid
      });

      // Buscar os eleitores deste upload
      const { data: eleitores, error: selectError } = await supabaseClient
        .from('gbp_eleitores')
        .select('*')
        .eq('upload_id', selectedHistory.upload_history_uid)
        .eq('empresa_uid', company.uid);

      if (selectError) throw selectError;

      if (!eleitores || eleitores.length === 0) {
        toast.warning('Nenhum eleitor encontrado para excluir.');
        return;
      }

      // Atualizar status do upload antes de mover os registros
      const { error: updateStatusError } = await supabaseClient
        .from('gbp_upload_history')
        .update({
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('uid', selectedHistory.uid);

      if (updateStatusError) throw updateStatusError;

      // Preparar os registros para a tabela de deletados
      const registrosParaDeletar = eleitores.map(eleitor => {
        // Selecionar apenas os campos que existem na tabela gbp_deletados
        const {
          nome,
          cpf,
          nascimento,
          whatsapp,
          telefone,
          genero,
          titulo,
          zona,
          secao,
          cep,
          logradouro,
          cidade,
          bairro,
          numero,
          complemento,
          indicado,
          uf,
          categoria,
          categoria_uid,
          responsavel,
          latitude,
          longitude,
          nome_mae,
          instagram,
          numero_do_sus,
          mes_nascimento,
          extract,
          ax_rg_cnh,
          ax_cpf,
          ax_cert_nascimento,
          ax_titulo,
          ax_comp_residencia,
          ax_foto_3x4,
          responsavel_pelo_eleitor
        } = eleitor;

        // Gerar um ID único para o registro deletado
        const deletadosUid = `del_${Math.random().toString(36).substr(2, 9)}`;

        return {
          deletados_uid: deletadosUid,
          nome,
          cpf,
          nascimento,
          whatsapp,
          telefone,
          genero,
          titulo,
          zona,
          secao,
          cep,
          logradouro,
          cidade,
          bairro,
          numero,
          complemento,
          empresa_uid: company.uid,
          indicado,
          uf,
          categoria,
          categoria_uid,
          responsavel,
          latitude,
          longitude,
          nome_mae,
          upload_id: selectedHistory.upload_history_uid,
          mes_nascimento,
          extract,
          ax_rg_cnh,
          ax_cpf,
          ax_cert_nascimento,
          ax_titulo,
          ax_comp_residencia,
          ax_foto_3x4,
          instagram,
          numero_do_sus,
          responsavel_pelo_eleitor,
          created_at: new Date().toISOString()
        };
      });

      // Inserir na tabela de deletados
      const { error: insertError } = await supabaseClient
        .from('gbp_deletados')
        .insert(registrosParaDeletar);

      if (insertError) throw insertError;

      // Deletar da tabela principal
      const { error: deleteError } = await supabaseClient
        .from('gbp_eleitores')
        .delete()
        .eq('empresa_uid', company.uid)
        .eq('upload_id', selectedHistory.upload_history_uid);

      if (deleteError) throw deleteError;

      toast.success(`${eleitores.length} eleitores foram movidos para a tabela de deletados com sucesso!`);
      setSelectedHistory(null);
      buscarHistoricoUpload();
    } catch (erro) {
      console.error('Erro ao excluir registros:', erro);
      toast.error('Erro ao excluir registros. Por favor, tente novamente.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Filtrar categorias pelo tipo selecionado
  const selectedTypeData = categoryTypes.find(type => type.nome === selectedType);
  const filteredCategories = selectedTypeData
    ? categories.filter(cat => cat.tipo_uid === selectedTypeData.uid)
    : [];

  useEffect(() => {
    // Limpar a categoria selecionada quando mudar o tipo
    setSelectedCategory('');
  }, [selectedType]);

  // Função para converter data do formato DD/MM/YYYY para YYYY-MM-DD
  const formatarData = (textoData: string | null) => {
    if (!textoData) return null;
    
    // Verifica se já está no formato ISO
    if (textoData.match(/^\d{4}-\d{2}-\d{2}$/)) return textoData;
    
    // Converte do formato DD/MM/YYYY para YYYY-MM-DD
    const partes = textoData.split('/');
    if (partes.length !== 3) return null;
    
    const dia = partes[0].padStart(2, '0');
    const mes = partes[1].padStart(2, '0');
    const ano = partes[2];
    
    // Validar data
    const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
    if (isNaN(data.getTime())) return null;
    
    return `${ano}-${mes}-${dia}`;
  };

  // Função para limpar caracteres especiais mantendo apenas números
  const limparNumeros = (valor: string | null | undefined) => {
    if (!valor) return '';
    return valor.replace(/\D/g, '');
  };

  // Função para formatar CPF
  const formatarCPF = (valor: string | null | undefined) => {
    const limpo = limparNumeros(valor);
    if (!limpo) return '';
    // Garante que tenha 11 dígitos
    return limpo.padEnd(11, '0').slice(0, 11);
  };

  // Função para formatar WhatsApp/Telefone
  const formatarTelefone = (valor: string | null | undefined) => {
    const limpo = limparNumeros(valor);
    if (!limpo) return '';
    // Garante que tenha pelo menos 10 dígitos (DDD + número)
    return limpo.padEnd(11, '0').slice(0, 11);
  };

  // Função para formatar texto com iniciais maiúsculas
  const formatarInicialMaiuscula = (texto: string | null | undefined): string => {
    if (!texto) return '';
    return texto
      .toLowerCase()
      .split(' ')
      .map(palavra => {
        if (palavra.length === 0) return '';
        // Palavras como "de", "da", "do" permanecem em minúsculo
        const conectores = ['de', 'da', 'do', 'das', 'dos', 'e'];
        if (conectores.includes(palavra)) return palavra;
        return palavra.charAt(0).toUpperCase() + palavra.slice(1);
      })
      .join(' ')
      .trim();
  };

  const refreshUploadHistory = async (empresaUid: string) => {
    if (!empresaUid) return [];

    const { data, error } = await supabaseClient
      .from('gbp_upload_history')
      .select('uid, upload_history_uid, arquivo_nome, status, registros_total, registros_processados, registros_erro, erro_mensagem, created_at, updated_at')
      .eq('empresa_uid', empresaUid)
      .eq('status', 'success')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const buscarHistoricoUpload = async () => {
    if (!company?.uid) return;

    try {
      // Buscar total de registros para paginação
      const { count } = await supabaseClient
        .from('gbp_upload_history')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_uid', company.uid)
        .neq('status', 'deleted'); // Excluir registros deletados da contagem

      setTotalPaginas(Math.ceil((count || 0) / itensPorPagina));

      // Buscar registros da página atual
      const { data, error } = await supabaseClient
        .from('gbp_upload_history')
        .select('*')
        .eq('empresa_uid', company.uid)
        .neq('status', 'deleted') // Excluir registros deletados da listagem
        .order('created_at', { ascending: false })
        .range((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina - 1);

      if (error) throw error;
      setUploadHistory(data || []);
    } catch (erro) {
      console.error('Erro ao buscar histórico:', erro);
      toast.error('Erro ao carregar histórico de uploads');
    }
  };

  useEffect(() => {
    if (company?.uid) {
      buscarHistoricoUpload();
    }
  }, [company?.uid, paginaAtual, itensPorPagina]);

  useEffect(() => {
    if (!company?.uid) return;

    const hasActiveUploads = uploadHistory.some(h => h.status === 'in_progress');
    if (!hasActiveUploads) return;

    const interval = setInterval(buscarHistoricoUpload, 5000);
    return () => clearInterval(interval);
  }, [company?.uid, uploadHistory]);

  useEffect(() => {
    if (!company?.uid) return;

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const history = await refreshUploadHistory(company.uid);
        setUploadHistory(history);
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        toast('Erro ao carregar histórico de importações', {
          type: 'error',
          duration: 4000
        });
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();

    // Inscrever-se nas mudanças em tempo real
    const subscription = supabaseClient
      .channel('gbp_upload_history_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gbp_upload_history',
          filter: `empresa_uid=eq.${company.uid}`
        },
        async (payload) => {
          console.log('Mudança detectada:', payload);
          await loadHistory();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [company?.uid]);

  const verificarArquivoExiste = async (nomeArquivo: string, empresaId: string) => {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_upload_history')
        .select('id, arquivo_nome, status')
        .eq('empresa_uid', empresaId)
        .eq('arquivo_nome', nomeArquivo)
        .eq('status', 'success')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (erro) {
      console.error('Erro ao verificar arquivo:', erro);
      return false;
    }
  };

  // Função para normalizar nomes de campos
  const normalizeFieldName = (name: string): string => {
    if (!name) return '';
    return name
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .trim();
  };

  // Mapeamento de variações comuns de nomes de campos
  const fieldVariations: Record<string, string[]> = {
    'nome': ['nome', 'name', 'eleitor', 'nomecompleto', 'nome completo'],
    'cpf': ['cpf', 'doc', 'documento'],
    'nascimento': ['nascimento', 'datanascimento', 'data_nascimento', 'datanasc', 'datanasc.'],
    'whatsapp': ['whatsapp', 'wpp', 'whats', 'telefone1', 'celular', 'telefone_1'],
    'telefone': ['telefone', 'tel', 'telefone2', 'telefone_2', 'fone', 'telefone fixo'],
    'cep': ['cep', 'codigopostal', 'código postal'],
    'logradouro': ['logradouro', 'endereco', 'endereço', 'rua', 'travessa', 'avenida', 'av'],
    'numero': ['numero', 'número', 'nº', 'nro', 'num'],
    'complemento': ['complemento', 'compl', 'apto', 'apartamento', 'bloco'],
    'bairro': ['bairro', 'distrito', 'zona'],
    'cidade': ['cidade', 'municipio', 'município', 'localidade'],
    'uf': ['uf', 'estado', 'uf_estado', 'sigla_estado'],
    'email': ['email', 'e-mail', 'correio', 'correioeletronico'],
    'zona': ['zona', 'zona_eleitoral', 'zona eleitoral'],
    'secao': ['secao', 'seção', 'secao_eleitoral', 'seção eleitoral', 'sessao', 'sessão'],
    'nome_mae': ['nomemae', 'nome_mae', 'mae', 'mãe', 'nome da mãe', 'nomedamae']
  };

  // Função para encontrar o nome do campo padrão
  const findStandardField = (header: string): string | null => {
    const normalizedHeader = normalizeFieldName(header);
    for (const [standardField, variations] of Object.entries(fieldVariations)) {
      if (variations.includes(normalizedHeader)) {
        return standardField;
      }
    }
    return null;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file || !company?.uid) {
        toast.error('Selecione um arquivo CSV válido');
        return;
      }

      // Verificar extensão do arquivo (aceita .csv e .txt)
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.csv') && !fileName.endsWith('.txt')) {
        toast.error('O arquivo deve estar no formato CSV ou TXT');
        event.target.value = '';
        return;
      }

      // Verificar tamanho do arquivo (aumentado para 20MB)
      const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB em bytes
      if (file.size > MAX_FILE_SIZE) {
        toast.error('O arquivo é muito grande. Tamanho máximo: 20MB');
        event.target.value = '';
        return;
      }

      setSelectedFile(file);

      // Validar estrutura do CSV
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
          const headers = results.meta.fields || [];
          
          // Normalizar cabeçalhos e mapear para nomes padrão
          const headerMap: Record<string, string> = {};
          const normalizedHeaders = headers.map(header => {
            const standardField = findStandardField(header);
            if (standardField) {
              headerMap[header] = standardField;
              return standardField;
            }
            return header;
          });

          // Verificar campos obrigatórios
          const requiredFields = ['nome'];
          const missingFields = requiredFields.filter(field => 
            !normalizedHeaders.includes(field)
          );

          if (missingFields.length > 0) {
            toast.error(
              <div>
                <p className="font-medium">Campos obrigatórios ausentes:</p>
                <ul className="list-disc list-inside mt-1">
                  {missingFields.map(field => (
                    <li key={field} className="text-sm">
                      {field} (tente usar: {fieldVariations[field]?.join(', ')})
                    </li>
                  ))}
                </ul>
              </div>,
              { autoClose: 8000 }
            );
            setSelectedFile(null);
            event.target.value = '';
            return;
          }

          const totalLinhas = results.data.length;
          if (totalLinhas === 0) {
            toast.error('O arquivo está vazio');
            setSelectedFile(null);
            event.target.value = '';
            return;
          }

          // Mapear os dados para os nomes de campos padronizados
          const mappedData = results.data.map((row: any) => {
            const mappedRow: any = {};
            Object.entries(row).forEach(([key, value]) => {
              const standardField = findStandardField(key) || key;
              mappedRow[standardField] = value;
            });
            return mappedRow;
          });

          // Validar formato dos dados
          const errors: string[] = [];
          mappedData.slice(0, 100).forEach((row: any, index: number) => {
            // Validar CPF (aceita com ou sem formatação)
            if (row.cpf) {
              const cpfClean = row.cpf.toString().replace(/\D/g, '');
              if (cpfClean.length !== 11 || !/^\d{11}$/.test(cpfClean)) {
                errors.push(`Linha ${index + 2}: CPF inválido (deve conter 11 números)`);
              }
            }

            // Validar data de nascimento (aceita vários formatos)
            if (row.nascimento) {
              const dateStr = row.nascimento.toString().trim();
              // Aceita DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
              if (!/^(\d{2}[\-\/]\d{2}[\-\/]\d{4}|\d{4}[\-\/]\d{2}[\-\/]\d{2})$/.test(dateStr)) {
                errors.push(`Linha ${index + 2}: Formato de data inválido. Use DD/MM/AAAA, DD-MM-AAAA ou AAAA-MM-DD`);
              }
            }

            // Validar CEP (aceita com ou sem formatação)
            if (row.ep) {
              const cepClean = row.cep.toString().replace(/\D/g, '');
              if (cepClean && cepClean.length !== 8) {
                errors.push(`Linha ${index + 2}: CEP inválido (deve conter 8 números)`);
              }
            }

            // Validar telefone/whatsapp (aceita vários formatos)
            ['whatsapp', 'telefone'].forEach(field => {
              if (row[field]) {
                const phoneClean = row[field].toString().replace(/\D/g, '');
                if (phoneClean.length < 10 || phoneClean.length > 11) {
                  errors.push(`Linha ${index + 2}: ${field} inválido (deve ter 10 ou 11 dígitos)`);
                }
              }
            });

            // Validar email (opcional, mas se existir, deve ser válido)
            if (row.email && row.email.trim()) {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(row.email)) {
                errors.push(`Linha ${index + 2}: E-mail inválido`);
              }
            }
          });

          if (errors.length > 0) {
            // Agrupar erros por tipo para facilitar a correção
            const errorGroups: Record<string, {count: number, message: string}> = {};
            
            errors.forEach(error => {
              // Extrai a mensagem base (sem o número da linha)
              const baseMessage = error.replace(/^Linha \d+: /, '');
              if (!errorGroups[baseMessage]) {
                errorGroups[baseMessage] = { count: 1, message: baseMessage };
              } else {
                errorGroups[baseMessage].count++;
              }
            });

            // Limitar a exibição a 5 tipos de erros diferentes
            const uniqueErrors = Object.values(errorGroups).slice(0, 5);
            const totalErrorTypes = Object.keys(errorGroups).length;

            toast.error(
              <div className="max-h-96 overflow-y-auto">
                <p className="font-medium mb-2">Foram encontrados {errors.length} erros no arquivo:</p>
                <ul className="mt-2 space-y-1">
                  {uniqueErrors.map((error, i) => (
                    <li key={i} className="text-sm flex items-start">
                      <span className="text-red-500 mr-1">•</span>
                      <span>
                        {error.message}
                        {error.count > 1 && (
                          <span className="text-gray-500 ml-1">(x{error.count})</span>
                        )}
                      </span>
                    </li>
                  ))}
                  {totalErrorTypes > 5 && (
                    <li className="text-sm text-gray-500 mt-1">
                      ...e mais {totalErrorTypes - 5} tipos de erros
                    </li>
                  )}
                </ul>
                <div className="mt-3 p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                  <p className="text-sm text-yellow-700">
                    <strong>Dica:</strong> Verifique se os dados estão nos formatos corretos e tente novamente.
                  </p>
                </div>
              </div>,
              { 
                autoClose: 15000, // 15 segundos
                closeButton: true,
                className: '!w-full max-w-2xl',
                bodyClassName: '!p-4',
              }
            );
            
            // Mesmo com erros, vamos mostrar a prévia para facilitar a correção
            setPreviewData(mappedData.slice(0, 3));
            setTotalRows(totalLinhas);
            
            // Não limpar o arquivo selecionado para permitir correção
            return;
          }

          setTotalRows(totalLinhas);
          setPreviewData(results.data.slice(0, 3));
          toast.success(`Arquivo válido com ${totalLinhas} registros`);
        },
        error: function(error) {
          console.error('Erro ao ler arquivo:', error);
          toast.error('Erro ao ler arquivo. Verifique se o formato está correto');
          setSelectedFile(null);
          event.target.value = '';
        }
      });
    } catch (erro) {
      console.error('Erro ao processar arquivo:', erro);
      toast.error('Erro ao processar arquivo. Tente novamente');
      setSelectedFile(null);
      if (event.target) event.target.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedType || !selectedCategory || !company?.uid) {
      toast.error('Por favor, selecione um arquivo, tipo e categoria');
      return;
    }

    // Obter o user_uid do localStorage diretamente
    const userUid = localStorage.getItem('user_uid');
    if (!userUid) {
      toast.error('Erro: Usuário não identificado');
      return;
    }

    try {
      setIsUploading(true);
      setProgress({ total: 0, processed: 0, success: 0, error: 0, percent: 0 });

      const selectedTypeData = categoryTypes.find(type => type.nome === selectedType);
      const selectedCategoryData = categories.find(cat => cat.nome === selectedCategory);

      if (!selectedTypeData?.uid || !selectedCategoryData?.uid) {
        toast.error('Tipo ou categoria inválidos');
        return;
      }

      const { data: uploadHistory, error: historyError } = await supabaseClient
        .from('gbp_upload_history')
        .insert({
          empresa_uid: company.uid,
          arquivo_nome: selectedFile.name,
          status: 'in_progress',
          registros_total: 0,
          registros_processados: 0,
          registros_erro: 0
        })
        .select()
        .single();

      if (historyError) {
        toast.error('Erro ao iniciar upload');
        return;
      }

      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: async function(results) {
          try {
            const TAMANHO_LOTE = 100;
            let processados = 0;
            let sucessos = 0;
            let erros = 0;
            const total = results.data.length;
            const cpfsDuplicadosArquivo: string[] = [];

            // Atualizar status inicial
            setProgress({ total, processed: 0, success: 0, error: 0, percent: 0 });
            await atualizarStatusUpload(uploadHistory.uid, 'processing', total, 0, 0);

            // Verificar se a coluna CPF existe no arquivo
            const temColunaCpf = results.meta.fields?.includes('cpf');

            // Map para controlar CPFs únicos no arquivo
            const cpfsUnicos = new Map<string, any>();
            const registrosSemCpf: any[] = [];

            // Primeiro passo: processar todas as linhas
            results.data.forEach((row: any, index: number) => {
              // Se não tem coluna CPF, todos os registros vão para registrosSemCpf
              if (!temColunaCpf) {
                registrosSemCpf.push({ ...row, index });
                return;
              }

              const cpfLimpo = row.cpf ? row.cpf.toString().replace(/\D/g, '') : '';
              
              // Se CPF está vazio ou é inválido, adiciona aos registros sem CPF
              if (!cpfLimpo || cpfLimpo.length !== 11) {
                registrosSemCpf.push({ ...row, index });
              } else {
                // Se tem CPF válido, verifica duplicidade
                if (cpfsUnicos.has(cpfLimpo)) {
                  cpfsDuplicadosArquivo.push(cpfLimpo);
                } else {
                  cpfsUnicos.set(cpfLimpo, { ...row, index });
                }
              }
            });

            // Atualizar progresso após validação inicial
            processados = cpfsDuplicadosArquivo.length;
            erros = processados;
            setProgress({ total, processed: processados, success: 0, error: erros, percent: Math.round((processados / total) * 100) });
            await atualizarStatusUpload(uploadHistory.uid, 'processing', total, processados, erros);

            // Verificar CPFs existentes em lotes menores (apenas para registros com CPF)
            const cpfsParaVerificar = Array.from(cpfsUnicos.keys());
            const TAMANHO_LOTE_VERIFICACAO = 50;
            const cpfsExistentes = new Set<string>();

            if (cpfsParaVerificar.length > 0) {
              for (let i = 0; i < cpfsParaVerificar.length; i += TAMANHO_LOTE_VERIFICACAO) {
                const loteCpfs = cpfsParaVerificar.slice(i, i + TAMANHO_LOTE_VERIFICACAO);
                
                const { data } = await supabaseClient
                  .from('gbp_eleitores')
                  .select('cpf')
                  .in('cpf', loteCpfs)
                  .eq('empresa_uid', company.uid);

                data?.forEach(d => cpfsExistentes.add(d.cpf));
                
                // Atualizar progresso da verificação
                processados += loteCpfs.length;
                setProgress({ 
                  total, 
                  processed: processados, 
                  success: sucessos, 
                  error: erros + cpfsExistentes.size, 
                  percent: Math.round((processados / total) * 100) 
                });
                await atualizarStatusUpload(uploadHistory.uid, 'processing', total, processados, erros + cpfsExistentes.size);
                
                // Pequena pausa para não sobrecarregar
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }

            // Remover CPFs existentes
            cpfsExistentes.forEach(cpf => {
              cpfsUnicos.delete(cpf);
            });

            // Juntar todos os registros válidos (com e sem CPF)
            const registrosParaInserir = [
              ...Array.from(cpfsUnicos.values()),
              ...registrosSemCpf
            ];

            // Processar registros em lotes
            for (let i = 0; i < registrosParaInserir.length; i += TAMANHO_LOTE) {
              const loteDados = registrosParaInserir.slice(i, i + TAMANHO_LOTE);
              
              const loteFormatado = loteDados.map((row: any) => {
                // Extrair mês da data de nascimento se existir
                let mesNascimento: number | null = null;
                if (row.nascimento) {
                  const partes = row.nascimento.split('/');
                  if (partes.length === 3) {
                    mesNascimento = parseInt(partes[1], 10);
                  }
                }

                return {
                  nome: row.nome ? formatarInicialMaiuscula(row.nome) : null,
                  cpf: temColunaCpf && row.cpf ? row.cpf.toString().replace(/\D/g, '') : null,
                  empresa_uid: company.uid,
                  upload_id: uploadHistory.upload_history_uid,
                  categoria_uid: selectedCategoryData.uid,
                  usuario_uid: userUid, // Usando o userUid do localStorage
                  whatsapp: row.whatsapp ? formatarTelefone(row.whatsapp) : null,
                  telefone: row.telefone ? formatarTelefone(row.telefone) : null,
                  nascimento: row.nascimento ? formatarData(row.nascimento) : null,
                  titulo: row.titulo || null,
                  zona: row.zona || null,
                  secao: row.secao || null,
                  cep: row.cep ? limparNumeros(row.cep) : null,
                  logradouro: row.logradouro ? formatarInicialMaiuscula(row.logradouro) : null,
                  cidade: row.cidade ? formatarInicialMaiuscula(row.cidade) : null,
                  bairro: row.bairro ? formatarInicialMaiuscula(row.bairro) : null,
                  numero: row.numero || null,
                  complemento: row.complemento ? formatarInicialMaiuscula(row.complemento) : null,
                  uf: row.uf ? row.uf.toUpperCase() : null,
                  nome_mae: row.nome_mae ? formatarInicialMaiuscula(row.nome_mae) : null,
                  genero: row.genero ? formatarInicialMaiuscula(row.genero) : null,
                  instagram: row.instagram || null,
                  latitude: row.latitude || null,
                  longitude: row.longitude || null,
                  numero_do_sus: row.numero_do_sus || null,
                  mes_nascimento: mesNascimento,
                  responsavel: 'Importação'
                };
              });

              try {
                const { error: insertError } = await supabaseClient
                  .from('gbp_eleitores')
                  .insert(loteFormatado);

                if (insertError) {
                  console.error('Erro ao inserir lote:', insertError);
                  erros += loteFormatado.length;
                } else {
                  sucessos += loteFormatado.length;
                }

                // Atualizar progresso após cada lote
                setProgress({ 
                  total, 
                  processed: processados, 
                  success: sucessos, 
                  error: erros, 
                  percent: Math.round((processados / total) * 100) 
                });
                await atualizarStatusUpload(uploadHistory.uid, 'processing', total, processados, erros);

                // Pequena pausa entre lotes
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (error) {
                console.error('Erro ao inserir lote:', error);
                erros += loteFormatado.length;
              }
            }

            // Atualizar status final
            const status = sucessos > 0 ? 'success' : 'error';
            let mensagemErro = '';

            if (temColunaCpf) {
              mensagemErro = [
                cpfsDuplicadosArquivo.length > 0 ? `${cpfsDuplicadosArquivo.length} CPFs duplicados` : '',
                cpfsExistentes.size > 0 ? `${cpfsExistentes.size} CPFs já existentes` : '',
                registrosSemCpf.length > 0 ? `${registrosSemCpf.length} registros sem CPF` : ''
              ].filter(Boolean).join(', ');
            } else {
              mensagemErro = 'Arquivo importado sem coluna CPF';
            }

            await atualizarStatusUpload(uploadHistory.uid, status, total, processados, erros, mensagemErro);

            const mensagem = erros > 0
              ? `Importação concluída: ${sucessos} registros importados, ${erros} registros ignorados (${mensagemErro})`
              : `${sucessos} registros importados com sucesso!`;

            toast.success(mensagem);
            resetAllStates();
            buscarHistoricoUpload();
          } catch (error) {
            console.error('Erro ao processar arquivo:', error);
            await atualizarStatusUpload(uploadHistory.uid, 'error', total, processados, total, 'Erro ao processar arquivo');
            toast.error('Erro ao processar arquivo');
          }
        }
      });
    } catch (erro) {
      console.error('Erro ao fazer upload:', erro);
      toast.error('Erro ao fazer upload');
      setIsUploading(false);
    }
  };

  // Função para verificar CPFs existentes na empresa
  const verificarCPFsExistentes = async (cpfs: string[]) => {
    if (!cpfs.length || !company?.uid) return new Set<string>();
    
    try {
      const TAMANHO_LOTE = 100; // Reduzir ainda mais o tamanho do lote
      const cpfsExistentes = new Set<string>();
      
      // Processar CPFs em lotes menores
      for (let i = 0; i < cpfs.length; i += TAMANHO_LOTE) {
        const loteCpfs = cpfs.slice(i, i + TAMANHO_LOTE);
        
        const { data } = await supabaseClient
          .from('gbp_eleitores')
          .select('cpf')
          .in('cpf', loteCpfs)
          .eq('empresa_uid', company.uid);

        data?.forEach(d => cpfsExistentes.add(d.cpf));
        
        // Pequena pausa entre as requisições para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return cpfsExistentes;
    } catch (erro) {
      console.error('Erro ao verificar CPFs existentes:', erro);
      // Retornar conjunto vazio em caso de erro para permitir continuar o processo
      return new Set<string>();
    }
  };

  // Função para verificar CPFs duplicados dentro da mesma empresa
  const verificarCPFsDuplicados = async (cpfs: string[]) => {
    if (!cpfs.length || !company?.uid) return [];
    try {
      // Busca CPFs que já existem para esta empresa específica
      const { data, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('cpf')
        .in('cpf', cpfs)
        .eq('empresa_uid', company.uid);

      if (error) throw error;
      return data?.map(d => d.cpf) || [];
    } catch (erro) {
      console.error('Erro ao verificar CPFs duplicados:', erro);
      return [];
    }
  };

  // Função para processar lote de registros
  const processarLote = async (lote: any[], uploadHistory: any) => {
    if (!lote.length) return { success: 0, error: 0 };
    try {
      const { error: insertError } = await supabaseClient
        .from('gbp_eleitores')
        .insert(lote);

      if (insertError) throw insertError;
      return { success: lote.length, error: 0 };
    } catch (erro) {
      console.error('Erro ao processar lote:', erro);
      return { success: 0, error: lote.length };
    }
  };

  const handleRemoveFile = () => {
    setShowDeleteModal(true);
  };

  const resetAllStates = async () => {
    try {
      // Limpar estados do arquivo
      setSelectedFile(null);
      setPreviewData([]);
      setTotalRows(0);
      setFileExists(false);
      setIsFileBlocked(false);

      // Limpar estados de progresso
      setProgress({ processed: 0, total: 0, percent: 0 });
      setIsUploading(false);

      // Limpar input file
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      // Atualizar lista de histórico
      buscarHistoricoUpload();
    } catch (error) {
      console.error('Erro ao resetar estados:', error);
    }
  };

  const processFile = async (data: any[], uploadId: number) => {
    try {
      setProgress(prev => ({ ...prev, isProcessing: true }));
      
      // Usar o novo método do eleitorService com retry
      await eleitorService.processImportFile(data, empresa_uid, uploadId);
      
      toast.success('Arquivo processado com sucesso!');
      setProgress(prev => ({ ...prev, isProcessing: false }));
      
      // Atualizar status do upload
      const { error: updateError } = await supabaseClient
        .from('gbp_upload_history')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('uid', uploadId);

      if (updateError) {
        console.error('Erro ao atualizar status do upload:', updateError);
      }

      return true;
    } catch (error: any) {
      console.error('Erro ao processar arquivo:', error);
      
      // Atualizar status do upload para erro
      const { error: updateError } = await supabaseClient
        .from('gbp_upload_history')
        .update({
          status: 'error',
          error_message: error.message || 'Erro desconhecido ao processar arquivo',
          completed_at: new Date().toISOString()
        })
        .eq('uid', uploadId);

      if (updateError) {
        console.error('Erro ao atualizar status do upload:', updateError);
      }

      toast.error(error.message || 'Erro ao processar arquivo. Tente novamente.');
      setProgress(prev => ({ ...prev, isProcessing: false }));
      return false;
    }
  };

  const handlePageChange = (page: number) => {
    setPaginaAtual(page);
  };

  const handleItemsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newItemsPerPage = parseInt(event.target.value, 10);
    setItensPorPagina(newItemsPerPage);
    setPaginaAtual(1); // Reset to first page when changing items per page
  };

  const handleDownloadTemplate = () => {
    generateExcelTemplate();
  };

  const generateExcelTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Modelo');

      // Definir as colunas
      const columns = [
        'nome',
        'cpf',
        'nascimento',
        'whatsapp',
        'telefone',
        'genero',
        'titulo',
        'zona',
        'secao',
        'cep',
        'logradouro',
        'cidade',
        'bairro',
        'numero',
        'complemento',
        'uf',
        'nome_mae',
        'responsavel',
        'latitude',
        'longitude',
        'instagram',
        'numero_do_sus'
      ];

      // Configurar as colunas
      worksheet.columns = columns.map(col => ({
        header: col,
        key: col,
        width: 15
      }));

      // Estilizar o cabeçalho
      const headerRow = worksheet.getRow(1);
      headerRow.font = {
        bold: true,
        color: { argb: 'FF000000' }
      };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Adicionar uma linha de exemplo
      worksheet.addRow({
        nome: 'João da Silva',
        cpf: '12345678900',
        nascimento: '01/01/1990',
        whatsapp: '11999999999',
        telefone: '11999999999',
        genero: 'M',
        titulo: '123456789012',
        zona: '001',
        secao: '0001',
        cep: '01234567',
        logradouro: 'Rua Exemplo',
        cidade: 'São Paulo',
        bairro: 'Centro',
        numero: '123',
        complemento: 'Apto 45',
        uf: 'SP',
        nome_mae: 'Maria da Silva',
        responsavel: 'José Santos',
        latitude: '-23.550520',
        longitude: '-46.633308',
        instagram: '@joaosilva',
        numero_do_sus: '123456789012345'
      });

      // Adicionar comentários nas células
      const whatsappCell = worksheet.getCell('D2');
      whatsappCell.note = 'Digite o número de WhatsApp';

      const telefoneCell = worksheet.getCell('E2');
      telefoneCell.note = 'Digite o número de telefone';

      const cpfCell = worksheet.getCell('B2');
      cpfCell.note = 'Digite apenas os 11 números do CPF, sem pontos ou traços';

      const cepCell = worksheet.getCell('J2');
      cepCell.note = 'Digite apenas os 8 números do CEP';

      const nascimentoCell = worksheet.getCell('C2');
      nascimentoCell.note = 'Digite a data no formato DD/MM/AAAA';

      // Gerar o arquivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'modelo_importacao.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('Modelo XLSX baixado com sucesso! Consulte as notas em cada coluna para ver o formato correto.');
    } catch (error) {
      console.error('Erro ao gerar modelo:', error);
      toast.error('Erro ao gerar modelo XLSX');
    }
  };

  const handleNextPage = () => {
    if (endIndex < uploadHistory.length) {
      setPaginaAtual(paginaAtual + 1);
    }
  };

  const handlePreviousPage = () => {
    if (paginaAtual > 1) {
      setPaginaAtual(paginaAtual - 1);
    }
  };

  const fetchUploadHistory = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_upload_history')
        .select('*')
        .eq('empresa_uid', company.uid)
        .neq('status', 'deleted') // Excluir registros deletados da listagem
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUploadHistory(data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      toast.error('Erro ao carregar histórico de uploads');
    }
  };

  useEffect(() => {
    if (company?.uid) {
      fetchUploadHistory();
    }
  }, [company?.uid]);

  if (!company) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Selecione uma empresa para importar eleitores</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex-1 pt-2 px-4 pb-4 bg-gray-50">
        <div className="space-y-8">
          {/* Cabeçalho */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/app/settings')}
                className="text-gray-400 hover:text-gray-500 mr-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
                title="Voltar para configurações"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Voltar para configurações</span>
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Importar Eleitores
                </h1>
                <p className="mt-1 text-xs text-gray-500">
                  Importe seus eleitores através de um arquivo CSV.
                </p>
              </div>
            </div>
          </div>

          {/* Área de Upload */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Upload de Arquivo
                  </h3>
                  <p className="text-sm text-gray-500">
                    Selecione um arquivo CSV para importar
                  </p>
                </div>
              </div>

              {/* Instruções do Modelo */}
              <div className="bg-blue-50 dark:bg-blue-900/50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Instruções
                </h3>
                <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>O arquivo deve estar no formato CSV (valores separados por vírgula)</li>
                  <li>O arquivo deve conter um cabeçalho com os nomes das colunas</li>
                  <li>As colunas devem estar na ordem correta conforme o modelo</li>
                  <li>CPF: quando informado, deve conter apenas números (exemplo: 12345678900)</li>
                  <li>CEP: quando informado, deve conter apenas números (exemplo: 12345678)</li>
                  <li>Data de nascimento: quando informada, usar formato DD/MM/AAAA (exemplo: 01/01/1990)</li>
                  <li>Registros com CPFs já cadastrados serão ignorados durante a importação</li>
                </ul>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={generateExcelTemplate}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:bg-blue-900 dark:text-blue-100 dark:hover:bg-blue-800"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Baixar Modelo XLSX
                  </button>
                </div>
              </div>

              {/* Área de Drop */}
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      <span>Selecione um arquivo</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept=".csv"
                        className="sr-only"
                        onChange={handleFileChange}
                        disabled={isUploading}
                      />
                    </label>
                    <p className="pl-1">ou arraste e solte</p>
                  </div>
                  <p className="text-xs text-gray-500">Arquivos CSV até 10MB</p>
                  {isFileBlocked && !isUploading && (
                    <div className="mt-2">
                      <p className="mt-1 text-sm text-red-500">Este arquivo já foi importado anteriormente. Não é possível importar o mesmo arquivo duas vezes.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Seleção de Tipo e Categoria */}
              <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1">
                    <select
                      id="type"
                      value={selectedType}
                      onChange={(e) => {
                        setSelectedType(e.target.value);
                        setSelectedCategory('');
                      }}
                      className={`block w-full rounded-md border-0 py-1.5 pl-3 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ${
                        selectedFile && !selectedType
                          ? 'text-red-900 ring-red-300 focus:ring-red-500'
                          : 'text-gray-900 ring-gray-300 focus:ring-blue-600'
                      }`}
                    >
                      <option value="">Selecione um tipo</option>
                      {categoryTypes.map((type) => (
                        <option key={type.uid} value={type.nome}>
                          {type.nome}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Categoria <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1">
                    <select
                      id="category"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      disabled={!selectedType}
                      className={`block w-full rounded-md border-0 py-1.5 pl-3 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ${
                        selectedFile && selectedType && !selectedCategory
                          ? 'text-red-900 ring-red-300 focus:ring-red-500'
                          : !selectedType
                          ? 'text-gray-500 bg-gray-50 ring-gray-200 cursor-not-allowed'
                          : 'text-gray-900 ring-gray-300 focus:ring-blue-600'
                      }`}
                    >
                      <option value="">Selecione uma categoria</option>
                      {selectedType && categories
                        .filter(category => category.tipo_uid === selectedTypeData?.uid)
                        .map((category) => (
                          <option key={category.uid} value={category.nome}>
                            {category.nome}
                          </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  {!selectedType && (
                    <p className="mt-2 text-sm text-gray-500">Primeiro selecione um tipo</p>
                  )}
                </div>
              </div>

              {/* Preview dos dados */}
              {selectedFile && (
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Arquivo selecionado:</h3>
                      <div className="mt-1 flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-500">{selectedFile.name}</span>
                        <button
                          onClick={() => {
                            setSelectedFile(null);
                            setPreviewData([]);
                            setTotalRows(0);
                            setFileExists(false);
                            const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                            if (fileInput) fileInput.value = '';
                          }}
                          className="ml-2 text-sm text-red-600 hover:text-red-800"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{totalRows} registros</p>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleUpload}
                        disabled={!selectedFile || isUploading || isFileBlocked}
                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white 
                          ${(!selectedFile || isUploading || isFileBlocked) 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}`}
                      >
                        {isUploading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processando...
                          </>
                        ) : isFileBlocked ? (
                          'Escolha outro arquivo'
                        ) : (
                          'Iniciar Importação'
                        )}
                      </button>
                    </div>
                  </div>
                  {isUploading && progress && (
                    <div className="mt-4">
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex">
                          <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                          <div>
                            <p className="text-sm text-yellow-700 font-medium">
                              Atenção! Não feche ou atualize a página
                            </p>
                            <p className="text-sm text-yellow-600">
                              Aguarde até que o upload seja concluído para evitar perda de dados
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-blue-700">
                          {progress.processed?.toLocaleString() || '0'} de {progress.total?.toLocaleString() || '0'} registros processados
                        </span>
                        <span className="text-sm font-medium text-blue-700">
                          {progress.percent || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                      {progress?.error > 0 && (
                        <p className="mt-2 text-sm text-red-600">
                          {progress?.error} {progress?.error === 1 ? 'registro com erro' : 'registros com erro'}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="mt-8">
                    <div className="flex flex-col mb-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">
                          Visualizando as primeiras 3 linhas de {totalRows} registros
                        </h3>
                      </div>
                      {/* Grid Preview */}
                      {selectedFile && !isUploading && (
                        <div className="mt-4 overflow-x-auto w-full">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                {Object.keys(previewData[0] || {}).map((header) => (
                                  <th
                                    key={header}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                  >
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {previewData.slice(0, 3).map((row, index) => (
                                <tr key={index}>
                                  {Object.values(row).map((value: any, cellIndex) => (
                                    <td
                                      key={cellIndex}
                                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                                    >
                                      {value}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Histórico de Uploads */}
              {!isUploading && !selectedFile && (
                <div className="mt-8">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Histórico de Uploads
                  </h2>
                  {isLoadingHistory ? (
                    <div className="text-center py-4">
                      <Clock className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
                      <p className="mt-2 text-sm text-gray-500">
                        Carregando histórico...
                      </p>
                    </div>
                  ) : uploadHistory.length > 0 ? (
                    <div className="space-y-4">
                      <div className="overflow-x-auto w-full">
                        <table className="min-w-full bg-white border rounded-lg">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Arquivo
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Data
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Importados
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Erros
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Ações
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {uploadHistory.map((upload) => (
                              <tr key={upload.uid} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {upload.arquivo_nome}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(upload.created_at).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    upload.status === 'success' ? 'bg-green-100 text-green-800' : 
                                    upload.status === 'error' ? 'bg-red-100 text-red-800' : 
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {upload.status === 'success' ? 'Sucesso' : 
                                     upload.status === 'error' ? 'Erro' : 'Em Progresso'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {upload.registros_processados - upload.registros_erro}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <span className="text-sm text-gray-500">{upload.registros_erro}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={() => handleOpenDeleteModal(upload)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Excluir registros"
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Paginação */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
                          <span className="text-sm text-gray-700">Mostrar</span>
                          <select
                            value={itensPorPagina}
                            onChange={(e) => {
                              setItensPorPagina(Number(e.target.value));
                              setPaginaAtual(1);
                            }}
                            className="block w-16 rounded-md border-0 py-1.5 pl-2 pr-6 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                          >
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="20">20</option>
                          </select>
                          <span className="text-sm text-gray-700 whitespace-nowrap">itens por página</span>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
                          <button
                            onClick={() => setPaginaAtual(paginaAtual - 1)}
                            disabled={paginaAtual === 1}
                            className="min-w-[80px] px-3 py-1.5 text-sm text-gray-500 bg-white border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Anterior
                          </button>
                          
                          <span className="text-sm text-gray-700 whitespace-nowrap">
                            Página {paginaAtual} de {totalPaginas}
                          </span>

                          <button
                            onClick={() => setPaginaAtual(paginaAtual + 1)}
                            disabled={paginaAtual === totalPaginas}
                            className="min-w-[80px] px-3 py-1.5 text-sm text-gray-500 bg-white border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Próxima
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        Nenhum histórico
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Nenhum upload foi realizado ainda.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Modal de confirmação de exclusão */}
          <Dialog.Root open={showDeleteModal} onOpenChange={(open) => {
            setShowDeleteModal(open);
            if (!open) setSelectedHistory(null);
          }}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              <div className="fixed inset-0 z-10 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                  <Dialog.Content className="relative transform overflow-hidden rounded-lg bg-white text-left align-middle shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                      <div className="sm:flex sm:items-start">
                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                          <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                        </div>
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                          <Dialog.Title className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                            Confirmar Exclusão
                          </Dialog.Title>
                          <div className="mt-2">
                            <p className="text-sm text-gray-500">
                              Tem certeza que deseja excluir os registros do arquivo <span className="font-medium text-gray-900">{selectedHistory?.arquivo_nome}</span>? Esta ação não poderá ser desfeita.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                      <button
                        type="button"
                        onClick={handleConfirmDelete}
                        disabled={isDeleting}
                        className={`w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm ${
                          isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            Excluindo...
                          </>
                        ) : (
                          'Confirmar Exclusão'
                        )}
                      </button>
                      <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        onClick={() => {
                          setShowDeleteModal(false);
                          setSelectedHistory(null);
                        }}
                        disabled={isDeleting}
                      >
                        Cancelar
                      </button>
                    </div>
                  </Dialog.Content>
                </div>
              </div>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </div>
  );
}

// Função auxiliar para atualizar o status do upload
const atualizarStatusUpload = async (uid: string, status: string, total: number, processados: number, erros: number, mensagemErro?: string) => {
  try {
    await supabaseClient
      .from('gbp_upload_history')
      .update({
        status,
        registros_total: total,
        registros_processados: processados,
        registros_erro: erros,
        erro_mensagem: mensagemErro || null,
        updated_at: new Date().toISOString()
      })
      .eq('uid', uid);
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
  }
};
