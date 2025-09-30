import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '../../../lib/supabase';
import { useCompanyStore } from '../../../store/useCompanyStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { EleitorFormData } from '../../../types/eleitor';
import { toast } from 'react-hot-toast';

export function useVoterSubmit(uid?: string) {
  const queryClient = useQueryClient();
  const company = useCompanyStore(state => state.company);
  const user = useAuthStore(state => state.user);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (data: EleitorFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(false);

      if (!company?.uid) {
        throw new Error('Empresa não selecionada');
      }

      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      // Prepare data
      const voterData = {
        ...data,
        empresa_uid: company.uid,
        usuario_uid: user.id,
      };

      let error;

      if (uid) {
        // Update
        const { error: updateError } = await supabaseClient
          .from('gbp_eleitores')
          .update(voterData)
          .eq('uid', uid);

        error = updateError;
      } else {
        // Create
        const { error: insertError } = await supabaseClient
          .from('gbp_eleitores')
          .insert(voterData);

        error = insertError;
      }

      if (error) {
        throw error;
      }

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['eleitores'] });
      if (uid) {
        await queryClient.invalidateQueries({ queryKey: ['eleitor', uid] });
      }

      toast.success(uid ? 'Eleitor atualizado com sucesso' : 'Eleitor cadastrado com sucesso');
      setSuccess(true);
      return true;
    } catch (error) {
      console.error('Error submitting voter:', error);
      setError(error as Error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Erro ao salvar eleitor');
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    handleSubmit,
    isSubmitting,
    error,
    success
  };
}