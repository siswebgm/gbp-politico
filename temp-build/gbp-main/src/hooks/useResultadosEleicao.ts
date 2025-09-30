import { useState, useEffect } from 'react';
import { ResultadoEleicao, ResultadoAgrupado, EstatisticasGerais } from '../types/eleicoes';

export const useResultadosEleicao = (resultados: ResultadoEleicao[]) => {
  const [dadosAgrupados, setDadosAgrupados] = useState<ResultadoAgrupado[]>([]);
  const [estatisticas, setEstatisticas] = useState<EstatisticasGerais>({
    totalEleitoresAptos: 0,
    totalComparecimento: 0,
    totalAbstencoes: 0,
    totalVotosNominais: 0,
    percentualComparecimento: 0,
    percentualAbstencao: 0,
    totalSecoes: 0,
    totalZonas: 0,
    totalLocaisVotacao: 0,
  });

  useEffect(() => {
    if (!resultados.length) return;

    // Conjuntos para contagem de valores únicos
    const zonasUnicas = new Set<string>();
    const secoesUnicas = new Set<string>();
    const locaisUnicas = new Set<string>();

    // Agrupamento por candidato
    const candidatosMap = new Map<string, ResultadoAgrupado>();

    let totalGeralAptos = 0;
    let totalGeralComparecimento = 0;
    let totalGeralAbstencoes = 0;
    let totalGeralVotosNominais = 0;

    resultados.forEach((resultado) => {
      zonasUnicas.add(resultado.nr_zona);
      secoesUnicas.add(`${resultado.nr_zona}-${resultado.nr_secao}`);
      locaisUnicas.add(resultado.nr_local_votacao);

      totalGeralAptos += resultado.qt_aptos;
      totalGeralComparecimento += resultado.qt_comparecimento;
      totalGeralAbstencoes += resultado.qt_abstencoes;
      totalGeralVotosNominais += resultado.qt_votos_nominais;

      // Agrupa dados por candidato
      if (resultado.nr_votavel && resultado.nm_votavel) {
        if (!candidatosMap.has(resultado.nr_votavel)) {
          candidatosMap.set(resultado.nr_votavel, {
            candidato: {
              numero: resultado.nr_votavel,
              nome: resultado.nm_votavel,
              totalVotos: 0,
              percentual: 0,
            },
            zonas: {},
            totais: {
              aptos: 0,
              comparecimento: 0,
              abstencoes: 0,
              votos: 0,
              percentualComparecimento: 0,
            },
          });
        }

        const dadosCandidato = candidatosMap.get(resultado.nr_votavel)!;

        // Atualiza totais do candidato
        dadosCandidato.totais.aptos += resultado.qt_aptos;
        dadosCandidato.totais.comparecimento += resultado.qt_comparecimento;
        dadosCandidato.totais.abstencoes += resultado.qt_abstencoes;
        dadosCandidato.totais.votos += resultado.qt_votos;

        // Inicializa zona se não existir
        if (!dadosCandidato.zonas[resultado.nr_zona]) {
          dadosCandidato.zonas[resultado.nr_zona] = {
            totalVotos: 0,
            percentual: 0,
            secoes: {},
          };
        }

        // Atualiza dados da seção
        dadosCandidato.zonas[resultado.nr_zona].secoes[resultado.nr_secao] = {
          local: {
            nome: resultado.nm_local_votacao,
            endereco: resultado.ds_local_votacao_endereco,
          },
          aptos: resultado.qt_aptos,
          comparecimento: resultado.qt_comparecimento,
          abstencoes: resultado.qt_abstencoes,
          votos: resultado.qt_votos,
          percentual: (resultado.qt_votos / resultado.qt_comparecimento) * 100,
        };

        // Atualiza total de votos da zona
        dadosCandidato.zonas[resultado.nr_zona].totalVotos += resultado.qt_votos;
      }
    });

    // Calcula percentuais
    candidatosMap.forEach((dados) => {
      dados.candidato.totalVotos = dados.totais.votos;
      dados.candidato.percentual = (dados.totais.votos / totalGeralVotosNominais) * 100;

      // Calcula percentuais por zona
      Object.keys(dados.zonas).forEach((zona) => {
        dados.zonas[zona].percentual =
          (dados.zonas[zona].totalVotos / dados.totais.votos) * 100;
      });

      dados.totais.percentualComparecimento =
        (dados.totais.comparecimento / dados.totais.aptos) * 100;
    });

    // Atualiza estatísticas gerais
    setEstatisticas({
      totalEleitoresAptos: totalGeralAptos,
      totalComparecimento: totalGeralComparecimento,
      totalAbstencoes: totalGeralAbstencoes,
      totalVotosNominais: totalGeralVotosNominais,
      percentualComparecimento: (totalGeralComparecimento / totalGeralAptos) * 100,
      percentualAbstencao: (totalGeralAbstencoes / totalGeralAptos) * 100,
      totalSecoes: secoesUnicas.size,
      totalZonas: zonasUnicas.size,
      totalLocaisVotacao: locaisUnicas.size,
    });

    // Converte Map para array e ordena por total de votos
    setDadosAgrupados(
      Array.from(candidatosMap.values()).sort(
        (a, b) => b.candidato.totalVotos - a.candidato.totalVotos
      )
    );
  }, [resultados]);

  return {
    dadosAgrupados,
    estatisticas,
  };
};
