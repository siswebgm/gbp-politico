import { jsPDF } from 'jspdf';
import type { Voter } from '../types/voter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LabelOptions {
  width: number;
  height: number;
  marginTop: number;
  marginLeft: number;
  cols: number;
  rows: number;
}

// Dimensions for 30 labels per sheet (3x10)
// Measurements in millimeters for Carta size
const LABEL_SPECS: LabelOptions = {
  width: 66.7, // 66.7mm width
  height: 25.4, // 25.4mm height
  marginTop: 13, // Top margin
  marginLeft: 4.8, // Left margin
  cols: 3, // 3 columns
  rows: 10, // 10 rows
};

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Don't capitalize certain words unless they're at the start
      const lowercaseWords = ['de', 'da', 'do', 'das', 'dos', 'e'];
      if (lowercaseWords.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function generateBirthdayLabels(voters: Voter[], month: number): void {
  // Filter voters by birth month
  const birthdayVoters = voters.filter(voter => {
    if (!voter.nascimento) return false;
    const birthDate = new Date(voter.nascimento);
    return birthDate.getMonth() + 1 === month;
  });

  if (!birthdayVoters.length) {
    alert('Nenhum eleitor encontrado com aniversário no mês selecionado.');
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter', // Carta size
  });

  // Add header with generation info
  doc.setFontSize(8);
  doc.text(
    `Etiquetas de Aniversário - ${format(new Date(2024, month - 1), 'MMMM', { locale: ptBR })}`,
    doc.internal.pageSize.width / 2,
    5,
    { align: 'center' }
  );
  doc.text(
    `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
    doc.internal.pageSize.width - 10,
    5,
    { align: 'right' }
  );

  let currentPage = 1;
  const labelsPerPage = LABEL_SPECS.rows * LABEL_SPECS.cols;

  birthdayVoters.forEach((voter, index) => {
    const pagePosition = index % labelsPerPage;
    const col = pagePosition % LABEL_SPECS.cols;
    const row = Math.floor(pagePosition / LABEL_SPECS.cols);

    // Add new page if needed
    if (pagePosition === 0 && index > 0) {
      doc.addPage();
      currentPage++;
    }

    // Calculate label position
    const x = LABEL_SPECS.marginLeft + (col * LABEL_SPECS.width);
    const y = LABEL_SPECS.marginTop + (row * LABEL_SPECS.height);

    // Add content to label
    doc.setFontSize(10);
    doc.text(formatVoterAddress(voter), x + 2, y + 5, {
      maxWidth: LABEL_SPECS.width - 4,
    });
  });

  // Save the PDF
  const fileName = `etiquetas-aniversario-${format(new Date(2024, month - 1), 'MMMM', {
    locale: ptBR,
  })}.pdf`;
  doc.save(fileName);
}

function formatVoterAddress(voter: Voter): string {
  const lines = [
    // Format name in title case
    voter.nome ? toTitleCase(voter.nome) : '',

    // Format address in title case with number
    voter.logradouro 
      ? `${toTitleCase(voter.logradouro)}${voter.numero ? `, ${voter.numero}` : ''}`
      : '',

    // Format complement in title case
    voter.complemento ? toTitleCase(voter.complemento) : '',

    // Format neighborhood in title case
    voter.bairro ? toTitleCase(voter.bairro) : '',

    // Format city and CEP
    voter.cidade && voter.cep 
      ? `${toTitleCase(voter.cidade)} - ${formatCEP(voter.cep)}`
      : voter.cidade 
      ? toTitleCase(voter.cidade)
      : '',
  ].filter(Boolean);

  return lines.join('\n');
}

function formatCEP(cep: string): string {
  const cleanCEP = cep.replace(/\D/g, '');
  return cleanCEP.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}