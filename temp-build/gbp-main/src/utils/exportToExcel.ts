import { utils, writeFile } from 'xlsx';
import { toast } from 'react-toastify';

interface Oficio {
  numero_oficio: string;
  data_solicitacao: string;
  status_solicitacao: string;
  nivel_de_urgencia: string;
  tipo_de_demanda: string;
  requerente_nome: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  descricao_do_problema: string;
}

export const exportOficiosToExcel = (oficios: Oficio[]) => {
  try {
    // Preparar os dados para exportação
    const dataToExport = oficios.map(oficio => ({
      'Número do Ofício': oficio.numero_oficio,
      'Data da Solicitação': new Date(oficio.data_solicitacao).toLocaleDateString('pt-BR'),
      'Status': oficio.status_solicitacao,
      'Nível de Urgência': oficio.nivel_de_urgencia.charAt(0).toUpperCase() + oficio.nivel_de_urgencia.slice(1),
      'Tipo de Demanda': oficio.tipo_de_demanda,
      'Requerente': oficio.requerente_nome,
      'Logradouro': oficio.logradouro,
      'Bairro': oficio.bairro,
      'Cidade': oficio.cidade,
      'Descrição do Problema': oficio.descricao_do_problema
    }));

    // Criar a planilha
    const ws = utils.json_to_sheet(dataToExport);

    // Definir largura das colunas
    const columnWidths = [
      { wch: 15 },  // Número do Ofício
      { wch: 15 },  // Data da Solicitação
      { wch: 15 },  // Status
      { wch: 15 },  // Nível de Urgência
      { wch: 25 },  // Tipo de Demanda
      { wch: 25 },  // Requerente
      { wch: 30 },  // Logradouro
      { wch: 20 },  // Bairro
      { wch: 20 },  // Cidade
      { wch: 50 },  // Descrição do Problema
    ];
    ws['!cols'] = columnWidths;

    // Adicionar filtros
    const range = utils.decode_range(ws['!ref'] || 'A1');
    ws['!autofilter'] = { ref: ws['!ref'] || 'A1' };

    // Estilizar o cabeçalho
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4A72B0" } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    // Aplicar estilo ao cabeçalho
    const headers = Object.keys(dataToExport[0]);
    headers.forEach((header, index) => {
      const cellRef = utils.encode_cell({ r: 0, c: index });
      if (!ws[cellRef]) ws[cellRef] = { v: header };
      ws[cellRef].s = headerStyle;
    });

    // Criar o workbook e adicionar a planilha
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Oficios');
    
    // Gerar o nome do arquivo com a data atual
    const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const fileName = `Oficios_${date}.xlsx`;

    // Salvar o arquivo
    writeFile(wb, fileName);

    toast.success('Relatório exportado com sucesso!');
  } catch (error) {
    console.error('Erro ao exportar:', error);
    toast.error('Erro ao exportar o relatório');
  }
};
