export function formatCpf(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
}

export function formatTituloEleitor(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 12);
  if (numbers.length <= 4) return numbers;
  if (numbers.length <= 8) return `${numbers.slice(0, 4)} ${numbers.slice(4)}`;
  return `${numbers.slice(0, 4)} ${numbers.slice(4, 8)} ${numbers.slice(8)}`;
}

export function formatZona(value: string): string {
  return value.replace(/\D/g, '').slice(0, 3);
}

export function formatSecao(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4);
}