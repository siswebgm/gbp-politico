export function toTitleCase(text: string): string {
  if (!text) return text;
  
  // Divide o texto em palavras
  return text
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (!word) return word;
      // Ignora palavras como "de", "da", "do", "dos", "das"
      const lowercaseWords = ['de', 'da', 'do', 'dos', 'das', 'e'];
      if (lowercaseWords.includes(word)) return word;
      // Capitaliza a primeira letra
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
