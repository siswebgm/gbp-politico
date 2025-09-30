import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
  Box,
  alpha,
  useTheme
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SecurityIcon from '@mui/icons-material/Security';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabaseClient } from '../../../lib/supabase';

interface GerenciarPermissoesProps {
  open: boolean;
  onClose: () => void;
  atendimentoUid: string;
  onPermissionChange: () => void;
}

interface Permissao {
  uid: string;
  usuario_email: string;
  created_at: string;
}

export function GerenciarPermissoes({ open, onClose, atendimentoUid, onPermissionChange }: GerenciarPermissoesProps) {
  const theme = useTheme();
  const [novoEmail, setNovoEmail] = useState('');
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar permissões existentes
  async function carregarPermissoes() {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabaseClient
        .from('gbp_atendimentos_permissoes')
        .select('uid, usuario_email, created_at')
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

  // Adicionar nova permissão
  async function adicionarPermissao() {
    if (!novoEmail.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabaseClient
        .from('gbp_atendimentos_permissoes')
        .insert({
          atendimento_uid: atendimentoUid,
          usuario_email: novoEmail.trim()
        });

      if (error) throw error;

      setNovoEmail('');
      await carregarPermissoes();
      onPermissionChange();
    } catch (err) {
      console.error('Erro ao adicionar permissão:', err);
      setError('Não foi possível adicionar a permissão.');
    } finally {
      setLoading(false);
    }
  }

  // Remover permissão
  async function removerPermissao(uid: string) {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabaseClient
        .from('gbp_atendimentos_permissoes')
        .delete()
        .eq('uid', uid);

      if (error) throw error;

      await carregarPermissoes();
      onPermissionChange();
    } catch (err) {
      console.error('Erro ao remover permissão:', err);
      setError('Não foi possível remover a permissão.');
    } finally {
      setLoading(false);
    }
  }

  // Carregar permissões quando o diálogo for aberto
  useEffect(() => {
    if (open) {
      carregarPermissoes();
    }
  }, [open]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="sm"
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
        justifyContent: 'space-between',
        gap: 1,
        '& .MuiTypography-root': {
          fontSize: '1.25rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon color="primary" />
          <Typography>Gerenciar Permissões</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: '16px !important' }}>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Adicionar Novo Usuário
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Email do usuário"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              disabled={loading}
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              onClick={adicionarPermissao}
              disabled={loading || !novoEmail.trim()}
              startIcon={<PersonAddIcon />}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                whiteSpace: 'nowrap'
              }}
            >
              Adicionar
            </Button>
          </Box>
        </Box>

        <Typography variant="subtitle2" gutterBottom>
          Usuários com Acesso
        </Typography>
        
        <List>
          {permissoes.map((permissao) => (
            <ListItem
              key={permissao.uid}
              sx={{
                borderRadius: 2,
                mb: 1,
                backgroundColor: alpha(theme.palette.primary.main, 0.03),
                border: '1px solid',
                borderColor: alpha(theme.palette.primary.main, 0.1)
              }}
            >
              <ListItemText 
                primary={permissao.usuario_email}
                primaryTypographyProps={{
                  sx: { fontWeight: 500 }
                }}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={() => removerPermissao(permissao.uid)}
                  disabled={loading}
                  size="small"
                  sx={{ 
                    color: 'error.main',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.error.main, 0.1)
                    }
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
          {permissoes.length === 0 && (
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                textAlign: 'center',
                py: 4
              }}
            >
              Nenhum usuário com permissão de acesso.
            </Typography>
          )}
        </List>
      </DialogContent>

      <DialogActions sx={{ p: 2.5 }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          color="inherit"
          sx={{ 
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
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
} 