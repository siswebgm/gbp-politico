export function sanitizeFileName(fileName: string): string {
  // Remove caracteres especiais e espaços
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .toLowerCase();
}
