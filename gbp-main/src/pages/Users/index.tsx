import { useState, useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EditUserModal } from './components/EditUserModal';
import { DeleteUserModal } from './components/DeleteUserModal';
import { UserCard } from './components/UserCard';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Phone, 
  Users as UsersIcon, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Trash2,
  LayoutGrid,
  List
} from 'lucide-react';
import { userService, User as UserType } from '../../services/users';
import { statsService, UserStats } from '../../services/stats';
import { toast } from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { cn } from '../../lib/utils';
import { useAuth } from '../../providers/AuthProvider';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import { ShieldCheck, Eye, EyeOff, X } from 'lucide-react';
import { AccessLevelPermissions } from '../../components/AccessLevelPermissions';
import { hasRestrictedAccess, ACCESS_LEVELS, ACCESS_LEVEL_DESCRIPTIONS } from '../../constants/accessLevels';

export function Users() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canAccess = hasRestrictedAccess(user?.nivel_acesso);

  useEffect(() => {
    if (!canAccess) {
      navigate('/app');
      return;
    }
  }, [canAccess, navigate]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserType | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTab, setSelectedTab] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const company = useCompanyStore((state) => state.company);
  const authUser = useAuthStore((state) => state.user);
  const [userStats, setUserStats] = useState<Record<string, UserStats>>({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadUsers = async () => {
    if (!company?.uid) {
      console.log('Nenhuma empresa selecionada');
      return;
    }

    try {
      setLoading(true);
      console.log('Carregando usuários para empresa:', company.uid);
      const data = await userService.list(company.uid);
      console.log('Usuários carregados:', data);
      setUsers(data);
    } catch (error) {
      console.error('Erro detalhado ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [company?.uid]);

  useEffect(() => {
    // Atualiza o currentTime a cada segundo
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  // Funções auxiliares
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatDisplayName = (name: string) => {
    return name.split(' ')[0];
  };

  const calcularPorcentagem = (valor: number, total: number = 1000) => {
    return Math.min(Math.round((valor / total) * 100), 100);
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      active: {
        label: 'Ativo',
        color: 'border-green-200 bg-green-50 text-green-700',
      },
      pending: {
        label: 'Pendente',
        color: 'border-yellow-200 bg-yellow-50 text-yellow-700',
      },
      blocked: {
        label: 'Bloqueado',
        color: 'border-red-200 bg-red-50 text-red-700',
      },
    };

    return statusMap[status] || statusMap.pending;
  };

  const getNivelAcessoInfo = (nivel: string) => {
    const nivelMap: Record<string, { label: string; color: string; bgColor: string }> = {
      admin: {
        label: 'Administrador',
        color: 'text-purple-700 dark:text-purple-400',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800'
      },
      coordenador: {
        label: 'Coordenador',
        color: 'text-blue-700 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
      },
      analista: {
        label: 'Analista',
        color: 'text-cyan-700 dark:text-cyan-400',
        bgColor: 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800'
      },
      colaborador: {
        label: 'Colaborador',
        color: 'text-green-700 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800'
      },
      visitante: {
        label: 'Visitante',
        color: 'text-gray-700 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800'
      }
    };

    return nivelMap[nivel] || nivelMap.visitante;
  };

  const isOnline = (lastAccess: string | null) => {
    if (!lastAccess) return false;
    const lastAccessDate = new Date(lastAccess);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastAccessDate > fiveMinutesAgo;
  };

  const formatLastAccess = (lastAccess: string | null) => {
    if (!lastAccess) return 'Nunca acessou';
    const date = new Date(lastAccess);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    
    if (minutes < 1) return 'Online';
    if (minutes < 60) return `há ${minutes} minutos`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours} horas`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return 'há 1 dia';
    if (days < 7) return `há ${days} dias`;
    
    return date.toLocaleDateString('pt-BR');
  };

  const loadUserStats = async () => {
    if (!company?.uid || loadingStats) {
      return;
    }
    
    try {
      setLoadingStats(true);
      console.log('🚀 Carregando stats otimizadas para empresa:', company.uid);
      const startTime = performance.now();
      
      const stats = await statsService.getAllUsersStats(company.uid);
      
      const endTime = performance.now();
      console.log(`✅ Stats carregadas em ${(endTime - startTime).toFixed(2)}ms`);
      console.log('Stats:', stats);
      
      setUserStats(stats);
    } catch (error) {
      console.error('❌ Erro ao carregar stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (users.length > 0 && company?.uid && !loadingStats) {
      loadUserStats();
    }
  }, [users.length, company?.uid]);

  const handleEditUser = (user: UserType) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleSuccess = () => {
    loadUsers();
    setIsEditModalOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteClick = (user: UserType) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    try {
      setIsDeleting(true);
      await userService.delete(selectedUser.uid);
      toast.success('Usuário excluído com sucesso!');
      loadUsers();
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast.error('Erro ao excluir usuário');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(user => {
    // Não mostrar usuários com adm_empresa = true
    if (user.adm_empresa) return false;

    const matchesSearch = (
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.nivel_acesso?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.contato?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    switch (selectedTab) {
      case 'ativos':
        return matchesSearch && user.status === 'active';
      case 'pendentes':
        return matchesSearch && user.status === 'pending';
      default:
        return matchesSearch;
    }
  });

  const visibleUsers = users.filter(u => !u.adm_empresa);
  const stats = {
    total: visibleUsers.length,
    ativos: visibleUsers.filter(u => u.status === 'active').length,
    pendentes: visibleUsers.filter(u => u.status === 'pending').length,
    online: visibleUsers.filter(u => isOnline(u.ultimo_acesso)).length
  };

  // Paginação
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const renderUserCard = (user: UserType) => {
    const stats = userStats[user.uid] || {
      totalEleitores: 0,
      totalAtendimentos: 0
    };

    const porcentagemAtendimentos = calcularPorcentagem(stats.totalAtendimentos);
    const porcentagemEleitores = calcularPorcentagem(stats.totalEleitores);

    return (
      <div 
        key={user.uid}
        className="group transition-all duration-300 hover:scale-[1.02]"
        style={{
          animationDelay: `${filteredUsers.indexOf(user) * 100}ms`,
        }}
      >
        <Card className="overflow-visible relative h-full flex flex-col bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 border-0">
          <CardHeader className="pb-4 flex-1 space-y-4">
            {/* Cabeçalho com Avatar e Informações */}
            <div className="flex items-start gap-3">
              <div className="relative">
                <Avatar className="h-12 w-12 border-2 border-white ring-2 ring-primary/10 flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                  {user.foto ? (
                    <AvatarImage 
                      src={user.foto} 
                      alt={user.nome || 'Avatar'} 
                      className="object-cover"
                    />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/30 text-primary-700 font-medium">
                      {user.nome ? getInitials(user.nome) : 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className={cn(
                  "absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white",
                  isOnline(user.ultimo_acesso) ? "bg-green-500" : "bg-gray-300"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
                      {user.nome}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                  </div>
                  
                  {/* Ações */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 bg-gray-50 hover:bg-primary/10 hover:text-primary transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditUser(user);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 bg-gray-50 hover:bg-red-50 hover:text-red-600 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(user);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={cn(
                    'inline-flex px-2 py-0.5 text-xs font-medium rounded-full border transition-colors duration-300',
                    getStatusInfo(user.status).color
                  )}>
                    {getStatusInfo(user.status).label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {user.cargo}
                  </span>
                </div>
              </div>
            </div>

            {/* Metas do Ano */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Metas do Ano (2025)</h4>
              
              {/* Meta de Atendimentos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>Atendimentos</span>
                  </span>
                  <span className="font-medium tabular-nums">
                    {stats.totalAtendimentos} / 1.000
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${porcentagemAtendimentos}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-right tabular-nums">
                  {porcentagemAtendimentos}% concluído
                </p>
              </div>

              {/* Meta de Eleitores */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <UsersIcon className="h-4 w-4" />
                    <span>Eleitores</span>
                  </span>
                  <span className="font-medium tabular-nums">
                    {stats.totalEleitores} / 1.000
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${porcentagemEleitores}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-right tabular-nums">
                  {porcentagemEleitores}% concluído
                </p>
              </div>
            </div>

            {/* Último Acesso */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                Último acesso: {formatLastAccess(user.ultimo_acesso)}
              </p>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  };

  // Esquema de validação para o formulário de criação de usuário
  const createUserSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('E-mail inválido'),
    contato: z.string().min(11, 'Telefone inválido'),
    senha: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
    nivel_acesso: z.enum(['admin', 'coordenador', 'analista', 'colaborador', 'visitante']),
    status: z.enum(['active', 'pending', 'blocked'])
  });

  type CreateUserFormData = z.infer<typeof createUserSchema>;

  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      nivel_acesso: 'colaborador',
      status: 'active'
    }
  });

  const onSubmit = async (data: CreateUserFormData) => {
    if (!company?.uid) {
      toast.error('Nenhuma empresa selecionada');
      return;
    }

    try {
      await userService.create({
        ...data,
        empresa_uid: company.uid,
        foto: null,
        ultimo_acesso: null
      });
      
      toast.success('Usuário criado com sucesso!');
      await loadUsers();
      reset();
      setIsCreating(false);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar usuário');
    }
  };

  if (!company) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Selecione uma empresa para gerenciar usuários</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 py-1 md:py-4 px-2 md:px-4 flex flex-col">
        <div className="flex flex-col space-y-2 md:space-y-4">
          {/* Header Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 md:p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => navigate('/app/dashboard')} 
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  aria-label="Voltar para Dashboard"
                >
                  <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-500 dark:text-gray-400" />
                </button>
                <h1 className="text-2xl font-bold">Usuários</h1>
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar usuário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full md:w-[250px]"
                  />
                </div>
                
                {/* Toggle View Mode */}
                <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="h-8 w-8 p-0"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="h-8 w-8 p-0"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                <Button 
                  onClick={() => setIsCreating(!isCreating)}
                  variant={isCreating ? 'outline' : 'default'}
                  className="hidden sm:flex whitespace-nowrap"
                >
                  {isCreating ? (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Usuário
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Formulário de Cadastro */}
          {isCreating && (
            <Card className="mb-6">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>Cadastrar Novo Usuário</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsCreating(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Fechar</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome Completo *</Label>
                      <Input
                        id="nome"
                        placeholder="Nome completo"
                        {...register('nome')}
                        className={errors.nome ? 'border-red-500' : ''}
                        onChange={(e) => {
                          const preposicoes = ['de', 'da', 'das', 'do', 'dos', 'e'];
                          const palavras = e.target.value.toLowerCase().split(' ');
                          const formatado = palavras.map((palavra, index) => {
                            if (index === 0 || !preposicoes.includes(palavra)) {
                              return palavra.charAt(0).toUpperCase() + palavra.slice(1);
                            }
                            return palavra;
                          }).join(' ');
                          e.target.value = formatado;
                          register('nome').onChange(e);
                        }}
                      />
                      {errors.nome && (
                        <p className="text-sm text-red-500">{errors.nome.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="exemplo@email.com"
                        {...register('email', {
                          onChange: (e) => {
                            // Remove espaços e força minúsculas
                            const value = e.target.value.replace(/\s/g, '').toLowerCase();
                            e.target.value = value;
                            register('email').onChange(e);
                          }
                        })}
                        className={errors.email ? 'border-red-500' : ''}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-500">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contato">Telefone (com DDD) *</Label>
                      <Input
                        id="contato"
                        placeholder="(00) 00000-0000"
                        {...register('contato')}
                        className={errors.contato ? 'border-red-500' : ''}
                        maxLength={15}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          const formatted = value.length <= 10
                            ? value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
                            : value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
                          e.target.value = formatted;
                          register('contato').onChange(e);
                        }}
                      />
                      {errors.contato && (
                        <p className="text-sm text-red-500">{errors.contato.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="senha">Senha *</Label>
                      <div className="relative">
                        <Input
                          id="senha"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Mínimo 6 caracteres"
                          {...register('senha')}
                          className={errors.senha ? 'border-red-500 pr-10' : 'pr-10'}
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {errors.senha && (
                        <p className="text-sm text-red-500">{errors.senha.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nivel_acesso">Nível de Acesso *</Label>
                      <select
                        id="nivel_acesso"
                        {...register('nivel_acesso')}
                        className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 focus:outline-none transition duration-150 ease-in-out"
                      >
                        <option value="admin">Administrador</option>
                        <option value="coordenador">Coordenador</option>
                        <option value="analista">Analista</option>
                        <option value="colaborador">Colaborador</option>
                        <option value="visitante">Visitante</option>
                      </select>
                      {errors.nivel_acesso && (
                        <p className="text-sm text-red-500">{errors.nivel_acesso.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status *</Label>
                      <select
                        id="status"
                        {...register('status')}
                        className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 focus:outline-none transition duration-150 ease-in-out"
                      >
                        <option value="active">Ativo</option>
                        <option value="pending">Pendente</option>
                        <option value="blocked">Bloqueado</option>
                      </select>
                      {errors.status && (
                        <p className="text-sm text-red-500">{errors.status.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="w-full mt-4">
                    <AccessLevelPermissions 
                      selectedLevel={watch('nivel_acesso')} 
                      onLevelChange={(level) => setValue('nivel_acesso', level as any)}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        reset();
                        setIsCreating(false);
                      }}
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        'Salvar Usuário'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Main Content */}
          <div className="space-y-4">
            {/* Cards de estatísticas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    <span className="lg:hidden">Total</span>
                    <span className="hidden lg:inline">Total de Usuários</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <UsersIcon className="h-8 w-8 text-blue-500" />
                    <span className="text-2xl font-bold ml-3">{stats.total}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    <span className="lg:hidden">Ativos</span>
                    <span className="hidden lg:inline">Usuários Ativos</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <User className="h-8 w-8 text-green-500" />
                    <span className="text-2xl font-bold ml-3">{stats.ativos}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    <span className="lg:hidden">Pendentes</span>
                    <span className="hidden lg:inline">Usuários Pendentes</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Mail className="h-8 w-8 text-yellow-500" />
                    <span className="text-2xl font-bold ml-3">{stats.pendentes}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    <span className="lg:hidden">Online</span>
                    <span className="hidden lg:inline">Usuários Online</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <div className="h-8 w-8 flex items-center justify-center">
                      <span className="h-3 w-3 rounded-full bg-green-500 ring-2 ring-green-200"></span>
                    </div>
                    <span className="text-2xl font-bold ml-3">{stats.online}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Grid/List de Usuários */}
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6' : 'flex flex-col gap-3'}>
              {currentUsers.map((user) => {
                const stats = userStats[user.uid] || {
                  totalEleitores: 0,
                  totalAtendimentos: 0
                };

                if (viewMode === 'list') {
                  const statusInfo = getStatusInfo(user.status);
                  const isUserOnline = isOnline(user.ultimo_acesso);
                  const nivelAcessoInfo = getNivelAcessoInfo(user.nivel_acesso || 'visitante');
                  
                  return (
                    <Card key={user.uid} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                            {user.foto ? (
                              <AvatarImage src={user.foto} alt={user.nome || ''} />
                            ) : (
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-sm sm:text-base">
                                {getInitials(user.nome || '')}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">{user.nome}</h3>
                              <span className={cn(
                                "hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border",
                                statusInfo.color
                              )}>
                                {statusInfo.label}
                              </span>
                              {isUserOnline && (
                                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate mb-1">{user.email}</p>
                            {/* Badges mobile */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border",
                                nivelAcessoInfo.bgColor,
                                nivelAcessoInfo.color
                              )}>
                                <Shield className="h-2.5 w-2.5" />
                                {nivelAcessoInfo.label}
                              </span>
                              <span className={cn(
                                "sm:hidden inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border",
                                statusInfo.color
                              )}>
                                {statusInfo.label}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
                            <div className="text-center">
                              <p className="text-xs text-gray-500 hidden sm:block">Atendimentos</p>
                              <p className="text-sm sm:text-lg font-bold text-blue-600">{stats.totalAtendimentos}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-500 hidden sm:block">Eleitores</p>
                              <p className="text-sm sm:text-lg font-bold text-green-600">{stats.totalEleitores}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditUser(user)}
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(user)}
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                            >
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <UserCard
                    key={user.uid}
                    user={user}
                    stats={stats}
                    onEdit={handleEditUser}
                    onDelete={handleDeleteClick}
                    getInitials={getInitials}
                    formatDisplayName={formatDisplayName}
                    getStatusInfo={getStatusInfo}
                    isOnline={isOnline}
                    formatLastAccess={formatLastAccess}
                    calcularPorcentagem={calcularPorcentagem}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Paginação no rodapé */}
      {currentUsers.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 py-4 px-2 md:px-4 mt-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
            <div className="w-full md:w-auto order-2 md:order-1">
              <span className="hidden md:inline text-sm text-gray-700 dark:text-gray-300">
                Mostrando {startIndex + 1} até {Math.min(endIndex, filteredUsers.length)} de {filteredUsers.length} resultados
              </span>
            </div>

            <div className="flex space-x-1 md:space-x-2 order-1 md:order-2 w-full md:w-auto justify-center md:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1 || loading}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  const start = Math.max(1, currentPage - (isMobile ? 1 : 2));
                  const end = Math.min(totalPages, start + (isMobile ? 2 : 4));
                  return page >= start && page <= end;
                })
                .map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    disabled={loading}
                  >
                    {page}
                  </Button>
                ))
              }

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages || loading}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Componentes flutuantes e modais */}
      <div className="relative">
        <Button
          onClick={() => setIsCreating(true)}
          className="md:hidden fixed right-4 bottom-4 rounded-full w-14 h-14 shadow-lg flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white z-50 transition-transform hover:scale-110"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
        <EditUserModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onSuccess={handleSuccess}
        />
        <DeleteUserModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
}