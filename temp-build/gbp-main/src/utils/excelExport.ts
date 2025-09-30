import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Voter } from '../types/voter';
import type { VoterFilters } from '../types/voter';

export function exportVotersToExcel(voters: Voter[], filters: VoterFilters) {
  // Filter voters based on criteria
  const filteredVoters = voters.filter(voter => {
    const matchesSearch = !filters.search || 
      voter.nome?.toLowerCase().includes(filters.search.toLowerCase()) ||
      voter.cpf?.includes(filters.search);
      
    const matchesCity = !filters.city || 
      voter.cidade?.toLowerCase().includes(filters.city.toLowerCase());
      
    const matchesNeighborhood = !filters.neighborhood || 
      voter.bairro?.toLowerCase().includes(filters.neighborhood.toLowerCase());
      
    const matchesLogradouro = !filters.logradouro || 
      voter.logradouro?.toLowerCase().includes(filters.logradouro.toLowerCase());
      
    const matchesCpf = !filters.cpf || 
      voter.cpf?.includes(filters.cpf);

    return matchesSearch && matchesCity && matchesNeighborhood && 
           matchesLogradouro && matchesCpf;
  });

  // Prepare data for export
  const data = filteredVoters.map(voter => ({
    'Nome': voter.nome || '-',
    'CPF': voter.cpf || '-',
    'WhatsApp': voter.whatsapp || '-',
    'Telefone': voter.telefone || '-',
    'Gênero': voter.genero || '-',
    'Data de Nascimento': voter.nascimento ? format(new Date(voter.nascimento), 'dd/MM/yyyy') : '-',
    'Título de Eleitor': voter.titulo || '-',
    'Zona': voter.zona || '-',
    'Seção': voter.secao || '-',
    'CEP': voter.cep || '-',
    'Logradouro': voter.logradouro || '-',
    'Número': voter.numero || '-',
    'Complemento': voter.complemento || '-',
    'Bairro': voter.bairro || '-',
    'Cidade': voter.cidade || '-',
    'Indicado por': voter.indicado || '-',
  }));

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Eleitores');

  // Generate filename with current date
  const fileName = `eleitores_${format(new Date(), 'dd-MM-yyyy_HH-mm', { locale: ptBR })}.xlsx`;

  // Save file
  XLSX.writeFile(wb, fileName);
}