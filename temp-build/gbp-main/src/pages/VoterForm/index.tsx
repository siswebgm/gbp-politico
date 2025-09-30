import React from 'react';
import { useParams } from 'react-router-dom';
import { VoterFormContent } from './components/VoterFormContent';

export function VoterForm() {
  const { uid } = useParams();
  const isEditing = Boolean(uid);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isEditing ? 'Editar Eleitor' : 'Novo Eleitor'}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {isEditing
            ? 'Atualize as informações do eleitor'
            : 'Preencha as informações para cadastrar um novo eleitor'}
        </p>
      </div>

      <VoterFormContent uid={uid} />
    </div>
  );
}