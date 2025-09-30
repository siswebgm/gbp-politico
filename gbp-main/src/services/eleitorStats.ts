import { supabaseClient } from "../lib/supabase";

// Função para converter números romanos para arábicos
const romanToArabic = (str: string): string => {
  const romanMap: Record<string, number> = {
    i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000
  };
  
  // Verifica se a string contém apenas caracteres de números romanos
  if (!/^[ivxlcdmIVXLCDM]+$/.test(str)) {
    return str; // Retorna o original se não for um número romano válido
  }
  
  str = str.toLowerCase();
  let result = 0;
  let previous = 0;
  
  for (let i = str.length - 1; i >= 0; i--) {
    const current = romanMap[str[i]];
    if (current >= previous) {
      result += current;
    } else {
      result -= current;
    }
    previous = current;
  }
  
  return result.toString();
};

// Função para normalizar textos (remover acentos, converter para minúsculos e normalizar números romanos)
const normalizeText = (text: string): string => {
  // Primeiro converte números romanos para arábicos
  const parts = text.split(/(\s+)/);
  const normalizedParts = parts.map(part => {
    // Se a parte for apenas letras romanas (I, V, X, L, C, D, M) e tiver até 10 caracteres
    if (/^[ivxlcdmIVXLCDM]{1,10}$/.test(part)) {
      return romanToArabic(part);
    }
    return part;
  });
  
  // Depois aplica a normalização padrão
  return normalizedParts.join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

export interface EleitorStats {
  totalEleitores: number;
  porCidade: {
    cidade: string;
    total: number;
  }[];
  porBairro: {
    cidade: string;
    bairro: string;
    total: number;
  }[];
  porZonaSecao: {
    zona: string;
    secao: string;
    total: number;
  }[];
  porMes: {
    mes: string;
    total: number;
  }[];
  porUsuario: {
    usuario_nome: string;
    total: number;
  }[];
  porIndicado: {
    indicado_nome: string;
    total: number;
  }[];
  porConfiabilidade: {
    confiabilidade: string;
    total: number;
  }[];
  topEleitoresAtendimentos: {
    uid: string;
    eleitor_nome: string;
    total_atendimentos: number;
    whatsapp?: string;
  }[];
}

export const eleitorStatsService = {
  async getStats(empresa_uid: string): Promise<EleitorStats> {
    if (!empresa_uid) {
      throw new Error('empresa_uid é obrigatório');
    }

    try {
      console.log('Iniciando busca de estatísticas para empresa:', empresa_uid);

      // Total de eleitores
      const { count: totalEleitores, error: countError } = await supabaseClient
        .from('gbp_eleitores')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_uid', empresa_uid);

      if (countError) {
        console.error('Erro ao buscar total de eleitores:', countError);
        throw countError;
      }

      console.log('Total de eleitores encontrados:', totalEleitores);

      // Buscar todos os eleitores de uma vez
      const { data: eleitoresData, error: eleitoresError } = await supabaseClient
        .from('gbp_eleitores')
        .select(`
          cidade,
          bairro,
          zona,
          secao,
          confiabilidade_do_voto,
          usuario:usuario_uid (
            uid,
            nome
          ),
          indicado:indicado_uid (
            uid,
            nome
          )
        `)
        .eq('empresa_uid', empresa_uid);

      if (eleitoresError) {
        console.error('Erro ao buscar dados dos eleitores:', eleitoresError);
        throw eleitoresError;
      }

      console.log('Dados dos eleitores recebidos:', eleitoresData?.length || 0, 'registros');

      // Processar cidades (com normalização)
      const cidadesMap = new Map<string, { nomeOriginal: string; total: number }>();
      eleitoresData?.forEach(eleitor => {
        if (eleitor.cidade) {
          const cidadeNormalizada = normalizeText(eleitor.cidade);
          const cidadeExistente = Array.from(cidadesMap.entries())
            .find(([key]) => normalizeText(key) === cidadeNormalizada);
          
          if (cidadeExistente) {
            // Se já existe uma cidade com o mesmo nome normalizado, incrementa o total
            const [_, cidade] = cidadeExistente;
            cidade.total += 1;
            cidadesMap.set(cidade.nomeOriginal, cidade);
          } else {
            // Se é uma cidade nova, adiciona ao mapa
            cidadesMap.set(eleitor.cidade, { 
              nomeOriginal: eleitor.cidade, 
              total: 1 
            });
          }
        }
      });

      const porCidade = Array.from(cidadesMap.values())
        .map(({ nomeOriginal, total }) => ({ cidade: nomeOriginal, total }))
        .sort((a, b) => b.total - a.total);

      console.log('Cidades processadas:', porCidade.length);

      // Processar bairros (com normalização)
      const bairrosMap = new Map<string, { 
        cidade: string; 
        bairro: string; 
        cidadeNormalizada: string;
        bairroNormalizado: string;
        total: number 
      }>();
      
      eleitoresData?.forEach(eleitor => {
        if (eleitor.cidade && eleitor.bairro) {
          const cidadeNormalizada = normalizeText(eleitor.cidade);
          const bairroNormalizado = normalizeText(eleitor.bairro);
          
          // Procurar por bairro existente com mesmo nome normalizado na mesma cidade
          const bairroExistente = Array.from(bairrosMap.values())
            .find(b => 
              b.cidadeNormalizada === cidadeNormalizada && 
              b.bairroNormalizado === bairroNormalizado
            );
          
          if (bairroExistente) {
            // Se já existe um bairro com o mesmo nome normalizado na mesma cidade, incrementa o total
            bairroExistente.total += 1;
            bairrosMap.set(`${bairroExistente.cidade}|${bairroExistente.bairro}`, bairroExistente);
          } else {
            // Se é um bairro novo, adiciona ao mapa
            const key = `${eleitor.cidade}|${eleitor.bairro}`;
            bairrosMap.set(key, { 
              cidade: eleitor.cidade, 
              bairro: eleitor.bairro,
              cidadeNormalizada,
              bairroNormalizado,
              total: 1 
            });
          }
        }
      });

      const porBairro = Array.from(bairrosMap.values())
        .map(({ cidade, bairro, total }) => ({ cidade, bairro, total }))
        .sort((a, b) => b.total - a.total);

      console.log('Bairros processados:', porBairro.length);

      // Processar zonas e seções
      const zonasMap = new Map<string, { zona: string; secao: string; total: number }>();
      eleitoresData?.forEach(eleitor => {
        if (eleitor.zona && eleitor.secao) {
          const key = `${eleitor.zona}|${eleitor.secao}`;
          const existing = zonasMap.get(key) || { zona: eleitor.zona, secao: eleitor.secao, total: 0 };
          existing.total += 1;
          zonasMap.set(key, existing);
        }
      });

      const porZonaSecao = Array.from(zonasMap.values())
        .sort((a, b) => b.total - a.total);

      console.log('Zonas e seções processadas:', porZonaSecao.length);

      // Processar usuários
      const usuariosMap = new Map<string, { usuario_nome: string; total: number }>();
      eleitoresData?.forEach(eleitor => {
        if (eleitor.usuario?.nome) {
          const nome = eleitor.usuario.nome;
          const existing = usuariosMap.get(nome) || { usuario_nome: nome, total: 0 };
          existing.total += 1;
          usuariosMap.set(nome, existing);
        }
      });

      const porUsuario = Array.from(usuariosMap.values())
        .sort((a, b) => b.total - a.total);

      console.log('Usuários processados:', porUsuario.length);

      // Processar indicados
      const indicadosMap = new Map<string, { indicado_nome: string; total: number }>();
      eleitoresData?.forEach(eleitor => {
        if (eleitor.indicado?.nome) {
          const nome = eleitor.indicado.nome;
          const existing = indicadosMap.get(nome) || { indicado_nome: nome, total: 0 };
          existing.total += 1;
          indicadosMap.set(nome, existing);
        }
      });

      const porIndicado = Array.from(indicadosMap.values())
        .sort((a, b) => b.total - a.total);

      console.log('Indicados processados:', porIndicado.length);

      // Processar confiabilidade do voto
      const confiabilidadeMap = new Map<string, { confiabilidade: string; total: number }>();
      eleitoresData?.forEach(eleitor => {
        if (eleitor.confiabilidade_do_voto) {
          const existing = confiabilidadeMap.get(eleitor.confiabilidade_do_voto) || { 
            confiabilidade: eleitor.confiabilidade_do_voto, 
            total: 0 
          };
          existing.total += 1;
          confiabilidadeMap.set(eleitor.confiabilidade_do_voto, existing);
        }
      });

      const porConfiabilidade = Array.from(confiabilidadeMap.values())
        .sort((a, b) => b.total - a.total);

      console.log('Confiabilidade processada:', porConfiabilidade.length);

      // Inicializar array vazio para os top eleitores
      let topEleitoresAtendimentos: any[] = [];
      
      try {
        // Buscar contagem de atendimentos por eleitor usando SQL direto
        const { data: atendimentosCount, error: atendimentosError } = await supabaseClient
          .rpc('get_top_eleitores_atendimentos', {
            p_empresa_uid: empresa_uid,
            p_limit: 20
          });

        if (atendimentosError) {
          console.error('Erro ao buscar atendimentos:', atendimentosError);
          // Não lançar erro, apenas logar e continuar com array vazio
        } else if (atendimentosCount) {
          topEleitoresAtendimentos = atendimentosCount;
        }
      } catch (error) {
        console.error('Erro ao processar atendimentos:', error);
        // Continuar com array vazio em caso de erro
      }

      // Buscar detalhes dos eleitores com mais atendimentos
      let topEleitoresDetalhes: any[] = [];
      
      if (topEleitoresAtendimentos && topEleitoresAtendimentos.length > 0) {
        try {
          // Filtrar apenas UIDs válidos
          const eleitoresUids = topEleitoresAtendimentos
            .map((e: any) => e.eleitor_uid)
            .filter((uid: string | null) => uid && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uid));
          
          if (eleitoresUids.length > 0) {
            const { data: eleitoresDetalhes, error: detalhesError } = await supabaseClient
              .from('gbp_eleitores')
              .select('uid, nome, whatsapp')
              .in('uid', eleitoresUids);

            if (detalhesError) {
              console.error('Erro ao buscar detalhes dos eleitores:', detalhesError);
              // Continuar com os dados básicos em caso de erro
              topEleitoresDetalhes = topEleitoresAtendimentos.map((atendimento: any) => ({
                uid: atendimento.eleitor_uid,
                eleitor_nome: 'Nome não disponível',
                total_atendimentos: Number(atendimento.total_atendimentos) || 0,
                whatsapp: null
              }));
            } else {
              // Combinar dados de atendimento com detalhes dos eleitores
              topEleitoresDetalhes = topEleitoresAtendimentos.map((atendimento: any) => {
                const detalhe = eleitoresDetalhes?.find((e: any) => e.uid === atendimento.eleitor_uid);
                return {
                  uid: atendimento.eleitor_uid,
                  eleitor_nome: detalhe?.nome || 'Nome não disponível',
                  total_atendimentos: Number(atendimento.total_atendimentos) || 0,
                  whatsapp: detalhe?.whatsapp || null
                };
              });
            }
          }
        } catch (error) {
          console.error('Erro ao processar detalhes dos eleitores:', error);
          // Em caso de erro, retornar dados básicos
          topEleitoresDetalhes = topEleitoresAtendimentos.map((atendimento: any) => ({
            uid: atendimento.eleitor_uid,
            eleitor_nome: 'Erro ao carregar',
            total_atendimentos: Number(atendimento.total_atendimentos) || 0,
            whatsapp: null
          }));
        }
      }

      // Montar o objeto de estatísticas
      const stats: EleitorStats = {
        totalEleitores: totalEleitores || 0,
        porCidade,
        porBairro,
        porZonaSecao,
        porMes: [], // Mantido para compatibilidade
        porUsuario,
        porIndicado,
        porConfiabilidade,
        topEleitoresAtendimentos: topEleitoresDetalhes
      };

      console.log('Estatísticas processadas com sucesso:', stats);
      return stats;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw error;
    }
  }
};
