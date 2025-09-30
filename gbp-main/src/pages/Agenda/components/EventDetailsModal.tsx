import React from 'react';
import { Dialog } from '@headlessui/react';
import { X, Edit2, Trash2, MapPin, Users, Clock } from 'lucide-react';
import { AgendaEvent } from '../../../types/agenda';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventDetailsModalProps {
  isOpen: boolean;
  event: AgendaEvent;
  onClose: () => void;
  onUpdate: (event: AgendaEvent) => void;
  onDelete: (eventId: string) => void;
}

export function EventDetailsModal({
  isOpen,
  event,
  onClose,
  onUpdate,
  onDelete,
}: EventDetailsModalProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedEvent, setEditedEvent] = React.useState(event);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(editedEvent);
    setIsEditing(false);
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
      locale: ptBR,
    });
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEditing ? 'Editar Evento' : event.title}
            </Dialog.Title>
            <div className="flex items-center space-x-2">
              {!isEditing && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => onDelete(event.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Título
                </label>
                <input
                  type="text"
                  value={editedEvent.title}
                  onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Descrição
                </label>
                <textarea
                  value={editedEvent.description || ''}
                  onChange={(e) => setEditedEvent({ ...editedEvent, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Início
                  </label>
                  <input
                    type="datetime-local"
                    value={format(new Date(editedEvent.start), "yyyy-MM-dd'T'HH:mm")}
                    onChange={(e) => setEditedEvent({ ...editedEvent, start: new Date(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fim
                  </label>
                  <input
                    type="datetime-local"
                    value={format(new Date(editedEvent.end), "yyyy-MM-dd'T'HH:mm")}
                    onChange={(e) => setEditedEvent({ ...editedEvent, end: new Date(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  Salvar
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {event.description && (
                <p className="text-gray-600 dark:text-gray-400">{event.description}</p>
              )}

              <div className="space-y-2">
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Clock className="h-5 w-5 mr-2" />
                  <span>
                    {formatDate(event.start)} até {formatDate(event.end)}
                  </span>
                </div>

                {event.location && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <MapPin className="h-5 w-5 mr-2" />
                    <span>{event.location}</span>
                  </div>
                )}

                {event.attendees.length > 0 && (
                  <div className="flex items-start text-gray-600 dark:text-gray-400">
                    <Users className="h-5 w-5 mr-2 mt-1" />
                    <div>
                      <p className="font-medium mb-1">Participantes:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {event.attendees.map((attendee) => (
                          <li key={attendee.id}>{attendee.name}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {event.recurrence && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="font-medium text-gray-900 dark:text-white mb-2">
                    Recorrência
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {event.recurrence.frequency === 'DAILY' && 'Diariamente'}
                    {event.recurrence.frequency === 'WEEKLY' && 'Semanalmente'}
                    {event.recurrence.frequency === 'MONTHLY' && 'Mensalmente'}
                    {event.recurrence.interval > 1 && ` a cada ${event.recurrence.interval} `}
                    {event.recurrence.endDate &&
                      ` até ${format(new Date(event.recurrence.endDate), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}`}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
