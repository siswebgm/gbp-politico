import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useToast } from '../../components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';

import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, Trash2, ArrowLeft, MessageSquare, Star, Check } from 'lucide-react';
import { Switch } from '../../components/ui/switch';
import { BannerPesquisa } from './components/BannerPesquisa';
import { obterPesquisa, DadosParticipantePesquisa } from '../../services/pesquisaService';
import { supabaseClient } from '../../lib/supabase';
import { useCompanyStore } from '../../store/useCompanyStore';

// Função para obter o UID da empresa do usuário logado
function obterEmpresaUidDoUsuario(): string {
  // Obtém o companyUid do useCompanyStore
  const companyUid = useCompanyStore.getState().company?.uid;
  
  if (!companyUid) {
    throw new Error('Não foi possível obter o UID da empresa do usuário');
  }
  
  return companyUid;
}

// Interface para candidato local
interface CandidatoLocal {
  id: string;
  nome: string;
  partido: string;
  imagem: string | null;
}

// Interface para opção de enquete local
interface OpcaoEnqueteLocal {
  id: string;
  texto: string;
  ordem?: number;
}

// Interface para pergunta local
interface PerguntaLocal {
  id: string;
  texto: string;
  tipo: 'estrelas' | 'nota' | 'votacao';
  permiteComentario?: boolean;
  opcoes: OpcaoEnqueteLocal[];
}

// Usando a interface DadosParticipantePesquisa do serviço

