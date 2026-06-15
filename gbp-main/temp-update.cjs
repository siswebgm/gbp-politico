const fs = require('fs');
const path = 'c:\\Users\\jmend\\sistema-vereador\\gbp-main\\src\\pages\\MapaEleitoral\\index.tsx';
let content = fs.readFileSync(path, 'utf8');

const fn = `

  // Função para carregar demandas de rua com coordenadas
  const loadDemandas = async () => {
    if (!company?.uid) return;

    try {
      const { data: demandasRaw, error: demandasError } = await supabaseClient
        .from('gbp_demandas_ruas')
        .select('uid, tipo_de_demanda, descricao_do_problema, nivel_de_urgencia, logradouro, numero, bairro, cidade, uf, cep, latitude, longitude, status, criado_em')
        .eq('empresa_uid', company.uid)
        .eq('excluido', false)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (demandasError) {
        console.error('Erro ao buscar demandas:', demandasError);
        return;
      }

      if (!demandasRaw) {
        setDemandas([]);
        return;
      }

      const demandasWithLocation = demandasRaw
        .filter((d) => {
          const lat = parseFloat(d.latitude);
          const lng = parseFloat(d.longitude);
          return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        })
        .map((d) => ({
          uid: d.uid,
          tipo_de_demanda: d.tipo_de_demanda || '',
          descricao_do_problema: d.descricao_do_problema || '',
          nivel_de_urgencia: d.nivel_de_urgencia || 'média',
          logradouro: d.logradouro || '',
          numero: d.numero || '',
          bairro: d.bairro || '',
          cidade: d.cidade || '',
          uf: d.uf || '',
          cep: d.cep || '',
          lat: parseFloat(d.latitude),
          lng: parseFloat(d.longitude),
          status: d.status || 'recebido',
          criado_em: d.criado_em || ''
        }));

      setDemandas(demandasWithLocation);
    } catch (err) {
      console.error('Erro ao carregar demandas:', err);
      setDemandas([]);
    }
  };`;

content = content.replace(
  '  };\n\n  useEffect(() => {',
  '  };' + fn + '\n\n  useEffect(() => {'
);

content = content.replace(
  '                  <MapComponent \n                    voters={voters} \n                  />',
  '                  <MapComponent \n                    voters={voters} \n                    demandas={demandas}\n                  />'
);

fs.writeFileSync(path, content, 'utf8');
console.log('OK');
