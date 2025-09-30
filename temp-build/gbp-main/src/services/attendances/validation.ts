import { supabase } from '../../lib/supabase';

export async function validateAttendanceData(attendance: {
  categoria_id?: number | null;
  eleitor_id: number;
  empresa_id: number;
}) {
  // Validate categoria_id if provided
  if (attendance.categoria_id) {
    const { data: categoryExists, error: categoryError } = await supabase
      .from('gbp_categorias_atendimento')
      .select('id')
      .eq('id', attendance.categoria_id)
      .eq('empresa_id', attendance.empresa_id)
      .single();

    if (categoryError || !categoryExists) {
      throw new Error('Categoria de atendimento inválida');
    }
  }

  // Validate eleitor_id
  const { data: voterExists, error: voterError } = await supabase
    .from('gbp_eleitores')
    .select('id')
    .eq('id', attendance.eleitor_id)
    .eq('empresa_id', attendance.empresa_id)
    .single();

  if (voterError || !voterExists) {
    throw new Error('Eleitor não encontrado');
  }
}