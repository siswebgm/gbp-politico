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

export interface CidadeCrescimento {
  cidade: string;
  total_atual: number;
  novos_mes_atual: number;
  novos_mes_anterior: number;
  crescimento_mensal: number;
  crescimento_mensal_percentual: number;
  novos_ano_atual: number;
  novos_ano_anterior: number;
  crescimento_anual: number;
  crescimento_anual_percentual: number;
}

export interface IndicadoCrescimento {
  indicado_nome: string;
  indicado_uid: string;
  total_atual: number;
  novos_mes_atual: number;
  novos_mes_anterior: number;
  crescimento_mensal: number;
  crescimento_mensal_percentual: number;
  novos_ano_atual: number;
  novos_ano_anterior: number;
  crescimento_anual: number;
  crescimento_anual_percentual: number;
}

export interface CategoriaCrescimento {
  categoria_nome: string;
  categoria_uid: string;
  total_atual: number;
  novos_mes_atual: number;
  novos_mes_anterior: number;
  crescimento_mensal: number;
  crescimento_mensal_percentual: number;
  novos_ano_atual: number;
  novos_ano_anterior: number;
  crescimento_anual: number;
  crescimento_anual_percentual: number;
}

export interface BairroCrescimento {
  cidade: string;
  bairro: string;
  total_atual: number;
  novos_mes_atual: number;
  novos_mes_anterior: number;
  crescimento_mensal: number;
  crescimento_mensal_percentual: number;
  novos_ano_atual: number;
  novos_ano_anterior: number;
  crescimento_anual: number;
  crescimento_anual_percentual: number;
}

export interface ZonaSecaoCrescimento {
  zona: string;
  secao: string;
  total_atual: number;
  novos_mes_atual: number;
  novos_mes_anterior: number;
  crescimento_mensal: number;
  crescimento_mensal_percentual: number;
  novos_ano_atual: number;
  novos_ano_anterior: number;
  crescimento_anual: number;
  crescimento_anual_percentual: number;
}

export interface ConfiabilidadeCrescimento {
  confiabilidade: string;
  total_atual: number;
  novos_mes_atual: number;
  novos_mes_anterior: number;
  crescimento_mensal: number;
  crescimento_mensal_percentual: number;
  novos_ano_atual: number;
  novos_ano_anterior: number;
  crescimento_anual: number;
  crescimento_anual_percentual: number;
}

