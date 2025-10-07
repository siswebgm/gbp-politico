import { Card, CardHeader, CardContent } from '../../../components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../../../components/ui/avatar';
import { Button } from '../../../components/ui/button';
import { Calendar, Users as UsersIcon, Pencil, Trash2, Shield } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { User as UserType } from '../../../services/users';
import { UserStats } from '../../../services/stats';

interface UserCardProps {
  user: UserType;
  stats: UserStats;
  onEdit: (user: UserType) => void;
  onDelete: (user: UserType) => void;
  getInitials: (name: string) => string;
  formatDisplayName: (name: string) => string;
  getStatusInfo: (status: string) => { label: string; color: string };
  isOnline: (lastAccess: string | null) => boolean;
  formatLastAccess: (lastAccess: string | null) => string;
  calcularPorcentagem: (valor: number, total?: number) => number;
}

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

export function UserCard({
  user,
  stats,
  onEdit,
  onDelete,
  getInitials,
  formatDisplayName,
  getStatusInfo,
  isOnline,
  formatLastAccess,
  calcularPorcentagem
}: UserCardProps) {
  const statusInfo = getStatusInfo(user.status);
  const isUserOnline = isOnline(user.ultimo_acesso);
  const porcentagemAtendimentos = calcularPorcentagem(stats.totalAtendimentos);
  const porcentagemEleitores = calcularPorcentagem(stats.totalEleitores);
  const nivelAcessoInfo = getNivelAcessoInfo(user.nivel_acesso || 'visitante');

  return (
    <Card className="relative overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-primary/30 group bg-white dark:bg-gray-800">
      <CardHeader className="pb-4 pt-5 px-5">
        {/* Avatar centralizado */}
        <div className="flex flex-col items-center text-center mb-4">
          <div className="relative mb-3">
            <Avatar className="h-20 w-20 border-4 border-white shadow-xl ring-4 ring-gray-100 dark:ring-gray-700 group-hover:ring-primary/20 transition-all duration-300">
              {user.foto ? (
                <AvatarImage src={user.foto} alt={user.nome || ''} className="object-cover" />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-2xl">
                  {getInitials(user.nome || '')}
                </AvatarFallback>
              )}
            </Avatar>
            {/* Indicador online */}
            {isUserOnline && (
              <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full border-3 border-white bg-green-500 shadow-lg animate-pulse" />
            )}
          </div>

          {/* Nome */}
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 px-2 leading-tight">
            {user.nome}
          </h3>

          {/* Email */}
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 truncate max-w-full px-2">
            {user.email}
          </p>

          {/* Badges: Nível de Acesso + Status */}
          <div className="flex items-center gap-1.5 justify-center">
            {/* Nível de Acesso */}
            <div className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm border whitespace-nowrap",
              nivelAcessoInfo.bgColor,
              nivelAcessoInfo.color
            )}>
              <Shield className="h-3 w-3 flex-shrink-0" />
              <span>{nivelAcessoInfo.label}</span>
            </div>

            {/* Status Badge */}
            <span className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm whitespace-nowrap",
              statusInfo.color
            )}>
              {statusInfo.label}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2 space-y-2 sm:space-y-2.5 pb-3 px-4 sm:pb-4 sm:px-5">
        {/* Meta de Atendimentos */}
        <div className="space-y-1 sm:space-y-1.5 bg-gray-50/50 dark:bg-gray-800/30 rounded-lg p-2 sm:p-2.5 border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="p-0.5 sm:p-1 bg-blue-500/90 rounded">
                <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Atendimentos</span>
            </div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tabular-nums">
              {stats.totalAtendimentos}
            </span>
          </div>
          <div className="w-full h-1.5 sm:h-2 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${porcentagemAtendimentos}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {porcentagemAtendimentos}%
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-500">
              Meta: 1.000
            </span>
          </div>
        </div>

        {/* Meta de Eleitores */}
        <div className="space-y-1 sm:space-y-1.5 bg-gray-50/50 dark:bg-gray-800/30 rounded-lg p-2 sm:p-2.5 border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="p-0.5 sm:p-1 bg-green-500/90 rounded">
                <UsersIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Eleitores</span>
            </div>
            <span className="text-xs font-bold text-green-600 dark:text-green-400 tabular-nums">
              {stats.totalEleitores}
            </span>
          </div>
          <div className="w-full h-1.5 sm:h-2 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${porcentagemEleitores}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {porcentagemEleitores}%
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-500">
              Meta: 1.000
            </span>
          </div>
        </div>

        {/* Última atividade e ações */}
        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 mr-2">
            <span className={cn(
              "h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full transition-all shadow-sm flex-shrink-0",
              isUserOnline ? "bg-green-500 ring-2 ring-green-200 animate-pulse" : "bg-gray-400"
            )} />
            <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold truncate">
              {formatLastAccess(user.ultimo_acesso)}
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(user)}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 transition-all rounded-lg"
            >
              <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(user)}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 transition-all rounded-lg"
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
