import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PersonalInfoSection } from './PersonalInfoSection';
import { ContactSection } from './ContactSection';
import { ElectoralSection } from './ElectoralSection';
import { AddressSection } from './AddressSection';
import { CategorySection } from './CategorySection';
import { AttendanceSection } from './AttendanceSection';
import { useVoterForm } from '../hooks/useVoterForm';
import { useVoterSubmit } from '../hooks/useVoterSubmit';
import { EleitorFormData } from '../../../types/eleitor';

interface VoterFormContentProps {
  uid?: string;
}

export function VoterFormContent({ uid }: VoterFormContentProps) {
  console.log('VoterFormContent renderizado com uid:', uid);
  
  const navigate = useNavigate();
  const form = useVoterForm(uid);
  const { handleSubmit, isSubmitting, error, success } = useVoterSubmit(uid);

  const onSubmit = async (data: EleitorFormData) => {
    console.log('Tentando submeter formulário com dados:', data);
    const result = await handleSubmit(data);
    if (result) {
      navigate('/app/eleitores');
    }
  };

  if (form.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-sm text-red-700">{error.message}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 p-4 rounded-md">
          <p className="text-sm text-green-700">
            {uid ? 'Eleitor atualizado com sucesso!' : 'Eleitor cadastrado com sucesso!'}
          </p>
        </div>
      )}

      <PersonalInfoSection {...form} />
      <ContactSection {...form} />
      <ElectoralSection {...form} />
      <AddressSection {...form} />
      <CategorySection {...form} />
      <AttendanceSection {...form} />

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => navigate('/app/eleitores')}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Salvando...' : uid ? 'Atualizar' : 'Cadastrar'}
        </button>
      </div>
    </form>
  );
}