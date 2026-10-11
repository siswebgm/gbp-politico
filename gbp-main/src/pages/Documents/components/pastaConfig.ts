import {
  Archive,
  BookMarked,
  Folder,
  FolderOpen,
  Landmark,
  MapPin,
  Star,
  Tag,
} from 'lucide-react';

// Paleta de cores disponíveis para as pastas personalizadas
export const pastaCores: Record<
  string,
  { label: string; text: string; bg: string; gradientFrom: string; gradientTo: string; hoverBg: string }
> = {
  blue: {
    label: 'Azul',
    text: 'text-blue-600',
    bg: 'bg-blue-50',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-blue-600',
    hoverBg: 'hover:bg-blue-50/80',
  },
  emerald: {
    label: 'Verde',
    text: 'text-emerald-600',
    bg: 'bg-emerald-50',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-emerald-600',
    hoverBg: 'hover:bg-emerald-50/80',
  },
  violet: {
    label: 'Roxo',
    text: 'text-violet-600',
    bg: 'bg-violet-50',
    gradientFrom: 'from-violet-500',
    gradientTo: 'to-violet-600',
    hoverBg: 'hover:bg-violet-50/80',
  },
  amber: {
    label: 'Âmbar',
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    gradientFrom: 'from-amber-500',
    gradientTo: 'to-amber-600',
    hoverBg: 'hover:bg-amber-50/80',
  },
  rose: {
    label: 'Rosa',
    text: 'text-rose-600',
    bg: 'bg-rose-50',
    gradientFrom: 'from-rose-500',
    gradientTo: 'to-rose-600',
    hoverBg: 'hover:bg-rose-50/80',
  },
  cyan: {
    label: 'Ciano',
    text: 'text-cyan-600',
    bg: 'bg-cyan-50',
    gradientFrom: 'from-cyan-500',
    gradientTo: 'to-cyan-600',
    hoverBg: 'hover:bg-cyan-50/80',
  },
};

// Ícones disponíveis para as pastas personalizadas
export const pastaIcones: Record<string, { label: string; icon: any }> = {
  folder: { label: 'Pasta', icon: Folder },
  folderOpen: { label: 'Pasta aberta', icon: FolderOpen },
  archive: { label: 'Arquivo', icon: Archive },
  mapPin: { label: 'Local', icon: MapPin },
  tag: { label: 'Categoria', icon: Tag },
  star: { label: 'Favorito', icon: Star },
  landmark: { label: 'Órgão', icon: Landmark },
  bookMarked: { label: 'Registro', icon: BookMarked },
};

export const corPadrao = 'blue';
export const iconePadrao = 'folder';

// Palavras que ficam em minúsculo no Title Case (exceto na 1ª posição)
const preposicoes = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com',
  'no', 'na', 'nos', 'nas', 'a', 'o', 'as', 'os', 'um', 'uma', 'por',
]);

// Normaliza o nome da pasta: evita TUDO MAIÚSCULO e padroniza Title Case
// "DOCUMENTOS DO BAIRRO CENTRO" -> "Documentos do Bairro Centro"
export function formatarNomePasta(nome: string): string {
  return nome
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ')
    .map((palavra, i) =>
      i === 0 || !preposicoes.has(palavra)
        ? palavra.charAt(0).toUpperCase() + palavra.slice(1)
        : palavra
    )
    .join(' ');
}
