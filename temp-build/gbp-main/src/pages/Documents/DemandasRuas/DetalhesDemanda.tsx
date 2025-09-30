import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabaseClient } from '@/lib/supabase';
import { ArrowLeft, Loader2, ExternalLink, FileText, Star, AlertTriangle, SendHorizontal, Upload, Pencil, RefreshCw, X, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { demandasRuasService, type DemandaRua } from '@/services/demandasRuasService';

interface MensagemWhatsApp {
  uid: string;
  mensagem: string;
  data_envio: string;
  data_leitura: string | null;
  status: string;
  tipo_mensagem: string;
  remetente_uid: string | null;
  usuario_uid: string | null;
  usuario_nome?: string;
  destinatario_whatsapp: string;
  created_at: string;
  updated_at: string;
}
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Extend the DemandaRua type to include observação_resposta
type DemandaComObservacoes = DemandaRua & {
  observação_resposta?: string[];
  fotos_do_problema?: string[];
  demanda_concluida?: boolean;
  favorito?: boolean;
  status?: string;
  requerente_nome?: string;
  requerente_whatsapp?: string;
  requerente_cpf?: string;
  tipo_de_demanda?: string;
  descricao_do_problema?: string;
};

export function DetalhesDemanda() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [demanda, setDemanda] = useState<DemandaComObservacoes | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagens, setMensagens] = useState<MensagemWhatsApp[]>([]);
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [novaObservacao, setNovaObservacao] = useState('');
  const [isFavorito, setIsFavorito] = useState(false);
  const [demandaConcluida, setDemandaConcluida] = useState(false);
  // Initialize with 'recebido' as default status to prevent validation errors
  const [novoStatus, setNovoStatus] = useState<DemandaRua['status']>('recebido');
  
  // Function to ensure status is valid
  const getValidStatus = (status: string): DemandaRua['status'] => {
    const validStatuses: DemandaRua['status'][] = ['recebido', 'feito_oficio', 'protocolado', 'aguardando', 'concluido', 'cancelado'];
    return validStatuses.includes(status as DemandaRua['status']) ? status as DemandaRua['status'] : 'recebido';
  };
  const [documentoProtocolado, setDocumentoProtocolado] = useState(false);
  const [documentoSelecionado, setDocumentoSelecionado] = useState<File | null>(null);
  const [documentoAnexo, setDocumentoAnexo] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingObservacoes, setDeletingObservacoes] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const anexoWhatsAppInputRef = useRef<HTMLInputElement>(null);

  // Estado para controle dos modais de confirmação
  const [observacaoParaExcluir, setObservacaoParaExcluir] = useState<number | null>(null);
  const [showDeleteObservacaoModal, setShowDeleteObservacaoModal] = useState(false);
  const [showDeleteDocumentoModal, setShowDeleteDocumentoModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showProtocoloModal, setShowProtocoloModal] = useState(false);
  const [protocoloFile, setProtocoloFile] = useState<File | null>(null);
  const [showWhatsAppField, setShowWhatsAppField] = useState(true);
  const [mensagemWhatsApp, setMensagemWhatsApp] = useState('');
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);
  const [anexoWhatsApp, setAnexoWhatsApp] = useState<File | null>(null);
  const MAX_CARACTERES = 1000;

  const sugestoesMensagens = [
    {
      id: 1,
      texto: "Recebemos sua mensagem! Nossa equipe já está analisando e retornaremos em breve.",
    },
    {
      id: 2,
      texto: "Sua demanda foi protocolada com sucesso! 🎉 Em breve entraremos em contato com mais informações.",
    },
  ];

  const handleSugestaoClick = (texto: string) => {
    setMensagemWhatsApp(texto);
  };

  const handleAnexoWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAnexoWhatsApp(e.target.files[0]);
    }
  };

  // Safe access to observação_resposta with null checks
  const observacoes = demanda?.observação_resposta || [];

  // Safe access to fotos_do_problema with null checks
  const fotosDoProblema = demanda?.fotos_do_problema || [];

  // Função para enviar mensagem via WhatsApp
  const enviarMensagemWhatsApp = async () => {
    if (!demanda || (!mensagemWhatsApp.trim() && !anexoWhatsApp)) {
      toast({
        title: 'Nenhum conteúdo para enviar',
        description: 'Por favor, digite uma mensagem ou anexe um arquivo.',
        variant: 'warning',
      });
      return;
    }

    if (mensagemWhatsApp.length > MAX_CARACTERES) {
      toast({
        title: 'Mensagem muito longa',
        description: `A mensagem não pode ter mais de ${MAX_CARACTERES} caracteres.`,
        variant: 'warning',
      });
      return;
    }

    try {
      setEnviandoMensagem(true);

      let anexoUrl = '';
      if (anexoWhatsApp) {
        // Faz o upload do anexo
        const fileExt = anexoWhatsApp.name.split('.').pop();
        const fileName = `anexo_whatsapp_${demanda.uid}_${Date.now()}.${fileExt}`;
        
        // O bucket 'neilton' e a pasta 'documentos' são usados como padrão,
        // idealmente isso viria de uma configuração.
        anexoUrl = await demandasRuasService.uploadFile(
          'neilton', 
          'documentos', 
          anexoWhatsApp, 
          fileName
        );
      }

      // Monta a mensagem final
      let mensagemFinal = mensagemWhatsApp;
      if (anexoUrl) {
        mensagemFinal = `${mensagemWhatsApp}\n\nAnexo: ${anexoUrl}`.trim();
      }
      
      // Obter informações do usuário logado
      const userData = JSON.parse(localStorage.getItem('gbp_user') || '{}');
      const userName = userData?.nome || 'Usuário';
      const userUid = userData?.uid || '';

      // Salvar a mensagem na tabela gbp_whatsapp_demanda
      await demandasRuasService.salvarMensagemWhatsApp({
        empresaUid: demanda.empresa_uid,
        demandaUid: demanda.uid,
        mensagem: mensagemFinal,
        usuarioUid: userUid,
        usuarioNome: userName,
        destinatarioWhatsapp: demanda.requerente_whatsapp || '',
      });

      // Atualizar a lista de mensagens
      await carregarMensagens(demanda.uid);

      toast({
        title: 'Sucesso',
        description: 'Mensagem enviada com sucesso!',
        variant: 'success',
      });

      // Limpa os campos após o envio
      setMensagemWhatsApp('');
      setAnexoWhatsApp(null);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a mensagem. Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setEnviandoMensagem(false);
    }
  };

  const confirmarExclusaoObservacao = (index: number) => {
    setObservacaoParaExcluir(index);
    setShowDeleteObservacaoModal(true);
  };

  const excluirObservacao = async () => {
    if (observacaoParaExcluir === null || !demanda?.observação_resposta) return;

    try {
      setUpdating(true);

      const novasObservacoes = [...(demanda.observação_resposta || [])];
      novasObservacoes.splice(observacaoParaExcluir, 1);

      await demandasRuasService.updateDemanda(demanda.uid, {
        observação_resposta: novasObservacoes,
      });

      setDemanda((prev) => prev ? { ...prev, observação_resposta: novasObservacoes } : null);

      setShowDeleteObservacaoModal(false);
      setObservacaoParaExcluir(null);

      toast({
        title: 'Sucesso',
        description: 'Observação removida com sucesso!',
        variant: 'default',
      });
    } catch (error) {
      console.error('Erro ao remover observação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a observação. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const removerObservacao = async () => {
    if (!demanda || observacaoParaExcluir === null) {
      setShowDeleteObservacaoModal(false);
      return;
    }

    const index = observacaoParaExcluir;

    setUpdating(true);
    try {
      const observacoesAtualizadas = [...(demanda.observação_resposta || [])];
      observacoesAtualizadas.splice(index, 1);

      await demandasRuasService.updateDemanda(demanda.uid, {
        observação_resposta: observacoesAtualizadas,
      });

      setDemanda({
        ...demanda,
        observação_resposta: observacoesAtualizadas,
      });

      toast({
        title: 'Observação removida',
        description: 'A observação foi excluída com sucesso.',
        className: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
      });
    } catch (err) {
      console.error('Erro ao remover observação:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a observação. Tente novamente.',
        className: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
      });
    } finally {
      setUpdating(false);
    }
  };

  const adicionarObservacao = async () => {
    if (!demanda || !novaObservacao.trim()) return;

    setUpdating(true);
    try {
      const observacoesAtualizadas = [
        ...(demanda.observação_resposta || []),
        `${new Date().toLocaleString()}: ${novaObservacao.trim()}`,
      ];

      await demandasRuasService.updateDemanda(demanda.uid, {
        observação_resposta: observacoesAtualizadas,
      } as Partial<DemandaRua>);

      setDemanda({
        ...demanda,
        observação_resposta: observacoesAtualizadas,
      });

      setNovaObservacao('');

      toast({
        title: 'Observação adicionada',
        description: 'A observação foi salva com sucesso.',
        className: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
      });
    } catch (err) {
      console.error('Erro ao adicionar observação:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar a observação. Tente novamente.',
        className: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleUploadProtocolo = async () => {
    if (!protocoloFile || !demanda) {
      toast({
        title: 'Nenhum arquivo selecionado',
        description: 'Por favor, selecione um documento para anexar.',
        variant: 'warning',
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = protocoloFile.name.split('.').pop();
      const fileName = `documento_protocolo_${demanda.uid}_${Date.now()}.${fileExt}`;

      const documentoUrl = await demandasRuasService.uploadFile(
        'neilton',
        'documentos',
        protocoloFile,
        fileName
      );

      const updateData: Partial<DemandaRua> = {
        status: 'protocolado',
        documento_protocolado: documentoUrl,
        atualizado_em: new Date().toISOString(),
      };

      const updatedDemanda = await demandasRuasService.updateDemanda(demanda.uid, updateData);

      setDemanda(prev => prev ? { ...prev, ...updatedDemanda } : updatedDemanda);
      setShowProtocoloModal(false);
      setProtocoloFile(null);

      // Agora, chama a função central para atualizar o status
      await updateStatus('protocolado');

      toast({
        title: 'Sucesso!',
        description: 'A demanda foi protocolada e o documento anexado.',
        variant: 'success',
      });

    } catch (error) {
      console.error('Erro ao protocolar demanda:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível anexar o documento ou atualizar o status.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (status: DemandaRua['status']) => {
    if (!demanda) return;

    // Atualiza o estado visual do select primeiro
    setNovoStatus(status);

    // Se o status for 'protocolado', abre o modal e interrompe a execução
    if (status === 'protocolado') {
      // Se já existe um documento, não precisa de modal
      if (demanda.documento_protocolado) {
        // Apenas atualiza o status
        await updateStatus(status);
      } else {
        setShowProtocoloModal(true);
      }
      return;
    }

    // Lógica para outros status
    await updateStatus(status);
  };

  // Função refatorada para apenas atualizar o status
  const updateStatus = async (status: DemandaRua['status']) => {
    if (!demanda) return;
    setUpdating(true);
    try {
      const updateData: Partial<DemandaRua> = {
        status,
        atualizado_em: new Date().toISOString(),
      };

      const updatedDemanda = await demandasRuasService.updateDemanda(demanda.uid, updateData);

      setDemanda(prev => prev ? { ...prev, ...updatedDemanda } : updatedDemanda);
      setDemandaConcluida(updatedDemanda.status === 'concluido');
      setNovoStatus(updatedDemanda.status as DemandaRua['status']);

      toast({
        title: 'Status atualizado',
        description: 'O status da demanda foi atualizado com sucesso.',
        variant: 'success',
      });
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status da demanda.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDocumentoProtocoladoChange = async (checked: boolean) => {
    if (!demanda?.uid) return;

    try {
      setDocumentoProtocolado(checked);

      // Se estiver marcando, apenas atualiza o status
      if (checked) {
        await demandasRuasService.updateDemanda(demanda.uid, {
          status: 'protocolado',
        });

        // Atualiza o estado local
        setNovoStatus('protocolado');

        toast({
          title: 'Sucesso',
          description: 'Status atualizado para protocolado',
        });
      } else {
        // Se estiver desmarcando, mantém o documento mas muda o status
        await demandasRuasService.updateDemanda(demanda.uid, {
          status: 'feito_oficio',
        });

        // Atualiza o estado local
        setNovoStatus('feito_oficio');

        toast({
          title: 'Sucesso',
          description: 'Status atualizado para ofício feito',
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar status do documento protocolado:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status do documento',
        variant: 'destructive',
      });
    }
  };

  const handleDocumentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocumentoSelecionado(e.target.files[0]);
    }
  };

  const handleDocumentoAnexo = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDocumentoSelecionado(file);
      setDocumentoAnexo(file);
      
      // Se já houver um documento protocolado, limpar o estado de documentoProtocolado
      // para forçar a atualização do componente
      if (documentoProtocolado) {
        setDocumentoProtocolado(false);
      }
    } else {
      // Se não houver arquivo selecionado, limpar os estados
      setDocumentoSelecionado(null);
      setDocumentoAnexo(null);
      setDocumentoProtocolado(false);
    }
    
    // Limpar o valor do input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  const handleUploadDocumento = async () => {
    if (!documentoAnexo || !demanda?.uid) {
      toast({
        title: 'Atenção',
        description: 'Nenhum documento selecionado para upload',
        variant: 'destructive' as const,
      });
      return;
    }

    try {
      setUploading(true);

      // Verifica o tamanho do arquivo (máximo 10MB)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (documentoAnexo.size > MAX_FILE_SIZE) {
        throw new Error('O arquivo é muito grande. O tamanho máximo permitido é 10MB.');
      }

      // Verifica o tipo do arquivo
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
      ];
      if (!allowedTypes.includes(documentoAnexo.type)) {
        throw new Error(
          'Tipo de arquivo não suportado. Use PDF, DOC, DOCX, JPG ou PNG.',
        );
      }

      toast({
        title: 'Enviando...',
        description: 'Fazendo upload do documento...',
      });

      // Gera um nome único para o arquivo
      const fileExt = documentoAnexo.name.split('.').pop();
      const fileName = `documento_${demanda.uid}_${Date.now()}.${fileExt}`;

      // Faz o upload do arquivo
      const fileUrl = await demandasRuasService.uploadFile(
        'neilton',
        'documentos',
        documentoAnexo,
        fileName,
      );

      // Atualiza a demanda com a URL do documento
      await demandasRuasService.updateDemanda(demanda.uid, {
        documento_protocolado: fileUrl,
        status: 'protocolado',
      });

      // Atualiza o estado local
      setDocumentoProtocolado(true);
      setDocumentoAnexo(null);
      setDocumentoSelecionado(null);
      setDemanda((prev) => ({
        ...prev!,
        documento_protocolado: fileUrl,
        status: 'protocolado',
      }));

      toast({
        title: 'Sucesso!',
        description: 'Documento enviado com sucesso!',
        variant: 'default',
      });
    } catch (error) {
      console.error('Erro ao fazer upload do documento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível fazer upload do documento',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleOpenDeleteModal = () => {
    console.log('handleOpenDeleteModal chamada');
    setShowDeleteDocumentoModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteDocumentoModal(false);
  };

  const handleConfirmDelete = async () => {
    if (!demanda?.uid) {
      toast({
        title: 'Atenção',
        description: 'Nenhuma demanda selecionada',
        variant: 'destructive',
        className:
          'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200',
      });
      return;
    }

    try {
      setIsDeleting(true);

      toast({
        title: 'Processando...',
        description: 'Removendo documento...',
        className:
          'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200',
      });

      // Atualiza a demanda removendo a URL do documento
      await demandasRuasService.updateDemanda(demanda.uid, {
        documento_protocolado: '',
        status: 'feito_oficio', // Volta para o status anterior
      });

      // Atualiza o estado local
      setDocumentoProtocolado(false);
      setNovoStatus('feito_oficio');
      setDocumentoSelecionado(null);

      // Atualiza os dados da demanda
      const updatedDemanda = await demandasRuasService.getDemandaByUid(
        demanda.uid,
      );
      setDemanda(updatedDemanda);

      toast({
        title: 'Sucesso',
        description: 'Documento removido com sucesso!',
        className:
          'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200',
      });

      // Limpa o input de arquivo se existir
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setShowDeleteDocumentoModal(false);
    } catch (error) {
      console.error('Erro ao remover documento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o documento',
        variant: 'destructive',
        className:
          'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Carregar demanda quando o componente montar
  useEffect(() => {
    if (id) {
      carregarDemanda(id);
    }
  }, [id]);

  // Sincronizar o estado documentoAnexo quando a demanda for carregada
  useEffect(() => {
    if (demanda?.documento_protocolado) {
      // Se houver um documento protocolado, definimos o estado documentoAnexo como um objeto File vazio
      // para manter a consistência com a interface do usuário
      const emptyFile = new File([], 'documento_protocolado', { type: 'application/octet-stream' });
      setDocumentoAnexo(emptyFile);
    } else {
      setDocumentoAnexo(null);
    }
  }, [demanda?.documento_protocolado]);

  // Carregar mensagens do WhatsApp
  const carregarMensagens = useCallback(async (demandaUid: string) => {
    try {
      setCarregandoMensagens(true);
      
      // Primeiro, buscar as mensagens
      const { data: mensagensData, error: mensagensError } = await supabaseClient
        .from('gbp_whatsapp_demanda')
        .select('*')
        .eq('demanda_rua_uid', demandaUid)
        .order('data_envio', { ascending: false });

      if (mensagensError) throw mensagensError;
      if (!mensagensData) {
        setMensagens([]);
        return;
      }

      // Obter os IDs únicos de usuários
      const usuariosUids = [...new Set(mensagensData.map(m => m.usuario_uid).filter(Boolean))];
      
      // Buscar informações dos usuários em uma única consulta
      let usuariosMap = new Map();
      if (usuariosUids.length > 0) {
        const { data: usuariosData, error: usuariosError } = await supabaseClient
          .from('gbp_usuarios')
          .select('uid, nome')
          .in('uid', usuariosUids);
          
        if (usuariosError) throw usuariosError;
        
        // Criar um mapa de usuários para acesso rápido
        usuariosMap = new Map(usuariosData?.map(u => [u.uid, u]) || []);
      }

      // Mapear as mensagens com os dados dos usuários
      const mensagensComUsuario = mensagensData.map(msg => {
        const usuario = msg.usuario_uid ? usuariosMap.get(msg.usuario_uid) : null;
        return {
          ...msg,
          usuario_nome: usuario?.nome || 'Sistema'
        };
      });
      
      setMensagens(mensagensComUsuario);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o histórico de mensagens.',
        variant: 'destructive',
      });
    } finally {
      setCarregandoMensagens(false);
    }
  }, [toast]);

  const carregarDemanda = async (id: string) => {
    try {
      setCarregando(true);
      const demandaCarregada = await demandasRuasService.getDemandaByUid(id);
      if (demandaCarregada) {
        setDemanda(demandaCarregada);
        setNovoStatus(getValidStatus(demandaCarregada.status));
        setIsFavorito(demandaCarregada.favorito || false);
        setDemandaConcluida(demandaCarregada.status === 'concluido');
        // Carregar mensagens quando a demanda for carregada
        await carregarMensagens(id);
      } else {
        toast({
          title: 'Erro',
          description: 'Demanda não encontrada.',
          variant: 'destructive',
        });
        navigate('/demandas');
      }
    } catch (error) {
      console.error('Erro ao carregar demanda:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a demanda.',
        variant: 'destructive',
      });
      navigate('/demandas');
    } finally {
      setCarregando(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", {
        locale: ptBR,
      });
    } catch (e) {
      return 'Data inválida';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'recebido':
      case 'feito_oficio':
        return 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
      case 'protocolado':
      case 'aguardando':
        return 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
      case 'concluido':
        return 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      case 'cancelado':
        return 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      default:
        return 'bg-gray-50 text-gray-800 border border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800';
    }
  };

  const getUrgenciaBadgeVariant = (urgencia: string) => {
    switch (urgencia) {
      case 'alta':
        return 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      case 'média':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'baixa':
        return 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const toggleFavorito = async () => {
    if (!demanda) return;
    
    const novoStatusFavorito = !isFavorito;
    try {
      const sucesso = await demandasRuasService.toggleFavorito(demanda.uid, novoStatusFavorito);
      if (sucesso) {
        setIsFavorito(novoStatusFavorito);
        setDemanda({ ...demanda, favorito: novoStatusFavorito });
        
        toast({
          title: novoStatusFavorito ? 'Adicionado aos favoritos' : 'Removido dos favoritos',
          description: novoStatusFavorito 
            ? 'A demanda foi adicionada aos seus favoritos.' 
            : 'A demanda foi removida dos seus favoritos.',
          className: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
        });
      } else {
        throw new Error('Falha ao atualizar favorito');
      }
    } catch (err) {
      console.error('Erro ao atualizar favorito:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status de favorito. Tente novamente.',
        className: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
      });
    }
  };


  const atualizarDemanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demanda || !id) return;
    
    setUpdating(true);
    try {
      let documentoUrl = demanda.documento_protocolado;
      
      // Se houver um novo documento para fazer upload
      if (documentoAnexo) {
        // Verifica se o arquivo é muito grande (mais de 10MB)
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        if (documentoAnexo.size > MAX_FILE_SIZE) {
          toast({
            title: 'Arquivo muito grande',
            description: 'O tamanho máximo permitido é de 10MB. Por favor, reduza o tamanho do arquivo e tente novamente.',
            variant: 'destructive',
          });
          return;
        }

        // Verifica se o tipo de arquivo é permitido
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(documentoAnexo.type)) {
          toast({
            title: 'Tipo de arquivo não suportado',
            description: 'Por favor, envie apenas arquivos PDF, JPG, JPEG ou PNG.',
            variant: 'destructive',
          });
          return;
        }

        try {
          // Mostra o loader durante o upload
          setUploading(true);
          
          // Se já existir um documento, remove o antigo primeiro
          if (demanda.documento_protocolado) {
            try {
              await demandasRuasService.updateDemanda(demanda.uid, {
                documento_protocolado: ''
              });
            } catch (error) {
              console.warn('Não foi possível remover o documento antigo:', error);
              // Continua mesmo se não conseguir remover o antigo
            }
          }

          // Gera um nome único para o arquivo
          const fileExt = documentoAnexo.name.split('.').pop();
          const fileName = `documento_${demanda.uid}_${Date.now()}.${fileExt}`;
          
          // Faz o upload do arquivo com timeout de 2 minutos
          documentoUrl = await Promise.race([
            demandasRuasService.uploadFile('neilton', 'documentos', documentoAnexo, fileName),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('O upload do arquivo está demorando muito. Por favor, tente novamente com um arquivo menor.')), 120000)
            )
          ]);
          
          // Limpa o documento anexado após o upload
          setDocumentoAnexo(null);
        } catch (error) {
          console.error('Erro ao fazer upload do documento:', error);
          toast({
            title: 'Erro no upload',
            description: error.message || 'Não foi possível fazer o upload do documento. Verifique sua conexão e tente novamente.',
            variant: 'destructive',
          });
          return;
        } finally {
          setUploading(false);
        }
      }
      
      // Determine the final status based on demandaConcluida flag
      const finalStatus = demandaConcluida ? 'concluido' : getValidStatus(novoStatus);
      
      const dadosAtualizados: Partial<DemandaRua> = {
        status: finalStatus,
        observação_resposta: [
          ...(demanda.observação_resposta || []),
          novaObservacao ? `${new Date().toLocaleString()}: ${novaObservacao}` : ''
        ].filter(Boolean) as string[],
        favorito: isFavorito,
        ...(documentoUrl ? { documento_protocolado: documentoUrl } : {})
      };

      const response = await demandasRuasService.updateDemanda(id, dadosAtualizados);
      
      if (response) {
        const demandaAtualizada = {
          ...demanda,
          ...dadosAtualizados,
          ...response
        };
        
        setDemanda(demandaAtualizada);
        setNovaObservacao('');
        setDocumentoProtocolado(!!documentoUrl);
        
        // Atualizar documentoAnexo para refletir o documento carregado
        if (documentoUrl) {
          const emptyFile = new File([], 'documento_protocolado', { type: 'application/octet-stream' });
          setDocumentoAnexo(emptyFile);
        } else {
          setDocumentoAnexo(null);
        }
        
        toast({
          title: 'Demanda atualizada',
          description: 'As alterações foram salvas com sucesso.',
          className: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
        });
      }
    } catch (err) {
      console.error('Erro ao atualizar demanda:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a demanda. Tente novamente.',
        className: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !demanda) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error || 'Demanda não encontrada'}</p>
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full px-2 pt-2 pb-4 sm:px-4 sm:pt-4 sm:pb-8 flex-1">
        {/* Modal de Upload de Protocolo */}
        <AlertDialog open={showProtocoloModal} onOpenChange={setShowProtocoloModal}>
          <AlertDialogContent className="w-[95%] sm:w-full max-w-2xl mx-auto p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
              <AlertDialogHeader className="space-y-2">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-blue-100" />
                  <AlertDialogTitle className="text-xl font-semibold text-white">
                    Anexar Documento Protocolado
                  </AlertDialogTitle>
                </div>
                <AlertDialogDescription className="text-blue-100">
                  Para alterar o status para "Protocolado", é necessário anexar o documento correspondente.
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">Selecione o arquivo</Label>
                    <span className="text-xs text-gray-500">Formatos: .pdf, .jpg, .jpeg, .png</span>
                  </div>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="protocolo-file"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                        >
                          <span>Enviar um arquivo</span>
                          <input
                            id="protocolo-file"
                            name="protocolo-file"
                            type="file"
                            className="sr-only"
                            onChange={(e) => setProtocoloFile(e.target.files ? e.target.files[0] : null)}
                            accept=".pdf,.jpg,.jpeg,.png"
                          />
                        </label>
                        <p className="pl-1">ou arraste e solte</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {protocoloFile 
                          ? `Arquivo selecionado: ${protocoloFile.name}`
                          : 'Tamanho máximo: 10MB'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-lg">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {protocoloFile && (
                    <div className="flex items-center text-green-600">
                      <Paperclip className="h-4 w-4 mr-1.5" />
                      <span className="truncate max-w-xs">{protocoloFile.name}</span>
                      <span className="ml-2 text-xs text-gray-400">
                        ({(protocoloFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <AlertDialogCancel 
                    onClick={() => {
                      setShowProtocoloModal(false);
                      setProtocoloFile(null);
                      if (demanda) setNovoStatus(getValidStatus(demanda.status));
                    }}
                    className="h-10 px-6 m-0 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-300"
                  >
                    Cancelar
                  </AlertDialogCancel>
                  <Button
                    onClick={handleUploadProtocolo}
                    disabled={!protocoloFile || uploading}
                    className="h-10 px-6 m-0 bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Enviando...
                      </>
                    ) : (
                      'Confirmar envio'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
          {/* Cabeçalho com gradiente sutil */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-b border-blue-100 dark:border-blue-900/50">
            <div className="px-3 py-3 sm:px-6 sm:py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 sm:h-10 sm:w-10 bg-white/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-600 shadow-sm flex-shrink-0" 
                    onClick={() => navigate(-1)}
                  >
                    <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-300" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-1.5">
                      <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl lg:text-3xl tracking-tight">
                        Detalhes da Demanda
                      </h1>
                      {demanda.numero_protocolo && (
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] xs:text-xs sm:text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            Protocolo: #{String(demanda.numero_protocolo).padStart(6, '0')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between w-full sm:w-auto gap-3 sm:gap-2">
                  <div className={cn(
                    'px-3 py-1.5 sm:py-1.5 rounded-full text-sm font-medium flex items-center whitespace-nowrap',
                    'min-h-[2rem] sm:min-h-0', // Minimum touch target size for mobile
                    getStatusBadgeVariant(demanda.status)
                  )}>
                    <span className="w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full mr-2 sm:mr-2 flex-shrink-0" style={{
                      backgroundColor: {
                        'pendente': '#f59e0b',
                        'em andamento': '#3b82f6',
                        'concluido': '#10b981',
                        'cancelado': '#ef4444'
                      }[demanda.status.toLowerCase()] || '#6b7280'
                    }}></span>
                    <span className="text-sm sm:text-sm font-medium truncate">
                      {demanda.status}
                    </span>
                  </div>
                  <Button 
                    variant={isFavorito ? 'default' : 'outline'} 
                    size="icon"
                    onClick={toggleFavorito}
                    className={cn(
                      'h-10 w-10 sm:h-10 sm:w-10 rounded-full transition-all duration-200 flex-shrink-0',
                      'flex items-center justify-center', // Center icon
                      isFavorito 
                        ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-md hover:shadow-lg hover:shadow-amber-500/20 dark:from-amber-500 dark:to-amber-600' 
                        : 'border-2 border-amber-200 bg-white text-amber-500 hover:bg-amber-50 hover:border-amber-300 dark:border-amber-800 dark:bg-gray-800 dark:hover:bg-amber-900/20 dark:text-amber-400'
                    )}
                  >
                    <Star className={`h-5 w-5 sm:h-4 sm:w-4 ${isFavorito ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <div className="space-y-4 sm:space-y-6">
              <Card className="overflow-hidden">
                <CardHeader className="pb-3 sm:pb-4 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg sm:text-xl">Informações da Demanda</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => navigate(`/app/documentos/demandas-ruas/${id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Editar demanda</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 space-y-4 sm:space-y-6">
                  {/* Informações do Requerente */}
                  {(demanda.requerente_nome || demanda.requerente_whatsapp || demanda.requerente_cpf) && (
                    <div className="bg-gray-50 dark:bg-gray-800/30 p-3 sm:p-4 rounded-md border border-gray-100 dark:border-gray-700">
                      <h3 className="font-medium text-sm sm:text-base mb-2 sm:mb-3 text-gray-700 dark:text-gray-300">
                        Informações do Requerente
                      </h3>
                      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                        {demanda.requerente_nome && (
                          <div className="space-y-0.5">
                            <Label className="text-xs sm:text-sm text-muted-foreground">Nome</Label>
                            <p className="text-sm sm:text-base font-medium break-words">{demanda.requerente_nome}</p>
                          </div>
                        )}
                        {demanda.requerente_whatsapp && (
                          <div className="space-y-0.5">
                            <Label className="text-xs sm:text-sm text-muted-foreground">WhatsApp</Label>
                            <p className="text-sm sm:text-base font-mono">{demanda.requerente_whatsapp}</p>
                          </div>
                        )}
                        {demanda.requerente_cpf && (
                          <div className="space-y-0.5">
                            <Label className="text-xs sm:text-sm text-muted-foreground">CPF</Label>
                            <p className="text-sm sm:text-base font-mono">{demanda.requerente_cpf}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs sm:text-sm">Tipo de Demanda</Label>
                      <div className="bg-gray-50 dark:bg-gray-800/50 p-2 sm:p-3 rounded border border-gray-100 dark:border-gray-700">
                        {demanda.tipo_de_demanda.includes('::') ? (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">
                              {demanda.tipo_de_demanda.split('::')[0].trim()}
                            </p>
                            <p className="font-medium text-sm sm:text-base">
                              {demanda.tipo_de_demanda.split('::')[1].trim()}
                            </p>
                          </div>
                        ) : (
                          <p className="font-medium text-sm sm:text-base">{demanda.tipo_de_demanda}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs sm:text-sm">Nível de Urgência</Label>
                      <div className="p-2 sm:p-3 rounded border border-gray-100 dark:border-gray-700">
                        <p className="font-medium text-sm sm:text-base">{demanda.nivel_de_urgencia}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs sm:text-sm">Data de Abertura</Label>
                      <div className="p-2 sm:p-3 rounded border border-gray-100 dark:border-gray-700">
                        <p className="font-medium text-sm sm:text-base">{formatDate(demanda.criado_em)}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs sm:text-sm">Última Atualização</Label>
                      <div className="p-2 sm:p-3 rounded border border-gray-100 dark:border-gray-700">
                        <p className="font-medium text-sm sm:text-base">{formatDate(demanda.atualizado_em)}</p>
                      </div>
                    </div>
                    {demanda.link_da_demanda && (
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-xs sm:text-sm">Link da Demanda</Label>
                        <div className="p-2 sm:p-3 rounded border border-gray-100 dark:border-gray-700">
                          <a 
                            href={demanda.link_da_demanda} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center text-sm sm:text-base break-all"
                          >
                            <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                            <span className="truncate">{demanda.link_da_demanda}</span>
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {demanda.boletim_ocorrencia === 'sim' && (
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-xs sm:text-sm">Boletim de Ocorrência</Label>
                        <div className="p-2 sm:p-3 rounded border border-gray-100 dark:border-gray-700">
                          {demanda.anexar_boletim_de_correncia ? (
                            <a 
                              href={demanda.anexar_boletim_de_correncia} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center text-sm sm:text-base"
                            >
                              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                              Visualizar boletim de ocorrência
                            </a>
                          ) : (
                            <p className="text-sm text-muted-foreground">Nenhum boletim anexado</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm">Descrição do Problema</Label>
                    <div className="p-3 sm:p-4 rounded border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                      <p className="whitespace-pre-line text-sm sm:text-base leading-relaxed">
                        {demanda.descricao_do_problema || 'Sem descrição'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Seção de Endereço */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-3 sm:pb-4 bg-gray-50 dark:bg-gray-800/50">
                  <CardTitle className="text-lg sm:text-xl">Endereço</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6">
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-baseline gap-1 text-sm sm:text-base">
                        <span className="font-medium">{demanda.logradouro || 'Rua não informada'}</span>
                        {demanda.numero && <span>, {demanda.numero}</span>}
                      </div>
                      
                      {(demanda.bairro || demanda.cidade || demanda.uf) && (
                        <div className="flex flex-wrap items-center gap-1 text-sm sm:text-base text-muted-foreground">
                          {demanda.bairro && <span>{demanda.bairro}</span>}
                          {(demanda.cidade || demanda.uf) && (
                            <span>
                              {demanda.bairro && ' • '}
                              {demanda.cidade || ''}
                              {demanda.uf && `/${demanda.uf}`}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {demanda.cep && (
                        <div className="text-sm sm:text-base">
                          <span className="text-muted-foreground">CEP: </span>
                          <span className="font-mono">{demanda.cep}</span>
                        </div>
                      )}
                    </div>
                    
                    {demanda.referencia && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <Label className="text-xs sm:text-sm text-muted-foreground">Ponto de referência</Label>
                        <p className="mt-1 text-sm sm:text-base">{demanda.referencia}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Fotos do Problema */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-1 sm:pb-2 bg-gray-50 dark:bg-gray-800/50">
                  <CardTitle className="text-lg sm:text-xl">Fotos do Problema</CardTitle>
                </CardHeader>
                <CardContent className="py-2 sm:py-3">
                  {fotosDoProblema.length > 0 ? (
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {fotosDoProblema.map((foto, index) => (
                        <div key={index} className="relative inline-block max-w-[200px]">
                          <img 
                            src={foto} 
                            alt={`Foto ${index + 1} da demanda`}
                            className="block max-h-[200px] w-auto max-w-full bg-white"
                            loading="lazy"
                            style={{ maxHeight: '200px' }}
                          />
                          <a 
                            href={foto} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-200"
                            title="Ampliar imagem"
                          >
                            <ExternalLink className="h-5 w-5 text-white" />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 sm:py-8">
                      <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-muted-foreground">
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                      </div>
                      <p className="text-sm sm:text-base text-muted-foreground">Nenhuma foto disponível</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Controle da Demanda e Acompanhamento */}
              <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow duration-200 mb-6">
                <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900/50 rounded-t-lg">
                  <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2 text-gray-800 dark:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Controle e Acompanhamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 py-4">
                  {/* Seção de Status */}
                  <div className="space-y-4 bg-gray-50 dark:bg-gray-800/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="space-y-2">
                      <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Status da Demanda
                      </Label>
                      <div className="relative">
                        <div className="relative">
                          <select
                            value={novoStatus || ''} // Garante que o valor não seja nulo
                            onChange={(e) => handleStatusChange(e.target.value as DemandaRua['status'])}
                            className="block w-full rounded-lg border border-gray-300 bg-white dark:bg-gray-800 py-2.5 pl-4 pr-10 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:focus:ring-blue-900/50 transition-colors duration-200"
                            disabled={updating}
                          >
                            <option value="" className="text-gray-500">Selecione um status</option>
                            
                            {/* Sempre mostra Recebido */}
                            <option 
                              value="recebido" 
                              className={novoStatus === 'recebido' ? 'font-medium' : 'text-gray-700'}
                              disabled={['feito_oficio', 'protocolado', 'aguardando', 'concluido', 'cancelado'].includes(novoStatus || '')}
                            >
                              Recebido {novoStatus === 'recebido' && '(Atual)'}
                            </option>
                            
                            {/* Mostra Feito Ofício apenas se o status atual for Recebido */}
                            {(!novoStatus || novoStatus === 'recebido' || novoStatus === 'feito_oficio') && (
                              <option 
                                value="feito_oficio" 
                                className={novoStatus === 'feito_oficio' ? 'font-medium' : 'text-gray-700'}
                                disabled={['protocolado', 'aguardando', 'concluido', 'cancelado'].includes(novoStatus || '')}
                              >
                                Feito ofício {novoStatus === 'feito_oficio' && '(Atual)'}
                              </option>
                            )}
                            
                            {/* Mostra Protocolado apenas se o status for Feito Ofício ou se já estiver protocolado */}
                            {((!novoStatus && !demanda?.documento_protocolado) || 
                              novoStatus === 'feito_oficio' || 
                              novoStatus === 'protocolado') && (
                              <option 
                                value="protocolado" 
                                className={`${novoStatus === 'protocolado' ? 'font-medium' : 'text-gray-700'}`}
                                disabled={!!demanda?.documento_protocolado || ['aguardando', 'concluido', 'cancelado'].includes(novoStatus || '')}
                              >
                                {novoStatus === 'protocolado' ? 'Protocolado (Atual)' : 'Protocolado'}
                              </option>
                            )}
                            
                            {/* Mostra Aguardando apenas se o status for Protocolado */}
                            {((!novoStatus && demanda?.documento_protocolado) || 
                              novoStatus === 'protocolado' || 
                              novoStatus === 'aguardando') && (
                              <option 
                                value="aguardando" 
                                className={novoStatus === 'aguardando' ? 'font-medium' : 'text-gray-700'}
                                disabled={['concluido', 'cancelado'].includes(novoStatus || '')}
                              >
                                Aguardando {novoStatus === 'aguardando' && '(Atual)'}
                              </option>
                            )}
                            
                            {/* Mostra Concluído em qualquer estágio, exceto quando já estiver concluído ou cancelado */}
                            {novoStatus !== 'concluido' && novoStatus !== 'cancelado' && (
                              <option 
                                value="concluido" 
                                className="text-green-600 font-medium"
                              >
                                Concluir demanda agora
                              </option>
                            )}
                            
                            {/* Mostra o status atual se já estiver concluído */}
                            {novoStatus === 'concluido' && (
                              <option 
                                value="concluido" 
                                className="text-green-600 font-medium"
                                disabled
                              >
                                Concluído (Atual)
                              </option>
                            )}
                            
                            {/* Mostra Cancelado em qualquer estágio */}
                            <option 
                              value="cancelado" 
                              className="text-red-600 font-medium"
                              disabled={novoStatus === 'cancelado'}
                            >
                              {novoStatus === 'cancelado' ? 'Cancelado (Atual)' : 'Cancelar demanda'}
                            </option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                        {updating && (
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Documento Protocolado - Apenas visualização */}
                  {demanda?.documento_protocolado && (
                    <div className="space-y-4 bg-gray-50 dark:bg-gray-800/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700 mt-6">
                      <div className="space-y-1">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Documento Protocolado
                        </h3>
                      </div>
                      
                      <div className="mt-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 gap-4 transition-all duration-200 hover:shadow-sm">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-all">
                                {demanda.documento_protocolado.split('/').pop() || 'Documento Protocolado'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date().toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <a
                              href={demanda.documento_protocolado}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 h-9 whitespace-nowrap"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Visualizar
                            </a>
                            <button
                              type="button"
                              onClick={handleOpenDeleteModal}
                              disabled={uploading}
                              className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 bg-red-600 text-white hover:bg-red-700 px-3 py-2 h-9 whitespace-nowrap disabled:opacity-50"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Mensagens WhatsApp */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <SendHorizontal className="h-5 w-5 text-green-600" />
                      <CardTitle className="text-lg sm:text-xl">Mensagens WhatsApp</CardTitle>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground pl-7">
                    Gerencie e visualize as mensagens enviadas para o requerente
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* Campo de Envio de Mensagem */}
                  {showWhatsAppField && (
                    <div className="space-y-2 pl-1 mb-6">
                      <div className="relative">
                        <Textarea
                          placeholder="Digite sua mensagem para o requerente..."
                          className={`min-h-[120px] w-full border-2 ${mensagemWhatsApp.length > MAX_CARACTERES ? 'border-red-500' : 'border-gray-300'} focus:border-green-500 focus:ring-2 focus:ring-green-200 rounded-lg p-3 text-sm transition-colors`}
                          value={mensagemWhatsApp}
                          onChange={(e) => setMensagemWhatsApp(e.target.value)}
                          disabled={enviandoMensagem}
                          maxLength={MAX_CARACTERES}
                        />
                        <div className={`absolute bottom-2 right-2 text-xs ${mensagemWhatsApp.length > MAX_CARACTERES ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                          {mensagemWhatsApp.length}/{MAX_CARACTERES}
                        </div>
                      </div>

                      {anexoWhatsApp && (
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded-md">
                          <div className='flex items-center gap-2 min-w-0'>
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <span className='truncate'>{anexoWhatsApp.name}</span>
                          </div>
                          <Button variant="ghost" size="icon" className='h-6 w-6 flex-shrink-0' onClick={() => setAnexoWhatsApp(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      <div className="flex justify-end items-center space-x-2 mt-2">
                        <input
                          type="file"
                          ref={anexoWhatsAppInputRef}
                          onChange={handleAnexoWhatsAppChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMensagemWhatsApp('');
                            setAnexoWhatsApp(null);
                          }}
                          disabled={enviandoMensagem}
                        >
                          Limpar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={enviarMensagemWhatsApp}
                          disabled={(!mensagemWhatsApp.trim() && !anexoWhatsApp) || enviandoMensagem}
                          className="bg-green-600 hover:bg-green-700 text-white font-medium"
                        >
                          {enviandoMensagem ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <SendHorizontal className="mr-2 h-4 w-4" />
                              <span>Enviar Mensagem</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Histórico de Mensagens */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium">Histórico de Mensagens</h4>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => carregarMensagens(demanda?.uid || '')}
                        disabled={carregandoMensagens}
                        className="h-8 text-xs"
                      >
                        {carregandoMensagens ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Atualizar
                      </Button>
                    </div>
                    
                    {carregandoMensagens ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : mensagens.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        Nenhuma mensagem enviada ainda.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-2 pb-2">
                        {mensagens.map((msg) => {
                          const data = new Date(msg.data_envio);
                          const dataFormatada = data.toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          });

                          const isLida = msg.status === 'ENTREGUE' || msg.status === 'LIDA';
                          
                          return (
                            <div 
                              key={msg.uid} 
                              className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800/30 relative"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">
                                    {msg.usuario_nome || 'Sistema'}
                                  </p>
                                  <span 
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                                      msg.status === 'ERRO' || msg.status === 'FALHA' || msg.status === 'PERDIDA'
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                        : msg.status === 'ENVIADA' || msg.status === 'ENTREGUE' || msg.status === 'LIDA' || !msg.status
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                    }`}
                                  >
                                    {msg.status === 'PERDIDA' ? (
                                      <>
                                        <span>✕</span> Perdida
                                      </>
                                    ) : msg.status === 'ERRO' || msg.status === 'FALHA' ? (
                                      <>
                                        <span>✕</span> {msg.status === 'ERRO' ? 'Erro' : 'Falha'}
                                      </>
                                    ) : msg.status === 'LIDA' ? (
                                      <>
                                        <span>✓</span> Lida
                                      </>
                                    ) : msg.status === 'ENTREGUE' ? (
                                      <>
                                        <span>✓</span> Entregue
                                      </>
                                    ) : msg.status === 'ENVIADA' || !msg.status ? (
                                      <>
                                        <span>↗</span> Enviada
                                      </>
                                    ) : (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                        <span>Processando...</span>
                                      </>
                                    )}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {dataFormatada}
                                </span>
                              </div>
                              <p className="mt-1 text-sm break-words">
                                {msg.mensagem}
                              </p>
                              {isLida && (
                                <div className="absolute -top-2 -right-2">
                                  <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px]">
                                    ✓
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>


            </div>
          </div>
        </div>
      </div>
      
      <input
        id="anexoDocumento"
        type="file"
        className="hidden"
        onChange={handleDocumentoAnexo}
        accept=".pdf,.jpg,.jpeg,.png"
      />

      {/* Modal de Confirmação de Exclusão de Documento */}
      <AlertDialog open={showProtocoloModal} onOpenChange={setShowProtocoloModal}>
        <AlertDialogContent className="w-[95%] sm:w-full max-w-2xl mx-auto p-0 overflow-hidden rounded-lg shadow-2xl">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <AlertDialogHeader className="space-y-2">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-blue-100" />
                <AlertDialogTitle className="text-xl font-semibold text-white">
                  Anexar Documento Protocolado
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-blue-100">
                Para alterar o status para "Protocolado", é necessário anexar o documento correspondente.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="protocolo-file" className="text-sm font-medium text-gray-700 dark:text-gray-300">Selecione o arquivo</Label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Formatos: PDF, JPG, PNG</span>
                </div>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                    <div className="flex text-sm text-gray-600 dark:text-gray-300">
                      <label
                        htmlFor="protocolo-file"
                        className="relative cursor-pointer rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none"
                      >
                        <span>Enviar um arquivo</span>
                        <input
                          id="protocolo-file"
                          name="protocolo-file"
                          type="file"
                          className="sr-only"
                          onChange={(e) => setProtocoloFile(e.target.files ? e.target.files[0] : null)}
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                      </label>
                      <p className="pl-1">ou arraste e solte</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {protocoloFile 
                        ? `Arquivo: ${protocoloFile.name}`
                        : 'Tamanho máximo: 10MB'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div> {/* Fecha o p-6 space-y-6 */}
            <AlertDialogFooter className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 rounded-b-lg mt-0">
              <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {protocoloFile && (
                    <div className="flex items-center text-green-600 dark:text-green-400">
                      <Paperclip className="h-4 w-4 mr-1.5 flex-shrink-0" />
                      <span className="truncate max-w-[200px] sm:max-w-xs" title={protocoloFile.name}>{protocoloFile.name}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <AlertDialogCancel 
                    onClick={() => {
                      setShowProtocoloModal(false);
                      setProtocoloFile(null);
                      if (demanda) setNovoStatus(getValidStatus(demanda.status));
                    }}
                    className="h-10 px-6 m-0 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus-visible:ring-gray-300 dark:focus-visible:ring-gray-500 w-full sm:w-auto"
                  >
                    Cancelar
                  </AlertDialogCancel>
                  <Button
                    onClick={handleUploadProtocolo}
                    disabled={!protocoloFile || uploading}
                    className="h-10 px-6 m-0 bg-blue-600 hover:bg-blue-700 text-white focus-visible:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      'Salvar e Protocolar'
                    )}
                  </Button>
                </div>
              </div>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Confirmação de Exclusão de Documento */}
      <AlertDialog open={showDeleteDocumentoModal} onOpenChange={setShowDeleteDocumentoModal}>
        <AlertDialogContent className="w-[95%] sm:max-w-[425px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            </div>
          </AlertDialogHeader>
          <AlertDialogDescription className="text-base">
            Tem certeza que deseja remover este documento? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
          <AlertDialogFooter className="flex flex-row items-center justify-end gap-3">
            <AlertDialogCancel>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Confirmação de Exclusão de Observação */}
      <AlertDialog open={showDeleteObservacaoModal} onOpenChange={setShowDeleteObservacaoModal}>
        <AlertDialogContent className="w-[95%] sm:max-w-[425px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            </div>
          </AlertDialogHeader>
          <AlertDialogDescription className="text-base">
            Tem certeza que deseja remover esta observação? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
          <AlertDialogFooter className="flex flex-row items-center justify-end gap-3">
            <AlertDialogCancel>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={excluirObservacao}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DetalhesDemanda;