export function EditarPesquisa() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  // Função para renderizar o tipo de pergunta
  const renderizarPergunta = (pergunta: PerguntaLocal) => {
    switch (pergunta.tipo) {
      case 'estrelas':
        return (
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star} 
                className="h-6 w-6 text-yellow-400 fill-current"
              />
            ))}
          </div>
        );
      case 'nota':
        return (
          <div className="flex items-center space-x-2">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((nota) => (
              <button
                key={nota}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100"
                type="button"
              >
                {nota}
              </button>
            ))}
          </div>
        );
      case 'votacao':
        return (
          <div className="flex space-x-4">
            <Button variant="outline" className="px-6">
              Sim
            </Button>
            <Button variant="outline" className="px-6">
              Não
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  // Estados do componente
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipoPesquisa, setTipoPesquisa] = useState('eleitoral');
  const [dataInicio, setDataInicio] = useState<Date>(new Date());
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [candidatos, setCandidatos] = useState<CandidatoLocal[]>([]);
  const [perguntas, setPerguntas] = useState<PerguntaLocal[]>([]);
  
  // Estados para controle das ajudas
  const [mostrarAjudaWhatsApp, setMostrarAjudaWhatsApp] = useState(false);
  const [mostrarAjudaPerguntas, setMostrarAjudaPerguntas] = useState(false);

  const [dadosParticipante, setDadosParticipante] = useState<DadosParticipantePesquisa>({
    nome: { ativo: true, obrigatorio: true }, // Nome sempre ativo e obrigatório
    faixaEtaria: { ativo: false, obrigatorio: false },
    telefone: { ativo: false, obrigatorio: false },
    cep: { ativo: false, obrigatorio: false },
    cidade: { ativo: false, obrigatorio: false },
    bairro: { ativo: false, obrigatorio: false },
    numero: { ativo: false, obrigatorio: false },
    complemento: { ativo: false, obrigatorio: false },
    notificacaoWhatsApp: {
      ativo: false,
      mensagem: ''
    }
  });

  const [novoCandidato, setNovoCandidato] = useState<{
    nome: string;
    partido: string;
    imagem: string | null;
  }>({ 
    nome: '', 
    partido: '', 
    imagem: null 
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [novaPergunta, setNovaPergunta] = useState('');
  const [tipoPergunta, setTipoPergunta] = useState<'estrelas' | 'nota' | 'votacao'>('estrelas');
  
  // Função para processar upload de imagem
  const processarUploadImagem = async (base64Image: string, nomeCandidato: string, bucketName: string): Promise<string | null> => {
    try {
      // Extrair o tipo MIME e os dados base64 da string
      const matches = base64Image.match(/^data:(.+?);base64,(.*)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Formato de imagem inválido');
      }
      
      const mimeType = matches[1];
      const base64Data = matches[2];
      const fileExt = mimeType.split('/')[1] || 'jpg';
      const fileName = `${Date.now()}_${nomeCandidato.replace(/\s+/g, '_')}.${fileExt}`;
      
      // Converter base64 para ArrayBuffer
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      
      // Fazer upload do arquivo
      const { error: uploadError } = await supabaseClient.storage
        .from(bucketName)
        .upload(`candidatos/${fileName}`, byteArray, {
          contentType: mimeType,
          upsert: true,
          cacheControl: '3600' // Cache de 1 hora
        });
      
      if (uploadError) throw uploadError;
      
      // Obter a URL pública da imagem
      const { data: { publicUrl } } = supabaseClient.storage
        .from(bucketName)
        .getPublicUrl(`candidatos/${fileName}`);
      
      return publicUrl;
    } catch (error) {
      console.error('Erro ao processar upload da imagem:', error);
      return null;
    }
  };
  
  // Estados para perguntas

  // Função para salvar a pesquisa
  const salvarPesquisa = async () => {
    try {
      setLoading(true);
      
      // Obter o UID da empresa do usuário logado
      // Você precisará implementar esta função para obter o UID da empresa do usuário atual
      const empresaUid = await obterEmpresaUidDoUsuario();
      
      if (!empresaUid) {
        throw new Error('Não foi possível obter o UID da empresa');
      }

      // 1. Primeiro, buscar o nome do bucket de storage da empresa
      const { data: empresa, error: empresaError } = await supabaseClient
        .from('gbp_empresas')
        .select('storage')
        .eq('uid', empresaUid)
        .single();
      
      if (empresaError) {
        console.error('Erro ao buscar dados da empresa:', empresaError);
        throw empresaError;
      }
      
      if (!empresa || !empresa.storage) {
        throw new Error('Não foi possível obter as configurações de armazenamento da empresa');
      }
      
      const nomeBucket = empresa.storage;
      
      // 2. Preparar os dados básicos da pesquisa
      const dadosPesquisa: any = {
        titulo,
        descricao: descricao || '',
        tipo_pesquisa: tipoPesquisa,
        data_inicio: dataInicio.toISOString(),
        data_fim: dataFim ? dataFim.toISOString() : null,
        ativa: true,
        empresa_uid: empresaUid,
        // Configuração dos campos do participante
        dados_participante: JSON.stringify({
          nome: { 
            ativo: true, // Nome sempre ativo
            obrigatorio: true // Nome sempre obrigatório
          },
          faixaEtaria: dadosParticipante.faixaEtaria || { ativo: false, obrigatorio: false },
          telefone: dadosParticipante.telefone || { ativo: false, obrigatorio: false },
          cep: dadosParticipante.cep || { ativo: false, obrigatorio: false },
          cidade: dadosParticipante.cidade || { ativo: false, obrigatorio: false },
          bairro: dadosParticipante.bairro || { ativo: false, obrigatorio: false },
          numero: dadosParticipante.numero || { ativo: false, obrigatorio: false },
          complemento: dadosParticipante.complemento || { ativo: false, obrigatorio: false },
          observacoes: dadosParticipante.observacoes || { ativo: false, obrigatorio: false },
          notificacaoWhatsApp: {
            ativo: dadosParticipante.notificacaoWhatsApp?.ativo || false,
            mensagem: dadosParticipante.notificacaoWhatsApp?.mensagem || 'Obrigado por participar da nossa pesquisa!'
          }
        }),
        // Configuração da notificação por WhatsApp
        notificacao_whatsapp: JSON.stringify({
          ativo: dadosParticipante.notificacaoWhatsApp?.ativo || false,
          mensagem: dadosParticipante.notificacaoWhatsApp?.mensagem || 'Obrigado por participar da nossa pesquisa!'
        })
      };

      let pesquisaId = id;
      
      // 2. Salvar/Atualizar a pesquisa principal
      if (id && id !== 'nova') {
        // Atualizar pesquisa existente
        const { error: updateError } = await supabaseClient
          .from('ps_gbp_pesquisas')
          .update(dadosPesquisa)
          .eq('uid', id);
          
        if (updateError) throw updateError;
        
        // Remover perguntas e candidatos existentes para reinserção
        await Promise.all([
          supabaseClient
            .from('ps_gbp_perguntas')
            .delete()
            .eq('pesquisa_uid', id),
          supabaseClient
            .from('ps_gbp_pesquisa_candidatos')
            .delete()
            .eq('pesquisa_uid', id)
        ]);
        
        // Redireciona para a lista de pesquisas após salvar
        navigate('/app/pesquisas');
      } else {
        // Criar nova pesquisa
        const { data: novaPesquisa, error } = await supabaseClient
          .from('ps_gbp_pesquisas')
          .insert(dadosPesquisa)
          .select('uid')
          .single();
        
        if (error) throw error;
        if (!novaPesquisa?.uid) throw new Error('Falha ao criar a pesquisa');
        
        pesquisaId = novaPesquisa.uid;
        // Exibe notificação de sucesso
        toast({
          title: 'Sucesso',
          description: 'Pesquisa criada e publicada com sucesso!',
          variant: 'success'
        });
        // Redireciona para a lista de pesquisas
        navigate('/app/pesquisas');
      }

      // 3. Salvar perguntas
      if (perguntas.length > 0) {
        console.log('=== INÍCIO - Salvamento de perguntas ===');
        console.log('Total de perguntas a serem salvas:', perguntas.length);
        console.log('Perguntas a serem salvas (bruto):', JSON.parse(JSON.stringify(perguntas)));
        
        const perguntasToInsert = perguntas.map((pergunta, index) => {
          console.log(`\n--- Processando pergunta ${index + 1} (${pergunta.tipo}) ---`);
          console.log('Dados da pergunta:', JSON.parse(JSON.stringify(pergunta)));
          
          // Preparar opções da pergunta
          const opcoesPergunta = pergunta.opcoes?.length > 0 
            ? pergunta.opcoes.map((opcao, opcaoIndex) => ({
                texto: opcao.texto,
                ordem: opcao.ordem || opcaoIndex + 1
              }))
            : [];

          console.log('Opções formatadas para pergunta:', opcoesPergunta);
          
          // Preparar os dados da pergunta
          const perguntaData: any = {
            pesquisa_uid: pesquisaId,
            pergunta: pergunta.texto,
            tipo_resposta: pergunta.tipo,
            obrigatoria: true,
            ordem: index + 1,
            permite_comentario: pergunta.permiteComentario || false,
            opcoes: opcoesPergunta,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          // Configurar campos padrão para a pergunta
          console.log('Configurando campos da pergunta...');
          perguntaData.opcoes = pergunta.opcoes?.length > 0 
            ? pergunta.opcoes.map((opcao, opcaoIndex) => ({
                texto: opcao.texto,
                ordem: opcao.ordem || opcaoIndex + 1
              }))
            : [];
          
          console.log(`Dados da pergunta ${index + 1} para inserção:`, perguntaData);
          return perguntaData;
        });
        
        console.log('Dados a serem inseridos no banco:', perguntasToInsert);

        console.log('Iniciando inserção no banco de dados...');
        const { data: insertedData, error: perguntaError } = await supabaseClient
          .from('ps_gbp_perguntas')
          .insert(perguntasToInsert)
          .select();
        
        if (perguntaError) {
          console.error('Erro ao salvar perguntas:', perguntaError);
          throw perguntaError;
        }
        
        console.log('Perguntas salvas com sucesso:', insertedData);
      }

      // 4. Salvar candidatos (apenas para pesquisa eleitoral)
      if (tipoPesquisa === 'eleitoral' && candidatos.length > 0) {
        console.log('Iniciando salvamento de candidatos...');
        console.log('Candidatos a serem salvos:', candidatos);
        
        const candidatosFiltrados = candidatos.filter(c => c.nome && c.nome.trim() !== '');
        console.log('Candidatos após filtro:', candidatosFiltrados);
        
        if (candidatosFiltrados.length > 0) {
          // 1. Primeiro, obter todos os candidatos existentes para esta pesquisa
          console.log('Buscando candidatos existentes para a pesquisa...');
          const { data: candidatosPesquisa, error: buscaError } = await supabaseClient
            .from('ps_gbp_pesquisa_candidatos')
            .select(`
              candidato_uid,
              candidatos:ps_gbp_candidatos(
                uid,
                nome,
                partido,
                foto_url
              )
            `)
            .eq('pesquisa_uid', pesquisaId);
          
          if (buscaError) {
            console.error('Erro ao buscar candidatos da pesquisa:', buscaError);
            throw buscaError;
          }
          
          console.log('Candidatos existentes na pesquisa:', candidatosPesquisa);
          
          // 2. Processar cada candidato do formulário
          for (const candidato of candidatosFiltrados) {
            // Verificar se o candidato já existe na pesquisa (verificando nome e partido)
            const candidatoExistente = candidatosPesquisa?.find(cp => 
              cp.candidatos?.nome?.toLowerCase() === candidato.nome.toLowerCase() &&
              (cp.candidatos?.partido || '').toLowerCase() === (candidato.partido || '').toLowerCase()
            );
            
            if (candidatoExistente) {
              console.log(`Candidato ${candidato.nome} (${candidato.partido}) já existe na pesquisa, atualizando...`);
              
              // Atualizar dados do candidato existente, se necessário
              const atualizacao: any = {};
              let precisaAtualizar = false;
              
              if (candidato.partido && candidato.partido !== candidatoExistente.candidatos?.partido) {
                atualizacao.partido = candidato.partido;
                precisaAtualizar = true;
              }
              
              // Processar imagem se fornecida
              if (candidato.imagem && candidato.imagem.startsWith('data:image')) {
                try {
                  const fotoUrl = await processarUploadImagem(
                    candidato.imagem, 
                    candidato.nome, 
                    nomeBucket
                  );
                  
                  if (fotoUrl) {
                    atualizacao.foto_url = fotoUrl;
                    precisaAtualizar = true;
                  }
                } catch (error) {
                  console.error('Erro ao processar upload da imagem:', error);
                }
              }
              
              // Atualizar candidato se necessário
              if (precisaAtualizar) {
                const { error: updateError } = await supabaseClient
                  .from('ps_gbp_candidatos')
                  .update(atualizacao)
                  .eq('uid', candidatoExistente.candidato_uid);
                  
                if (updateError) {
                  console.error(`Erro ao atualizar candidato ${candidato.nome}:`, updateError);
                }
              }
            } else {
              console.log(`Processando candidato: ${candidato.nome}`);
              
              // Verificar se o candidato já existe na empresa (verificando nome e partido)
              const { data: candidatoExistente, error: buscaCandidatoError } = await supabaseClient
                .from('ps_gbp_candidatos')
                .select('uid, nome, partido, foto_url')
                .eq('empresa_uid', empresaUid)
                .ilike('nome', candidato.nome)
                .ilike('partido', candidato.partido || '')
                .maybeSingle();
                
              if (buscaCandidatoError) {
                console.error(`Erro ao buscar candidato ${candidato.nome}:`, buscaCandidatoError);
                continue;
              }
              
              let candidatoUid: string;
              let fotoUrl = candidato.imagem;
              
              // Processar a imagem se fornecida
              if (candidato.imagem && candidato.imagem.startsWith('data:image')) {
                try {
                  fotoUrl = await processarUploadImagem(
                    candidato.imagem, 
                    candidato.nome, 
                    nomeBucket
                  ) || candidato.imagem;
                } catch (error) {
                  console.error('Erro ao processar upload da imagem:', error);
                }
              }
              
              if (candidatoExistente) {
                console.log(`Candidato ${candidato.nome} já existe na empresa, atualizando...`);
                candidatoUid = candidatoExistente.uid;
                
                // Atualizar dados do candidato existente, se necessário
                const atualizacao: any = {};
                let precisaAtualizar = false;
                
                if (candidato.partido && candidato.partido !== candidatoExistente.partido) {
                  atualizacao.partido = candidato.partido;
                  precisaAtualizar = true;
                }
                
                if (fotoUrl && fotoUrl !== candidatoExistente.foto_url) {
                  atualizacao.foto_url = fotoUrl;
                  precisaAtualizar = true;
                }
                
                if (precisaAtualizar) {
                  const { error: updateError } = await supabaseClient
                    .from('ps_gbp_candidatos')
                    .update(atualizacao)
                    .eq('uid', candidatoUid);
                    
                  if (updateError) {
                    console.error(`Erro ao atualizar candidato ${candidato.nome}:`, updateError);
                  }
                }
              } else {
                // Inserir novo candidato
                console.log(`Inserindo novo candidato: ${candidato.nome}`);
                const { data: novoCandidato, error: insertError } = await supabaseClient
                  .from('ps_gbp_candidatos')
                  .insert([{
                    nome: candidato.nome,
                    partido: candidato.partido || null,
                    foto_url: fotoUrl,
                    cargo: 'Candidato',
                    empresa_uid: empresaUid,
                    pesquisa_uid: pesquisaId
                  }])
                  .select('uid')
                  .single();
                  
                if (insertError) {
                  console.error(`Erro ao inserir candidato ${candidato.nome}:`, insertError);
                  continue;
                }
                
                candidatoUid = novoCandidato.uid;
              }
              
              // Verificar se já existe associação com a pesquisa
              const { data: associacaoExistente, error: buscaAssociacaoError } = await supabaseClient
                .from('ps_gbp_pesquisa_candidatos')
                .select('*')
                .eq('pesquisa_uid', pesquisaId)
                .eq('candidato_uid', candidatoUid)
                .maybeSingle();
                
              if (buscaAssociacaoError) {
                console.error(`Erro ao verificar associação do candidato ${candidato.nome}:`, buscaAssociacaoError);
                continue;
              }
              
              if (!associacaoExistente) {
                // Associar o candidato à pesquisa
                const { error: relError } = await supabaseClient
                  .from('ps_gbp_pesquisa_candidatos')
                  .insert([{
                    pesquisa_uid: pesquisaId,
                    candidato_uid: candidatoUid,
                    votos_iniciais: 0
                  }]);
                  
                if (relError) {
                  console.error(`Erro ao associar candidato ${candidato.nome} à pesquisa:`, relError);
                }
              }
            }
          }
          
          // 3. Remover candidatos que foram excluídos do formulário
          const candidatosParaManter = new Set(candidatosFiltrados.map(c => c.nome.toLowerCase()));
          const candidatosParaRemover = candidatosPesquisa?.filter(
            cp => !candidatosParaManter.has(cp.candidatos?.nome?.toLowerCase() || '')
          ) || [];
          
          if (candidatosParaRemover.length > 0) {
            console.log('Candidatos para remover da pesquisa:', candidatosParaRemover);
            
            // Remover as associações com a pesquisa (não removemos os candidatos em si)
            const { error: deleteError } = await supabaseClient
              .from('ps_gbp_pesquisa_candidatos')
              .delete()
              .in('candidato_uid', candidatosParaRemover.map(c => c.candidato_uid))
              .eq('pesquisa_uid', pesquisaId);
              
            if (deleteError) {
              console.error('Erro ao remover candidatos da pesquisa:', deleteError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao salvar pesquisa:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar a pesquisa.',
        variant: 'warning',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };



  // Carregar pesquisa existente
  useEffect(() => {
    const carregarPesquisa = async () => {
      try {
        setLoading(true);
        
        if (id && id !== 'nova') {
          const pesquisa = await obterPesquisa(id);
          console.log('Dados da pesquisa carregados:', pesquisa);
          
          if (!pesquisa) {
            toast.error('Pesquisa não encontrada');
            navigate('/app/pesquisas');
            return;
          }
          
          // Atualizar estados com os dados da pesquisa
          setTitulo(pesquisa.titulo || '');
          setDescricao(pesquisa.descricao || '');
          setTipoPesquisa(pesquisa.tipo_pesquisa || 'eleitoral');
          
          // Converter strings de data para objetos Date
          const dataInicio = pesquisa.data_inicio ? new Date(pesquisa.data_inicio) : new Date();
          const dataFim = pesquisa.data_fim ? new Date(pesquisa.data_fim) : null;
          
          setDataInicio(dataInicio);
          setDataFim(dataFim);
          
          // Mapear candidatos (se for pesquisa eleitoral)
          if (pesquisa.tipo_pesquisa === 'eleitoral' && pesquisa.candidatos) {
            const candidatosMapeados = Array.isArray(pesquisa.candidatos) 
              ? pesquisa.candidatos
                  .filter(c => c.nome && c.nome.trim() !== '') // Filtra candidatos sem nome
                  .map((c, index) => ({
                    id: c.uid || `cand-${Date.now()}-${index}`,
                    nome: c.nome,
                    partido: c.partido || '',
                    imagem: c.imagem_url || null
                  }))
              : [];
              
            setCandidatos(candidatosMapeados);
          } else {
            setCandidatos([]);
          }
          
          // Carregar dados do participante, se existirem
          if (pesquisa.dados_participante) {
            // Função auxiliar para converter o formato antigo para o novo formato
            const converterCampo = (valor: any): { ativo: boolean, obrigatorio: boolean } => {
              if (typeof valor === 'boolean') {
                return { ativo: valor, obrigatorio: valor };
              }
              if (valor && typeof valor === 'object' && 'ativo' in valor) {
                return {
                  ativo: !!valor.ativo,
                  obrigatorio: !!valor.obrigatorio
                };
              }
              return { ativo: false, obrigatorio: false };
            };

            // Garantir que o nome sempre fique ativo e obrigatório
            const dadosConvertidos = {
              nome: { ativo: true, obrigatorio: true },
              faixaEtaria: converterCampo(pesquisa.dados_participante.faixaEtaria),
              telefone: converterCampo(pesquisa.dados_participante.telefone),
              cep: converterCampo(pesquisa.dados_participante.cep),
              cidade: converterCampo(pesquisa.dados_participante.cidade),
              bairro: converterCampo(pesquisa.dados_participante.bairro),
              numero: converterCampo(pesquisa.dados_participante.numero),
              complemento: converterCampo(pesquisa.dados_participante.complemento),
              notificacaoWhatsApp: pesquisa.dados_participante.notificacaoWhatsApp || {
                ativo: false,
                mensagem: ''
              }
            };

            setDadosParticipante(dadosConvertidos);
          } else {
            // Valores padrão para nova pesquisa
            setDadosParticipante({
              nome: { ativo: true, obrigatorio: true },
              faixaEtaria: { ativo: false, obrigatorio: false },
              telefone: { ativo: false, obrigatorio: false },
              cep: { ativo: false, obrigatorio: false },
              cidade: { ativo: false, obrigatorio: false },
              bairro: { ativo: false, obrigatorio: false },
              numero: { ativo: false, obrigatorio: false },
              complemento: { ativo: false, obrigatorio: false },
              notificacaoWhatsApp: {
                ativo: false,
                mensagem: ''
              }
            });
          }
          
          // Mapear perguntas
          if (pesquisa.perguntas && Array.isArray(pesquisa.perguntas)) {
            const perguntasMapeadas = pesquisa.perguntas.map((p, index) => {
              // Obter opções da pergunta
              let opcoesParaUsar: any[] = [];
              
              // Tentar obter opções do campo opcoes
              if (p.opcoes) {
                if (Array.isArray(p.opcoes)) {
                  opcoesParaUsar = [...p.opcoes];
                } else if (typeof p.opcoes === 'string') {
                  try {
                    opcoesParaUsar = JSON.parse(p.opcoes);
                  } catch (e) {
                    console.error('Erro ao fazer parse das opções:', e);
                  }
                }
              }
              
              // Se não encontrou opções, tenta obter de opcoes_enquete
              if (opcoesParaUsar.length === 0 && 'opcoes_enquete' in p && p.opcoes_enquete) {
                try {
                  const opcoesEnquete = typeof p.opcoes_enquete === 'string' 
                    ? JSON.parse(p.opcoes_enquete) 
                    : p.opcoes_enquete;
                  
                  if (Array.isArray(opcoesEnquete)) {
                    opcoesParaUsar = opcoesEnquete;
                  }
                } catch (e) {
                  console.error('Erro ao processar opcoes_enquete:', e);
                }
              }
              
              // Converter tipo 'enquete' para 'votacao' se necessário
              const tipo = (p.tipo === 'enquete' ? 'votacao' : p.tipo) as 'estrelas' | 'nota' | 'votacao';
              
              return {
                id: p.uid || `perg-${Date.now()}-${index}`,
                texto: p.texto || '',
                tipo: tipo || 'estrelas',
                permiteComentario: (p as any).permite_comentario || (p as any).permiteComentario || false,
                opcoes: Array.isArray(opcoesParaUsar)
                  ? opcoesParaUsar.map((o: any, i: number) => ({
                      id: o.uid || o.id || `opc-${Date.now()}-${i}`,
                      texto: o.texto || o.pergunta || `Opção ${i + 1}`,
                      ordem: o.ordem || i + 1
                    }))
                  : []
              } as PerguntaLocal;
            });
            
            console.log('Perguntas mapeadas:', perguntasMapeadas);
            setPerguntas(perguntasMapeadas);
          } else {
            setPerguntas([]);
          }
        } else {
          // Valores padrão para nova pesquisa
          setTitulo('Nova Pesquisa');
          setTipoPesquisa('eleitoral');
          setDataInicio(new Date());
          setDataFim(null);
          setCandidatos([]);
          setPerguntas([]);
        }
      } catch (error) {
        console.error('Erro ao carregar pesquisa:', error);
        toast.error('Erro ao carregar a pesquisa');
      } finally {
        setLoading(false);
      }
    };
    
    carregarPesquisa();
  }, [id]);

  // Estados para o formulário de pergunta

  const handleClearImage = () => {
    setNovoCandidato(prev => ({
      ...prev,
      imagem: null
    }));
    // Limpar o input de arquivo
    const fileInput = document.getElementById('foto-candidato') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar se o arquivo é uma imagem
    if (!file.type.match('image.*')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione um arquivo de imagem válido',
        variant: 'warning',
        duration: 3000
      });
      return;
    }

    // Verificar o tamanho do arquivo (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 2MB',
        variant: 'warning',
        duration: 3000
      });
      return;
    }

    setUploadingImage(true);
    
    try {
      // Criar um URL temporário para a imagem
      const imageUrl = URL.createObjectURL(file);
      
      // Criar um elemento de imagem para carregar o arquivo
      const img = new Image();
      img.src = imageUrl;
      
      // Quando a imagem for carregada, criar um canvas para redimensioná-la
      img.onload = () => {
        try {
          // Criar um canvas para redimensionar a imagem
          const canvas = document.createElement('canvas');
          const maxWidth = 400; // Largura máxima desejada
          const maxHeight = 400; // Altura máxima desejada
          let width = img.width;
          let height = img.height;

          // Redimensionar mantendo a proporção
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Não foi possível obter o contexto 2D do canvas');
          }
          
          // Desenhar a imagem redimensionada no canvas
          ctx.drawImage(img, 0, 0, width, height);
          
          // Obter a imagem em base64
          const base64Image = canvas.toDataURL('image/jpeg', 0.8);
          
          // Atualizar o estado com a imagem em base64
          setNovoCandidato(prev => ({
            ...prev,
            imagem: base64Image
          }));
          
          // Liberar a URL do objeto
          URL.revokeObjectURL(imageUrl);
          
          // Usar o toast do hook useToast
          toast({
            title: 'Sucesso',
            description: 'Imagem carregada com sucesso!',
            variant: 'success',
            duration: 3000
          });
          
          setUploadingImage(false);
        } catch (error) {
          console.error('Erro ao processar imagem:', error);
          toast({
            title: 'Erro',
            description: 'Erro ao processar a imagem',
            variant: 'warning',
            duration: 3000
          });
          setUploadingImage(false);
        }
      };
      
      // Em caso de erro ao carregar a imagem
      img.onerror = () => {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar a imagem',
          variant: 'warning',
          duration: 3000
        });
        setUploadingImage(false);
      };
      
    } catch (error) {
      console.error('Erro ao processar a imagem:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao processar a imagem',
        variant: 'warning',
        duration: 3000
      });
      setUploadingImage(false);
    }
  };

  const handleAddCandidato = async () => {
    try {
      // Verifica se o nome foi preenchido
      if (!novoCandidato.nome || !novoCandidato.nome.trim()) {
        toast({
          title: 'Atenção',
          description: 'Por favor, insira o nome do candidato',
          variant: 'warning',
          duration: 3000
        });
        return;
      }

      const nomeCandidato = novoCandidato.nome.trim();
      const partidoCandidato = novoCandidato.partido.trim();

      // Verifica se já existe um candidato com o mesmo nome E partido na lista atual
      const candidatoExistenteNaLista = candidatos.find(c => 
        c.nome.toLowerCase() === nomeCandidato.toLowerCase() && 
        c.partido.toLowerCase() === partidoCandidato.toLowerCase()
      );

      if (candidatoExistenteNaLista) {
        toast({
          title: 'Atenção',
          description: `Candidato "${nomeCandidato}" (${partidoCandidato}) já está na lista.`,
          variant: 'warning',
          duration: 3000
        });
        return;
      }

      // Se houver um ID de pesquisa, verifica se o candidato já está associado a ela
      if (id && id !== 'nova') {
        // Primeiro, buscar os candidatos associados à pesquisa
        const { data: candidatosPesquisa, error: buscaCandidatosError } = await supabaseClient
          .from('ps_gbp_pesquisa_candidatos')
          .select(`
            *,
            candidato:ps_gbp_candidatos(
              nome,
              partido
            )
          `)
          .eq('pesquisa_uid', id);

        if (buscaCandidatosError) {
          console.error('Erro ao buscar candidatos da pesquisa:', buscaCandidatosError);
        } else if (candidatosPesquisa && candidatosPesquisa.length > 0) {
          // Verificar se já existe um candidato com o mesmo nome e partido
          const candidatoExistente = candidatosPesquisa.some(cp => 
            cp.candidato?.nome?.toLowerCase() === nomeCandidato.toLowerCase() &&
            (cp.candidato?.partido || '').toLowerCase() === partidoCandidato.toLowerCase()
          );
          
          if (candidatoExistente) {
            toast.warning(`Candidato "${nomeCandidato}" (${partidoCandidato}) já está associado a esta pesquisa.`);
            return;
          }
        }
      }

      // Cria um novo candidato com ID único
      const novoCandidatoComId: CandidatoLocal = {
        id: `cand-${Date.now()}`,
        nome: nomeCandidato,
        partido: partidoCandidato,
        imagem: novoCandidato.imagem
      };

      console.log('Adicionando novo candidato:', novoCandidatoComId);
      
      // Adiciona o candidato à lista
      setCandidatos(prevCandidatos => {
        const novaLista = [...prevCandidatos, novoCandidatoComId];
        console.log('Nova lista de candidatos:', novaLista);
        return novaLista;
      });
      
      // Reseta o formulário
      setNovoCandidato({ 
        nome: '', 
        partido: '', 
        imagem: null 
      });
      
      // Limpa o input de arquivo
      const fileInput = document.getElementById('foto-candidato') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      toast({
        title: 'Sucesso',
        description: 'Candidato adicionado com sucesso!',
        variant: 'success',
        duration: 3000
      });
    } catch (error) {
      console.error('Erro ao verificar/inserir candidato:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao processar o candidato. Verifique o console para mais detalhes.',
        variant: 'warning',
        duration: 5000
      });
    }
  };

  const handleRemoveCandidato = (id: string) => {
    setCandidatos(candidatos.filter(c => c.id !== id));
    toast({
      title: 'Sucesso',
      description: 'Candidato removido com sucesso!',
      variant: 'success',
      duration: 3000
    });
  };

  const adicionarPergunta = () => {
    if (!novaPergunta.trim()) {
      toast({
        title: 'Atenção',
        description: 'Por favor, insira o texto da pergunta',
        variant: 'warning',
        duration: 3000
      });
      return;
    }
    
    const novaPerguntaObj: PerguntaLocal = {
      id: Date.now().toString(),
      texto: novaPergunta,
      tipo: tipoPergunta,
      permiteComentario: false, // Valor padrão para nova pergunta
      opcoes: [] // Inicializa com array vazio por padrão
    };
    
    setPerguntas([...perguntas, novaPerguntaObj]);
    setNovaPergunta('');
    toast({
      title: 'Sucesso',
      description: 'Pergunta adicionada com sucesso!',
      variant: 'success',
      duration: 3000
    });
  };

  const handleRemovePergunta = (id: string) => {
    setPerguntas(perguntas.filter(p => p.id !== id));
    toast({
      title: 'Sucesso',
      description: 'Pergunta removida com sucesso!',
      variant: 'success',
      duration: 3000
    });
  };

  const togglePermiteComentario = (perguntaId: string) => {
    setPerguntas(perguntas.map(p => 
      p.id === perguntaId 
        ? { ...p, permiteComentario: !p.permiteComentario } 
        : p
    ));
  };

  // Função para alternar campos do participante (ativo/inativo)
  const toggleCampoObrigatorio = (campo: keyof Omit<DadosParticipantePesquisa, 'notificacaoWhatsApp'>) => {
    setDadosParticipante(prev => ({
      ...prev,
      [campo]: {
        ...prev[campo],
        ativo: !prev[campo].ativo,
        // Se estiver ativando o campo, mantém o status de obrigatoriedade
        // Se estiver desativando, garante que não fique obrigatório
        obrigatorio: !prev[campo].ativo ? prev[campo].obrigatorio : false
      }
    }));
  };

  // Função para alternar a obrigatoriedade de um campo (só funciona se o campo estiver ativo)
  const toggleObrigatoriedadeCampo = (campo: keyof Omit<DadosParticipantePesquisa, 'notificacaoWhatsApp'>) => {
    setDadosParticipante(prev => {
      // Se o campo não estiver ativo, não faz nada
      if (!prev[campo].ativo) return prev;
      
      return {
        ...prev,
        [campo]: {
          ...prev[campo],
          obrigatorio: !prev[campo].obrigatorio
        }
      };
    });
  };

  // Função para alternar notificação por WhatsApp
  const toggleNotificacaoWhatsApp = () => {
    setDadosParticipante(prev => ({
      ...prev,
      notificacaoWhatsApp: {
        ...prev.notificacaoWhatsApp,
        ativo: !prev.notificacaoWhatsApp.ativo
      }
    }));
  };

  // Função para atualizar a mensagem do WhatsApp
  const atualizarMensagemWhatsApp = (mensagem: string) => {
    setDadosParticipante(prev => ({
      ...prev,
      notificacaoWhatsApp: {
        ...prev.notificacaoWhatsApp,
        mensagem
      }
    }));
  };

  const handleSavePesquisa = async () => {
    try {
      setLoading(true);
      await salvarPesquisa();
      // Exibe notificação de sucesso após publicar
      toast({
        title: 'Sucesso',
        description: 'Pesquisa publicada com sucesso! Sua pesquisa está ativa e disponível para os participantes.',
        variant: 'success',
        duration: 5000
      });
    } catch (error) {
      console.error('Erro ao salvar pesquisa:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar a pesquisa.',
        variant: 'warning',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="pb-6">
            <div className="mx-auto sm:px-0 md:px-0">
              {/* Header Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <Link
                      to="/app/pesquisas"
                      className="inline-flex items-center justify-center w-10 h-10 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Link>

                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {id === 'nova' ? 'Nova Pesquisa' : 'Editar Pesquisa'}
                      </h1>
                    </div>
                  </div>
                  
                  <div className="w-full md:w-auto mt-4 md:mt-0 hidden sm:block">
                    <Button 
                      onClick={handleSavePesquisa} 
                      disabled={loading}
                      className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Banner com informações da pesquisa */}
              <BannerPesquisa 
                titulo={titulo}
                tipoPesquisa={tipoPesquisa}
                dataInicio={dataInicio}
                dataFim={dataFim}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Candidatos - Apenas para pesquisa eleitoral */}
      {tipoPesquisa === 'eleitoral' && (
        <Card className="mb-6">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="text-lg font-semibold">Candidatos</CardTitle>
            <CardDescription>
              Adicione e gerencie os candidatos que participarão desta pesquisa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome-candidato">Nome do Candidato *</Label>
                  <Input
                    id="nome-candidato"
                    value={novoCandidato.nome}
                    onChange={(e) => setNovoCandidato({...novoCandidato, nome: e.target.value.toUpperCase()})}
                    placeholder="NOME COMPLETO"
                    className="uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partido">Partido</Label>
                  <Input
                    id="partido"
                    value={novoCandidato.partido}
                    onChange={(e) => setNovoCandidato({...novoCandidato, partido: e.target.value.toUpperCase()})}
                    placeholder="SIGLA DO PARTIDO"
                    className="uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="foto-candidato">Foto do Candidato</Label>
                  <Input
                    id="foto-candidato"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="cursor-pointer"
                  />
                  {uploadingImage && (
                    <p className="text-sm text-gray-500">Enviando imagem...</p>
                  )}
                </div>
                <div className="flex items-end">
                  <Button 
                    type="button" 
                    onClick={handleAddCandidato}
                    className="w-full md:w-auto"
                    disabled={uploadingImage}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Candidato
                  </Button>
                </div>
              </div>
              
              {/* Preview da imagem */}
              {novoCandidato.imagem && !uploadingImage && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center space-x-4">
                    <div className="relative flex-shrink-0">
                      <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-blue-500 relative">
                        <img 
                          src={novoCandidato.imagem} 
                          alt="Pré-visualização" 
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Pré-visualização da foto</p>
                      <p className="text-sm text-gray-500">A imagem será exibida como um círculo</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Remover imagem"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
              
              {/* Lista de Candidatos */}
              {candidatos.length > 0 && (
                <div className="border rounded-lg divide-y">
                  {candidatos.map((candidato) => (
                    <div key={candidato.id} className="p-4 flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          {candidato.imagem ? (
                            <img 
                              src={candidato.imagem} 
                              alt={candidato.nome} 
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-gray-500">Foto</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{candidato.nome}</p>
                          <p className="text-sm text-gray-500">{candidato.partido}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCandidato(candidato.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seção de Perguntas */}
      <Card className="mb-6">
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-lg font-semibold">Perguntas da Pesquisa</CardTitle>
              <button 
                type="button"
                onClick={() => setMostrarAjudaPerguntas(!mostrarAjudaPerguntas)}
                className="text-gray-400 hover:text-blue-500 transition-colors"
                aria-label="Mostrar ajuda sobre as perguntas da pesquisa"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 109 10.5v1a.75.75 0 01-1.5 0v-1a3 3 0 011.44-2.56zM12 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <CardDescription>
              Adicione e edite as perguntas que serão exibidas na pesquisa
            </CardDescription>
            <div className="p-3 bg-blue-50 rounded-md text-sm text-gray-700 mt-2">
              <p className="font-medium mb-2">Tipos de perguntas disponíveis:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><span className="font-medium">Avaliação por Estrelas:</span> Permite que o participante avalie com até 5 estrelas</li>
                <li><span className="font-medium">Nota de 0 a 10:</span> O participante pode dar uma nota de 0 a 10</li>
                <li><span className="font-medium">Votação Sim/Não:</span> Opção para respostas binárias (Sim ou Não)</li>
              </ul>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pergunta">Nova Pergunta</Label>
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      id="pergunta"
                      value={novaPergunta}
                      onChange={(e) => setNovaPergunta(e.target.value.toUpperCase())}
                      placeholder="DIGITE A PERGUNTA"
                      className="flex-1 uppercase text-sm sm:text-base"
                      style={{ textTransform: 'uppercase' }}
                    />
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <Select 
                        value={tipoPergunta} 
                        onValueChange={(value: 'estrelas' | 'nota' | 'votacao') => {
                          setTipoPergunta(value);
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-[180px]">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="estrelas">Avaliação por Estrelas</SelectItem>
                          <SelectItem value="nota">Nota de 0 a 10</SelectItem>
                          <SelectItem value="votacao">Votação Sim/Não</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        type="button" 
                        onClick={adicionarPergunta}
                        className="flex-1 sm:flex-none justify-center"
                      >
                        <span className="flex items-center">
                          <Plus className="h-4 w-4 mr-2" />
                          <span>Adicionar</span>
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de Perguntas */}
            {perguntas.length > 0 && (
              <div className="border rounded-lg divide-y overflow-hidden">
                {perguntas.map((pergunta) => (
                  <div key={pergunta.id} className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base break-words">{pergunta.texto}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs sm:text-sm text-gray-500">
                          <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                            {pergunta.tipo === 'estrelas' ? '⭐ Avaliação' : 
                             pergunta.tipo === 'nota' ? '🔢 Nota 0-10' : '🗳️ Votação'}
                          </span>
                          {pergunta.permiteComentario && (
                            <span className="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded flex items-center">
                              <MessageSquare className="h-3 w-3 mr-1" /> Comentário
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="h-4 w-4 text-gray-500" />
                          <Switch 
                            id={`comentario-${pergunta.id}`}
                            checked={pergunta.permiteComentario || false}
                            onCheckedChange={() => togglePermiteComentario(pergunta.id)}
                            className="data-[state=checked]:bg-blue-600"
                          />
                          <Label htmlFor={`comentario-${pergunta.id}`} className="text-sm text-gray-500">
                            Comentário
                          </Label>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePergunta(pergunta.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {pergunta.permiteComentario && (
                      <div className="mt-3 pl-4 border-l-2 border-blue-200">
                        <Input 
                          placeholder="Campo de comentário será exibido aqui" 
                          disabled 
                          className="bg-gray-50"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Os respondentes poderão adicionar um comentário a esta pergunta.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            

          </div>
        </CardContent>
      </Card>

      {/* Seção de Visualização */}
      <Card className="mb-6">
        <CardContent className="pt-4 sm:pt-6">
          <div className="border rounded-lg p-4 sm:p-6 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="text-lg font-semibold mb-4">Visualização da Pesquisa</h3>
            
            {/* Se não houver candidatos E o tipo for eleitoral, mostra um exemplo */}
            {tipoPesquisa === 'eleitoral' && candidatos.length === 0 ? (
              <div className="space-y-6 sm:space-y-8">
                <div className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6 last:border-0 last:pb-0 last:mb-0">
                  <div className="mb-4">
                    <h4 className="font-bold text-base sm:text-lg">Candidato de Exemplo</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Partido de Exemplo</p>
                  </div>
                  {perguntas.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">Adicione perguntas para visualizar a prévia</p>
                  ) : (
                    <div className="space-y-4 sm:pl-4">
                      {perguntas.map((pergunta) => (
                        <div key={pergunta.id} className="space-y-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                          <p className="font-medium text-sm sm:text-base">{pergunta.texto}</p>
                          {renderizarPergunta(pergunta)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6 sm:space-y-8">
                {candidatos.map((candidato) => (
                  <div key={candidato.id} className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6 last:border-0 last:pb-0 last:mb-0">
                    <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 mb-4">
                      {tipoPesquisa === 'eleitoral' && (
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
                          {candidato.imagem ? (
                            <img 
                              src={candidato.imagem} 
                              alt={candidato.nome} 
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Foto</span>
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm sm:text-base truncate">{candidato.nome}</h3>
                        {candidato.partido && (
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{candidato.partido}</p>
                        )}
                      </div>
                    </div>

                    {perguntas.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">Adicione perguntas para este candidato</p>
                    ) : (
                      <div className="space-y-4 sm:pl-14">
                        {perguntas.map((pergunta) => (
                          <div key={pergunta.id} className="space-y-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                            <p className="font-medium text-sm sm:text-base">{pergunta.texto}</p>
                            {pergunta.tipo === 'estrelas' && (
                              <div className="flex space-x-1 py-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star 
                                    key={star} 
                                    className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400 fill-current"
                                  />
                                ))}
                              </div>
                            )}
                            {pergunta.tipo === 'nota' && (
                              <div className="flex flex-wrap gap-1 sm:gap-2 py-1">
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((nota) => (
                                  <button
                                    key={nota}
                                    className="w-7 h-7 sm:w-8 sm:h-8 text-xs sm:text-sm flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    type="button"
                                  >
                                    {nota}
                                  </button>
                                ))}
                              </div>
                            )}
                            {pergunta.tipo === 'votacao' && (
                              <div className="flex flex-wrap gap-2 sm:gap-4 pt-1">
                                <Button variant="outline" className="flex-1 sm:flex-none px-4 text-sm sm:text-base">
                                  Sim
                                </Button>
                                <Button variant="outline" className="flex-1 sm:flex-none px-4 text-sm sm:text-base">
                                  Não
                                </Button>
                              </div>
                            )}
                            {pergunta.permiteComentario && (
                              <div className="flex items-center text-xs text-gray-500 mt-2">
                                <MessageSquare className="h-3 w-3 mr-1" />
                                <span>Comentário ativado</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seção de Notificação por WhatsApp */}
      <Card className="mb-6">
        <CardHeader>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-lg font-semibold">Notificação por WhatsApp</CardTitle>
              <button 
                type="button"
                onClick={() => setMostrarAjudaWhatsApp(!mostrarAjudaWhatsApp)}
                className="text-gray-400 hover:text-blue-500 transition-colors"
                aria-label="Mostrar ajuda sobre notificação por WhatsApp"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 109 10.5v1a.75.75 0 01-1.5 0v-1a3 3 0 011.44-2.56zM12 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="p-3 bg-blue-50 rounded-md text-sm text-gray-700 mt-2">
              <p className="font-medium mb-1">Como funciona a notificação por WhatsApp:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>O participante que finalizar a pesquisa e informar o telefone receberá uma mensagem</li>
                <li>A mensagem será enviada através do WhatsApp conectado ao sistema</li>
                <li>O conteúdo da mensagem é o que for digitado no campo abaixo</li>
              </ul>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label className="font-medium">Ativar notificação por WhatsApp</Label>
                <p className="text-sm text-gray-500">
                  Ao ativar, os participantes que informarem o telefone receberão uma mensagem
                </p>
              </div>
              <Switch 
                checked={dadosParticipante.notificacaoWhatsApp.ativo}
                onCheckedChange={toggleNotificacaoWhatsApp}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>

            {dadosParticipante.notificacaoWhatsApp.ativo && (
              <div className="space-y-2">
                <Label htmlFor="mensagem-whatsapp">Mensagem para envio</Label>
                <textarea
                  id="mensagem-whatsapp"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Digite sua mensagem de agradecimento..."
                  value={dadosParticipante.notificacaoWhatsApp.mensagem}
                  onChange={(e) => atualizarMensagemWhatsApp(e.target.value)}
                />
                <p className="text-sm text-gray-500">
                  Este campo deve conter os agradecimentos por participar da pesquisa.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seção de Dados do Participante */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Dados do Participante</CardTitle>
          <CardDescription>
            Selecione quais informações adicionais você deseja coletar dos participantes e defina se são obrigatórias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Nome - Sempre obrigatório */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg bg-gray-50">
              <div className="flex-1">
                <Label className="font-medium">Nome</Label>
                <p className="text-sm text-gray-500">Sempre obrigatório</p>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="h-5 w-5 text-green-500" />
                <span className="text-sm text-gray-500">Obrigatório</span>
              </div>
            </div>

            {/* Outros campos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { key: 'faixaEtaria', label: 'Faixa Etária' },
                { key: 'telefone', label: 'Telefone' },
                { key: 'cep', label: 'CEP' },
                { key: 'cidade', label: 'Cidade' },
                { key: 'bairro', label: 'Bairro' },
                { key: 'numero', label: 'Número' },
                { key: 'complemento', label: 'Complemento' },
              ].map(({ key, label }) => (
                <div key={key} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-3">
                    <div>
                      <Label className="font-medium">{label}</Label>
                      <p className="text-sm text-gray-500">
                        {dadosParticipante[key as keyof Omit<DadosParticipantePesquisa, 'notificacaoWhatsApp'>].ativo 
                          ? dadosParticipante[key as keyof Omit<DadosParticipantePesquisa, 'notificacaoWhatsApp'>].obrigatorio 
                            ? 'Obrigatório' 
                            : 'Opcional'
                          : 'Inativo'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={dadosParticipante[key as keyof Omit<DadosParticipantePesquisa, 'notificacaoWhatsApp'>].ativo} 
                        onCheckedChange={() => toggleCampoObrigatorio(key as keyof Omit<DadosParticipantePesquisa, 'notificacaoWhatsApp'>)}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>
                  </div>
                  
                  {/* Opção de tornar obrigatório (só aparece se o campo estiver ativo) */}
                  {dadosParticipante[key as keyof Omit<DadosParticipantePesquisa, 'notificacaoWhatsApp'>].ativo && (
                    <div className="px-3 pb-3 pt-0 border-t border-gray-100 bg-gray-50">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={`${key}-obrigatorio`}
                          checked={dadosParticipante[key as keyof Omit<DadosParticipantePesquisa, 'notificacaoWhatsApp'>].obrigatorio}
                          onCheckedChange={() => toggleObrigatoriedadeCampo(key as keyof Omit<DadosParticipantePesquisa, 'notificacaoWhatsApp'>)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <Label htmlFor={`${key}-obrigatorio`} className="text-sm font-medium text-gray-700">
                          Obrigatório
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
        <Button 
          onClick={handleSavePesquisa} 
          disabled={loading}
          size="lg"
          className="px-6"
        >
          {loading ? 'Salvando...' : 'Salvar e Publicar Pesquisa'}
        </Button>
      </div>
    </div>
  );
}

export default EditarPesquisa;
