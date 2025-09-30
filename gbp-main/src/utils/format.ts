export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}; 

export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  
  // Como data_solicitacao é do tipo DATE no banco, não tem fuso horário
  // Então precisamos criar a data no fuso horário local (que já é Brasília)
  const [year, month, day] = date.toString().split('-');
  return `${day}/${month}/${year}`;
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  const dateToCheck = new Date(date);
  
  // Compara apenas ano, mês e dia já que data_solicitacao é tipo DATE
  return dateToCheck.getUTCFullYear() === today.getFullYear() &&
         dateToCheck.getUTCMonth() === today.getMonth() &&
         dateToCheck.getUTCDate() === today.getDate();
};