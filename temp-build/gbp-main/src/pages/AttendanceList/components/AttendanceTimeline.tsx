import React, { useState } from 'react';
import { Clock, AlertCircle, CheckCircle, Calendar, Bell, Check } from 'lucide-react';
import { format, isPast, addDays, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx } from 'clsx';
import { reminderService } from '../../../services/reminder';
import { useToast } from '../../../hooks/useToast';

interface TimelineStep {
  id: string;
  title: string;
  description: string;
  date: Date;
  status: 'completed' | 'current' | 'upcoming' | 'overdue';
  reminder?: Date;
  protocolo?: string;
  eleitor?: { nome: string };
  whatsapp?: string; // Adicione o número do WhatsApp ao TimelineStep
}

interface AttendanceTimelineProps {
  steps: TimelineStep[];
  onSetReminder: (stepId: string, date: Date) => void;
}

export function AttendanceTimeline({ steps, onSetReminder }: AttendanceTimelineProps) {
  const [showReminderInput, setShowReminderInput] = useState<string | null>(null);
  const [reminderDate, setReminderDate] = useState<string>(
    format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm")
  );
  const toast = useToast();

  const handleSetReminder = async (stepId: string) => {
    if (!reminderDate) return;

    const date = new Date(reminderDate);
    if (!isValid(date)) {
      toast.error('Data inválida');
      return;
    }

    const step = steps.find(s => s.id === stepId);
    if (!step) return;

    try {
      await reminderService.addReminder({
        id: stepId,
        title: step.title,
        description: step.description,
        date,
        userPhone: step.whatsapp
      });

      toast.success('Lembrete definido com sucesso! Você receberá uma notificação no WhatsApp.');
      setShowReminderInput(null);
      setReminderDate('');
      onSetReminder(stepId, date);
    } catch (error) {
      console.error('Erro ao definir lembrete:', error);
      toast.error('Erro ao definir lembrete. Por favor, tente novamente.');
    }
  };

  const formatDate = (date: Date) => {
    try {
      if (!isValid(date)) return 'Data inválida';
      return format(date, "dd 'de' MMMM", { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Data inválida';
    }
  };

  const formatReminderDate = (date: Date) => {
    try {
      if (!isValid(date)) return 'Data inválida';
      return format(date, "dd/MM 'às' HH:mm");
    } catch (error) {
      console.error('Erro ao formatar data do lembrete:', error);
      return 'Data inválida';
    }
  };

  const getStepIcon = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'current':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'upcoming':
        return <Calendar className="h-5 w-5 text-gray-500" />;
      case 'overdue':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStepColor = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'current':
        return 'bg-blue-500';
      case 'upcoming':
        return 'bg-gray-500';
      case 'overdue':
        return 'bg-red-500';
    }
  };

  return (
    <div className="flow-root py-4">
      {/* Timeline */}
      <ul role="list" className="-mb-8">
        {steps.map((step, stepIdx) => (
          <li key={step.id}>
            <div key={stepIdx} className="relative pb-8">
              {stepIdx !== steps.length - 1 ? (
                <div className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
              ) : null}
              <div className="relative flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <span
                    className={clsx(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      step.status === 'completed'
                        ? "bg-green-500 dark:bg-green-600"
                        : step.status === 'current'
                        ? "bg-blue-500 dark:bg-blue-600"
                        : "bg-gray-400 dark:bg-gray-600"
                    )}
                  >
                    {step.status === 'completed' ? (
                      <Check className="h-5 w-5 text-white" aria-hidden="true" />
                    ) : step.status === 'current' ? (
                      <div className="h-2.5 w-2.5 rounded-full bg-white" aria-hidden="true" />
                    ) : (
                      <div className="h-2.5 w-2.5 rounded-full bg-gray-200 dark:bg-gray-400" aria-hidden="true" />
                    )}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{step.title}</p>
                      {step.description && (
                        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{step.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col text-sm text-gray-500 dark:text-gray-400">
                      <span className="whitespace-nowrap">{formatDate(step.date)}</span>
                      {(step.status === 'current' || step.status === 'upcoming') && (
                        <div className="mt-2">
                          {showReminderInput === step.id ? (
                            <div className="flex flex-col gap-2">
                              <input
                                type="datetime-local"
                                value={reminderDate}
                                onChange={(e) => setReminderDate(e.target.value)}
                                className="block w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setShowReminderInput(null)}
                                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleSetReminder(step.id)}
                                  className="px-3 py-1.5 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                                >
                                  Salvar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowReminderInput(step.id)}
                              className="inline-flex items-center text-sm text-blue-500 hover:text-blue-600 transition-colors"
                            >
                              <Bell className="h-4 w-4 mr-1" />
                              {step.reminder ? 'Editar lembrete' : 'Definir lembrete'}
                            </button>
                          )}
                        </div>
                      )}
                      {step.reminder && isValid(step.reminder) && !showReminderInput && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Lembrete: {formatReminderDate(step.reminder)}
                        </p>
                      )}
                      {step.status === 'overdue' && (
                        <p className="mt-1 text-xs font-medium text-red-500">
                          Atrasado
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
