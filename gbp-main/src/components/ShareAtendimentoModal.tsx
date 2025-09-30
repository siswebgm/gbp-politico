import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  useTheme,
  alpha,
  Tooltip,
  CircularProgress,
  Alert,
  Fade,
  Autocomplete,
  TextField,
  Divider,
  InputAdornment,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import { 
  X as CloseIcon, 
  UserPlus as UserPlusIcon, 
  Trash2 as DeleteIcon, 
  Mail as MailIcon, 
  Copy as CopyIcon, 
  QrCode as QrCodeIcon,
  Users as UsersIcon,
  Share as ShareIcon,
  Link as LinkIcon
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabaseClient } from '../lib/supabase';
import { useToast } from '../hooks/useToast';

interface ShareAtendimentoModalProps {
  open: boolean;
  onClose: () => void;
  atendimentoUid: string;
  empresaUid: string;
  onPermissionChange?: () => void;
}

interface Permissao {
  uid: string;
  usuario_email: string;
  created_at: string;
}

interface Usuario {
  email: string;
  nome: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`share-tabpanel-${index}`}
      aria-labelledby={`share-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function ShareAtendimentoModal({
  open,
  onClose,
  atendimentoUid,
  empresaUid,
  onPermissionChange
}: ShareAtendimentoModalProps) {
  const theme = useTheme();
  const toast = useToast();
  const [currentTab, setCurrentTab] = useState(0);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [novoEmail, setNovoEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // URL de compartilhamento
  const shareUrl = `${window.location.origin}/atendimento/${atendimentoUid}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.showToast({
        title: 'URL copiada',
        description: 'Link de compartilhamento copiado para a área de transferência',
        type: 'success'
      });
    } catch (err) {
      toast.showToast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o link. Tente copiar manualmente.',
        type: 'error'
      });
    }
  };

  useEffect(() => {
    if (open) {
      console.log('Modal aberto com empresaUid:', empresaUid);
      console.log('Tipo do empresaUid:', typeof empresaUid);
      carregarPermissoes();
      carregarUsuarios();
    }
  }, [open, empresaUid]);

  async function carregarUsuarios() {
    setLoadingUsuarios(true);
    setError(null);
    
    try {
      console.log('Carregando usuários para empresa:', empresaUid);
      console.log('Tipo do empresaUid:', typeof empresaUid);
      
      if (!empresaUid) {
        throw new Error('ID da empresa não fornecido');
      }

      const { data, error } = await supabaseClient
        .from('gbp_usuarios')
        .select('email, nome')
        .eq('empresa_uid', empresaUid)
        .order('nome');

      if (error) {
        console.error('Erro Supabase ao carregar usuários:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('Nenhum usuário encontrado para a empresa');
      } else {
        console.log(`${data.length} usuários encontrados`);
      }

      setUsuarios(data || []);
    } catch (err: any) {
      console.error('Erro detalhado ao carregar usuários:', err);
      let mensagemErro = 'Não foi possível carregar a lista de usuários.';
      
      if (err.message) {
        mensagemErro += ` Motivo: ${err.message}`;
      }
      
      if (err.code) {
        console.error('Código do erro:', err.code);
      }
      
      setError(mensagemErro);
      setUsuarios([]);
    } finally {
      setLoadingUsuarios(false);
    }
  }

  async function carregarPermissoes() {
    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('gbp_atendimentos_permissoes')
        .select('*')
        .eq('atendimento_uid', atendimentoUid);

      if (error) throw error;
      setPermissoes(data || []);
    } catch (err) {
      console.error('Erro ao carregar permissões:', err);
      setError('Não foi possível carregar as permissões.');
    } finally {
      setLoading(false);
    }
  }

  async function adicionarPermissao() {
    if (!novoEmail) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { error } = await supabaseClient
        .from('gbp_atendimentos_permissoes')
        .insert({
          atendimento_uid: atendimentoUid,
          usuario_email: novoEmail
        });

      if (error) throw error;
      
      setNovoEmail(null);
      setSuccess('Permissão adicionada com sucesso!');
      carregarPermissoes();
      onPermissionChange?.();
    } catch (err) {
      console.error('Erro ao adicionar permissão:', err);
      setError('Não foi possível adicionar a permissão.');
    } finally {
      setLoading(false);
    }
  }

  async function removerPermissao(uid: string) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { error } = await supabaseClient
        .from('gbp_atendimentos_permissoes')
        .delete()
        .eq('uid', uid);

      if (error) throw error;
      
      setSuccess('Permissão removida com sucesso!');
      carregarPermissoes();
      onPermissionChange?.();
    } catch (err) {
      console.error('Erro ao remover permissão:', err);
      setError('Não foi possível remover a permissão.');
    } finally {
      setLoading(false);
    }
  }

  // Filtra usuários que já têm permissão
  const usuariosDisponiveis = usuarios.filter(
    usuario => !permissoes.some(p => p.usuario_email === usuario.email)
  );

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          maxWidth: '460px',
          maxHeight: '90vh',
          background: 'linear-gradient(145deg, #ffffff 0%, #f8faff 100%)'
        }
      }}
    >
      {/* Header */}
      <Box
        sx={{
          position: 'relative',
          p: 2.5,
          pb: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          borderBottom: '1px solid',
          borderColor: alpha(theme.palette.divider, 0.1),
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'text.secondary',
            bgcolor: alpha(theme.palette.error.main, 0.04),
            '&:hover': { 
              bgcolor: alpha(theme.palette.error.main, 0.1),
              color: 'error.main',
              transform: 'rotate(90deg)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          <CloseIcon size={18} />
        </IconButton>

        <Avatar
          sx={{
            width: 44,
            height: 44,
            mb: 1.5,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.8)} 0%, ${theme.palette.primary.main} 100%)`,
            boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <ShareIcon size={20} />
        </Avatar>

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: 'text.primary', fontSize: '1rem' }}>
          Compartilhar Atendimento
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: '80%', fontSize: '0.875rem' }}>
          Compartilhe este atendimento com sua equipe
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2.5 }}>
        {/* Tabs */}
        <Paper
          elevation={0}
          sx={{
            mb: 1.5,
            borderRadius: '12px',
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            p: 0.5,
          }}
        >
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
              minHeight: 36,
              '& .MuiTab-root': {
                minHeight: 36,
                borderRadius: '8px',
              textTransform: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'primary.main',
                  bgcolor: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              }
            },
              '& .MuiTabs-indicator': { display: 'none' }
          }}
        >
          <Tab 
              icon={<LinkIcon size={16} />} 
            iconPosition="start" 
              label="Link Rápido"
            sx={{ gap: 1 }}
          />
          <Tab 
              icon={<UsersIcon size={16} />} 
            iconPosition="start" 
            label="Permissões" 
            sx={{ gap: 1 }}
          />
        </Tabs>
        </Paper>

        {/* Error/Success Messages */}
        <Box sx={{ mb: 1.5 }}>
          <Fade in={!!error}>
            <Box sx={{ mb: error ? 1 : 0 }}>
              {error && (
                <Alert 
                  severity="error" 
                  onClose={() => setError(null)}
                  sx={{ 
                    borderRadius: '12px',
                    boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.1)}`,
                    py: 0.5,
                  }}
                >
                  {error}
                </Alert>
              )}
            </Box>
          </Fade>
          <Fade in={!!success}>
            <Box sx={{ mb: success ? 1 : 0 }}>
              {success && (
                <Alert 
                  severity="success" 
                  onClose={() => setSuccess(null)}
                  sx={{ 
                    borderRadius: '12px',
                    boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.1)}`,
                    py: 0.5,
                  }}
                >
                  {success}
                </Alert>
              )}
            </Box>
          </Fade>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={currentTab} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: -1 }}>
            {/* Link Section */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: '12px',
                bgcolor: 'white',
                boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
                border: '1px solid',
                borderColor: alpha(theme.palette.divider, 0.08),
              }}
            >
            <Typography 
                variant="subtitle2" 
              sx={{ 
                  mb: 1.5, 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                  gap: 1,
                  color: 'text.primary'
              }}
            >
                <LinkIcon size={16} />
              Link de Compartilhamento
            </Typography>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  value={shareUrl}
                  size="small"
                  InputProps={{
                    readOnly: true,
                    sx: {
                      borderRadius: '8px',
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'transparent'
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'transparent'
                      },
                      fontSize: '0.875rem'
                    }
                  }}
                />
                <Button
                  onClick={handleCopyUrl}
                  variant="contained"
                  startIcon={<CopyIcon size={14} />}
                  size="small"
                  sx={{
                    borderRadius: '8px',
                    textTransform: 'none',
                    px: 2,
                    whiteSpace: 'nowrap',
                    bgcolor: 'primary.main',
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
                    '&:hover': {
                      bgcolor: 'primary.dark',
                      boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                    }
                  }}
                >
                  Copiar
                </Button>
              </Box>
            </Paper>

            {/* QR Code Section */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: '12px',
                bgcolor: 'white',
                boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
                border: '1px solid',
                borderColor: alpha(theme.palette.divider, 0.08),
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
            <Typography 
                variant="subtitle2" 
              sx={{ 
                  mb: 1.5,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                  color: 'text.primary'
              }}
            >
                <QrCodeIcon size={16} />
                Código QR
            </Typography>

            <Paper 
              elevation={0}
              sx={{ 
                  p: 1.5,
                  borderRadius: '12px',
                bgcolor: 'white',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
                border: '1px solid',
                  borderColor: alpha(theme.palette.divider, 0.08),
              }}
            >
              <QRCodeSVG
                value={shareUrl}
                  size={140}
                level="H"
                includeMargin={true}
                bgColor="#FFFFFF"
                fgColor={theme.palette.primary.main}
              />
              </Paper>
            </Paper>
          </Box>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          {/* Add User Form */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: '20px',
              bgcolor: 'white',
              boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
              border: '1px solid',
              borderColor: alpha(theme.palette.divider, 0.08),
              mb: 3
            }}
          >
            <Typography 
              variant="subtitle1" 
              sx={{ 
                mb: 2,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: 'text.primary'
              }}
            >
              <UserPlusIcon size={18} />
              Adicionar Usuário
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
            <Autocomplete
              fullWidth
              options={usuariosDisponiveis}
              getOptionLabel={(option) => `${option.nome} (${option.email})`}
              value={usuariosDisponiveis.find(u => u.email === novoEmail) || null}
              onChange={(_, newValue) => setNovoEmail(newValue?.email || null)}
              loading={loadingUsuarios}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Selecione um usuário"
                  InputProps={{
                    ...params.InputProps,
                      sx: {
                        borderRadius: '12px',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: alpha(theme.palette.divider, 0.2)
                      }
                    }
                  }}
                />
              )}
            />
            <Button
              variant="contained"
              onClick={adicionarPermissao}
              disabled={!novoEmail || loading}
              sx={{
                  borderRadius: '12px',
                  textTransform: 'none',
                px: 3,
                minWidth: '120px',
                  bgcolor: 'primary.main',
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
                '&:hover': {
                    bgcolor: 'primary.dark',
                    boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                }
              }}
            >
                {loading ? <CircularProgress size={24} /> : 'Adicionar'}
            </Button>
          </Box>
          </Paper>

          {/* Users List */}
          <Paper 
            elevation={0}
            sx={{ 
              borderRadius: '20px',
              bgcolor: 'white',
              boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
              border: '1px solid',
              borderColor: alpha(theme.palette.divider, 0.08),
              overflow: 'hidden'
            }}
          >
            <List sx={{ p: 2 }}>
              {permissoes.map((permissao) => (
                <ListItem
                  key={permissao.uid}
                  sx={{
                    borderRadius: '16px',
                    mb: 1,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                      transform: 'translateX(8px)'
                    }
                  }}
                >
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      mr: 2,
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.8)} 0%, ${theme.palette.primary.main} 100%)`,
                      boxShadow: `0 4px 8px ${alpha(theme.palette.primary.main, 0.2)}`,
                      fontSize: '1rem',
                      fontWeight: 600
                    }}
                  >
                    {permissao.usuario_email.charAt(0).toUpperCase()}
                  </Avatar>
                  <ListItemText
                    primary={
                      usuarios.find(u => u.email === permissao.usuario_email)?.nome || 
                      permissao.usuario_email
                    }
                    secondary={new Date(permissao.created_at).toLocaleDateString()}
                    primaryTypographyProps={{
                      sx: { 
                        fontWeight: 600,
                        color: 'text.primary'
                      }
                    }}
                    secondaryTypographyProps={{
                      sx: { 
                        fontSize: '0.75rem',
                        color: 'text.secondary',
                        mt: 0.5
                      }
                    }}
                  />
                    <Tooltip title="Remover acesso">
                      <IconButton
                        onClick={() => removerPermissao(permissao.uid)}
                        disabled={loading}
                        sx={{
                          color: 'text.secondary',
                          '&:hover': {
                            color: 'error.main',
                          bgcolor: alpha(theme.palette.error.main, 0.1),
                          }
                        }}
                      >
                      <DeleteIcon size={18} />
                      </IconButton>
                    </Tooltip>
                </ListItem>
              ))}
              {permissoes.length === 0 && !loading && (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 8,
                    px: 3,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 64,
                      height: 64,
                      mx: 'auto',
                      mb: 2,
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      color: 'primary.main'
                    }}
                  >
                    <UsersIcon size={28} />
                  </Avatar>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
                    Nenhum usuário com acesso
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Adicione usuários para compartilhar este atendimento
                  </Typography>
                </Box>
              )}
            </List>
          </Paper>
        </TabPanel>
      </Box>
    </Dialog>
  );
} 