import { supabaseClient } from '../lib/supabase';

interface OficioInput {
  tipo_de_demanda: string;
  descricao_do_problema: string;
  nivel_de_urgencia: 'baixa' | 'média' | 'alta';
  requerente_nome: string;
  requerente_cpf: string;
  requerente_whatsapp: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  referencia?: string;
  contato?: string;
  empresa_uid: string;
  fotos_do_problema?: string[];
  boletim_ocorrencia: string;
  link_da_demanda?: string;
}

export async function createOficio(oficio: OficioInput) {
  try {
    const { data, error } = await supabase
      .from('gbp_oficios')
      .insert([{
        ...oficio,
        status_solicitacao: 'Recebida',
        visualizou: false,
        oficio_existente: false
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar ofício:', error);
    throw error;
  }
}

export async function uploadOficioFiles(empresaUid: string, oficioUid: string, files: File[]) {
  try {
    const uploadPromises = files.map(async (file, index) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${oficioUid}_${Date.now()}_${index}.${fileExt}`;
      const filePath = `${empresaUid}/oficios/${oficioUid}/${fileName}`;

      const { error: uploadError } = await supabaseClient.storage
        .from('gbp_oficios')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseClient.storage
        .from('gbp_oficios')
        .getPublicUrl(filePath);

      return publicUrl;
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Erro ao enviar arquivos:', error);
    throw error;
  }
}
