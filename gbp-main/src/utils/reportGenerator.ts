import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReportOptions {
  title: string;
  subtitle?: string;
  columns: { header: string; key: string }[];
  data: any[];
  format: 'pdf' | 'xlsx';
  orientation?: 'portrait' | 'landscape';
}

export function generateReport(options: ReportOptions): void {
  if (options.format === 'pdf') {
    generatePDFReport(options);
  } else {
    generateXLSXReport(options);
  }
}

function generatePDFReport(options: ReportOptions): void {
  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Add header
  doc.setFontSize(16);
  doc.text(options.title, doc.internal.pageSize.width / 2, 20, { align: 'center' });

  if (options.subtitle) {
    doc.setFontSize(12);
    doc.text(options.subtitle, doc.internal.pageSize.width / 2, 30, { align: 'center' });
  }

  // Add generation date
  doc.setFontSize(10);
  doc.text(
    `Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`,
    doc.internal.pageSize.width - 20,
    10,
    { align: 'right' }
  );

  // Prepare table data
  const headers = options.columns.map(col => col.header);
  const rows = options.data.map(item =>
    options.columns.map(col => {
      const value = item[col.key];
      if (value instanceof Date) {
        return format(value, 'dd/MM/yyyy');
      }
      return value?.toString() || '';
    })
  );

  // Add table
  (doc as any).autoTable({
    head: [headers],
    body: rows,
    startY: options.subtitle ? 40 : 30,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
  });

  // Add page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const fileName = `${options.title.toLowerCase().replace(/\s+/g, '-')}-${format(
    new Date(),
    'yyyy-MM-dd-HHmm'
  )}.pdf`;
  doc.save(fileName);
}

function generateXLSXReport(options: ReportOptions): void {
  // Prepare worksheet data
  const wsData = [
    // Title row
    [{ v: options.title, t: 's' }],
    // Empty row
    [],
    // Headers
    options.columns.map(col => col.header),
    // Data rows
    ...options.data.map(item =>
      options.columns.map(col => {
        const value = item[col.key];
        if (value instanceof Date) {
          return format(value, 'dd/MM/yyyy');
        }
        return value?.toString() || '';
      })
    ),
  ];

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Style the title
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: options.columns.length - 1 } }];

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório');

  // Save the file
  const fileName = `${options.title.toLowerCase().replace(/\s+/g, '-')}-${format(
    new Date(),
    'yyyy-MM-dd-HHmm'
  )}.xlsx`;
  XLSX.writeFile(wb, fileName);
}