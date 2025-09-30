import React from 'react';
import { EditAttendanceForm } from './components/EditAttendanceForm';

export function EditAttendance() {
  return (
    <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
            Editar Atendimento
          </h2>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <EditAttendanceForm />
      </div>
    </div>
  );
}
