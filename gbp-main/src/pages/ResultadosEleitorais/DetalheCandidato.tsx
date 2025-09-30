import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { ArrowLeft, Download, Filter } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface AnaliseEstrategica {
  NM_MUNICIPIO: string;
  NR_ZONA: string;
  NR_SECAO: string;
  QT_APTOS: number;
  QT_COMPARECIMENTO: number;
  QT_ABSTENCOES: number;
  QT_VOTOS: number;
  NM_VOTAVEL: string;
  SG_PARTIDO: string;
  DS_CARGO_PERGUNTA: string;
}

export default function DetalheCandidatoPage() {
  const { tableName, numero } = useParams<{ tableName: string; numero: string }>();
  const navigate = useNavigate();
  
  // Estados para os filtros
  const [filtroMunicipio, setFiltroMunicipio] = useState<string>('');
  const [filtroZona, setFiltroZona] = useState<string>('');
  const [filtroSecao, setFiltroSecao] = useState<string>('');
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Resetar para a primeira página quando os filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [filtroMunicipio, filtroZona, filtroSecao]);

  const { data: analise, isLoading, error } = useQuery<AnaliseEstrategica[]>({
    queryKey: ['detalheCandidato', tableName, numero],
    queryFn: async () => {
      if (!tableName || !numero) return [];

      const { data, error } = await supabaseClient.rpc('get_analise_votacao_candidato', {
        p_tabela: tableName,
        p_nr_votavel: numero,
      });

      if (error) {
        throw new Error('Erro ao buscar detalhes do candidato: ' + error.message);
      }
      console.log('Dados recebidos da RPC:', data);
      // Mapeia os dados para garantir que as chaves estejam em maiúsculas, tornando o código mais robusto
      const mappedData = data.map((item: any) => ({
        NM_MUNICIPIO: item.NM_MUNICIPIO || item.nm_municipio || '',
        NR_ZONA: item.NR_ZONA || item.nr_zona || '',
        NR_SECAO: item.NR_SECAO || item.nr_secao || '',
        QT_APTOS: item.QT_APTOS || item.qt_aptos || 0,
        QT_COMPARECIMENTO: item.QT_COMPARECIMENTO || item.qt_comparecimento || 0,
        QT_ABSTENCOES: item.QT_ABSTENCOES || item.qt_abstenções || 0,
        QT_VOTOS: item.QT_VOTOS || item.qt_votos || 0,
        NM_VOTAVEL: item.NM_VOTAVEL || item.nm_votavel || '',
        SG_PARTIDO: item.SG_PARTIDO || item.sg_partido || '',
        DS_CARGO_PERGUNTA: item.DS_CARGO_PERGUNTA || item.ds_cargo_pergunta || '',
      }));
      return mappedData || [];
    },
    enabled: !!tableName && !!numero,
  });

  // Extrai valores únicos para os filtros
  const { municipios, zonas, secoes } = useMemo(() => {
    if (!analise) return { municipios: [], zonas: [], secoes: [] };
    
    const municipiosUnicos = Array.from(new Set(analise.map(item => item.NM_MUNICIPIO))).sort();
    const zonasUnicas = Array.from(new Set(analise.map(item => item.NR_ZONA))).sort((a, b) => parseInt(a) - parseInt(b));
    const secoesUnicas = Array.from(new Set(analise.map(item => item.NR_SECAO))).sort((a, b) => parseInt(a) - parseInt(b));
    
    return {
      municipios: municipiosUnicos,
      zonas: zonasUnicas,
      secoes: secoesUnicas
    };
  }, [analise]);

  // Filtra os dados com base nos filtros selecionados
  const dadosFiltrados = useMemo(() => {
    if (!analise) return [];
    
    return analise.filter(item => {
      const municipioMatch = filtroMunicipio === 'todos' || !filtroMunicipio || item.NM_MUNICIPIO === filtroMunicipio;
      const zonaMatch = filtroZona === 'todas' || !filtroZona || item.NR_ZONA === filtroZona;
      const secaoMatch = filtroSecao === 'todas' || !filtroSecao || item.NR_SECAO === filtroSecao;
      
      return municipioMatch && zonaMatch && secaoMatch;
    });
  }, [analise, filtroMunicipio, filtroZona, filtroSecao]);
  
  // Cálculo dos totais para análise
  const totais = useMemo(() => {
    return dadosFiltrados.reduce((acc, item) => ({
      aptos: acc.aptos + (item.QT_APTOS || 0),
      comparecimento: acc.comparecimento + (item.QT_COMPARECIMENTO || 0),
      abstencoes: acc.abstencoes + (item.QT_ABSTENCOES || 0),
      votos: acc.votos + (item.QT_VOTOS || 0)
    }), {
      aptos: 0,
      comparecimento: 0,
      abstencoes: 0,
      votos: 0
    });
  }, [dadosFiltrados]);
  
  // Cálculo dos percentuais
  const percentuais = useMemo(() => ({
    votosSobreAptos: totais.aptos > 0 ? (totais.votos / totais.aptos) * 100 : 0,
    votosSobreComparecimento: totais.comparecimento > 0 ? (totais.votos / totais.comparecimento) * 100 : 0,
    comparecimentoSobreAptos: totais.aptos > 0 ? (totais.comparecimento / totais.aptos) * 100 : 0,
    abstencoesSobreAptos: totais.aptos > 0 ? (totais.abstencoes / totais.aptos) * 100 : 0
  }), [totais]);

  // Lógica de paginação
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = dadosFiltrados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(dadosFiltrados.length / itemsPerPage);
  
  // Função para mudar de página
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  // Função para ir para a próxima página
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  // Função para ir para a página anterior
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  // Função para limpar todos os filtros
  const limparFiltros = () => {
    setFiltroMunicipio('todos');
    setFiltroZona('todas');
    setFiltroSecao('todas');
  };

  // Função para exportar para Excel
  const exportToExcel = () => {
    if (!dadosFiltrados || dadosFiltrados.length === 0 || !analise || analise.length === 0) return;

    // Cria um novo livro
    const workbook = XLSX.utils.book_new();
    
    // Cabeçalho com informações do candidato
    const candidato = analise[0];
    const infoCandidato = [
      [candidato.NM_VOTAVEL],
      [] // linha em branco
    ];
    
    // Adiciona informações adicionais apenas se existirem
    const infoAdicionais = [];
    if (candidato.SG_PARTIDO && candidato.NM_VOTAVEL && candidato.DS_CARGO_PERGUNTA) {
      infoAdicionais.push(`${candidato.SG_PARTIDO} - ${candidato.NM_VOTAVEL} | ${candidato.DS_CARGO_PERGUNTA}`);
    } else if (candidato.SG_PARTIDO && candidato.NM_VOTAVEL) {
      infoAdicionais.push(`${candidato.SG_PARTIDO} - ${candidato.NM_VOTAVEL}`);
    } else if (candidato.SG_PARTIDO) {
      infoAdicionais.push(candidato.SG_PARTIDO);
    }
    
    // Adiciona as informações adicionais ao cabeçalho
    infoAdicionais.forEach(info => infoCandidato.splice(1, 0, [info]));
    
    // Adiciona linha em branco após as informações do candidato
    infoCandidato.push([], ['RESUMO DOS RESULTADOS'], []);
    
    // Adiciona os totais gerais
    infoCandidato.push(
      ['', 'TOTAL', 'PERCENTUAL'],
      ['Eleitores Aptos', totais.aptos.toString(), '100.00%'],
      ['Comparecimento', totais.comparecimento.toString(), `${percentuais.comparecimentoSobreAptos.toFixed(2)}%`],
      ['Abstenções', totais.abstencoes.toString(), `${percentuais.abstencoesSobreAptos.toFixed(2)}%`],
      ['Votos Obtidos', totais.votos.toString(), `${percentuais.votosSobreAptos.toFixed(2)}%`],
      ['', '', ''],
      ['Eficiência Eleitoral', '', `${percentuais.votosSobreComparecimento.toFixed(2)}% dos votos válidos`],
      []
    );

    // Formata os dados para o Excel
    const dadosFormatados = dadosFiltrados.map(item => ({
      'MUNICÍPIO': item.NM_MUNICIPIO,
      'ZONA': item.NR_ZONA,
      'SEÇÃO': item.NR_SECAO,
      'ELEITORES APTOS': item.QT_APTOS,
      'COMPARECIMENTO': item.QT_COMPARECIMENTO,
      'ABSTENÇÕES': item.QT_ABSTENCOES,
      'VOTOS OBTIDOS': item.QT_VOTOS,
      '% VOTOS/APTOS': item.QT_APTOS > 0 ? ((item.QT_VOTOS / item.QT_APTOS) * 100).toFixed(2) + '%' : '0%',
      '% VOTOS/COMPARECIMENTO': item.QT_COMPARECIMENTO > 0 ? ((item.QT_VOTOS / item.QT_COMPARECIMENTO) * 100).toFixed(2) + '%' : '0%'
    }));

    // Converte os dados para a planilha
    const startRow = infoCandidato.length + 1; // Pula as linhas do cabeçalho
    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados, { origin: `A${startRow}` });
    
    // Adiciona o cabeçalho com as informações do candidato
    XLSX.utils.sheet_add_aoa(worksheet, infoCandidato, { origin: 'A1' });
    
    // Ajusta a largura da coluna A para o nome do candidato
    if (!worksheet['!cols']) worksheet['!cols'] = [];
    worksheet['!cols'][0] = { wch: 50, hidden: false };
    
    // Garante que a coluna A tenha largura suficiente para o nome
    if (worksheet['A1'] && worksheet['A1'].v) {
      const nameLength = worksheet['A1'].v.length;
      if (nameLength > 50) {
        worksheet['!cols'][0].wch = Math.min(nameLength * 1.2, 100);
      }
    }
    
    // Ajusta a largura das colunas
    const wscols = [
      { wch: 25 }, // Município
      { wch: 8 },  // Zona
      { wch: 8 },  // Seção
      { wch: 15 }, // Eleitores Aptos
      { wch: 15 }, // Comparecimento
      { wch: 12 }, // Abstenções
      { wch: 15 }, // Votos Obtidos
      { wch: 15 }, // % Votos/Aptos
      { wch: 22 }, // % Votos/Comparecimento
    ];
    worksheet['!cols'] = wscols;
    
    // Estilização do cabeçalho da tabela
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const headerRow = infoCandidato.length + 1; // A linha do cabeçalho da tabela começa após as informações do candidato
    
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + headerRow;
      if (!worksheet[address]) continue;
      worksheet[address].s = {
        font: { bold: true, color: { rgb: '1F2937' } },
        fill: { fgColor: { rgb: 'F9FAFB' } },
        alignment: { horizontal: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
          left: { style: 'thin', color: { rgb: 'E5E7EB' } },
          right: { style: 'thin', color: { rgb: 'E5E7EB' } }
        }
      };
    }
    
    // Estilização do nome do candidato
    if (worksheet['A1']) {
      worksheet['A1'].s = { 
        font: { 
          bold: true, 
          sz: 20, 
          color: { rgb: 'FFFFFF' }, // Cor da fonte branca
          name: 'Arial'
        },
        fill: {
          fgColor: { rgb: '1E40AF' }, // Cor de fundo azul
          patternType: 'solid'
        },
        alignment: { 
          horizontal: 'left',
          vertical: 'center'
        }
      };
      
      // Ajusta a altura da linha do nome do candidato
      if (!worksheet['!rows']) worksheet['!rows'] = [];
      worksheet['!rows'][0] = { hpt: 36 }; // Aproximadamente 36 pontos de altura
    }
    
    // Estiliza as linhas de informações adicionais
    for (let i = 1; i < infoCandidato.length; i++) {
      if (worksheet[`A${i + 1}`]) {
        worksheet[`A${i + 1}`].s = { 
          font: { bold: false, sz: 11, color: { rgb: '4B5563' } },
          alignment: { horizontal: 'left' }
        };
      }
    }

    // Adiciona a planilha ao livro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultados');

    // Gera o arquivo Excel
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' 
    });
    
    // Define o nome do arquivo com base no nome do candidato
    const nomeCandidato = `${candidato.NM_VOTAVEL} (${candidato.SG_PARTIDO})`
      .replace(/[^a-z0-9\s()]/gi, '')
      .replace(/\s+/g, '_')
      .toLowerCase();
    
    // Faz o download do arquivo
    saveAs(data, `resultados_${nomeCandidato}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };



  return (
    <div className="w-full min-h-screen p-4 flex flex-col bg-gray-50">
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-center">
          <div>
            {analise && analise.length > 0 ? (
              <>
                <h1 className="text-2xl font-bold text-gray-800">{analise[0].NM_VOTAVEL} <span className="text-gray-600">({analise[0].SG_PARTIDO})</span></h1>
                <p className="text-md text-gray-600">Análise Estratégica de Votação para {analise[0].DS_CARGO_PERGUNTA}</p>
              </>
            ) : (
              <h1 className="text-2xl font-bold text-gray-800">Análise Estratégica de Votação - Candidato {numero}</h1>
            )}
          </div>
        </div>
      </div>
      
      {isLoading && <p className="text-center py-10">Carregando análise...</p>}
      {error && <p className="text-red-500 text-center py-10">{(error as Error).message}</p>}
      {analise && (
        <div className="overflow-auto flex-grow border rounded-lg bg-white shadow-sm">
          {/* Filtros */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filtros:</span>
              </div>
              
              <div className="w-full md:w-64">
                <Select 
                  value={filtroMunicipio} 
                  onValueChange={setFiltroMunicipio}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o Município" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectItem value="todos">Todos os Municípios</SelectItem>
                    {municipios.map(municipio => (
                      <SelectItem key={municipio} value={municipio}>
                        {municipio}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-full md:w-48">
                <Select 
                  value={filtroZona} 
                  onValueChange={setFiltroZona}
                  disabled={!filtroMunicipio}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a Zona" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectItem value="todas">Todas as Zonas</SelectItem>
                    {zonas.map(zona => (
                      <SelectItem key={zona} value={zona}>
                        Zona {zona}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-full md:w-48">
                <Select 
                  value={filtroSecao} 
                  onValueChange={setFiltroSecao}
                  disabled={!filtroZona}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a Seção" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectItem value="todas">Todas as Seções</SelectItem>
                    {secoes
                      .filter(secao => !filtroZona || analise.some(item => 
                        item.NR_ZONA === filtroZona && item.NR_SECAO === secao
                      ))
                      .map(secao => (
                        <SelectItem key={secao} value={secao}>
                          Seção {secao}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={limparFiltros}
                className="whitespace-nowrap"
              >
                Limpar Filtros
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportToExcel}
                disabled={!dadosFiltrados || dadosFiltrados.length === 0}
                className="whitespace-nowrap bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
              
              {dadosFiltrados.length > 0 && (
                <div className="text-sm text-gray-500 ml-2">
                  {dadosFiltrados.length} registro{dadosFiltrados.length !== 1 ? 's' : ''} encontrado{dadosFiltrados.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
          
          {/* Seção de Análise */}
          {dadosFiltrados.length > 0 && (
            <div className="mt-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 px-4">Análise dos Resultados</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Votos / Aptos</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {percentuais.votosSobreAptos.toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {totais.votos.toLocaleString('pt-BR')} de {totais.aptos.toLocaleString('pt-BR')} eleitores
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Votos / Comparecimento</p>
                  <p className="text-2xl font-bold text-green-700">
                    {percentuais.votosSobreComparecimento.toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {totais.votos.toLocaleString('pt-BR')} de {totais.comparecimento.toLocaleString('pt-BR')} votantes
                  </p>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Comparecimento / Aptos</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {percentuais.comparecimentoSobreAptos.toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {totais.comparecimento.toLocaleString('pt-BR')} de {totais.aptos.toLocaleString('pt-BR')} eleitores
                  </p>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Abstenções / Aptos</p>
                  <p className="text-2xl font-bold text-red-700">
                    {percentuais.abstencoesSobreAptos.toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {totais.abstencoes.toLocaleString('pt-BR')} de {totais.aptos.toLocaleString('pt-BR')} eleitores
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Município</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Zona</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Seção</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Aptos</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Comparecimento</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Abstenções</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Votos Obtidos</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      Nenhum registro encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{item.NM_MUNICIPIO}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.NR_ZONA}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.NR_SECAO}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{(item.QT_APTOS ?? 0).toLocaleString('pt-BR')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{(item.QT_COMPARECIMENTO ?? 0).toLocaleString('pt-BR')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{(item.QT_ABSTENCOES ?? 0).toLocaleString('pt-BR')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 text-right">{(item.QT_VOTOS ?? 0).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            {/* Controles de paginação */}
            {dadosFiltrados.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-gray-200 bg-white sm:px-6">
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a{' '}
                    <span className="font-medium">
                      {Math.min(indexOfLastItem, dadosFiltrados.length)}
                    </span>{' '}
                    de <span className="font-medium">{dadosFiltrados.length}</span> resultados
                  </p>
                  
                  <select 
                    className="text-sm border rounded p-1 bg-white"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={5}>5 itens</option>
                    <option value={10}>10 itens</option>
                    <option value={25}>25 itens</option>
                    <option value={50}>50 itens</option>
                    <option value={100}>100 itens</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-1 mt-2 sm:mt-0">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => paginate(pageNum)}
                          className={`w-8 h-8 rounded text-sm ${currentPage === pageNum 
                            ? 'bg-blue-600 text-white' 
                            : 'border hover:bg-gray-100'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-3 py-1 border rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
