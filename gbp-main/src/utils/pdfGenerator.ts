import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VoterData {
  nome?: string | null;
  cpf?: string | null;
  titulo?: string | null;
  zona?: string | null;
  seçao?: string | null;
  whatsapp?: string | null;
  contato?: string | null;
  genero?: string | null;
  nascimento?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  nº?: string | null;
  indicação?: string | null;
}

export const generateVoterPDF = (voter: VoterData) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text('Ficha do Eleitor', 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Data de Emissão: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 105, 30, { align: 'center' });

  // Informações Pessoais
  doc.setFontSize(14);
  doc.text('Informações Pessoais', 20, 45);
  doc.setFontSize(12);
  doc.setDrawColor(0, 123, 255);
  doc.line(20, 47, 190, 47);

  const personalInfo = [
    ['Nome:', voter.nome || '-'],
    ['CPF:', voter.cpf || '-'],
    ['Gênero:', voter.genero || '-'],
    ['Data de Nascimento:', voter.nascimento ? format(new Date(voter.nascimento), 'dd/MM/yyyy') : '-'],
  ];

  (doc as any).autoTable({
    startY: 50,
    head: [],
    body: personalInfo,
    theme: 'plain',
    styles: { fontSize: 12, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 50 } },
  });

  // Informações Eleitorais
  doc.setFontSize(14);
  doc.text('Informações Eleitorais', 20, (doc as any).lastAutoTable.finalY + 15);
  doc.setFontSize(12);
  doc.line(20, (doc as any).lastAutoTable.finalY + 17, 190, (doc as any).lastAutoTable.finalY + 17);

  const electoralInfo = [
    ['Título de Eleitor:', voter.titulo || '-'],
    ['Zona:', voter.zona || '-'],
    ['Seção:', voter.seçao || '-'],
  ];

  (doc as any).autoTable({
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [],
    body: electoralInfo,
    theme: 'plain',
    styles: { fontSize: 12, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 50 } },
  });

  // Contato
  doc.setFontSize(14);
  doc.text('Contato', 20, (doc as any).lastAutoTable.finalY + 15);
  doc.setFontSize(12);
  doc.line(20, (doc as any).lastAutoTable.finalY + 17, 190, (doc as any).lastAutoTable.finalY + 17);

  const contactInfo = [
    ['WhatsApp:', voter.whatsapp || '-'],
    ['Telefone:', voter.contato || '-'],
  ];

  (doc as any).autoTable({
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [],
    body: contactInfo,
    theme: 'plain',
    styles: { fontSize: 12, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 50 } },
  });

  // Endereço
  doc.setFontSize(14);
  doc.text('Endereço', 20, (doc as any).lastAutoTable.finalY + 15);
  doc.setFontSize(12);
  doc.line(20, (doc as any).lastAutoTable.finalY + 17, 190, (doc as any).lastAutoTable.finalY + 17);

  const addressInfo = [
    ['CEP:', voter.cep || '-'],
    ['Logradouro:', `${voter.logradouro || '-'}, ${voter.nº || '-'}`],
    ['Bairro:', voter.bairro || '-'],
    ['Cidade:', voter.cidade || '-'],
  ];

  (doc as any).autoTable({
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [],
    body: addressInfo,
    theme: 'plain',
    styles: { fontSize: 12, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 50 } },
  });

  // Indicação
  if (voter.indicação) {
    doc.setFontSize(14);
    doc.text('Indicação', 20, (doc as any).lastAutoTable.finalY + 15);
    doc.setFontSize(12);
    doc.line(20, (doc as any).lastAutoTable.finalY + 17, 190, (doc as any).lastAutoTable.finalY + 17);

    const indicationInfo = [['Indicado por:', voter.indicação]];

    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [],
      body: indicationInfo,
      theme: 'plain',
      styles: { fontSize: 12, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 50 } },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(
      `Página ${i} de ${pageCount}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  doc.save(`eleitor_${voter.nome || 'sem_nome'}.pdf`);
};

interface AtendimentoPDF {
  nome: string;
  categoria: string;
  data: string;
  status: string;
  telefone?: string;
  endereco?: string;
  observacoes?: string;
  tipo_atendimento?: string;
  data_agendamento?: string | null;
  data_expiração?: string | null;
  responsavel?: string;
  indicado?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  numero_do_sus?: string;
  cpf?: string;
}

// Função para formatar o CPF
const formatarCPF = (cpf: string) => {
  if (!cpf) return '';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

// Função para formatar o CEP
const formatarCEP = (cep: string) => {
  if (!cep) return '';
  return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
};

// Função para formatar o número do SUS
const formatarSUS = (sus: string) => {
  if (!sus) return '';
  return sus.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4');
};

export const generateAtendimentosDiaPDF = (atendimentos: AtendimentoPDF[]) => {
  const doc = new jsPDF('landscape'); // Modo paisagem para melhor visualização
  const today = new Date();
  const formattedDate = format(today, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  // Margens do documento (em mm) - Ajustadas para melhor visualização
  const margin = {
    left: 10,   // Margem esquerda reduzida
    right: 10,  // Margem direita reduzida
    top: 20,    // Margem superior
    bottom: 20  // Margem inferior
  };

  // Cabeçalho
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GBP POLÍTICO', 148, margin.top, { align: 'center' });
  doc.setFontSize(14);
  doc.text('RELATÓRIO DE ATENDIMENTOS', 148, margin.top + 8, { align: 'center' });
  
  // Informações do relatório
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Data:', margin.left, margin.top + 20);
  doc.setFont('helvetica', 'bold');
  doc.text(formattedDate, margin.left + 20, margin.top + 20);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Total:', margin.left + 100, margin.top + 20);
  doc.setFont('helvetica', 'bold');
  doc.text(atendimentos.length.toString(), margin.left + 130, margin.top + 20);

  // Cabeçalhos das colunas
  const tableColumn = [
    'NOME',
    'CATEGORIA',
    'HORA',
    'STATUS',
    'RESPONSÁVEL',
    'INDICADO',
    'DESCRIÇÃO',
  ];
  
  const tableRows: string[][] = [];

  atendimentos.forEach(atendimento => {
    const hora = new Date(atendimento.data).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    // Criar descrição formatada como string
    const descricao = [];
    
    // Seção de observações
    if (atendimento.observacoes) {
      descricao.push(`OBSERVAÇÕES: ${atendimento.observacoes}`);
      descricao.push(''); // Linha em branco
    }
    
    // Seção de endereço
    descricao.push('ENDEREÇO');
    
    // Linha 1: Logradouro
    if (atendimento.logradouro) {
      let enderecoLinha = atendimento.logradouro;
      if (atendimento.numero) enderecoLinha += `, ${atendimento.numero}`;
      if (atendimento.complemento) enderecoLinha += ` - ${atendimento.complemento}`;
      descricao.push(enderecoLinha);
    }
    
    // Linha 2: Bairro, Cidade/UF e CEP
    const linhaEndereco = [];
    if (atendimento.bairro) linhaEndereco.push(`Bairro: ${atendimento.bairro}`);
    if (atendimento.cidade || atendimento.uf) {
      linhaEndereco.push(`Cidade: ${[atendimento.cidade, atendimento.uf].filter(Boolean).join('/')}`);
    }
    if (atendimento.cep) linhaEndereco.push(`CEP: ${formatarCEP(atendimento.cep)}`);
    
    if (linhaEndereco.length > 0) {
      descricao.push(linhaEndereco.join(' | '));
    }
    
    // Seção de documentos
    const docs = [];
    if (atendimento.cpf) docs.push(`CPF: ${formatarCPF(atendimento.cpf)}`);
    if (atendimento.numero_do_sus) docs.push(`SUS: ${formatarSUS(atendimento.numero_do_sus)}`);
    
    if (docs.length > 0) {
      descricao.push('\nDOCUMENTOS');
      descricao.push(docs.join(' | '));
    }
    
    // Formata o nome com o telefone abaixo
    const nomeComTelefone = atendimento.telefone 
      ? `${atendimento.nome || '-'}\nTel: ${atendimento.telefone}`
      : atendimento.nome || '-';

    tableRows.push([
      nomeComTelefone,
      atendimento.categoria || '-',
      hora,
      atendimento.status || 'Pendente',
      atendimento.responsavel || '-',
      atendimento.indicado || '-',
      descricao.join('\n') || '-',
    ]);
  });

  // Larguras das colunas (soma total: 277mm, considerando margens de 10mm cada lado)
  const columnWidths = [
    55,  // Nome (ajustado para melhorar o layout)
    35,  // Categoria (ajustado para melhorar o layout)
    18,  // Hora
    25,  // Status
    40,  // Responsável (reduzido para melhorar o layout)
    25,  // Indicado
    75   // Descrição (aumentado para melhor visualização)
  ];
  
  // Largura total da tabela (A4 landscape = 297mm - margens de 10mm cada lado)
  const tableWidth = 277;

  // Configurações da tabela
  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: margin.top + 25,
    theme: 'grid',
    margin: { top: 40, left: 10, right: 10, bottom: 20 },
    tableWidth: tableWidth,
    headStyles: {
      fillColor: [0, 100, 0], // Verde escuro
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      minCellHeight: 8,
    },
    styles: {
      fontSize: 9,
      cellPadding: 2,
      overflow: 'linebreak',
      cellWidth: 'wrap',
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      font: 'helvetica',
      halign: 'left',
      valign: 'top',
      lineHeight: 1.1,
      textColor: [40, 40, 40],
      minCellHeight: 8,
      cellHeight: 'auto',
      minCellPadding: 1
    },
    columnStyles: {
      0: { 
        cellWidth: columnWidths[0],
        fontStyle: 'bold',
        cellPadding: [3, 2],
        valign: 'middle',
        overflow: 'linebreak'
      },  // Nome
      1: { 
        cellWidth: columnWidths[1],
        fontStyle: 'italic',
        valign: 'middle',
        overflow: 'linebreak'
      },  // Categoria
      2: { 
        cellWidth: columnWidths[2],
        halign: 'center',
        valign: 'middle',
        overflow: 'linebreak'
      },  // Hora
      3: { 
        cellWidth: columnWidths[3],
        halign: 'center',
        valign: 'middle',
        cellPadding: [3, 2],
        overflow: 'linebreak',
        fillColor: (row: any) => {
          const status = tableRows[row]?.[3]?.toLowerCase();
          if (status?.includes('finalizado')) return [200, 230, 200];
          if (status?.includes('andamento')) return [255, 255, 200];
          if (status?.includes('pendente')) return [255, 200, 200];
          return [240, 240, 240];
        }
      },  // Status
      4: { 
        cellWidth: columnWidths[4],
        fontStyle: 'italic',
        valign: 'middle',
        overflow: 'linebreak'
      },  // Responsável
      5: { 
        cellWidth: columnWidths[5],
        fontStyle: 'italic',
        valign: 'middle',
        overflow: 'linebreak'
      },  // Indicado
      6: { 
        cellWidth: columnWidths[6],
        cellPadding: [2, 1],
        valign: 'top',
        fontSize: 8,
        lineHeight: 1.1,
        minCellHeight: 8,
        overflow: 'linebreak',
        fontStyle: 'normal'
      }   // Descrição
    },
    // Removendo a duplicação da margem
    didDrawPage: function (data: any) {
      // Rodapé em todas as páginas
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      
      doc.setFontSize(8);
      doc.setTextColor(100);
      
      // Linha de rodapé
      doc.setDrawColor(0, 100, 0);
      doc.line(20, pageHeight - 20, 280, pageHeight - 20);
      
      // Texto do rodapé
      doc.text(
        `Gerado em: ${new Date().toLocaleString('pt-BR')} | GBP Político - Sistema de Gestão de Atendimentos`,
        20,
        pageHeight - 15
      );
      
      doc.text(
        `Página ${data.pageNumber} de ${data.pageCount}`,
        260,
        pageHeight - 15,
        { align: 'right' }
      );
    }
  });

  // Salvar o PDF
  doc.save(`atendimentos_${format(today, 'yyyy-MM-dd')}.pdf`);
};