import { useState, useEffect } from 'react';
import { notificationLogsService, NotificationLog, NotificationStats } from '../services/notificationLogs';
import { useCompanyStore } from '../store/useCompanyStore';

export function useNotificationLogs() {
  const { company } = useCompanyStore();
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar logs da empresa
  const loadLogs = async (limit: number = 50, offset: number = 0) => {
    if (!company?.uid) return;

    setLoading(true);
    setError(null);

    try {
      const data = await notificationLogsService.getLogsByEmpresa(
        company.uid,
        limit,
        offset
      );
      setLogs(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao carregar logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar estatísticas da empresa
  const loadStats = async () => {
    if (!company?.uid) return;

    setLoading(true);
    setError(null);

    try {
      const data = await notificationLogsService.getStatsByEmpresa(company.uid);
      setStats(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao carregar estatísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar estatísticas de usuários
  const loadUserStats = async () => {
    if (!company?.uid) return;

    setLoading(true);
    setError(null);

    try {
      const data = await notificationLogsService.getNotificationUserStats(company.uid);
      setUserStats(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao carregar estatísticas de usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar tudo ao montar
  useEffect(() => {
    if (company?.uid) {
      loadLogs();
      loadStats();
      loadUserStats();
    }
  }, [company?.uid]);

  return {
    logs,
    stats,
    userStats,
    loading,
    error,
    loadLogs,
    loadStats,
    loadUserStats
  };
}
