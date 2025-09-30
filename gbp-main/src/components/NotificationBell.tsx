import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { ExternalLink } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const navigate = useNavigate();

  const priorityColors = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    high: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  };

  const priorityLabels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta'
  };

  const handleNotificationClick = async (notification) => {
    if (notification.url_direcionar) {
      // Marca como lido antes de redirecionar
      await markAsRead(notification.uid);
      navigate(notification.url_direcionar);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full p-1.5 text-white hover:bg-blue-500 transition-colors relative"
      >
        <span className="sr-only">Ver notificações</span>
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-medium text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="sm:hidden fixed inset-0 z-40 bg-black/20"
            onClick={() => setIsOpen(false)}
          />
          <div className={`${
            window.innerWidth < 640 
              ? 'fixed right-0 top-0 w-full h-screen' 
              : 'absolute right-0 w-96'
          } z-50 mt-2`}>
            <div className={`bg-white dark:bg-gray-800 shadow-lg ${
              window.innerWidth < 640 
                ? 'h-full' 
                : 'rounded-lg'
            }`}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Notificações
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    Nenhuma notificação pendente
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.uid} 
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${notification.url_direcionar ? 'cursor-pointer' : ''}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {notification.title}
                            </p>
                            {notification.description && (
                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {notification.description}
                              </p>
                            )}
                            {notification.url_direcionar && (
                              <p className="mt-1 text-xs text-primary-600 dark:text-primary-400 flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" />
                                Acessar: {notification.url_direcionar.replace(/^\/+/, '/')}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityColors[notification.priority]}`}>
                                {priorityLabels[notification.priority]}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {format(new Date(notification.due_date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          </div>
                          {!notification.url_direcionar && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.uid);
                              }}
                              className="ml-4 text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                            >
                              Marcar como lido
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}