import { supabaseClient } from '../lib/supabase';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TableRow, TableCell, Table } from 'docx';

export interface ProjetoLei {
  uid: string;
  id?: number;
  numero: string;
  ano: number;
  titulo: string;
  autor: string;
  coautores: string[];
  data_protocolo: string;
  status: 'em_andamento' | 'aprovado' | 'arquivado';
  ementa: string;
  justificativa: string;
  texto_lei: {
    artigos: Array<{
      texto: string;
      paragrafos?: Array<{
        texto: string;
      }>;
    }>;
    objetivo: string;
    disposicoesFinais: string;
  };
  tags: string[];
  arquivos: any[];
  tramitacao: any[];
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  empresa_uid: string;
  responsavel?: string;
}

export const projetosLeiService = {
  async criar(projeto: Omit<ProjetoLei, 'uid' | 'created_at' | 'updated_at'>, usuarioUid: string) {
    try {
      if (!usuarioUid) {
        throw new Error('Usuário não encontrado. Por favor, tente novamente.');
      }

      const projetoFormatado = {
        ...projeto,
        responsavel: usuarioUid,
        coautores: JSON.stringify(projeto.coautores || []),
        tags: JSON.stringify(projeto.tags || []),
        arquivos: JSON.stringify(projeto.arquivos || []),
        tramitacao: JSON.stringify(projeto.tramitacao || []),
        texto_lei: JSON.stringify(projeto.texto_lei || {})
      };

      const { data, error } = await supabaseClient
        .from('gbp_projetos_lei')
        .insert([projetoFormatado])
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao criar projeto:', error);
        if (error.code === '23505') {
          throw new Error('Já existe um projeto com este número e ano.');
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
      throw error;
    }
  },

  async atualizar(uid: string, projeto: Partial<ProjetoLei>, usuarioUid: string) {
    try {
      if (!usuarioUid) {
        throw new Error('Usuário não encontrado. Por favor, tente novamente.');
      }

      const { data, error } = await supabaseClient
        .from('gbp_projetos_lei')
        .update({
          ...projeto,
          responsavel: usuarioUid,
          updated_at: new Date().toISOString()
        })
        .eq('uid', uid)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar projeto:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro ao atualizar projeto:', error);
      throw error;
    }
  },

  async deletar(uid: string, usuarioUid: string) {
    try {
      if (!usuarioUid) {
        throw new Error('Usuário não encontrado. Por favor, tente novamente.');
      }

      const { error } = await supabaseClient
        .from('gbp_projetos_lei')
        .update({ 
          deleted_at: new Date().toISOString(),
          responsavel: usuarioUid
        })
        .eq('uid', uid);

      if (error) {
        console.error('Erro ao deletar projeto:', error);
        throw error;
      }
    } catch (error) {
      console.error('Erro ao deletar projeto:', error);
      throw error;
    }
  },

  async buscarPorId(uid: string) {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_projetos_lei')
        .select(`
          *,
          empresa:empresa_uid (
            nome
          )
        `)
        .eq('uid', uid)
        .is('deleted_at', null)
        .single();

      if (error) {
        console.error('Erro ao buscar projeto:', error);
        throw error;
      }

      if (!data) {
        return null;
      }

      // Parse dos campos JSON
      let textoLei;
      try {
        textoLei = typeof data.texto_lei === 'string' ? JSON.parse(data.texto_lei) : data.texto_lei || {};
      } catch (e) {
        console.error('Erro ao fazer parse do texto_lei:', e);
        textoLei = {};
      }

      let arquivos;
      try {
        arquivos = typeof data.arquivos === 'string' ? JSON.parse(data.arquivos) : data.arquivos || [];
        console.log('Arquivos após parse:', arquivos);
      } catch (e) {
        console.error('Erro ao fazer parse dos arquivos:', e);
        arquivos = [];
      }

      return {
        ...data,
        coautores: typeof data.coautores === 'string' ? JSON.parse(data.coautores) : (data.coautores || []),
        tags: typeof data.tags === 'string' ? JSON.parse(data.tags) : (data.tags || []),
        arquivos: arquivos,
        tramitacao: typeof data.tramitacao === 'string' ? JSON.parse(data.tramitacao) : (data.tramitacao || []),
        texto_lei: {
          artigos: Array.isArray(textoLei.artigos) ? textoLei.artigos : [],
          objetivo: textoLei.objetivo || '',
          disposicoesFinais: textoLei.disposicoesFinais || ''
        }
      };
    } catch (error) {
      console.error('Erro ao buscar projeto:', error);
      throw error;
    }
  },

  async listar(empresaUid: string) {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_projetos_lei')
        .select('*')
        .eq('empresa_uid', empresaUid)
        .is('deleted_at', null)
        .order('ano', { ascending: false })
        .order('numero', { ascending: false });

      if (error) {
        console.error('Erro ao listar projetos:', error);
        throw error;
      }

      // Parse dos campos JSON
      return data.map(projeto => ({
        ...projeto,
        coautores: typeof projeto.coautores === 'string' ? JSON.parse(projeto.coautores) : (projeto.coautores || []),
        tags: typeof projeto.tags === 'string' ? JSON.parse(projeto.tags) : (projeto.tags || []),
        arquivos: typeof projeto.arquivos === 'string' ? JSON.parse(projeto.arquivos) : (projeto.arquivos || []),
        tramitacao: typeof projeto.tramitacao === 'string' ? JSON.parse(projeto.tramitacao) : (projeto.tramitacao || []),
        texto_lei: typeof projeto.texto_lei === 'string' ? JSON.parse(projeto.texto_lei) : projeto.texto_lei
      }));
    } catch (error) {
      console.error('Erro ao listar projetos:', error);
      throw error;
    }
  },

  async buscarPorAnoNumero(ano: number, numero: string, empresaUid: string) {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_projetos_lei')
        .select('*')
        .eq('ano', ano)
        .eq('numero', numero)
        .eq('empresa_uid', empresaUid)
        .is('deleted_at', null)
        .single();

      if (error) {
        console.error('Erro ao buscar projeto por ano/número:', error);
        throw error;
      }

      // Parse dos campos JSON
      if (data) {
        data.coautores = typeof data.coautores === 'string' ? JSON.parse(data.coautores) : (data.coautores || []);
        data.tags = typeof data.tags === 'string' ? JSON.parse(data.tags) : (data.tags || []);
        data.arquivos = typeof data.arquivos === 'string' ? JSON.parse(data.arquivos) : (data.arquivos || []);
        data.tramitacao = typeof data.tramitacao === 'string' ? JSON.parse(data.tramitacao) : (data.tramitacao || []);
        data.texto_lei = typeof data.texto_lei === 'string' ? JSON.parse(data.texto_lei) : data.texto_lei;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar projeto por ano/número:', error);
      throw error;
    }
  },

  async buscarPorStatus(status: ProjetoLei['status'], empresaUid: string) {
    try {
      const { data, error } = await supabaseClient
        .from('gbp_projetos_lei')
        .select('*')
        .eq('status', status)
        .eq('empresa_uid', empresaUid)
        .is('deleted_at', null)
        .order('ano', { ascending: false })
        .order('numero', { ascending: false });

      if (error) {
        console.error('Erro ao buscar projetos por status:', error);
        throw error;
      }

      // Parse dos campos JSON
      return data.map(projeto => ({
        ...projeto,
        coautores: typeof projeto.coautores === 'string' ? JSON.parse(projeto.coautores) : (projeto.coautores || []),
        tags: typeof projeto.tags === 'string' ? JSON.parse(projeto.tags) : (projeto.tags || []),
        arquivos: typeof projeto.arquivos === 'string' ? JSON.parse(projeto.arquivos) : (projeto.arquivos || []),
        tramitacao: typeof projeto.tramitacao === 'string' ? JSON.parse(projeto.tramitacao) : (projeto.tramitacao || []),
        texto_lei: typeof projeto.texto_lei === 'string' ? JSON.parse(projeto.texto_lei) : projeto.texto_lei
      }));
    } catch (error) {
      console.error('Erro ao buscar projetos por status:', error);
      throw error;
    }
  },

  async exportarWord(uid: string): Promise<Blob> {
    try {
      const projeto = await this.buscarPorId(uid);
      if (!projeto) throw new Error('Projeto não encontrado');

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: `PROJETO DE LEI Nº ${projeto.numero}/${projeto.ano}`,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: projeto.ementa,
              heading: HeadingLevel.HEADING_2,
              alignment: AlignmentType.CENTER,
              spacing: { before: 400, after: 400 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "EMENTA: ",
                  bold: true,
                }),
                new TextRun(projeto.ementa),
              ],
              spacing: { before: 400, after: 400 },
            }),
            new Paragraph({
              text: "AUTORIA",
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 400 },
            }),
            new Paragraph({
              text: `Autor: ${projeto.autor}`,
              spacing: { before: 200 },
            }),
            ...(projeto.coautores && projeto.coautores.length > 0 ? [
              new Paragraph({
                text: `Coautores: ${Array.isArray(projeto.coautores) ? projeto.coautores.join(", ") : projeto.coautores}`,
                spacing: { before: 200, after: 400 },
              }),
            ] : []),
            new Paragraph({
              text: "OBJETIVO",
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 400 },
            }),
            new Paragraph({
              text: projeto.texto_lei.objetivo,
              spacing: { before: 200, after: 400 },
            }),
            new Paragraph({
              text: "ARTIGOS",
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 400 },
            }),
            ...projeto.texto_lei.artigos.map(artigo => 
              new Paragraph({
                text: `Art. ${artigo.numero}º - ${artigo.texto}`,
                spacing: { before: 200 },
              })
            ),
            new Paragraph({
              text: "DISPOSIÇÕES FINAIS",
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 400 },
            }),
            new Paragraph({
              text: projeto.texto_lei.disposicoesFinais,
              spacing: { before: 200, after: 400 },
            }),
            new Paragraph({
              text: "TRAMITAÇÃO",
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 400 },
            }),
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph("Data")] }),
                    new TableCell({ children: [new Paragraph("Status")] }),
                    new TableCell({ children: [new Paragraph("Descrição")] }),
                  ],
                }),
                ...projeto.tramitacao.map(t => 
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph(new Date(t.data).toLocaleDateString('pt-BR'))] }),
                      new TableCell({ children: [new Paragraph(t.status)] }),
                      new TableCell({ children: [new Paragraph(t.descricao)] }),
                    ],
                  })
                ),
              ],
            }),
          ],
        }],
      });

      const buffer = await Packer.toBlob(doc);
      return buffer;
    } catch (error) {
      console.error('Erro ao exportar projeto para Word:', error);
      throw error;
    }
  },
};
