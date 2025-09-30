import { whatsappService } from '../lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  date: Date;
  userPhone: string;
  sent: boolean;
}

class ReminderService {
  private reminders: Map<string, Reminder> = new Map();

  async addReminder(reminder: Omit<Reminder, 'sent'>): Promise<void> {
    const newReminder = {
      ...reminder,
      sent: false
    };
    
    this.reminders.set(reminder.id, newReminder);
    
    // Agendar o envio da notificação
    const now = new Date();
    const timeUntilReminder = reminder.date.getTime() - now.getTime();
    
    if (timeUntilReminder > 0) {
      setTimeout(async () => {
        await this.sendReminderNotification(reminder.id);
      }, timeUntilReminder);
    }
  }

  private async sendReminderNotification(reminderId: string): Promise<void> {
    const reminder = this.reminders.get(reminderId);
    if (!reminder || reminder.sent) return;

    try {
      const formattedDate = format(reminder.date, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
      const message = `🔔 *Lembrete:* ${reminder.title}\n\n📅 ${formattedDate}${reminder.description ? `\n\n📝 ${reminder.description}` : ''}`;

      await whatsappService.sendTextMessage(reminder.userPhone, message);
      
      // Marcar como enviado
      this.reminders.set(reminderId, { ...reminder, sent: true });
    } catch (error) {
      console.error('Erro ao enviar notificação do lembrete:', error);
      // Você pode implementar uma lógica de retry aqui se necessário
    }
  }

  // Método para remover um lembrete
  removeReminder(reminderId: string): void {
    this.reminders.delete(reminderId);
  }

  // Método para obter um lembrete específico
  getReminder(reminderId: string): Reminder | undefined {
    return this.reminders.get(reminderId);
  }

  // Método para listar todos os lembretes
  listReminders(): Reminder[] {
    return Array.from(this.reminders.values());
  }
}

export const reminderService = new ReminderService();
