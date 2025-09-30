import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabaseClient } from '../../../lib/supabase';
import { updateAttendance } from '../../../services/attendance';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  TextField, 
  Button, 
  CircularProgress,
  Chip,
  Paper,
  Avatar,
  Container,
  useTheme,
  alpha,
  Theme,
  Grid,
  IconButton,
  Tooltip,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Divider
} from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Person from '@mui/icons-material/Person';
import Assignment from '@mui/icons-material/Assignment';
import Category from '@mui/icons-material/Category';
import AccessTime from '@mui/icons-material/AccessTime';
import Description from '@mui/icons-material/Description';
import SendIcon from '@mui/icons-material/Send';
import CommentIcon from '@mui/icons-material/Comment';
import EventIcon from '@mui/icons-material/Event';
import BusinessIcon from '@mui/icons-material/Business';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/PendingActions';
import UpdateIcon from '@mui/icons-material/Update';
import CancelIcon from '@mui/icons-material/Cancel';
import AddIcon from '@mui/icons-material/Add';
import CircleIcon from '@mui/icons-material/Circle';
import HistoryIcon from '@mui/icons-material/History';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SecurityIcon from '@mui/icons-material/Security';
import { useAuth } from '../../../providers/AuthProvider';
import { GerenciarPermissoes } from './GerenciarPermissoes';

interface Observacao {
  uid: string;
  atendimento_uid: string;
  observacao: string;
  created_at: string;
  responsavel: string;
  empresa_uid: string;
  responsavel_nome?: string;
  avatar_url?: string | null;
}

interface Atendimento {
  uid: string;
  atendimentos_uid: string;
  eleitor_uid: string;
  usuario_uid: string;
  categoria_uid: string;
  descricao: string;
  data_atendimento: string;
  empresa_uid: string;
  status: string;
  responsavel: string;
  indicado: string;
  numero: number;
  created_at: string;
  tipo_de_atendimento: string;
  data_agendamento: string;
  data_expiração: string;
  eleitor: {
    nome: string;
  };
  categoria: {
    nome: string;
  };
  empresa: {
    nome: string;
  };
}

interface AtendimentoPermissao {
  uid: string;
  atendimento_uid: string;
  usuario_email: string;
  created_at: string;
}

const statusSteps = [
  { label: 'Pendente', icon: <PendingIcon />, color: '#FFA726' },
  { label: 'Em Andamento', icon: <UpdateIcon />, color: '#29B6F6' },
  { label: 'Concluído', icon: <CheckCircleIcon />, color: '#66BB6A' }
];

// Primeiro, vamos definir a interface do TimelineEntry
interface TimelineEntryProps {
  date: string;
  author?: string | null;
  content: React.ReactNode;
  isLast?: boolean;
  userUid?: string | null;
}

