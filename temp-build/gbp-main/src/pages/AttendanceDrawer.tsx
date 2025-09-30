import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { supabaseClient } from '../lib/supabase';
import { useCompanyStore } from '../store/useCompanyStore';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useAuth } from '../providers/AuthProvider';

interface User {
  uid: string;
  nome: string | null;
  email: string | null;
  cargo: string | null;
  nivel_acesso: string | null;
  permissoes: string[];
  empresa_uid: string | null;
  contato: string | null;
  status: string | null;
  ultimo_acesso: string | null;
  created_at: string | null;
}

interface Company {
  uid: string;
  nome: string;
}

interface Observacao {
  id: number;
  atendimento_uid: string;
  empresa_uid: string;
  responsavel: string;
  observacao: string;
  created_at: string;
}

interface Atendimento {
  uid: string;
  empresa_uid: string;
  responsavel: string;
  observacoes?: Observacao[];
}

interface ObservationFormData {
  observacao: string;
}

interface Lembrete {
  uid: string;
  atendimento_uid: string;
  empresa_uid: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  relation: string | null;
}

export function AttendanceDrawer({ atendimento, isOpen }: { atendimento?: Atendimento; isOpen?: boolean }) {
  const { user } = useAuth();
  const company = useCompanyStore((state) => state.company);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm<ObservationFormData>();
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);

  useEffect(() => {
    if (isOpen) {
      console.log('Debug - Auth Context:', {
        user,
        company
      });
    }
  }, [isOpen, user, company]);

  useEffect(() => {
    if (isOpen && atendimento?.uid && company?.uid) {
      loadData();
    }
  }, [isOpen, atendimento?.uid, company?.uid]);

  const loadData = async () => {
    await Promise.all([
      loadLembretes(),
      loadObservacoes()
    ]);
  };

  const loadObservacoes = async () => {
    if (!atendimento?.uid || !company?.uid) return;

    try {
      const { data, error } = await supabaseClient
        .from('gbp_observacoes')
        .select('*')
        .eq('atendimento_uid', atendimento.uid)
        .eq('empresa_uid', company.uid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Debug - Observações carregadas:', data?.length);
    } catch (error) {
      console.error('Erro ao carregar observações:', error);
      toast.error('Erro ao carregar observações');
    }
  };

  const loadLembretes = async () => {
    if (!atendimento?.uid || !company?.uid) return;

    try {
      const { data, error } = await supabaseClient
        .from('gbp_lembretes')
        .select('*')
        .eq('atendimento_uid', atendimento.uid)
        .eq('empresa_uid', company.uid)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Erro detalhado ao carregar lembretes:', error);
        throw error;
      }
      
      setLembretes(data || []);
      console.log('Debug - Lembretes carregados:', data?.length);
    } catch (error) {
      console.error('Erro ao carregar lembretes:', error);
      toast.error('Erro ao carregar lembretes');
    }
  };

  console.log('=== Debug - Estado do AttendanceDrawer ===');
  console.log('User:', user);
  console.log('Company:', company);
  console.log('Atendimento:', atendimento);
  console.log('IsOpen:', isOpen);
  console.log('Lembretes:', lembretes);
  console.log('====================================');

  const handleSubmitObservation = async (data: ObservationFormData) => {
    if (!user?.uid || !company?.uid || !atendimento?.uid) {
      console.log('Debug - Dados necessários não disponíveis:', {
        userUid: user?.uid,
        companyUid: company?.uid,
        atendimentoUid: atendimento?.uid,
        isOpen
      });
      toast.error('Usuário não identificado');
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('gbp_observacoes')
        .insert({
          atendimento_uid: atendimento.uid,
          empresa_uid: company.uid,
          responsavel: user.uid,
          observacao: data.observacao,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Observação registrada com sucesso');
      reset();
      queryClient.invalidateQueries({ queryKey: ['observacoes'] });
    } catch (error) {
      console.error('Erro ao registrar observação:', error);
      toast.error('Erro ao registrar observação');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div>
      <form onSubmit={handleSubmit(handleSubmitObservation)}>
        <textarea
          {...register('observacao')}
          placeholder="Digite sua observação..."
          className="w-full p-2 border rounded"
        />
        <button 
          type="submit"
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Enviar
        </button>
      </form>

      {lembretes.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Lembretes</h3>
          <div className="space-y-2">
            {lembretes.map((lembrete) => (
              <div 
                key={lembrete.uid}
                className={`p-2 rounded border ${
                  lembrete.priority === 'high' ? 'border-red-500 bg-red-50' :
                  lembrete.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                  'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="font-medium">{lembrete.title}</div>
                {lembrete.description && (
                  <div className="text-sm text-gray-600">{lembrete.description}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  Vencimento: {new Date(lembrete.due_date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 