export interface UsuarioCrescimento {
  usuario_nome: string;
  usuario_uid: string;
  total_atual: number;
  novos_mes_atual: number;
  novos_mes_anterior: number;
  crescimento_mensal: number;
  crescimento_mensal_percentual: number;
  novos_ano_atual: number;
  novos_ano_anterior: number;
  crescimento_anual: number;
  crescimento_anual_percentual: number;
}

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
  async getCrescimentoPorUsuario(empresa_uid: string): Promise<UsuarioCrescimento[]> {
    if (!empresa_uid) {
      throw new Error('empresa_uid é obrigatório');
    }

    try {
      const now = new Date();
      const mesAtual = now.getMonth() + 1;
      const anoAtual = now.getFullYear();
      const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
      const anoMesAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;
      const anoAnterior = anoAtual - 1;

      // Buscar todos os eleitores com usuario_uid e created_at
      const { data: eleitores, error: eleitoresError } = await supabaseClient
        .from('gbp_eleitores')
        .select('usuario_uid, created_at')
        .eq('empresa_uid', empresa_uid)
        .not('usuario_uid', 'is', null);

      if (eleitoresError) throw eleitoresError;

      // Buscar informações dos usuários
      const usuarioUids = [...new Set(eleitores?.map(e => e.usuario_uid).filter(Boolean))];
      
      const { data: usuarios, error: usuariosError } = await supabaseClient
        .from('gbp_usuarios')
        .select('uid, nome')
        .in('uid', usuarioUids);

      if (usuariosError) throw usuariosError;

      // Criar mapa de usuários para lookup rápido
      const usuariosMapLookup = new Map(usuarios?.map(u => [u.uid, u.nome]) || []);

      // Processar dados por usuário
      const usuariosMap = new Map<string, {
        usuario_nome: string;
        total_atual: number;
        novos_mes_atual: number;
        novos_mes_anterior: number;
        novos_ano_atual: number;
        novos_ano_anterior: number;
      }>();

      eleitores?.forEach(eleitor => {
        if (!eleitor.usuario_uid) return;

        const usuarioUid = eleitor.usuario_uid;
        const usuarioNome = usuariosMapLookup.get(usuarioUid) || 'Usuário Desconhecido';
        const createdAt = new Date(eleitor.created_at);
        const mes = createdAt.getMonth() + 1;
        const ano = createdAt.getFullYear();

        // Encontrar usuário existente ou criar novo
        let usuarioData = usuariosMap.get(usuarioUid);

        if (!usuarioData) {
          usuariosMap.set(usuarioUid, {
            usuario_nome: usuarioNome,
            total_atual: 0,
            novos_mes_atual: 0,
            novos_mes_anterior: 0,
            novos_ano_atual: 0,
            novos_ano_anterior: 0
          });
          usuarioData = usuariosMap.get(usuarioUid)!;
        }

        // Total atual
        usuarioData.total_atual++;

        // Novos no mês atual
        if (ano === anoAtual && mes === mesAtual) {
          usuarioData.novos_mes_atual++;
        }

        // Novos no mês anterior
        if (ano === anoMesAnterior && mes === mesAnterior) {
          usuarioData.novos_mes_anterior++;
        }

        // Novos no ano atual
        if (ano === anoAtual) {
          usuarioData.novos_ano_atual++;
        }

        // Novos no ano anterior
        if (ano === anoAnterior) {
          usuarioData.novos_ano_anterior++;
        }
      });

      // Calcular crescimentos e montar array final
      const crescimento: UsuarioCrescimento[] = Array.from(usuariosMap.entries())
        .map(([usuario_uid, dados]) => {
          const crescimento_mensal = dados.novos_mes_atual - dados.novos_mes_anterior;
          const crescimento_mensal_percentual = dados.novos_mes_anterior > 0
            ? ((crescimento_mensal / dados.novos_mes_anterior) * 100)
            : (dados.novos_mes_atual > 0 ? 100 : 0);

          const crescimento_anual = dados.novos_ano_atual - dados.novos_ano_anterior;
          const crescimento_anual_percentual = dados.novos_ano_anterior > 0
            ? ((crescimento_anual / dados.novos_ano_anterior) * 100)
            : (dados.novos_ano_atual > 0 ? 100 : 0);

          return {
            usuario_uid,
            usuario_nome: dados.usuario_nome,
            total_atual: dados.total_atual,
            novos_mes_atual: dados.novos_mes_atual,
            novos_mes_anterior: dados.novos_mes_anterior,
            crescimento_mensal,
            crescimento_mensal_percentual,
            novos_ano_atual: dados.novos_ano_atual,
            novos_ano_anterior: dados.novos_ano_anterior,
            crescimento_anual,
            crescimento_anual_percentual
          };
        })
        .sort((a, b) => {
          // Ordenar por crescimento absoluto (mais relevante estrategicamente)
          // Se empate, ordenar por percentual
          if (b.crescimento_anual !== a.crescimento_anual) {
            return b.crescimento_anual - a.crescimento_anual;
          }
          return b.crescimento_anual_percentual - a.crescimento_anual_percentual;
        });

      return crescimento;
    } catch (error) {
      console.error('Erro ao buscar crescimento por usuário:', error);
      throw error;
    }
  },

  async getCrescimentoPorConfiabilidade(empresa_uid: string): Promise<ConfiabilidadeCrescimento[]> {
    if (!empresa_uid) {
      throw new Error('empresa_uid é obrigatório');
    }

    try {
      const now = new Date();
      const mesAtual = now.getMonth() + 1;
      const anoAtual = now.getFullYear();
      const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
      const anoMesAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;
      const anoAnterior = anoAtual - 1;

      // Buscar todos os eleitores com confiabilidade_do_voto e created_at
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('confiabilidade_do_voto, created_at')
        .eq('empresa_uid', empresa_uid);

      if (error) throw error;

      // Processar dados por confiabilidade
      const confiabilidadesMap = new Map<string, {
        total_atual: number;
        novos_mes_atual: number;
        novos_mes_anterior: number;
        novos_ano_atual: number;
        novos_ano_anterior: number;
      }>();

      eleitores?.forEach(eleitor => {
        const confiabilidade = eleitor.confiabilidade_do_voto || 'Não informado';
        const createdAt = new Date(eleitor.created_at);
        const mes = createdAt.getMonth() + 1;
        const ano = createdAt.getFullYear();

        // Encontrar confiabilidade existente ou criar nova
        let confiabilidadeData = confiabilidadesMap.get(confiabilidade);

        if (!confiabilidadeData) {
          confiabilidadesMap.set(confiabilidade, {
            total_atual: 0,
            novos_mes_atual: 0,
            novos_mes_anterior: 0,
            novos_ano_atual: 0,
            novos_ano_anterior: 0
          });
          confiabilidadeData = confiabilidadesMap.get(confiabilidade)!;
        }

        // Total atual
        confiabilidadeData.total_atual++;

        // Novos no mês atual
        if (ano === anoAtual && mes === mesAtual) {
          confiabilidadeData.novos_mes_atual++;
        }

        // Novos no mês anterior
        if (ano === anoMesAnterior && mes === mesAnterior) {
          confiabilidadeData.novos_mes_anterior++;
        }

        // Novos no ano atual
        if (ano === anoAtual) {
          confiabilidadeData.novos_ano_atual++;
        }

        // Novos no ano anterior
        if (ano === anoAnterior) {
          confiabilidadeData.novos_ano_anterior++;
        }
      });

      // Calcular crescimentos e montar array final
      const crescimento: ConfiabilidadeCrescimento[] = Array.from(confiabilidadesMap.entries())
        .map(([confiabilidade, dados]) => {
          const crescimento_mensal = dados.novos_mes_atual - dados.novos_mes_anterior;
          const crescimento_mensal_percentual = dados.novos_mes_anterior > 0
            ? ((crescimento_mensal / dados.novos_mes_anterior) * 100)
            : (dados.novos_mes_atual > 0 ? 100 : 0);

          const crescimento_anual = dados.novos_ano_atual - dados.novos_ano_anterior;
          const crescimento_anual_percentual = dados.novos_ano_anterior > 0
            ? ((crescimento_anual / dados.novos_ano_anterior) * 100)
            : (dados.novos_ano_atual > 0 ? 100 : 0);

          return {
            confiabilidade,
            total_atual: dados.total_atual,
            novos_mes_atual: dados.novos_mes_atual,
            novos_mes_anterior: dados.novos_mes_anterior,
            crescimento_mensal,
            crescimento_mensal_percentual,
            novos_ano_atual: dados.novos_ano_atual,
            novos_ano_anterior: dados.novos_ano_anterior,
            crescimento_anual,
            crescimento_anual_percentual
          };
        })
        .sort((a, b) => {
          // Ordenar por crescimento absoluto (mais relevante estrategicamente)
          // Se empate, ordenar por percentual
          if (b.crescimento_anual !== a.crescimento_anual) {
            return b.crescimento_anual - a.crescimento_anual;
          }
          return b.crescimento_anual_percentual - a.crescimento_anual_percentual;
        });

      return crescimento;
    } catch (error) {
      console.error('Erro ao buscar crescimento por confiabilidade:', error);
      throw error;
    }
  },

  async getCrescimentoPorZonaSecao(empresa_uid: string): Promise<ZonaSecaoCrescimento[]> {
    if (!empresa_uid) {
      throw new Error('empresa_uid é obrigatório');
    }

    try {
      const now = new Date();
      const mesAtual = now.getMonth() + 1;
      const anoAtual = now.getFullYear();
      const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
      const anoMesAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;
      const anoAnterior = anoAtual - 1;

      // Buscar todos os eleitores com zona, seção e created_at
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('zona, secao, created_at')
        .eq('empresa_uid', empresa_uid);

      if (error) throw error;

      // Processar dados por zona e seção
      const zonasSecoesMap = new Map<string, {
        zona: string;
        secao: string;
        total_atual: number;
        novos_mes_atual: number;
        novos_mes_anterior: number;
        novos_ano_atual: number;
        novos_ano_anterior: number;
      }>();

      eleitores?.forEach(eleitor => {
        if (!eleitor.zona || !eleitor.secao) return;

        const chave = `${eleitor.zona}_${eleitor.secao}`;
        const createdAt = new Date(eleitor.created_at);
        const mes = createdAt.getMonth() + 1;
        const ano = createdAt.getFullYear();

        // Encontrar zona/seção existente ou criar nova
        let zonaSecaoData = zonasSecoesMap.get(chave);

        if (!zonaSecaoData) {
          zonasSecoesMap.set(chave, {
            zona: eleitor.zona,
            secao: eleitor.secao,
            total_atual: 0,
            novos_mes_atual: 0,
            novos_mes_anterior: 0,
            novos_ano_atual: 0,
            novos_ano_anterior: 0
          });
          zonaSecaoData = zonasSecoesMap.get(chave)!;
        }

        // Total atual
        zonaSecaoData.total_atual++;

        // Novos no mês atual
        if (ano === anoAtual && mes === mesAtual) {
          zonaSecaoData.novos_mes_atual++;
        }

        // Novos no mês anterior
        if (ano === anoMesAnterior && mes === mesAnterior) {
          zonaSecaoData.novos_mes_anterior++;
        }

        // Novos no ano atual
        if (ano === anoAtual) {
          zonaSecaoData.novos_ano_atual++;
        }

        // Novos no ano anterior
        if (ano === anoAnterior) {
          zonaSecaoData.novos_ano_anterior++;
        }
      });

      // Calcular crescimentos e montar array final
      const crescimento: ZonaSecaoCrescimento[] = Array.from(zonasSecoesMap.values())
        .map((dados) => {
          const crescimento_mensal = dados.novos_mes_atual - dados.novos_mes_anterior;
          const crescimento_mensal_percentual = dados.novos_mes_anterior > 0
            ? ((crescimento_mensal / dados.novos_mes_anterior) * 100)
            : (dados.novos_mes_atual > 0 ? 100 : 0);

          const crescimento_anual = dados.novos_ano_atual - dados.novos_ano_anterior;
          const crescimento_anual_percentual = dados.novos_ano_anterior > 0
            ? ((crescimento_anual / dados.novos_ano_anterior) * 100)
            : (dados.novos_ano_atual > 0 ? 100 : 0);

          return {
            zona: dados.zona,
            secao: dados.secao,
            total_atual: dados.total_atual,
            novos_mes_atual: dados.novos_mes_atual,
            novos_mes_anterior: dados.novos_mes_anterior,
            crescimento_mensal,
            crescimento_mensal_percentual,
            novos_ano_atual: dados.novos_ano_atual,
            novos_ano_anterior: dados.novos_ano_anterior,
            crescimento_anual,
            crescimento_anual_percentual
          };
        })
        .sort((a, b) => {
          // Ordenar por crescimento absoluto (mais relevante estrategicamente)
          // Se empate, ordenar por percentual
          if (b.crescimento_anual !== a.crescimento_anual) {
            return b.crescimento_anual - a.crescimento_anual;
          }
          return b.crescimento_anual_percentual - a.crescimento_anual_percentual;
        });

      return crescimento;
    } catch (error) {
      console.error('Erro ao buscar crescimento por zona e seção:', error);
      throw error;
    }
  },

  async getCrescimentoPorBairro(empresa_uid: string): Promise<BairroCrescimento[]> {
    if (!empresa_uid) {
      throw new Error('empresa_uid é obrigatório');
    }

    try {
      const now = new Date();
      const mesAtual = now.getMonth() + 1;
      const anoAtual = now.getFullYear();
      const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
      const anoMesAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;
      const anoAnterior = anoAtual - 1;

      // Buscar todos os eleitores com bairro e created_at
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('cidade, bairro, created_at')
        .eq('empresa_uid', empresa_uid);

      if (error) throw error;

      // Processar dados por bairro
      const bairrosMap = new Map<string, {
        cidade: string;
        bairro: string;
        total_atual: number;
        novos_mes_atual: number;
        novos_mes_anterior: number;
        novos_ano_atual: number;
        novos_ano_anterior: number;
      }>();

      eleitores?.forEach(eleitor => {
        if (!eleitor.cidade || !eleitor.bairro) return;

        const chave = `${normalizeText(eleitor.cidade)}_${normalizeText(eleitor.bairro)}`;
        const createdAt = new Date(eleitor.created_at);
        const mes = createdAt.getMonth() + 1;
        const ano = createdAt.getFullYear();

        // Encontrar bairro existente ou criar novo
        let bairroData = bairrosMap.get(chave);

        if (!bairroData) {
          bairrosMap.set(chave, {
            cidade: eleitor.cidade,
            bairro: eleitor.bairro,
            total_atual: 0,
            novos_mes_atual: 0,
            novos_mes_anterior: 0,
            novos_ano_atual: 0,
            novos_ano_anterior: 0
          });
          bairroData = bairrosMap.get(chave)!;
        }

        // Total atual
        bairroData.total_atual++;

        // Novos no mês atual
        if (ano === anoAtual && mes === mesAtual) {
          bairroData.novos_mes_atual++;
        }

        // Novos no mês anterior
        if (ano === anoMesAnterior && mes === mesAnterior) {
          bairroData.novos_mes_anterior++;
        }

        // Novos no ano atual
        if (ano === anoAtual) {
          bairroData.novos_ano_atual++;
        }

        // Novos no ano anterior
        if (ano === anoAnterior) {
          bairroData.novos_ano_anterior++;
        }
      });

      // Calcular crescimentos e montar array final
      const crescimento: BairroCrescimento[] = Array.from(bairrosMap.values())
        .map((dados) => {
          const crescimento_mensal = dados.novos_mes_atual - dados.novos_mes_anterior;
          const crescimento_mensal_percentual = dados.novos_mes_anterior > 0
            ? ((crescimento_mensal / dados.novos_mes_anterior) * 100)
            : (dados.novos_mes_atual > 0 ? 100 : 0);

          const crescimento_anual = dados.novos_ano_atual - dados.novos_ano_anterior;
          const crescimento_anual_percentual = dados.novos_ano_anterior > 0
            ? ((crescimento_anual / dados.novos_ano_anterior) * 100)
            : (dados.novos_ano_atual > 0 ? 100 : 0);

          return {
            cidade: dados.cidade,
            bairro: dados.bairro,
            total_atual: dados.total_atual,
            novos_mes_atual: dados.novos_mes_atual,
            novos_mes_anterior: dados.novos_mes_anterior,
            crescimento_mensal,
            crescimento_mensal_percentual,
            novos_ano_atual: dados.novos_ano_atual,
            novos_ano_anterior: dados.novos_ano_anterior,
            crescimento_anual,
            crescimento_anual_percentual
          };
        })
        .sort((a, b) => {
          // Ordenar por crescimento absoluto (mais relevante estrategicamente)
          // Se empate, ordenar por percentual
          if (b.crescimento_anual !== a.crescimento_anual) {
            return b.crescimento_anual - a.crescimento_anual;
          }
          return b.crescimento_anual_percentual - a.crescimento_anual_percentual;
        });

      return crescimento;
    } catch (error) {
      console.error('Erro ao buscar crescimento por bairro:', error);
      throw error;
    }
  },

  async getCrescimentoPorCategoria(empresa_uid: string): Promise<CategoriaCrescimento[]> {
    if (!empresa_uid) {
      throw new Error('empresa_uid é obrigatório');
    }

    try {
      const now = new Date();
      const mesAtual = now.getMonth() + 1;
      const anoAtual = now.getFullYear();
      const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
      const anoMesAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;
      const anoAnterior = anoAtual - 1;

      // Buscar todos os eleitores com categoria e created_at
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('categoria_uid, created_at, categoria:categoria_uid(uid, nome)')
        .eq('empresa_uid', empresa_uid)
        .not('categoria_uid', 'is', null);

      if (error) throw error;

      // Processar dados por categoria
      const categoriasMap = new Map<string, {
        categoria_nome: string;
        total_atual: number;
        novos_mes_atual: number;
        novos_mes_anterior: number;
        novos_ano_atual: number;
        novos_ano_anterior: number;
      }>();

      eleitores?.forEach(eleitor => {
        if (!eleitor.categoria_uid || !eleitor.categoria) return;

        const categoriaUid = eleitor.categoria_uid;
        const categoriaNome = (eleitor.categoria as any)?.nome || 'Desconhecida';
        const createdAt = new Date(eleitor.created_at);
        const mes = createdAt.getMonth() + 1;
        const ano = createdAt.getFullYear();

        // Encontrar categoria existente ou criar nova
        let categoriaData = categoriasMap.get(categoriaUid);

        if (!categoriaData) {
          categoriasMap.set(categoriaUid, {
            categoria_nome: categoriaNome,
            total_atual: 0,
            novos_mes_atual: 0,
            novos_mes_anterior: 0,
            novos_ano_atual: 0,
            novos_ano_anterior: 0
          });
          categoriaData = categoriasMap.get(categoriaUid)!;
        }

        // Total atual
        categoriaData.total_atual++;

        // Novos no mês atual
        if (ano === anoAtual && mes === mesAtual) {
          categoriaData.novos_mes_atual++;
        }

        // Novos no mês anterior
        if (ano === anoMesAnterior && mes === mesAnterior) {
          categoriaData.novos_mes_anterior++;
        }

        // Novos no ano atual
        if (ano === anoAtual) {
          categoriaData.novos_ano_atual++;
        }

        // Novos no ano anterior
        if (ano === anoAnterior) {
          categoriaData.novos_ano_anterior++;
        }
      });

      // Calcular crescimentos e montar array final
      const crescimento: CategoriaCrescimento[] = Array.from(categoriasMap.entries())
        .map(([categoria_uid, dados]) => {
          const crescimento_mensal = dados.novos_mes_atual - dados.novos_mes_anterior;
          const crescimento_mensal_percentual = dados.novos_mes_anterior > 0
            ? ((crescimento_mensal / dados.novos_mes_anterior) * 100)
            : (dados.novos_mes_atual > 0 ? 100 : 0);

          const crescimento_anual = dados.novos_ano_atual - dados.novos_ano_anterior;
          const crescimento_anual_percentual = dados.novos_ano_anterior > 0
            ? ((crescimento_anual / dados.novos_ano_anterior) * 100)
            : (dados.novos_ano_atual > 0 ? 100 : 0);

          return {
            categoria_uid,
            categoria_nome: dados.categoria_nome,
            total_atual: dados.total_atual,
            novos_mes_atual: dados.novos_mes_atual,
            novos_mes_anterior: dados.novos_mes_anterior,
            crescimento_mensal,
            crescimento_mensal_percentual,
            novos_ano_atual: dados.novos_ano_atual,
            novos_ano_anterior: dados.novos_ano_anterior,
            crescimento_anual,
            crescimento_anual_percentual
          };
        })
        .sort((a, b) => {
          // Ordenar por crescimento absoluto (mais relevante estrategicamente)
          // Se empate, ordenar por percentual
          if (b.crescimento_anual !== a.crescimento_anual) {
            return b.crescimento_anual - a.crescimento_anual;
          }
          return b.crescimento_anual_percentual - a.crescimento_anual_percentual;
        });

      return crescimento;
    } catch (error) {
      console.error('Erro ao buscar crescimento por categoria:', error);
      throw error;
    }
  },

  async getCrescimentoPorIndicado(empresa_uid: string): Promise<IndicadoCrescimento[]> {
    if (!empresa_uid) {
      throw new Error('empresa_uid é obrigatório');
    }

    try {
      const now = new Date();
      const mesAtual = now.getMonth() + 1;
      const anoAtual = now.getFullYear();
      const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
      const anoMesAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;
      const anoAnterior = anoAtual - 1;

      // Buscar todos os eleitores com indicado e created_at
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('indicado_uid, created_at, indicado:indicado_uid(uid, nome)')
        .eq('empresa_uid', empresa_uid)
        .not('indicado_uid', 'is', null);

      if (error) throw error;

      // Processar dados por indicado
      const indicadosMap = new Map<string, {
        indicado_nome: string;
        total_atual: number;
        novos_mes_atual: number;
        novos_mes_anterior: number;
        novos_ano_atual: number;
        novos_ano_anterior: number;
      }>();

      eleitores?.forEach(eleitor => {
        if (!eleitor.indicado_uid || !eleitor.indicado) return;

        const indicadoUid = eleitor.indicado_uid;
        const indicadoNome = (eleitor.indicado as any)?.nome || 'Desconhecido';
        const createdAt = new Date(eleitor.created_at);
        const mes = createdAt.getMonth() + 1;
        const ano = createdAt.getFullYear();

        // Encontrar indicado existente ou criar novo
        let indicadoData = indicadosMap.get(indicadoUid);

        if (!indicadoData) {
          indicadosMap.set(indicadoUid, {
            indicado_nome: indicadoNome,
            total_atual: 0,
            novos_mes_atual: 0,
            novos_mes_anterior: 0,
            novos_ano_atual: 0,
            novos_ano_anterior: 0
          });
          indicadoData = indicadosMap.get(indicadoUid)!;
        }

        // Total atual
        indicadoData.total_atual++;

        // Novos no mês atual
        if (ano === anoAtual && mes === mesAtual) {
          indicadoData.novos_mes_atual++;
        }

        // Novos no mês anterior
        if (ano === anoMesAnterior && mes === mesAnterior) {
          indicadoData.novos_mes_anterior++;
        }

        // Novos no ano atual
        if (ano === anoAtual) {
          indicadoData.novos_ano_atual++;
        }

        // Novos no ano anterior
        if (ano === anoAnterior) {
          indicadoData.novos_ano_anterior++;
        }
      });

      // Calcular crescimentos e montar array final
      const crescimento: IndicadoCrescimento[] = Array.from(indicadosMap.entries())
        .map(([indicado_uid, dados]) => {
          const crescimento_mensal = dados.novos_mes_atual - dados.novos_mes_anterior;
          const crescimento_mensal_percentual = dados.novos_mes_anterior > 0
            ? ((crescimento_mensal / dados.novos_mes_anterior) * 100)
            : (dados.novos_mes_atual > 0 ? 100 : 0);

          const crescimento_anual = dados.novos_ano_atual - dados.novos_ano_anterior;
          const crescimento_anual_percentual = dados.novos_ano_anterior > 0
            ? ((crescimento_anual / dados.novos_ano_anterior) * 100)
            : (dados.novos_ano_atual > 0 ? 100 : 0);

          return {
            indicado_uid,
            indicado_nome: dados.indicado_nome,
            total_atual: dados.total_atual,
            novos_mes_atual: dados.novos_mes_atual,
            novos_mes_anterior: dados.novos_mes_anterior,
            crescimento_mensal,
            crescimento_mensal_percentual,
            novos_ano_atual: dados.novos_ano_atual,
            novos_ano_anterior: dados.novos_ano_anterior,
            crescimento_anual,
            crescimento_anual_percentual
          };
        })
        .sort((a, b) => {
          // Ordenar por crescimento absoluto (mais relevante estrategicamente)
          // Se empate, ordenar por percentual
          if (b.crescimento_anual !== a.crescimento_anual) {
            return b.crescimento_anual - a.crescimento_anual;
          }
          return b.crescimento_anual_percentual - a.crescimento_anual_percentual;
        });

      return crescimento;
    } catch (error) {
      console.error('Erro ao buscar crescimento por indicado:', error);
      throw error;
    }
  },

  async getCrescimentoPorCidade(empresa_uid: string): Promise<CidadeCrescimento[]> {
    if (!empresa_uid) {
      throw new Error('empresa_uid é obrigatório');
    }

    try {
      const now = new Date();
      const mesAtual = now.getMonth() + 1;
      const anoAtual = now.getFullYear();
      const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
      const anoMesAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;
      const anoAnterior = anoAtual - 1;

      // Buscar todos os eleitores com created_at
      const { data: eleitores, error } = await supabaseClient
        .from('gbp_eleitores')
        .select('cidade, created_at')
        .eq('empresa_uid', empresa_uid);

      if (error) throw error;

      // Processar dados por cidade
      const cidadesMap = new Map<string, {
        total_atual: number;
        novos_mes_atual: number;
        novos_mes_anterior: number;
        novos_ano_atual: number;
        novos_ano_anterior: number;
      }>();

      eleitores?.forEach(eleitor => {
        if (!eleitor.cidade) return;

        const cidadeNormalizada = normalizeText(eleitor.cidade);
        const createdAt = new Date(eleitor.created_at);
        const mes = createdAt.getMonth() + 1;
        const ano = createdAt.getFullYear();

        // Encontrar cidade existente ou criar nova
        let cidadeData = Array.from(cidadesMap.entries())
          .find(([key]) => normalizeText(key) === cidadeNormalizada);

        if (!cidadeData) {
          cidadesMap.set(eleitor.cidade, {
            total_atual: 0,
            novos_mes_atual: 0,
            novos_mes_anterior: 0,
            novos_ano_atual: 0,
            novos_ano_anterior: 0
          });
          cidadeData = [eleitor.cidade, cidadesMap.get(eleitor.cidade)!];
        }

        const [cidadeNome, dados] = cidadeData;

        // Total atual
        dados.total_atual++;

        // Novos no mês atual
        if (ano === anoAtual && mes === mesAtual) {
          dados.novos_mes_atual++;
        }

        // Novos no mês anterior
        if (ano === anoMesAnterior && mes === mesAnterior) {
          dados.novos_mes_anterior++;
        }

        // Novos no ano atual
        if (ano === anoAtual) {
          dados.novos_ano_atual++;
        }

        // Novos no ano anterior
        if (ano === anoAnterior) {
          dados.novos_ano_anterior++;
        }

        cidadesMap.set(cidadeNome, dados);
      });

      // Calcular crescimentos e montar array final
      const crescimento: CidadeCrescimento[] = Array.from(cidadesMap.entries())
        .map(([cidade, dados]) => {
          const crescimento_mensal = dados.novos_mes_atual - dados.novos_mes_anterior;
          const crescimento_mensal_percentual = dados.novos_mes_anterior > 0
            ? ((crescimento_mensal / dados.novos_mes_anterior) * 100)
            : (dados.novos_mes_atual > 0 ? 100 : 0);

          const crescimento_anual = dados.novos_ano_atual - dados.novos_ano_anterior;
          const crescimento_anual_percentual = dados.novos_ano_anterior > 0
            ? ((crescimento_anual / dados.novos_ano_anterior) * 100)
            : (dados.novos_ano_atual > 0 ? 100 : 0);

          return {
            cidade,
            total_atual: dados.total_atual,
            novos_mes_atual: dados.novos_mes_atual,
            novos_mes_anterior: dados.novos_mes_anterior,
            crescimento_mensal,
            crescimento_mensal_percentual,
            novos_ano_atual: dados.novos_ano_atual,
            novos_ano_anterior: dados.novos_ano_anterior,
            crescimento_anual,
            crescimento_anual_percentual
          };
        })
        .sort((a, b) => {
          // Ordenar por crescimento absoluto (mais relevante estrategicamente)
          // Se empate, ordenar por percentual
          if (b.crescimento_anual !== a.crescimento_anual) {
            return b.crescimento_anual - a.crescimento_anual;
          }
          return b.crescimento_anual_percentual - a.crescimento_anual_percentual;
        });

      return crescimento;
    } catch (error) {
      console.error('Erro ao buscar crescimento por cidade:', error);
      throw error;
    }
  },

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
