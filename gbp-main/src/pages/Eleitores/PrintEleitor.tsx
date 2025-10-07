import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Atendimento {
  uid: string;
  numero: number;
  descricao: string;
  data_atendimento: string;
  status: string;
  gbp_categorias: {
    nome: string;
  } | null;
  responsavel: {
    nome: string;
  } | null;
}

interface Oficio {
  uid: string;
  numero_oficio: string;
  titulo: string;
  descricao: string;
  descricao_do_problema?: string;
  status: string;
  data_solicitacao: string;
  tipo_de_demanda?: string;
  responsavel_nome?: string | null;
  created_at: string;
}

interface PrintEleitorProps {
  eleitor: any;
  atendimentos?: Atendimento[];
  oficios?: Oficio[];
}

const PrintEleitor: React.FC<PrintEleitorProps> = ({ eleitor, atendimentos = [], oficios = [] }) => {
  if (!eleitor) return null;

  const formatDate = (date: string) => {
    if (!date) return '-';
    try {
      return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return date;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Concluído': return '#10b981';
      case 'Em Andamento': return '#f59e0b';
      case 'Pendente': return '#6b7280';
      case 'Cancelado': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <>
      <div className="hidden print:block">
        <div className="print-content" style={{ 
          fontFamily: 'Arial, sans-serif',
          color: '#1f2937',
          fontSize: '11pt',
          lineHeight: '1.5'
        }}>
          {/* Cabeçalho */}
          <div style={{ 
            borderBottom: '3px solid #3b82f6',
            paddingBottom: '15px',
            marginBottom: '25px'
          }}>
            <h1 style={{ 
              fontSize: '24pt',
              fontWeight: 'bold',
              color: '#1e40af',
              margin: '0 0 5px 0'
            }}>
              {eleitor.nome}
            </h1>
            <p style={{ 
              fontSize: '10pt',
              color: '#6b7280',
              margin: 0
            }}>
              Cadastrado em {formatDate(eleitor.created_at)}
              {eleitor.responsavel && ` • por ${eleitor.responsavel}`}
            </p>
          </div>

          {/* Dados Pessoais */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ 
              fontSize: '14pt',
              fontWeight: 'bold',
              color: '#1e40af',
              marginBottom: '12px',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '5px'
            }}>
              📋 Dados Pessoais
            </h2>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px 20px'
            }}>
              <div>
                <strong style={{ color: '#374151' }}>CPF:</strong> {eleitor.cpf || '-'}
              </div>
              <div>
                <strong style={{ color: '#374151' }}>Nascimento:</strong> {formatDate(eleitor.nascimento)}
              </div>
              <div>
                <strong style={{ color: '#374151' }}>Gênero:</strong> {eleitor.genero || '-'}
              </div>
              <div>
                <strong style={{ color: '#374151' }}>Nome da Mãe:</strong> {eleitor.nome_mae || '-'}
              </div>
            </div>
          </div>

          {/* Contato */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ 
              fontSize: '14pt',
              fontWeight: 'bold',
              color: '#1e40af',
              marginBottom: '12px',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '5px'
            }}>
              📞 Contato
            </h2>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px 20px'
            }}>
              <div>
                <strong style={{ color: '#374151' }}>WhatsApp:</strong> {eleitor.whatsapp || '-'}
              </div>
              <div>
                <strong style={{ color: '#374151' }}>Telefone:</strong> {eleitor.telefone || '-'}
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ 
              fontSize: '14pt',
              fontWeight: 'bold',
              color: '#1e40af',
              marginBottom: '12px',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '5px'
            }}>
              📍 Endereço
            </h2>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '12px 20px'
            }}>
              <div>
                <strong style={{ color: '#374151' }}>Logradouro:</strong> {eleitor.logradouro || '-'}, {eleitor.numero || 'S/N'}
                {eleitor.complemento && ` - ${eleitor.complemento}`}
              </div>
              <div>
                <strong style={{ color: '#374151' }}>CEP:</strong> {eleitor.cep || '-'}
              </div>
              <div>
                <strong style={{ color: '#374151' }}>Bairro:</strong> {eleitor.bairro || '-'}
              </div>
              <div>
                <strong style={{ color: '#374151' }}>Cidade/UF:</strong> {eleitor.cidade || '-'}/{eleitor.uf || '-'}
              </div>
            </div>
          </div>

          {/* Dados Eleitorais */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ 
              fontSize: '14pt',
              fontWeight: 'bold',
              color: '#1e40af',
              marginBottom: '12px',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '5px'
            }}>
              🗳️ Dados Eleitorais
            </h2>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '12px 20px'
            }}>
              <div>
                <strong style={{ color: '#374151' }}>Título:</strong> {eleitor.titulo || '-'}
              </div>
              <div>
                <strong style={{ color: '#374151' }}>Zona:</strong> {eleitor.zona || '-'}
              </div>
              <div>
                <strong style={{ color: '#374151' }}>Seção:</strong> {eleitor.secao || '-'}
              </div>
              <div>
                <strong style={{ color: '#374151' }}>Colégio Eleitoral:</strong> {eleitor.colegio_eleitoral || '-'}
              </div>
              <div>
                <strong style={{ color: '#374151' }}>Categoria:</strong> {eleitor.gbp_categorias?.nome || '-'}
              </div>
              <div>
                <strong style={{ color: '#374151' }}>Indicado por:</strong> {eleitor.gbp_indicado?.nome || '-'}
              </div>
            </div>
          </div>

          {/* Informações Adicionais */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ 
              fontSize: '14pt',
              fontWeight: 'bold',
              color: '#1e40af',
              marginBottom: '12px',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '5px'
            }}>
              ℹ️ Informações Adicionais
            </h2>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '12px 20px'
            }}>
              <div>
                <strong style={{ color: '#374151' }}>Número do SUS:</strong> {eleitor.numero_do_sus || '-'}
              </div>
              <div>
                <strong style={{ color: '#374151' }}>Instagram:</strong> {eleitor.instagram || '-'}
              </div>
              <div>
                <strong style={{ color: '#374151' }}>Confiabilidade:</strong> {eleitor.confiabilidade_do_voto || '-'}
              </div>
              <div>
                <strong style={{ color: '#374151' }}>Responsável pelo Eleitor:</strong> {eleitor.responsavel_pelo_eleitor || '-'}
              </div>
              <div>
                <strong style={{ color: '#374151' }}>Qtd Adultos na Residência:</strong> {eleitor.quantidade_adultos_residencia || '-'}
              </div>
            </div>
          </div>

          {/* Atendimentos */}
          {atendimentos && atendimentos.length > 0 && (
            <div style={{ marginTop: '30px', pageBreakBefore: 'auto' }}>
              <h2 style={{ 
                fontSize: '14pt',
                fontWeight: 'bold',
                color: '#1e40af',
                marginBottom: '12px',
                borderBottom: '2px solid #e5e7eb',
                paddingBottom: '5px'
              }}>
                📝 Histórico de Atendimentos ({atendimentos.length})
              </h2>
              <table style={{ 
                width: '100%',
                borderCollapse: 'collapse',
                marginTop: '10px',
                fontSize: '10pt'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ 
                      border: '1px solid #d1d5db',
                      padding: '8px',
                      textAlign: 'left',
                      fontWeight: 'bold'
                    }}>Nº</th>
                    <th style={{ 
                      border: '1px solid #d1d5db',
                      padding: '8px',
                      textAlign: 'left',
                      fontWeight: 'bold'
                    }}>Data</th>
                    <th style={{ 
                      border: '1px solid #d1d5db',
                      padding: '8px',
                      textAlign: 'left',
                      fontWeight: 'bold'
                    }}>Categoria</th>
                    <th style={{ 
                      border: '1px solid #d1d5db',
                      padding: '8px',
                      textAlign: 'left',
                      fontWeight: 'bold'
                    }}>Descrição</th>
                    <th style={{ 
                      border: '1px solid #d1d5db',
                      padding: '8px',
                      textAlign: 'left',
                      fontWeight: 'bold'
                    }}>Status</th>
                    <th style={{ 
                      border: '1px solid #d1d5db',
                      padding: '8px',
                      textAlign: 'left',
                      fontWeight: 'bold'
                    }}>Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {atendimentos.map((atendimento, index) => (
                    <tr key={atendimento.uid} style={{ 
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb'
                    }}>
                      <td style={{ 
                        border: '1px solid #d1d5db',
                        padding: '8px'
                      }}>#{atendimento.numero}</td>
                      <td style={{ 
                        border: '1px solid #d1d5db',
                        padding: '8px'
                      }}>{formatDate(atendimento.data_atendimento)}</td>
                      <td style={{ 
                        border: '1px solid #d1d5db',
                        padding: '8px'
                      }}>{atendimento.gbp_categorias?.nome || '-'}</td>
                      <td style={{ 
                        border: '1px solid #d1d5db',
                        padding: '8px',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{atendimento.descricao}</td>
                      <td style={{ 
                        border: '1px solid #d1d5db',
                        padding: '8px'
                      }}>
                        <span style={{ 
                          color: getStatusColor(atendimento.status),
                          fontWeight: 'bold'
                        }}>
                          {atendimento.status}
                        </span>
                      </td>
                      <td style={{ 
                        border: '1px solid #d1d5db',
                        padding: '8px'
                      }}>{atendimento.responsavel?.nome || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Ofícios */}
          {oficios && oficios.length > 0 && (
            <div style={{ marginTop: '30px', pageBreakBefore: 'auto' }}>
              <h2 style={{ 
                fontSize: '14pt',
                fontWeight: 'bold',
                color: '#1e40af',
                marginBottom: '12px',
                borderBottom: '2px solid #e5e7eb',
                paddingBottom: '5px'
              }}>
                📄 Ofícios Relacionados ({oficios.length})
              </h2>
              <table style={{ 
                width: '100%',
                borderCollapse: 'collapse',
                marginTop: '10px',
                fontSize: '10pt'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ 
                      border: '1px solid #d1d5db',
                      padding: '8px',
                      textAlign: 'left',
                      fontWeight: 'bold'
                    }}>Nº Ofício</th>
                    <th style={{ 
                      border: '1px solid #d1d5db',
                      padding: '8px',
                      textAlign: 'left',
                      fontWeight: 'bold'
                    }}>Data</th>
                    <th style={{ 
                      border: '1px solid #d1d5db',
                      padding: '8px',
                      textAlign: 'left',
                      fontWeight: 'bold'
                    }}>Tipo</th>
                    <th style={{ 
                      border: '1px solid #d1d5db',
                      padding: '8px',
                      textAlign: 'left',
                      fontWeight: 'bold'
                    }}>Descrição</th>
                    <th style={{ 
                      border: '1px solid #d1d5db',
                      padding: '8px',
                      textAlign: 'left',
                      fontWeight: 'bold'
                    }}>Status</th>
                    <th style={{ 
                      border: '1px solid #d1d5db',
                      padding: '8px',
                      textAlign: 'left',
                      fontWeight: 'bold'
                    }}>Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {oficios.map((oficio, index) => (
                    <tr key={oficio.uid} style={{ 
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb'
                    }}>
                      <td style={{ 
                        border: '1px solid #d1d5db',
                        padding: '8px'
                      }}>{oficio.numero_oficio || '-'}</td>
                      <td style={{ 
                        border: '1px solid #d1d5db',
                        padding: '8px'
                      }}>{formatDate(oficio.data_solicitacao)}</td>
                      <td style={{ 
                        border: '1px solid #d1d5db',
                        padding: '8px'
                      }}>{oficio.tipo_de_demanda || '-'}</td>
                      <td style={{ 
                        border: '1px solid #d1d5db',
                        padding: '8px',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        <div>{oficio.descricao}</div>
                        {oficio.descricao_do_problema && (
                          <div style={{ 
                            marginTop: '4px',
                            fontSize: '9pt',
                            color: '#6b7280',
                            fontStyle: 'italic'
                          }}>
                            Problema: {oficio.descricao_do_problema}
                          </div>
                        )}
                      </td>
                      <td style={{ 
                        border: '1px solid #d1d5db',
                        padding: '8px'
                      }}>
                        <span style={{ 
                          color: getStatusColor(oficio.status),
                          fontWeight: 'bold'
                        }}>
                          {oficio.status}
                        </span>
                      </td>
                      <td style={{ 
                        border: '1px solid #d1d5db',
                        padding: '8px'
                      }}>{oficio.responsavel_nome || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Rodapé */}
          <div style={{ 
            marginTop: '30px',
            paddingTop: '15px',
            borderTop: '1px solid #e5e7eb',
            fontSize: '9pt',
            color: '#6b7280',
            textAlign: 'center'
          }}>
            Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 1.5cm;
          }

          body * {
            visibility: hidden;
          }

          .print-content,
          .print-content * {
            visibility: visible;
          }

          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          /* Evitar quebra de página dentro de seções */
          .print-content > div {
            page-break-inside: avoid;
          }

          /* Força quebra de página antes dos atendimentos se necessário */
          .print-content table {
            page-break-inside: auto;
          }

          .print-content tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>
    </>
  );
};

export default PrintEleitor;
