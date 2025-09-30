export function formatarData(data: string) {
  if (!data) return '';
  
  try {
    const date = new Date(data);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return data;
  }
}
