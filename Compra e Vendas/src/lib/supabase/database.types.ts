// Tipos manuais refletindo as VIEWS-PONTE do schema "public" que espelham
// as tabelas reais do schema "marketplace" (ver sql/07_public_bridge.sql).
// O PostgREST desta instância self-hosted não expõe "marketplace" diretamente,
// por isso o client aponta para "public" (chave raiz abaixo).
// Mantidos em sincronia manual com os scripts em /sql.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProductCondition = "novo" | "usado";
export type ProductStatus = "ativo" | "pausado" | "vendido" | "removido";
export type UserRole = "usuario" | "administrador";
export type UserStatus = "ativo" | "inativo" | "suspenso";
export type ReportStatus = "pendente" | "em_analise" | "resolvido" | "arquivado";
export type BannerPosition = "home_topo" | "home_meio" | "barra_lateral" | "listagem";

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string;
          id_autenticacao: string;
          email: string;
          nome: string;
          telefone: string | null;
          condominio: string | null;
          endereco: string | null;
          cidade: string | null;
          estado: string | null;
          cep: string | null;
          foto_url: string | null;
          biografia: string | null;
          latitude: number | null;
          longitude: number | null;
          avaliacao: number;
          total_avaliacoes: number;
          total_anuncios: number;
          total_vendidos: number;
          papel: UserRole;
          situacao: UserStatus;
          email_confirmado: boolean;
          slug: string | null;
          criado_em: string;
          atualizado_em: string;
          ultimo_acesso: string | null;
        };
        Insert: {
          id?: string;
          id_autenticacao: string;
          email: string;
          nome: string;
          telefone?: string | null;
          condominio?: string | null;
          endereco?: string | null;
          cidade?: string | null;
          estado?: string | null;
          cep?: string | null;
          foto_url?: string | null;
          biografia?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          avaliacao?: number;
          total_avaliacoes?: number;
          total_anuncios?: number;
          total_vendidos?: number;
          papel?: UserRole;
          situacao?: UserStatus;
          email_confirmado?: boolean;
          slug?: string | null;
          criado_em?: string;
          atualizado_em?: string;
          ultimo_acesso?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["usuarios"]["Insert"]>;
        Relationships: [];
      };
      categorias: {
        Row: {
          id: string;
          nome: string;
          slug: string;
          icone: string | null;
          cor: string | null;
          ordem: number;
          categoria_pai_id: string | null;
          ativo: boolean;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          nome: string;
          slug: string;
          icone?: string | null;
          cor?: string | null;
          ordem?: number;
          categoria_pai_id?: string | null;
          ativo?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categorias"]["Insert"]>;
        Relationships: [];
      };
      subcategorias: {
        Row: {
          id: string;
          categoria_id: string;
          nome: string;
          slug: string;
          ordem: number;
          ativo: boolean;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          categoria_id: string;
          nome: string;
          slug: string;
          ordem?: number;
          ativo?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subcategorias"]["Insert"]>;
        Relationships: [];
      };
      anuncios: {
        Row: {
          id: string;
          usuario_id: string;
          titulo: string;
          slug: string;
          descricao: string | null;
          preco: number;
          categoria_id: string | null;
          subcategoria_id: string | null;
          condicao: ProductCondition;
          quantidade: number;
          cidade: string | null;
          condominio: string | null;
          endereco: string | null;
          latitude: number | null;
          longitude: number | null;
          visualizacoes: number;
          situacao: ProductStatus;
          destaque: boolean;
          negociavel: boolean;
          aceita_troca: boolean;
          video_url: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          titulo: string;
          slug?: string;
          descricao?: string | null;
          preco: number;
          categoria_id?: string | null;
          subcategoria_id?: string | null;
          condicao: ProductCondition;
          quantidade?: number;
          cidade?: string | null;
          condominio?: string | null;
          endereco?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          visualizacoes?: number;
          situacao?: ProductStatus;
          destaque?: boolean;
          negociavel?: boolean;
          aceita_troca?: boolean;
          video_url?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["anuncios"]["Insert"]>;
        Relationships: [];
      };
      anuncio_imagens: {
        Row: {
          id: string;
          anuncio_id: string;
          url: string;
          ordem: number;
          criado_em: string;
        };
        Insert: {
          id?: string;
          anuncio_id: string;
          url: string;
          ordem?: number;
          criado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["anuncio_imagens"]["Insert"]>;
        Relationships: [];
      };
      anuncio_videos: {
        Row: {
          id: string;
          anuncio_id: string;
          url: string;
          thumbnail_url: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          anuncio_id: string;
          url: string;
          thumbnail_url?: string | null;
          criado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["anuncio_videos"]["Insert"]>;
        Relationships: [];
      };
      favoritos: {
        Row: {
          id: string;
          usuario_id: string;
          anuncio_id: string;
          criado_em: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          anuncio_id: string;
          criado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["favoritos"]["Insert"]>;
        Relationships: [];
      };
      conversas: {
        Row: {
          id: string;
          anuncio_id: string;
          comprador_id: string;
          vendedor_id: string;
          ultima_mensagem_em: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          anuncio_id: string;
          comprador_id: string;
          vendedor_id: string;
          ultima_mensagem_em?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["conversas"]["Insert"]>;
        Relationships: [];
      };
      mensagens: {
        Row: {
          id: string;
          conversa_id: string;
          remetente_id: string;
          conteudo: string | null;
          anexos: Json;
          lida_em: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          conversa_id: string;
          remetente_id: string;
          conteudo?: string | null;
          anexos?: Json;
          lida_em?: string | null;
          criado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mensagens"]["Insert"]>;
        Relationships: [];
      };
      anuncio_visualizacoes: {
        Row: {
          id: string;
          anuncio_id: string;
          visitante_id: string | null;
          endereco_ip: string | null;
          user_agent: string | null;
          visualizado_em: string;
        };
        Insert: {
          id?: string;
          anuncio_id: string;
          visitante_id?: string | null;
          endereco_ip?: string | null;
          user_agent?: string | null;
          visualizado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["anuncio_visualizacoes"]["Insert"]>;
        Relationships: [];
      };
      denuncias: {
        Row: {
          id: string;
          anuncio_id: string;
          denunciante_id: string;
          motivo: string;
          detalhes: string | null;
          situacao: ReportStatus;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          anuncio_id: string;
          denunciante_id: string;
          motivo: string;
          detalhes?: string | null;
          situacao?: ReportStatus;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["denuncias"]["Insert"]>;
        Relationships: [];
      };
      banners: {
        Row: {
          id: string;
          titulo: string | null;
          descricao: string | null;
          imagem_desktop_url: string;
          imagem_mobile_url: string | null;
          link: string | null;
          posicao: BannerPosition;
          data_inicio: string;
          data_fim: string | null;
          ativo: boolean;
          cliques: number;
          impressoes: number;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          titulo?: string | null;
          descricao?: string | null;
          imagem_desktop_url: string;
          imagem_mobile_url?: string | null;
          link?: string | null;
          posicao?: BannerPosition;
          data_inicio?: string;
          data_fim?: string | null;
          ativo?: boolean;
          cliques?: number;
          impressoes?: number;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["banners"]["Insert"]>;
        Relationships: [];
      };
      notificacoes: {
        Row: {
          id: string;
          usuario_id: string;
          tipo: string;
          titulo: string;
          message: string | null;
          data: Json;
          lida: boolean;
          criado_em: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          tipo: string;
          titulo: string;
          mensagem?: string | null;
          dados?: Json;
          lida?: boolean;
          criado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notificacoes"]["Insert"]>;
        Relationships: [];
      };
      configuracoes: {
        Row: {
          id: string;
          chave: string;
          valor: Json;
          descricao: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          chave: string;
          valor?: Json;
          descricao?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["configuracoes"]["Insert"]>;
        Relationships: [];
      };
      atributos_categoria: {
        Row: {
          id: string;
          categoria_id: string;
          nome: string;
          chave: string;
          tipo: "texto" | "numero" | "selecao" | "multipla_selecao";
          opcoes: Json | null;
          obrigatorio: boolean;
          ordem: number;
          ativo: boolean;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          categoria_id: string;
          nome: string;
          chave: string;
          tipo: "texto" | "numero" | "selecao" | "multipla_selecao";
          opcoes?: Json | null;
          obrigatorio?: boolean;
          ordem?: number;
          ativo?: boolean;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["atributos_categoria"]["Insert"]>;
        Relationships: [];
      };
      anuncio_atributos: {
        Row: {
          id: string;
          anuncio_id: string;
          atributo_id: string;
          valor: string;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          anuncio_id: string;
          atributo_id: string;
          valor: string;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["anuncio_atributos"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      anuncios_publicos: {
        Row: {
          id: string;
          titulo: string;
          slug: string;
          descricao: string | null;
          preco: number;
          condicao: ProductCondition;
          quantidade: number;
          cidade: string | null;
          condominio: string | null;
          endereco: string | null;
          latitude: number | null;
          longitude: number | null;
          visualizacoes: number;
          situacao: ProductStatus;
          destaque: boolean;
          negociavel: boolean;
          aceita_troca: boolean;
          video_url: string | null;
          criado_em: string;
          atualizado_em: string;
          categoria_id: string | null;
          categoria_nome: string | null;
          categoria_slug: string | null;
          subcategoria_id: string | null;
          subcategoria_nome: string | null;
          subcategoria_slug: string | null;
          vendedor_id: string | null;
          vendedor_nome: string | null;
          vendedor_slug: string | null;
          vendedor_foto_url: string | null;
          vendedor_cidade: string | null;
          vendedor_avaliacao: number | null;
          capa_url: string | null;
          total_imagens: number;
        };
        Relationships: [];
      };
      perfis_vendedores: {
        Row: {
          id: string;
          slug: string | null;
          nome: string;
          foto_url: string | null;
          biografia: string | null;
          cidade: string | null;
          estado: string | null;
          avaliacao: number;
          total_avaliacoes: number;
          criado_em: string;
          total_anuncios_ativos: number;
          total_anuncios_vendidos: number;
        };
        Relationships: [];
      };
      conversas_com_ultima_message: {
        Row: {
          id: string;
          anuncio_id: string;
          comprador_id: string;
          vendedor_id: string;
          criado_em: string;
          ultima_mensagem_em: string | null;
          anuncio_titulo: string;
          anuncio_slug: string;
          anuncio_imagem_url: string | null;
          ultima_mensagem_conteudo: string | null;
          ultima_mensagem_remetente_id: string | null;
          ultima_mensagem_criado_em: string | null;
          nao_lidas: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      incrementar_visualizacoes_anuncio: {
        Args: { p_anuncio_id: string };
        Returns: undefined;
      };
      obter_id_usuario_atual: {
        Args: Record<string, never>;
        Returns: string;
      };
      eh_administrador: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      slugify: {
        Args: { input: string };
        Returns: string;
      };
      autenticar_usuario: {
        Args: { p_email: string; p_senha: string };
        Returns: {
          autenticado: boolean;
          usuario_uid: string;
          autenticacao_uid: string;
          email: string;
          nome: string;
          papel: string;
          email_confirmado: boolean;
        }[];
      };
      criar_usuario: {
        Args: {
          p_email: string;
          p_senha: string;
          p_nome: string;
          p_telefone?: string | null;
          p_condominio?: string | null;
          p_endereco?: string | null;
          p_cidade?: string | null;
          p_estado?: string | null;
          p_cep?: string | null;
        };
        Returns: {
          usuario_uid: string;
          autenticacao_uid: string;
          email: string;
          nome: string;
        }[];
      };
    };
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"];
