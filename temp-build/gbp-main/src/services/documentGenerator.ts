import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx';
import { saveAs } from 'file-saver';
import { DocumentFormData, DocumentType } from '../pages/Documents/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatDate = (date: Date) => {
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
};

const generateLawProject = (data: DocumentFormData) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          heading: HeadingLevel.HEADING_1,
          children: [
            new TextRun({
              text: 'PROJETO DE LEI',
              bold: true,
              size: 32,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: `Nº ${data.number}`,
              bold: true,
              size: 28,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: {
            before: 400,
            after: 400,
          },
          children: [
            new TextRun({
              text: data.description || '',
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: {
            before: 400,
          },
          children: [
            new TextRun({
              text: `Autor(es): ${data.authors?.join(', ') || ''}`,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new TextRun({
              text: `Data de Apresentação: ${data.presentationDate ? formatDate(data.presentationDate) : ''}`,
              size: 24,
            }),
          ],
        }),
      ],
    }],
  });

  return doc;
};

const generateRequirement = (data: DocumentFormData) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          heading: HeadingLevel.HEADING_1,
          children: [
            new TextRun({
              text: 'REQUERIMENTO',
              bold: true,
              size: 32,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: `Nº ${data.number}`,
              bold: true,
              size: 28,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: {
            before: 400,
            after: 200,
          },
          children: [
            new TextRun({
              text: `À ${data.destination || ''}`,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: {
            before: 200,
            after: 400,
          },
          children: [
            new TextRun({
              text: data.description || '',
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: {
            before: 400,
          },
          children: [
            new TextRun({
              text: `Prazo de Resposta: ${data.responseDeadline ? formatDate(data.responseDeadline) : ''}`,
              size: 24,
            }),
          ],
        }),
      ],
    }],
  });

  return doc;
};

const generateOfficialLetter = (data: DocumentFormData) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          heading: HeadingLevel.HEADING_1,
          children: [
            new TextRun({
              text: 'OFÍCIO',
              bold: true,
              size: 32,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: `Nº ${data.number}`,
              bold: true,
              size: 28,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: {
            before: 400,
          },
          children: [
            new TextRun({
              text: formatDate(new Date()),
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: {
            before: 400,
          },
          children: [
            new TextRun({
              text: `De: ${data.sender || ''}`,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: {
            before: 200,
          },
          children: [
            new TextRun({
              text: `Para: ${data.recipient || ''}`,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: {
            before: 400,
            after: 400,
          },
          children: [
            new TextRun({
              text: data.description || '',
              size: 24,
            }),
          ],
        }),
      ],
    }],
  });

  return doc;
};

export const generateDocument = async (data: DocumentFormData) => {
  let doc;

  switch (data.type as DocumentType) {
    case 'law_project':
      doc = generateLawProject(data);
      break;
    case 'requirement':
      doc = generateRequirement(data);
      break;
    case 'official_letter':
      doc = generateOfficialLetter(data);
      break;
    case 'minutes':
    case 'resolution':
    case 'ordinance':
      // Por enquanto, usar o mesmo template do ofício para os novos tipos
      doc = generateOfficialLetter(data);
      break;
    default:
      throw new Error('Tipo de documento não suportado');
  }

  const blob = await Packer.toBlob(doc);
  const fileName = `${data.type}_${data.number}_${format(new Date(), 'yyyy-MM-dd')}.docx`;
  saveAs(blob, fileName);
};
