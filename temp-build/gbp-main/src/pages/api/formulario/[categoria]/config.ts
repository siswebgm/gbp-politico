import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseClient } from '../../../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { categoria } = req.query;

  try {
    const { data: formConfig, error } = await supabaseClient
      .from('gbp_form_config')
      .select('*')
      .eq('categoria_id', String(categoria))
      .single();

    if (error) {
      console.error('Erro ao buscar configuração:', error);
      return res.status(500).json({ message: 'Erro ao buscar configuração do formulário' });
    }

    if (!formConfig) {
      return res.status(404).json({ message: 'Configuração do formulário não encontrada' });
    }

    // Garante que os campos opcionais tenham valores padrão
    const configWithDefaults = {
      isActive: formConfig.is_active ?? true,
      maxRegistrations: formConfig.max_registrations ?? 0,
      currentRegistrations: 0, // TODO: Implementar contagem de registros
      campos_config: formConfig.campos_config ?? {},
      documentos_config: formConfig.documentos_config ?? { documentos: [] }
    };

    return res.status(200).json(configWithDefaults);
  } catch (error) {
    console.error('Erro ao buscar configuração do formulário:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