function TimelineEntry({ date, author, content, isLast = false, userUid }: TimelineEntryProps) {
  const theme = useTheme();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAvatar() {
      if (!userUid) return;

      try {
        const { data: userData } = await supabaseClient
          .from('gbp_usuarios')
          .select('foto')
          .eq('uid', userUid)
          .single();

        if (userData?.foto) {
          const { data: { publicUrl } } = supabaseClient
            .storage
            .from('avatars')
            .getPublicUrl(userData.foto);
          
          setAvatarUrl(publicUrl);
        }
      } catch (error) {
        console.error('Erro ao buscar avatar:', error);
      }
    }

    fetchAvatar();
  }, [userUid]);

  return (
    <Box sx={{ position: 'relative', pb: isLast ? 0 : 3 }}>
      {!isLast && (
        <Box
          sx={{
            position: 'absolute',
            left: { xs: '20px', sm: '15px' },
            top: '40px',
            bottom: 0,
            width: '2px',
            bgcolor: alpha(theme.palette.primary.main, 0.2),
            zIndex: 0
          }}
        />
      )}
      
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1, sm: 2 }
        }}
      >
        {/* Data */}
        <Box 
          sx={{ 
            width: { xs: '100%', sm: '120px' },
            minWidth: { sm: '120px' },
            order: { xs: 2, sm: 1 }
          }}
        >
          <Typography 
            variant="caption" 
            color="text.secondary"
            component="div"
            sx={{ 
              display: 'block',
              textAlign: { xs: 'left', sm: 'right' },
              pl: { xs: '52px', sm: 0 }
            }}
          >
            {date}
          </Typography>
        </Box>

        {/* Conteúdo */}
        <Box 
          sx={{ 
            flex: 1,
            display: 'flex',
            gap: 2,
            order: { xs: 1, sm: 2 }
          }}
        >
          {/* Ponto na timeline */}
          <Box>
            <Avatar
              src={avatarUrl || undefined}
              sx={{
                width: 32,
                height: 32,
                bgcolor: theme.palette.primary.main,
                boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.1)}`
              }}
            >
              {!avatarUrl && <Person sx={{ fontSize: 16 }} />}
            </Avatar>
          </Box>

          {/* Conteúdo da observação */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              flex: 1,
              backgroundColor: alpha(theme.palette.primary.main, 0.03),
              borderRadius: 2,
              border: '1px solid',
              borderColor: alpha(theme.palette.primary.main, 0.1)
            }}
          >
            {author && (
              <Typography variant="subtitle2" color="primary" gutterBottom>
                {author}
              </Typography>
            )}
            <Box component="div">
              {content}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

export function PublicAtendimento() {
  const theme = useTheme();
  const { uid } = useParams();
  const { user } = useAuth();
  const [atendimento, setAtendimento] = useState<Atendimento | null>(null);
  const [observacoes, setObservacoes] = useState<Observacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [observacao, setObservacao] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [novoStatus, setNovoStatus] = useState('');
  const [permissoes, setPermissoes] = useState<AtendimentoPermissao[]>([]);
  const [openPermissoesDialog, setOpenPermissoesDialog] = useState(false);
  const [lembreteTitle, setLembreteTitle] = useState('');
  const [lembreteDescription, setLembreteDescription] = useState('');
  const [lembreteDueDate, setLembreteDueDate] = useState('');
  const [showLembreteForm, setShowLembreteForm] = useState(false);

  useEffect(() => {
    fetchAtendimento();
  }, [uid]);

  useEffect(() => {
    if (atendimento?.uid) {
      fetchObservacoes();
    }
  }, [atendimento?.uid]);

  async function fetchObservacoes() {
    try {
      if (!atendimento?.uid) {
        console.log('Atendimento UID não disponível');
        return;
      }

      console.log('Buscando observações para o atendimento:', atendimento.uid);
      
      const { data: observacoesData, error } = await supabaseClient
        .from('gbp_observacoes')
        .select(`
          *,
          usuario:gbp_usuarios(
            nome,
            foto
          )
        `)
        .eq('atendimento_uid', atendimento.uid)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar observações:', error);
        throw error;
      }

      console.log('Observações encontradas:', observacoesData?.length || 0);
      console.log('Dados brutos:', observacoesData);

      // Mapear os dados para o formato esperado
      const observacoesProcessadas = (observacoesData || []).map(obs => ({
        ...obs,
        responsavel_nome: obs.usuario?.nome || 'Usuário',
        avatar_url: obs.usuario?.foto || null
      }));

      console.log('Observações processadas:', observacoesProcessadas);
      setObservacoes(observacoesProcessadas);
    } catch (err) {
      console.error('Erro ao buscar observações:', err);
      alert('Não foi possível carregar as observações do atendimento.');
    }
  }

  async function verificarPermissao(atendimentoUid: string) {
    // Se não houver usuário logado, permite visualização mas não edição
    if (!user?.email) {
      return true; // Permite visualização pública
    }
    
    // Para usuários logados, verifica permissões específicas
    try {
      const { data, error } = await supabaseClient
        .from('gbp_atendimentos_permissoes')
        .select('uid')
        .eq('atendimento_uid', atendimentoUid)
        .eq('usuario_email', user.email);

      if (error) {
        console.error('Erro ao verificar permissão:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (err) {
      console.error('Erro ao verificar permissão:', err);
      return false;
    }
  }

  // Função para verificar se o usuário pode editar
  function podeEditar() {
    return !!user?.email;
  }

  async function fetchAtendimento() {
    try {
      if (!uid) return;

      // Verificar permissão antes de buscar o atendimento
      const temPermissao = await verificarPermissao(uid);
      if (!temPermissao) {
        setError('Você não tem permissão para visualizar este atendimento.');
        setLoading(false);
        return;
      }

      console.log('Buscando atendimento com UID:', uid);
      
      const { data: atendimentoData, error: atendimentoError } = await supabaseClient
        .from('gbp_atendimentos')
        .select('*')
        .eq('uid', uid)
        .single();

      if (atendimentoError) {
        console.error('Erro ao buscar atendimento:', atendimentoError);
        throw atendimentoError;
      }

      if (!atendimentoData) {
        throw new Error('Atendimento não encontrado');
      }

      // Buscar dados do eleitor
      if (atendimentoData.eleitor_uid) {
        const { data: eleitorData } = await supabaseClient
          .from('gbp_eleitores')
          .select('nome')
          .eq('uid', atendimentoData.eleitor_uid)
          .single();

        if (eleitorData) {
          atendimentoData.eleitor = { nome: eleitorData.nome };
        }
      }

      // Buscar dados da categoria
      if (atendimentoData.categoria_uid) {
        const { data: categoriaData } = await supabaseClient
          .from('gbp_categorias')
          .select('nome')
          .eq('uid', atendimentoData.categoria_uid)
          .single();

        if (categoriaData) {
          atendimentoData.categoria = { nome: categoriaData.nome };
        }
      }

      // Buscar dados da empresa
      if (atendimentoData.empresa_uid) {
        const { data: empresaData } = await supabaseClient
          .from('gbp_empresas')
          .select('nome')
          .eq('uid', atendimentoData.empresa_uid)
          .single();

        if (empresaData) {
          atendimentoData.empresa = { nome: empresaData.nome };
        }
      }

      console.log('Dados do atendimento:', atendimentoData);
      setAtendimento(atendimentoData);
    } catch (err) {
      console.error('Erro ao buscar atendimento:', err);
      setError('Não foi possível carregar o atendimento.');
    } finally {
      setLoading(false);
    }
  }

  async function adicionarObservacao() {
    if (!observacao.trim() || !atendimento) return;

    try {
      const novaObservacao = {
        atendimento_uid: atendimento.uid,
        observacao: observacao.trim(),
        empresa_uid: atendimento.empresa_uid,
        responsavel: user?.uid,
        created_at: new Date().toISOString()
      };

      console.log('Adicionando observação:', novaObservacao);

      const { error } = await supabaseClient
        .from('gbp_observacoes')
        .insert([novaObservacao]);

      if (error) {
        console.error('Erro ao inserir observação:', error);
        throw error;
      }

      setObservacao('');
      await fetchObservacoes();
    } catch (err) {
      console.error('Erro ao adicionar observação:', err);
      alert('Não foi possível adicionar a observação.');
    }
  }

  const activeStep = statusSteps.findIndex(
    step => step.label.toLowerCase() === atendimento?.status?.toLowerCase()
  );

  async function atualizarStatus() {
    if (!novoStatus || !atendimento || !user?.uid) return;

    try {
      // Usa a função updateAttendance em vez de atualizar diretamente
      await updateAttendance(Number(atendimento.uid), { 
        status: novoStatus,
        empresa_uid: atendimento.empresa_uid,
        responsavel: user.uid
      });

      // Adiciona uma observação sobre a mudança de status
      await supabaseClient
        .from('gbp_observacoes')
        .insert({
          atendimento_uid: atendimento.uid,
          observacao: `Status atualizado para: ${novoStatus}`,
          empresa_uid: atendimento.empresa_uid,
          responsavel: user.uid,
          created_at: new Date().toISOString()
        });

      setOpenDialog(false);
      fetchAtendimento();
      fetchObservacoes();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      alert('Não foi possível atualizar o status.');
    }
  }

  async function handleAddLembrete(e: React.FormEvent) {
    e.preventDefault();
    if (!atendimento?.uid) return;

    try {
      const novoLembrete = {
        atendimento_uid: atendimento.uid,
        empresa_uid: atendimento.empresa_uid,
        title: lembreteTitle,
        description: lembreteDescription,
        due_date: lembreteDueDate,
        priority: 'medium' as const,
        status: 'pending' as const,
        created_by: user?.uid || null
      };

      const { error } = await supabaseClient
        .from('gbp_lembretes')
        .insert([novoLembrete]);

      if (error) throw error;

      // Limpar os campos do formulário
      setLembreteTitle('');
      setLembreteDescription('');
      setLembreteDueDate('');
      
      // Feedback visual
      alert('Lembrete registrado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar lembrete:', error);
      alert('Erro ao registrar lembrete. Tente novamente.');
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !atendimento) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography color="error">{error || 'Atendimento não encontrado.'}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      backgroundColor: '#f8fafc', 
      minHeight: '100vh',
      overflow: 'auto',
      position: 'relative',
    }}>
      <Container maxWidth="lg" sx={{ 
        py: { xs: 1, sm: 4 },
        px: { xs: 1, sm: 3 },
        mb: { xs: 2, sm: 4 }
      }}>
        {/* Cabeçalho */}
        <Paper 
          elevation={0}
          sx={{ 
            p: { xs: 1.5, sm: 3 },
            mb: { xs: 1.5, sm: 3 },
            borderRadius: { xs: 2, sm: 3 },
            background: 'white',
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.1)
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' }, 
            gap: { xs: 1.5, sm: 2 }
          }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: { xs: 1.5, sm: 2 },
                flex: 1
              }}
            >
              <Avatar 
                sx={{ 
                  width: { xs: 40, sm: 64 },
                  height: { xs: 40, sm: 64 }, 
                  bgcolor: theme.palette.primary.main 
                }}
              >
                <Assignment sx={{ fontSize: { xs: 20, sm: 32 } }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 600, 
                    mb: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '1.25rem', sm: '2rem' }
                  }}
                >
                  {atendimento.eleitor?.nome || 'N/A'}
                </Typography>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    gap: 0.5,
                    flexWrap: 'wrap'
                  }}
                >
                  <Chip 
                    icon={<Category fontSize="small" />}
                    label={atendimento.categoria?.nome || 'N/A'}
                    size="small"
                    sx={{ height: 24 }}
                  />
                  <Chip 
                    icon={<BusinessIcon fontSize="small" />}
                    label={atendimento.empresa?.nome || 'N/A'}
                    size="small"
                    sx={{ height: 24 }}
                  />
                </Box>
              </Box>
            </Box>
            
            <Box 
              sx={{ 
                textAlign: { xs: 'left', sm: 'right' },
                pl: { xs: '48px', sm: 0 },
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5
              }}
            >
              <Typography variant="caption" color="text.secondary" display="block">
                Protocolo
              </Typography>
              <Typography 
                variant="h6" 
                color="primary" 
                sx={{ 
                  fontWeight: 600,
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }}
              >
                #{atendimento.atendimentos_uid}
              </Typography>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                display="block"
                sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
              >
                {format(new Date(atendimento.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Descrição do Atendimento */}
        <Paper 
          elevation={0}
          sx={{ 
            p: { xs: 2, sm: 3 }, 
            mb: { xs: 2, sm: 3 }, 
            borderRadius: 3,
            background: 'white',
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.1)
          }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: 2
            }}
          >
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 1
              }}
            >
              <Description sx={{ color: 'primary.main' }} />
              <Typography variant="h6" color="primary">
                Descrição do Atendimento
              </Typography>
            </Box>
            
            <Box 
              sx={{ 
                backgroundColor: alpha(theme.palette.primary.main, 0.03),
                borderRadius: 2,
                p: { xs: 2, sm: 3 },
                border: '1px solid',
                borderColor: alpha(theme.palette.primary.main, 0.1)
              }}
            >
              <Typography 
                sx={{ 
                  whiteSpace: 'pre-wrap',
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  lineHeight: 1.6
                }}
              >
                {atendimento.descricao || 'Nenhuma descrição fornecida.'}
              </Typography>
            </Box>

            {/* Informações Adicionais */}
            <Box 
              sx={{ 
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                mt: 1
              }}
            >
              {atendimento.data_atendimento && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTime fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Data do Atendimento: {format(new Date(atendimento.data_atendimento), "dd/MM/yyyy", { locale: ptBR })}
                  </Typography>
                </Box>
              )}
              
              {atendimento.data_agendamento && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EventIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Agendado para: {format(new Date(atendimento.data_agendamento), "dd/MM/yyyy", { locale: ptBR })}
                  </Typography>
                </Box>
              )}

              {atendimento.tipo_de_atendimento && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assignment fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Tipo: {atendimento.tipo_de_atendimento}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Paper>

        {/* Status do Atendimento */}
        <Paper 
          elevation={0}
          sx={{ 
            p: { xs: 1.5, sm: 3 }, 
            mb: { xs: 1.5, sm: 3 }, 
            borderRadius: { xs: 2, sm: 3 },
            background: 'white',
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.1)
          }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              gap: { xs: 1, sm: 2 },
              mb: { xs: 2, sm: 3 }
            }}
          >
            <Typography 
              variant="h6" 
              color="primary"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                fontSize: { xs: '1rem', sm: '1.25rem' }
              }}
            >
              <Assignment sx={{ fontSize: 'inherit' }} />
              Status do Atendimento
            </Typography>
          </Box>

          <Box sx={{ px: { xs: 0, sm: 3 }, py: { xs: 1, sm: 2 } }}>
            <Box 
              sx={{ 
                position: 'relative',
                '&:before': {
                  content: '""',
                  position: 'absolute',
                  top: '50%',
                  left: { xs: '20%', sm: '10%' },
                  right: { xs: '20%', sm: '10%' },
                  height: '2px',
                  backgroundColor: alpha(theme.palette.primary.main, 0.12),
                  transform: 'translateY(-50%)',
                  zIndex: 0
                }
              }}
            >
              <Grid container spacing={1} justifyContent="space-between">
                {statusSteps.map((step, index) => (
                  <Grid item xs={4} key={step.label}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        position: 'relative',
                        zIndex: 1
                      }}
                    >
                      <Avatar
                        sx={{
                          width: { xs: 32, sm: 48 },
                          height: { xs: 32, sm: 48 },
                          bgcolor: index <= activeStep ? step.color : 'grey.100',
                          color: index <= activeStep ? 'white' : 'grey.400',
                          border: '3px solid white',
                          boxShadow: index <= activeStep ? 2 : 0,
                          transition: 'all 0.3s ease',
                          '& .MuiSvgIcon-root': {
                            fontSize: { xs: '1rem', sm: '1.5rem' }
                          }
                        }}
                      >
                        {step.icon}
                      </Avatar>
                      <Typography
                        sx={{
                          mt: 1,
                          color: index <= activeStep ? 'text.primary' : 'text.secondary',
                          fontWeight: index <= activeStep ? 500 : 400,
                          fontSize: { xs: '0.7rem', sm: '1rem' },
                          textAlign: 'center',
                          transition: 'all 0.3s ease',
                          lineHeight: { xs: 1.1, sm: 1.5 },
                          maxWidth: { xs: '60px', sm: 'none' }
                        }}
                      >
                        {step.label}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        </Paper>

        {/* Timeline de Observações */}
        <Paper 
          elevation={0}
          sx={{ 
            p: { xs: 2, sm: 3 }, 
            borderRadius: 3,
            background: 'white',
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.1),
            mb: { xs: 2, sm: 3 }
          }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              gap: 2,
              mb: 3
            }}
          >
            <Typography 
              variant="h6" 
              color="primary"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <CommentIcon sx={{ fontSize: 'inherit' }} />
              Histórico do Atendimento
            </Typography>
          </Box>

          <Stack spacing={0}>
            {observacoes.map((obs, index) => (
              <TimelineEntry
                key={obs.uid}
                date={format(new Date(obs.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                author={obs.responsavel_nome}
                content={obs.observacao}
                isLast={index === observacoes.length - 1}
                userUid={obs.responsavel}
              />
            ))}

            {/* Campo para nova observação */}
            {user && (
              <Box sx={{ mt: 3 }}>
                <Box 
                  sx={{ 
                    position: 'relative',
                    pb: 0
                  }}
                >
                  <Box 
                    sx={{ 
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: { xs: 1, sm: 2 }
                    }}
                  >
                    {/* Data */}
                    <Box 
                      sx={{ 
                        width: { xs: '100%', sm: '120px' },
                        minWidth: { sm: '120px' },
                        order: { xs: 2, sm: 1 }
                      }}
                    >
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        component="div"
                        sx={{ 
                          display: 'block',
                          textAlign: { xs: 'left', sm: 'right' },
                          pl: { xs: '52px', sm: 0 }
                        }}
                      >
                        Agora
                      </Typography>
                    </Box>

                    {/* Conteúdo */}
                    <Box 
                      sx={{ 
                        flex: 1,
                        display: 'flex',
                        gap: 2,
                        order: { xs: 1, sm: 2 }
                      }}
                    >
                      {/* Ponto na timeline */}
                      <Box>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: theme.palette.primary.main,
                            boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.1)}`
                          }}
                        >
                          <CommentIcon sx={{ fontSize: 16 }} />
                        </Avatar>
                      </Box>

                      {/* Conteúdo da observação */}
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          flex: 1,
                          backgroundColor: alpha(theme.palette.primary.main, 0.03),
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: alpha(theme.palette.primary.main, 0.1)
                        }}
                      >
                        <Box component="form" onSubmit={(e) => { e.preventDefault(); adicionarObservacao(); }}>
                          <TextField
                            id="nova-observacao"
                            fullWidth
                            multiline
                            rows={3}
                            placeholder="Adicione uma nova atualização..."
                            value={observacao}
                            onChange={(e) => setObservacao(e.target.value)}
                            variant="outlined"
                            sx={{ 
                              backgroundColor: 'white',
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2
                              }
                            }}
                          />
                          <Box 
                            sx={{ 
                              display: 'flex',
                              justifyContent: 'flex-end',
                              mt: 2
                            }}
                          >
                            <Button
                              type="submit"
                              variant="contained"
                              disabled={!observacao.trim()}
                              startIcon={<SendIcon />}
                            >
                              Enviar
                            </Button>
                          </Box>
                        </Box>
                      </Paper>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}
          </Stack>
        </Paper>

        {/* Formulário de Adição de Lembrete */}
        <Paper 
          elevation={0}
          sx={{ 
            p: { xs: 2, sm: 3 }, 
            borderRadius: 3,
            background: 'white',
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.1),
            mb: { xs: 4, sm: 5 }
          }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              gap: 2,
              mb: showLembreteForm ? 3 : 0
            }}
          >
            <Typography 
              variant="h6" 
              color="primary"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <NotificationsIcon sx={{ fontSize: 'inherit' }} />
              Lembretes
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={showLembreteForm ? <CancelIcon /> : <AddIcon />}
              onClick={() => setShowLembreteForm(!showLembreteForm)}
              size="small"
            >
              {showLembreteForm ? 'Cancelar' : 'Novo Lembrete'}
            </Button>
          </Box>

          {showLembreteForm && (
            <Box component="form" onSubmit={handleAddLembrete}>
              <TextField
                label="Título"
                fullWidth
                required
                value={lembreteTitle}
                onChange={(e) => setLembreteTitle(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Descrição"
                fullWidth
                multiline
                rows={3}
                value={lembreteDescription}
                onChange={(e) => setLembreteDescription(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Box sx={{ mb: 2 }}>
                <InputLabel>Data e Hora de Vencimento</InputLabel>
                <TextField
                  type="datetime-local"
                  fullWidth
                  required
                  value={lembreteDueDate}
                  onChange={(e) => setLembreteDueDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={<NotificationsIcon />}
                >
                  Registrar Lembrete
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Container>

      {/* Dialog para Atualizar Status */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            border: '1px solid',
            borderColor: 'divider'
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          '& .MuiTypography-root': {
            fontSize: '1.25rem',
            fontWeight: 600
          }
        }}>
          <UpdateIcon color="primary" />
          Atualizar Status do Atendimento
        </DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <FormControl fullWidth>
            <InputLabel>Novo Status</InputLabel>
            <Select
              value={novoStatus}
              label="Novo Status"
              onChange={(e) => setNovoStatus(e.target.value)}
              sx={{
                '& .MuiSelect-select': {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }
              }}
            >
              {statusSteps.map((step) => (
                <MenuItem 
                  key={step.label} 
                  value={step.label}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: 1.5,
                    px: 2,
                    '& .MuiSvgIcon-root': {
                      color: step.color
                    },
                    '&.Mui-selected': {
                      backgroundColor: alpha(step.color, 0.1),
                      '&:hover': {
                        backgroundColor: alpha(step.color, 0.15)
                      }
                    },
                    '&:hover': {
                      backgroundColor: alpha(step.color, 0.05)
                    }
                  }}
                >
                  {step.icon}
                  {step.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 2 }}>
          <Button 
            onClick={() => setOpenDialog(false)}
            variant="outlined"
            color="inherit"
            startIcon={<CancelIcon />}
            sx={{ 
              flex: 1,
              borderRadius: 2,
              textTransform: 'none',
              borderColor: 'divider',
              color: 'text.secondary',
              '&:hover': {
                borderColor: 'text.secondary',
                backgroundColor: 'action.hover'
              }
            }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={atualizarStatus} 
            variant="contained"
            disabled={!novoStatus}
            startIcon={<CheckCircleIcon />}
            sx={{ 
              flex: 1,
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: novoStatus ? 2 : 0
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 