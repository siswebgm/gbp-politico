import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function exportToExcel(data: Record<string, any>[], fileName: string, sheetName = 'Dados') {
  if (data.length === 0) return;

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  const keys = Object.keys(data[0]);
  ws['!cols'] = keys.map((key) => {
    const headerLen = key.length;
    const maxContentLen = data.reduce((max, row) => {
      const value = row[key] ?? '';
      return Math.max(max, String(value).length);
    }, headerLen);
    return { wch: Math.min(Math.max(maxContentLen + 2, 10), 60) };
  });

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

export function exportToPdf(
  headers: string[],
  body: (string | number | null | undefined)[][],
  title: string,
  description: string,
  total: number,
  fileName: string
) {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(title, pageWidth / 2, 12, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(description, 14, 20);
  doc.text(`Total: ${total}`, pageWidth - 14, 20, { align: 'right' });

  const safeBody = body.map((row) =>
    row.map((cell) => (cell == null || cell === '' ? '-' : String(cell)))
  );

  const columnStyles: Record<number, any> = {};
  headers.forEach((_, i) => {
    columnStyles[i] = { cellWidth: 'auto' };
  });

  (doc as any).autoTable({
    head: [headers],
    body: safeBody,
    startY: 26,
    theme: 'striped',
    margin: { top: 26, right: 14, bottom: 18, left: 14 },
    styles: {
      fontSize: 9,
      cellPadding: 2,
      overflow: 'linebreak',
      valign: 'middle',
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      minCellHeight: 8,
    },
    bodyStyles: { textColor: 50 },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    columnStyles,
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    tableLineWidth: 0.1,
    tableLineColor: [200, 200, 200],
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(150);
      const info = doc.internal.getCurrentPageInfo();
      doc.text(`Página ${info.pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    },
  });

  doc.save(fileName);
}
