import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Loader2,
  Chrome,
  KeyRound,
  Power,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { useToast } from '../../../components/ui/use-toast';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import {
  extensaoCredenciaisService,
  type ExtensaoCredencial,
} from '../../../services/extensaoCredenciaisService';

export function ExtensaoSettings() {
  const company = useCompanyStore((state) => state.company);
  const { toast } = useToast();

  const [credenciais, setCredenciais] = useState<ExtensaoCredencial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Criar
  const [showCreate, setShowCreate] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset de senha
  const [resetTarget, setResetTarget] = useState<ExtensaoCredencial | null>(null);
  const [resetSenha, setResetSenha] = useState('');
  const [showResetSenha, setShowResetSenha] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Exclusão
  const [deleteTarget, setDeleteTarget] = useState<ExtensaoCredencial | null>(null);

  const empresaUid = company?.uid;

  const carregar = useCallback(async () => {
    if (!empresaUid) return;
    try {
      const rows = await extensaoCredenciaisService.listar(empresaUid);
      setCredenciais(rows);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar credenciais',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [empresaUid, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirCriar = () => {
    setNovoUsuario('');
    setNovaSenha('');
    setShowSenha(false);
    setShowCreate(true);
  };

  const handleCriar = async () => {
    if (!empresaUid) return;
    if (!novoUsuario.trim()) {
      toast({ title: 'Informe o nome de usuário.' });
      return;
    }
    if (!novaSenha) {
      toast({ title: 'Informe a senha.' });
      return;
    }
    setIsSubmitting(true);
    try {
      await extensaoCredenciaisService.criar(empresaUid, novoUsuario.trim(), novaSenha);
      toast({
        title: 'Credencial criada',
        description: `Login "${novoUsuario.trim()}" criado com sucesso.`,
      });
      setShowCreate(false);
      await carregar();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível criar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!empresaUid || !resetTarget) return;
    if (!resetSenha) {
      toast({ title: 'Informe a nova senha.' });
      return;
    }
    setIsResetting(true);
    try {
      await extensaoCredenciaisService.atualizarSenha(empresaUid, resetTarget.id, resetSenha);
      toast({
        title: 'Senha atualizada',
        description: `A senha de "${resetTarget.usuario}" foi alterada.`,
      });
      setResetTarget(null);
      setResetSenha('');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível atualizar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleStatus = async (cred: ExtensaoCredencial) => {
    if (!empresaUid) return;
    try {
      await extensaoCredenciaisService.definirStatus(empresaUid, cred.id, !cred.ativo);
      setCredenciais((prev) =>
        prev.map((c) => (c.id === cred.id ? { ...c, ativo: !c.ativo } : c))
      );
      toast({
        title: cred.ativo ? 'Credencial desativada' : 'Credencial ativada',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar status',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    }
  };

  const handleExcluir = async () => {
    if (!empresaUid || !deleteTarget) return;
    try {
      await extensaoCredenciaisService.excluir(empresaUid, deleteTarget.id);
      setCredenciais((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast({ title: 'Credencial excluída' });
      setDeleteTarget(null);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    }
  };

  const conectado = (c: ExtensaoCredencial) => {
    if (!c.whatsapp_conectado || !c.heartbeat_em) return false;
    // Considera conectado se o último heartbeat foi há menos de 2 minutos.
    const diff = Date.now() - new Date(c.heartbeat_em).getTime();
    return diff < 2 * 60 * 1000;
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da seção */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <Chrome className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Credenciais da Extensão
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsRefreshing(true);
              carregar();
            }}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button size="sm" onClick={abrirCriar}>
            <Plus className="h-4 w-4 mr-2" />
            Nova credencial
          </Button>
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Carregando...
        </div>
      ) : credenciais.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <KeyRound className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Nenhuma credencial criada ainda.
          </p>
          <Button className="mt-4" size="sm" onClick={abrirCriar}>
            <Plus className="h-4 w-4 mr-2" />
            Criar a primeira
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  WhatsApp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {credenciais.map((cred) => (
                <tr key={cred.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{cred.usuario}</div>
                    <div className="text-xs text-gray-400">
                      Criado em {new Date(cred.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {conectado(cred) ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
                        <Wifi className="h-4 w-4" />
                        {cred.whatsapp_numero || 'Conectado'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
                        <WifiOff className="h-4 w-4" />
                        Desconectado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        cred.ativo
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {cred.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Resetar senha"
                        onClick={() => {
                          setResetTarget(cred);
                          setResetSenha('');
                          setShowResetSenha(false);
                        }}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title={cred.ativo ? 'Desativar' : 'Ativar'}
                        onClick={() => handleToggleStatus(cred)}
                      >
                        <Power
                          className={`h-4 w-4 ${
                            cred.ativo ? 'text-green-600' : 'text-gray-400'
                          }`}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Excluir"
                        onClick={() => setDeleteTarget(cred)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog: criar */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova credencial da extensão</DialogTitle>
            <DialogDescription>
              Defina um usuário e uma senha. Anote a senha: ela não poderá ser vista novamente
              depois de salva.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ext-usuario">Usuário</Label>
              <Input
                id="ext-usuario"
                value={novoUsuario}
                onChange={(e) => setNovoUsuario(e.target.value)}
                placeholder="ex: gabinete_maria"
                autoComplete="off"
              />
              <p className="text-xs text-gray-400">
                O nome de usuário é único no sistema todo. Se já existir, você será avisado.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ext-senha">Senha</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="ext-senha"
                    type={showSenha ? 'text' : 'password'}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Digite a senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleCriar} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar credencial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: reset de senha */}
      <Dialog
        open={!!resetTarget}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null);
            setResetSenha('');
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resetar senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para o login <strong>{resetTarget?.usuario}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="ext-reset-senha">Nova senha</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="ext-reset-senha"
                  type={showResetSenha ? 'text' : 'password'}
                  value={resetSenha}
                  onChange={(e) => setResetSenha(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Digite a nova senha"
                />
                <button
                  type="button"
                  onClick={() => setShowResetSenha((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showResetSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetTarget(null);
                setResetSenha('');
              }}
              disabled={isResetting}
            >
              Cancelar
            </Button>
            <Button onClick={handleReset} disabled={isResetting}>
              {isResetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar nova senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alerta: excluir */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir credencial?</AlertDialogTitle>
            <AlertDialogDescription>
              O login <strong>{deleteTarget?.usuario}</strong> será removido permanentemente e não
              poderá mais acessar a extensão. Essa ação não pode ser desfeita. Se quiser apenas
              bloquear o acesso, use "Desativar".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluir}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
