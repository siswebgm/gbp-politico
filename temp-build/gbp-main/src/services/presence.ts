import { supabaseClient } from '../lib/supabase';

class PresenceService {
  private userId: number | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private offlineTimeout: NodeJS.Timeout | null = null;

  initialize(userId: number) {
    this.userId = userId;
    this.setupEventListeners();
    this.startHeartbeat();
    this.updateStatus('active');
  }

  private setupEventListeners() {
    window.addEventListener('focus', () => this.handleOnline());
    window.addEventListener('blur', () => this.handleOffline());
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.handleOnline();
      } else {
        this.handleOffline();
      }
    });
  }

  private async updateStatus(status: 'active' | 'offline') {
    if (!this.userId) return;

    try {
      await supabaseClient
        .from('gbp_usuarios')
        .update({
          ultimo_acesso: status === 'active' ? new Date().toISOString() : null
        })
        .eq('id', this.userId);
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }

  private handleOnline() {
    if (this.offlineTimeout) {
      clearTimeout(this.offlineTimeout);
      this.offlineTimeout = null;
    }
    this.updateStatus('active');
    this.startHeartbeat();
  }

  private handleOffline() {
    // Aguarda 5 segundos antes de marcar como offline para evitar falsos positivos
    this.offlineTimeout = setTimeout(() => {
      this.updateStatus('offline');
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    }, 5000);
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Atualiza o status a cada 30 segundos para manter "online"
    this.heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.updateStatus('active');
      }
    }, 30000); // 30 segundos
  }

  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.offlineTimeout) {
      clearTimeout(this.offlineTimeout);
    }
    window.removeEventListener('focus', () => this.handleOnline());
    window.removeEventListener('blur', () => this.handleOffline());
    window.removeEventListener('online', () => this.handleOnline());
    window.removeEventListener('offline', () => this.handleOffline());
    document.removeEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.handleOnline();
      } else {
        this.handleOffline();
      }
    });
  }
}

export const presenceService = new PresenceService();
