// Script de renomeação do marketplace: inglês → português.
// Aplica em sql/*.sql e src/**/*.{ts,tsx}.
//
// Uso:
//   node scripts/renomear_portugues.mjs --dry-run
//   node scripts/renomear_portugues.mjs
//   node scripts/renomear_portugues.mjs --only-sql
//   node scripts/renomear_portugues.mjs --only-ts
//   node scripts/renomear_portugues.mjs --migration

import { readFile, writeFile, readdir } from "node:fs/promises";
import { resolve, join, relative, extname, basename } from "node:path";

const ROOT = resolve(process.cwd());
const SQL_DIR = join(ROOT, "sql");
const SRC_DIR = join(ROOT, "src");

const TABLES = {
  users: "usuarios",
  categories: "categorias",
  subcategories: "subcategorias",
  products: "anuncios",
  product_images: "anuncio_imagens",
  product_videos: "anuncio_videos",
  favorites: "favoritos",
  chat_rooms: "conversas",
  chat_messages: "mensagens",
  product_views: "anuncio_visualizacoes",
  product_reports: "denuncias",
  banner_ads: "banners",
  notifications: "notificacoes",
  settings: "configuracoes",
  // views
  products_public: "anuncios_publicos",
  seller_profiles: "perfis_vendedores",
  chat_rooms_with_last_message: "conversas_com_ultima_mensagem",
};

const COLUMNS = {
  // usuarios
  auth_id: "id_autenticacao",
  name: "nome",
  phone: "telefone",
  condominium: "condominio",
  address: "endereco",
  city: "cidade",
  state: "estado",
  zip: "cep",
  photo_url: "foto_url",
  bio: "biografia",
  latitude: "latitude",
  longitude: "longitude",
  rating: "avaliacao",
  total_reviews: "total_avaliacoes",
  total_ads: "total_anuncios",
  total_sold: "total_vendidos",
  role: "papel",
  status: "situacao",
  email_confirmed: "email_confirmado",
  created_at: "criado_em",
  updated_at: "atualizado_em",
  last_access: "ultimo_acesso",
  // categorias
  category_id: "categoria_id",
  subcategory_id: "subcategoria_id",
  parent_id: "categoria_pai_id",
  icon: "icone",
  color: "cor",
  order: "ordem",
  is_active: "ativo",
  // anuncios
  user_id: "usuario_id",
  title: "titulo",
  description: "descricao",
  price: "preco",
  condition: "condicao",
  quantity: "quantidade",
  views: "visualizacoes",
  featured: "destaque",
  negotiable: "negociavel",
  accepts_trade: "aceita_troca",
  video_url: "video_url",
  search_vector: "vetor_busca",
  // imagens/videos
  product_id: "anuncio_id",
  thumbnail_url: "thumbnail_url",
  // chat
  buyer_id: "comprador_id",
  seller_id: "vendedor_id",
  last_message_at: "ultima_mensagem_em",
  // mensagens
  room_id: "conversa_id",
  sender_id: "remetente_id",
  content: "conteudo",
  attachments: "anexos",
  read_at: "lida_em",
  // visualizacoes
  viewer_id: "visitante_id",
  ip_address: "endereco_ip",
  user_agent: "user_agent",
  viewed_at: "visualizado_em",
  // denuncias
  reporter_id: "denunciante_id",
  reason: "motivo",
  details: "detalhes",
  // banners
  desktop_image_url: "imagem_desktop_url",
  mobile_image_url: "imagem_mobile_url",
  position: "posicao",
  start_date: "data_inicio",
  end_date: "data_fim",
  active: "ativo",
  clicks: "cliques",
  impressions: "impressoes",
  // notificacoes
  type: "tipo",
  message: "mensagem",
  data: "dados",
  read: "lida",
  // configuracoes
  key: "chave",
  value: "valor",
  // view columns
  category_name: "categoria_nome",
  category_slug: "categoria_slug",
  subcategory_name: "subcategoria_nome",
  subcategory_slug: "subcategoria_slug",
  seller_name: "vendedor_nome",
  seller_slug: "vendedor_slug",
  seller_photo_url: "vendedor_foto_url",
  seller_city: "vendedor_cidade",
  seller_rating: "vendedor_avaliacao",
  cover_image_url: "capa_url",
  images_count: "total_imagens",
  active_ads_count: "total_anuncios_ativos",
  sold_ads_count: "total_anuncios_vendidos",
  product_title: "anuncio_titulo",
  product_slug: "anuncio_slug",
  product_image_url: "anuncio_imagem_url",
  last_message_content: "ultima_mensagem_conteudo",
  last_message_sender_id: "ultima_mensagem_remetente_id",
  last_message_created_at: "ultima_mensagem_criado_em",
  unread_count: "nao_lidas",
  // args
  p_product_id: "p_anuncio_id",
};

const FUNCTIONS = {
  update_updated_at_column: "atualizar_coluna_atualizado_em",
  set_user_slug: "definir_slug_usuario",
  set_product_slug: "definir_slug_anuncio",
  handle_new_user: "tratar_novo_usuario",
  get_current_user_id: "obter_id_usuario_atual",
  is_admin: "eh_administrador",
  increment_product_views: "incrementar_visualizacoes_anuncio",
};

const CONSTRAINTS = {
  no_self_chat: "sem_chat_proprio",
};

const ENUMS = {
  '"new"': '"novo"',
  '"used"': '"usado"',
  "'new'": "'novo'",
  "'used'": "'usado'",
  '"active"': '"ativo"',
  '"paused"': '"pausado"',
  '"sold"': '"vendido"',
  '"deleted"': '"removido"',
  "'active'": "'ativo'",
  "'paused'": "'pausado'",
  "'sold'": "'vendido'",
  "'deleted'": "'removido'",
  '"user"': '"usuario"',
  '"admin"': '"administrador"',
  "'user'": "'usuario'",
  "'admin'": "'administrador'",
  '"inactive"': '"inativo"',
  '"suspended"': '"suspenso"',
  "'inactive'": "'inativo'",
  "'suspended'": "'suspenso'",
  '"pending"': '"pendente"',
  '"reviewing"': '"em_analise"',
  '"resolved"': '"resolvido"',
  '"dismissed"': '"arquivado"',
  "'pending'": "'pendente'",
  "'reviewing'": "'em_analise'",
  "'resolved'": "'resolvido'",
  "'dismissed'": "'arquivado'",
  '"home_top"': '"home_topo"',
  '"home_middle"': '"home_meio"',
  '"sidebar"': '"barra_lateral"',
  '"listing"': '"listagem"',
  "'home_top'": "'home_topo'",
  "'home_middle'": "'home_meio'",
  "'sidebar'": "'barra_lateral'",
  "'listing'": "'listagem'",
};

const DOT_SKIP_PREFIXES = new Set([
  "siteConfig",
  "file",
  "fieldErrors",
  "state",
  "target",
  "e",
  "event",
  "File",
  "window",
  "document",
  "navigator",
]);

function makeWordReplacements(mapping, caseSensitive = true) {
  const entries = Object.entries(mapping).sort((a, b) => b[0].length - a[0].length);
  return entries.map(([k, v]) => {
    const flags = caseSensitive ? "g" : "gi";
    return { pattern: new RegExp(`\\b${escapeRegex(k)}\\b`, flags), to: v };
  });
}

function makeEnumReplacements() {
  return Object.entries(ENUMS)
    .sort((a, b) => b[0].length - a[0].length)
    .map(([k, v]) => ({ pattern: new RegExp(escapeRegex(k), "g"), to: v }));
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const TABLE_REPLS = makeWordReplacements(TABLES);
const COLUMN_REPLS = makeWordReplacements(COLUMNS);
const FUNCTION_REPLS = makeWordReplacements(FUNCTIONS);
const CONSTRAINT_REPLS = makeWordReplacements(CONSTRAINTS);
const ENUM_REPLS = makeEnumReplacements();

function applyReplacements(text, repls) {
  for (const { pattern, to } of repls) {
    text = text.replace(pattern, to);
  }
  return text;
}

function quotedColumnReplace(text) {
  // strings entre aspas duplas
  text = text.replace(/"([^"]+)"/g, (m, inner) => {
    const newInner = applyReplacements(applyReplacements(inner, COLUMN_REPLS), TABLE_REPLS);
    return `"${newInner}"`;
  });
  // strings entre aspas simples (multi-caractere)
  text = text.replace(/'([^']+)'/g, (m, inner) => {
    const newInner = applyReplacements(applyReplacements(inner, COLUMN_REPLS), TABLE_REPLS);
    return `'${newInner}'`;
  });
  return text;
}

function dotPropertyReplace(text) {
  const columns = Object.keys(COLUMNS);
  const pattern = new RegExp(
    `(\\w+)(\\??\\.\\b(?:${columns.map(escapeRegex).join("|")})\\b)`,
    "g"
  );
  return text.replace(pattern, (m, prefix, rest) => {
    const col = rest.replace(/^\?\./, "");
    if (DOT_SKIP_PREFIXES.has(prefix)) return m;
    const newCol = COLUMNS[col];
    return newCol ? `${prefix}${rest.includes("?") ? "?." : "."}${newCol}` : m;
  });
}

function objectKeyReplace(text, filename) {
  const columns = Object.keys(COLUMNS);
  const pattern = new RegExp(
    `(?<=[{,;\\n\\s])(${columns.map(escapeRegex).join("|")})\\s*:`,
    "g"
  );
  return text.replace(pattern, (m, key) => {
    const newKey = COLUMNS[key];
    return newKey ? `${newKey}:` : m;
  });
}

function typeKeyReplace(text) {
  const tables = Object.keys(TABLES);
  const pattern = new RegExp(`(?<=[{,\\n\\s])(${tables.map(escapeRegex).join("|")})\\s*:`, "g");
  return text.replace(pattern, (m, key) => (TABLES[key] ? `${TABLES[key]}:` : m));
}

function sqlProcess(text) {
  text = applyReplacements(text, TABLE_REPLS);
  text = applyReplacements(text, COLUMN_REPLS);
  text = applyReplacements(text, FUNCTION_REPLS);
  text = applyReplacements(text, CONSTRAINT_REPLS);
  text = applyReplacements(text, ENUM_REPLS);
  text = text.replace(/"ordem"/g, "ordem");
  return text;
}

function typesProcess(text) {
  text = applyReplacements(text, ENUM_REPLS);
  text = typeKeyReplace(text);
  text = dotPropertyReplace(text);
  text = objectKeyReplace(text, "database.types.ts");
  text = applyReplacements(text, TABLE_REPLS);
  text = applyReplacements(text, FUNCTION_REPLS);
  text = quotedColumnReplace(text);
  return text;
}

function tsProcess(text, filename) {
  text = applyReplacements(text, ENUM_REPLS);
  text = quotedColumnReplace(text);
  text = dotPropertyReplace(text);
  text = objectKeyReplace(text, filename);
  text = applyReplacements(text, TABLE_REPLS);
  text = applyReplacements(text, FUNCTION_REPLS);
  return text;
}

function tsxProcess(text, filename) {
  text = applyReplacements(text, ENUM_REPLS);
  text = quotedColumnReplace(text);
  text = dotPropertyReplace(text);
  // Em .tsx nao fazemos objectKey generico para proteger metadata/JSON-LD
  text = applyReplacements(text, TABLE_REPLS);
  text = applyReplacements(text, FUNCTION_REPLS);
  return text;
}

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  for (const entry of entries) {
    if (entry.isFile()) {
      const full = join(dir, entry.parentPath ? relative(dir, entry.parentPath) : "", entry.name);
      yield full;
    }
  }
}

function generateMigration() {
  const lines = [
    "-- ============================================================================",
    "-- Marketplace - Migracao: renomear tabelas e colunas para o portugues",
    "-- Execute uma unica vez na base de dados existente.",
    "-- ============================================================================",
    "",
    "DROP TRIGGER IF EXISTS trg_users_before_insert ON marketplace.users;",
    "DROP TRIGGER IF EXISTS trg_products_before_insert ON marketplace.products;",
    "DROP TRIGGER IF EXISTS trg_auth_users_insert ON auth.users;",
    "",
  ];

  // Colunas a renomear (tabela, antigo, novo)
  const columnAlters = [
    ["users", "auth_id", "id_autenticacao"],
    ["users", "name", "nome"],
    ["users", "phone", "telefone"],
    ["users", "condominium", "condominio"],
    ["users", "address", "endereco"],
    ["users", "city", "cidade"],
    ["users", "state", "estado"],
    ["users", "zip", "cep"],
    ["users", "photo_url", "foto_url"],
    ["users", "bio", "biografia"],
    ["users", "rating", "avaliacao"],
    ["users", "total_reviews", "total_avaliacoes"],
    ["users", "total_ads", "total_anuncios"],
    ["users", "total_sold", "total_vendidos"],
    ["users", "role", "papel"],
    ["users", "status", "situacao"],
    ["users", "email_confirmed", "email_confirmado"],
    ["users", "created_at", "criado_em"],
    ["users", "updated_at", "atualizado_em"],
    ["users", "last_access", "ultimo_acesso"],
    ["categories", "name", "nome"],
    ["categories", "icon", "icone"],
    ["categories", "color", "cor"],
    ["categories", '"order"', "ordem"],
    ["categories", "parent_id", "categoria_pai_id"],
    ["categories", "is_active", "ativo"],
    ["categories", "created_at", "criado_em"],
    ["categories", "updated_at", "atualizado_em"],
    ["subcategories", "category_id", "categoria_id"],
    ["subcategories", "name", "nome"],
    ["subcategories", '"order"', "ordem"],
    ["subcategories", "is_active", "ativo"],
    ["subcategories", "created_at", "criado_em"],
    ["subcategories", "updated_at", "atualizado_em"],
    ["products", "user_id", "usuario_id"],
    ["products", "title", "titulo"],
    ["products", "description", "descricao"],
    ["products", "price", "preco"],
    ["products", "category_id", "categoria_id"],
    ["products", "subcategory_id", "subcategoria_id"],
    ["products", "condition", "condicao"],
    ["products", "quantity", "quantidade"],
    ["products", "city", "cidade"],
    ["products", "condominium", "condominio"],
    ["products", "address", "endereco"],
    ["products", "views", "visualizacoes"],
    ["products", "status", "situacao"],
    ["products", "featured", "destaque"],
    ["products", "negotiable", "negociavel"],
    ["products", "accepts_trade", "aceita_troca"],
    ["products", "search_vector", "vetor_busca"],
    ["products", "created_at", "criado_em"],
    ["products", "updated_at", "atualizado_em"],
    ["product_images", "product_id", "anuncio_id"],
    ["product_images", '"order"', "ordem"],
    ["product_images", "created_at", "criado_em"],
    ["product_videos", "product_id", "anuncio_id"],
    ["product_videos", "created_at", "criado_em"],
    ["favorites", "user_id", "usuario_id"],
    ["favorites", "product_id", "anuncio_id"],
    ["favorites", "created_at", "criado_em"],
    ["chat_rooms", "product_id", "anuncio_id"],
    ["chat_rooms", "buyer_id", "comprador_id"],
    ["chat_rooms", "seller_id", "vendedor_id"],
    ["chat_rooms", "last_message_at", "ultima_mensagem_em"],
    ["chat_rooms", "created_at", "criado_em"],
    ["chat_rooms", "updated_at", "atualizado_em"],
    ["chat_messages", "room_id", "conversa_id"],
    ["chat_messages", "sender_id", "remetente_id"],
    ["chat_messages", "content", "conteudo"],
    ["chat_messages", "attachments", "anexos"],
    ["chat_messages", "read_at", "lida_em"],
    ["chat_messages", "created_at", "criado_em"],
    ["product_views", "product_id", "anuncio_id"],
    ["product_views", "viewer_id", "visitante_id"],
    ["product_views", "ip_address", "endereco_ip"],
    ["product_views", "viewed_at", "visualizado_em"],
    ["product_reports", "product_id", "anuncio_id"],
    ["product_reports", "reporter_id", "denunciante_id"],
    ["product_reports", "reason", "motivo"],
    ["product_reports", "details", "detalhes"],
    ["product_reports", "status", "situacao"],
    ["product_reports", "created_at", "criado_em"],
    ["product_reports", "updated_at", "atualizado_em"],
    ["banner_ads", "title", "titulo"],
    ["banner_ads", "description", "descricao"],
    ["banner_ads", "desktop_image_url", "imagem_desktop_url"],
    ["banner_ads", "mobile_image_url", "imagem_mobile_url"],
    ["banner_ads", "position", "posicao"],
    ["banner_ads", "start_date", "data_inicio"],
    ["banner_ads", "end_date", "data_fim"],
    ["banner_ads", "active", "ativo"],
    ["banner_ads", "clicks", "cliques"],
    ["banner_ads", "impressions", "impressoes"],
    ["banner_ads", "created_at", "criado_em"],
    ["banner_ads", "updated_at", "atualizado_em"],
    ["notifications", "user_id", "usuario_id"],
    ["notifications", "type", "tipo"],
    ["notifications", "title", "titulo"],
    ["notifications", "message", "mensagem"],
    ["notifications", "data", "dados"],
    ["notifications", "read", "lida"],
    ["notifications", "created_at", "criado_em"],
    ["settings", "key", "chave"],
    ["settings", "value", "valor"],
    ["settings", "description", "descricao"],
    ["settings", "created_at", "criado_em"],
    ["settings", "updated_at", "atualizado_em"],
  ];

  lines.push("-- Renomeia colunas");
  for (const [table, oldCol, newCol] of columnAlters) {
    lines.push(`ALTER TABLE marketplace.${table} RENAME COLUMN ${oldCol} TO ${newCol};`);
  }
  lines.push("");

  lines.push("-- Renomeia tabelas");
  for (const [old, neu] of Object.entries(TABLES)) {
    if (["products_public", "seller_profiles", "chat_rooms_with_last_message"].includes(old)) continue;
    lines.push(`ALTER TABLE marketplace.${old} RENAME TO ${neu};`);
  }
  lines.push("");

  lines.push("-- Renomeia constraints");
  lines.push("ALTER TABLE marketplace.conversas RENAME CONSTRAINT no_self_chat TO sem_chat_proprio;");
  lines.push("");

  lines.push("-- Atualiza check constraints");
  lines.push("ALTER TABLE marketplace.usuarios DROP CONSTRAINT IF EXISTS users_role_check;");
  lines.push("ALTER TABLE marketplace.usuarios ADD CONSTRAINT users_role_check CHECK (papel IN ('usuario','administrador'));");
  lines.push("ALTER TABLE marketplace.usuarios DROP CONSTRAINT IF EXISTS users_status_check;");
  lines.push("ALTER TABLE marketplace.usuarios ADD CONSTRAINT users_status_check CHECK (situacao IN ('ativo','inativo','suspenso'));");
  lines.push("ALTER TABLE marketplace.anuncios DROP CONSTRAINT IF EXISTS products_condition_check;");
  lines.push("ALTER TABLE marketplace.anuncios ADD CONSTRAINT products_condition_check CHECK (condicao IN ('novo','usado'));");
  lines.push("ALTER TABLE marketplace.anuncios DROP CONSTRAINT IF EXISTS products_status_check;");
  lines.push("ALTER TABLE marketplace.anuncios ADD CONSTRAINT products_status_check CHECK (situacao IN ('ativo','pausado','vendido','removido'));");
  lines.push("ALTER TABLE marketplace.denuncias DROP CONSTRAINT IF EXISTS product_reports_status_check;");
  lines.push("ALTER TABLE marketplace.denuncias ADD CONSTRAINT product_reports_status_check CHECK (situacao IN ('pendente','em_analise','resolvido','arquivado'));");
  lines.push("ALTER TABLE marketplace.banners DROP CONSTRAINT IF EXISTS banner_ads_position_check;");
  lines.push("ALTER TABLE marketplace.banners ADD CONSTRAINT banner_ads_position_check CHECK (posicao IN ('home_topo','home_meio','barra_lateral','listagem'));");
  lines.push("");

  // Restante da migracao (funcoes, views, public bridge, realtime, storage) segue a mesma estrutura
  lines.push("-- Recria funcoes com nomes/campos em portugues");
  lines.push("CREATE OR REPLACE FUNCTION marketplace.atualizar_coluna_atualizado_em()");
  lines.push("RETURNS TRIGGER LANGUAGE plpgsql AS $$");
  lines.push("BEGIN NEW.atualizado_em := now(); RETURN NEW; END;");
  lines.push("$$;");
  lines.push("");

  lines.push("CREATE OR REPLACE FUNCTION marketplace.definir_slug_usuario()");
  lines.push("RETURNS TRIGGER LANGUAGE plpgsql AS $$");
  lines.push("BEGIN");
  lines.push("  IF NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;");
  lines.push("  IF NEW.slug IS NULL OR NEW.slug = '' THEN");
  lines.push("    NEW.slug := marketplace.slugify(coalesce(NULLIF(NEW.nome, ''), 'usuario')) || '-' || substring(NEW.id::text, 1, 8);");
  lines.push("  END IF;");
  lines.push("  RETURN NEW;");
  lines.push("END; $$;");
  lines.push("");

  lines.push("CREATE OR REPLACE FUNCTION marketplace.definir_slug_anuncio()");
  lines.push("RETURNS TRIGGER LANGUAGE plpgsql AS $$");
  lines.push("BEGIN");
  lines.push("  IF NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;");
  lines.push("  IF NEW.slug IS NULL OR NEW.slug = '' THEN");
  lines.push("    NEW.slug := marketplace.slugify(coalesce(NULLIF(NEW.titulo, ''), 'anuncio')) || '-' || substring(NEW.id::text, 1, 8);");
  lines.push("  END IF;");
  lines.push("  IF NEW.situacao IS NULL THEN NEW.situacao := 'ativo'; END IF;");
  lines.push("  RETURN NEW;");
  lines.push("END; $$;");
  lines.push("");

  lines.push("CREATE OR REPLACE FUNCTION marketplace.tratar_novo_usuario()");
  lines.push("RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = marketplace, auth, public AS $$");
  lines.push("BEGIN");
  lines.push("  INSERT INTO marketplace.usuarios (id_autenticacao, email, nome, foto_url, email_confirmado, situacao, papel, ultimo_acesso)");
  lines.push("  VALUES (");
  lines.push("    NEW.id,");
  lines.push("    NEW.email,");
  lines.push("    coalesce(nullif(NEW.raw_user_meta_data ->> 'name', ''), split_part(NEW.email, '@', 1)),");
  lines.push("    NEW.raw_user_meta_data ->> 'photo_url',");
  lines.push("    NEW.email_confirmed_at IS NOT NULL,");
  lines.push("    'ativo',");
  lines.push("    coalesce(NEW.raw_user_meta_data ->> 'role', 'usuario'),");
  lines.push("    now()");
  lines.push("  ) ON CONFLICT (id_autenticacao) DO NOTHING;");
  lines.push("  RETURN NEW;");
  lines.push("END; $$;");
  lines.push("");

  lines.push("CREATE OR REPLACE FUNCTION marketplace.obter_id_usuario_atual()");
  lines.push("RETURNS uuid LANGUAGE sql STABLE AS $$");
  lines.push("  SELECT id FROM marketplace.usuarios WHERE id_autenticacao = auth.uid() LIMIT 1;");
  lines.push("$$;");
  lines.push("");

  lines.push("CREATE OR REPLACE FUNCTION marketplace.eh_administrador()");
  lines.push("RETURNS boolean LANGUAGE sql STABLE AS $$");
  lines.push("  SELECT exists(SELECT 1 FROM marketplace.usuarios WHERE id_autenticacao = auth.uid() AND papel = 'administrador' AND situacao = 'ativo');");
  lines.push("$$;");
  lines.push("");

  lines.push("CREATE OR REPLACE FUNCTION marketplace.incrementar_visualizacoes_anuncio(p_anuncio_id uuid)");
  lines.push("RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = marketplace, auth AS $$");
  lines.push("BEGIN");
  lines.push("  INSERT INTO marketplace.anuncio_visualizacoes (anuncio_id, visitante_id, endereco_ip, user_agent)");
  lines.push("  VALUES (");
  lines.push("    p_anuncio_id,");
  lines.push("    marketplace.obter_id_usuario_atual(),");
  lines.push("    current_setting('request.headers::x-forwarded-for', true),");
  lines.push("    current_setting('request.headers::user-agent', true)");
  lines.push("  );");
  lines.push("  UPDATE marketplace.anuncios SET visualizacoes = visualizacoes + 1 WHERE id = p_anuncio_id;");
  lines.push("END; $$;");
  lines.push("");

  lines.push("GRANT EXECUTE ON FUNCTION marketplace.incrementar_visualizacoes_anuncio(uuid) TO anon, authenticated;");
  lines.push("");

  // Triggers
  lines.push("-- Recria triggers");
  lines.push("DO $$");
  lines.push("DECLARE tabela text;");
  lines.push("BEGIN");
  lines.push("  FOR tabela IN");
  lines.push("    SELECT tablename FROM pg_tables WHERE schemaname = 'marketplace'");
  lines.push("      AND tablename IN ('usuarios','categorias','subcategorias','anuncios','anuncio_imagens','anuncio_videos','favoritos','conversas','mensagens','anuncio_visualizacoes','denuncias','banners','notificacoes','configuracoes')");
  lines.push("  LOOP");
  lines.push("    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_atualizado_em ON marketplace.%I;', tabela, tabela);");
  lines.push("    EXECUTE format('CREATE TRIGGER trg_%I_atualizado_em BEFORE UPDATE ON marketplace.%I FOR EACH ROW EXECUTE FUNCTION marketplace.atualizar_coluna_atualizado_em();', tabela, tabela);");
  lines.push("  END LOOP;");
  lines.push("END $$;");
  lines.push("");

  lines.push("CREATE OR REPLACE TRIGGER trg_usuarios_before_insert BEFORE INSERT ON marketplace.usuarios FOR EACH ROW EXECUTE FUNCTION marketplace.definir_slug_usuario();");
  lines.push("CREATE OR REPLACE TRIGGER trg_anuncios_before_insert BEFORE INSERT ON marketplace.anuncios FOR EACH ROW EXECUTE FUNCTION marketplace.definir_slug_anuncio();");
  lines.push("DROP TRIGGER IF EXISTS trg_auth_users_insert ON auth.users;");
  lines.push("CREATE TRIGGER trg_auth_users_insert AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION marketplace.tratar_novo_usuario();");
  lines.push("");

  // Views resumidas
  lines.push("-- Atualiza views agregadas");
  lines.push("CREATE OR REPLACE VIEW marketplace.anuncios_publicos AS");
  lines.push("SELECT p.id, p.titulo, p.slug, p.descricao, p.preco, p.condicao, p.quantidade, p.cidade, p.condominio, p.endereco,");
  lines.push("       p.latitude, p.longitude, p.visualizacoes, p.situacao, p.destaque, p.negociavel, p.aceita_troca, p.video_url,");
  lines.push("       p.criado_em, p.atualizado_em,");
  lines.push("       c.id AS categoria_id, c.nome AS categoria_nome, c.slug AS categoria_slug,");
  lines.push("       sc.id AS subcategoria_id, sc.nome AS subcategoria_nome, sc.slug AS subcategoria_slug,");
  lines.push("       u.id AS vendedor_id, u.nome AS vendedor_nome, u.slug AS vendedor_slug, u.foto_url AS vendedor_foto_url,");
  lines.push("       u.cidade AS vendedor_cidade, u.avaliacao AS vendedor_avaliacao,");
  lines.push("       (SELECT pi.url FROM marketplace.anuncio_imagens pi WHERE pi.anuncio_id = p.id ORDER BY pi.ordem ASC, pi.criado_em ASC LIMIT 1) AS capa_url,");
  lines.push("       (SELECT count(*) FROM marketplace.anuncio_imagens pi WHERE pi.anuncio_id = p.id) AS total_imagens");
  lines.push("FROM marketplace.anuncios p");
  lines.push("LEFT JOIN marketplace.categorias c ON c.id = p.categoria_id");
  lines.push("LEFT JOIN marketplace.subcategorias sc ON sc.id = p.subcategoria_id");
  lines.push("LEFT JOIN marketplace.usuarios u ON u.id = p.usuario_id");
  lines.push("WHERE p.situacao = 'ativo';");
  lines.push("");

  lines.push("CREATE OR REPLACE VIEW marketplace.perfis_vendedores AS");
  lines.push("SELECT u.id, u.slug, u.nome, u.foto_url, u.biografia, u.cidade, u.estado, u.avaliacao, u.total_avaliacoes, u.criado_em,");
  lines.push("       count(p.id) FILTER (WHERE p.situacao = 'ativo') AS total_anuncios_ativos,");
  lines.push("       count(p.id) FILTER (WHERE p.situacao = 'vendido') AS total_anuncios_vendidos");
  lines.push("FROM marketplace.usuarios u");
  lines.push("LEFT JOIN marketplace.anuncios p ON p.usuario_id = u.id");
  lines.push("WHERE u.situacao = 'ativo'");
  lines.push("GROUP BY u.id;");
  lines.push("");

  lines.push("CREATE OR REPLACE VIEW marketplace.conversas_com_ultima_mensagem AS");
  lines.push("SELECT cr.id, cr.anuncio_id, cr.comprador_id, cr.vendedor_id, cr.criado_em, cr.ultima_mensagem_em,");
  lines.push("       p.titulo AS anuncio_titulo, p.slug AS anuncio_slug,");
  lines.push("       (SELECT pi.url FROM marketplace.anuncio_imagens pi WHERE pi.anuncio_id = p.id ORDER BY pi.ordem ASC LIMIT 1) AS anuncio_imagem_url,");
  lines.push("       lm.conteudo AS ultima_mensagem_conteudo, lm.remetente_id AS ultima_mensagem_remetente_id, lm.criado_em AS ultima_mensagem_criado_em,");
  lines.push("       (SELECT count(*) FROM marketplace.mensagens m WHERE m.conversa_id = cr.id AND m.lida_em IS NULL) AS nao_lidas");
  lines.push("FROM marketplace.conversas cr");
  lines.push("JOIN marketplace.anuncios p ON p.id = cr.anuncio_id");
  lines.push("LEFT JOIN LATERAL (");
  lines.push("  SELECT conteudo, remetente_id, criado_em FROM marketplace.mensagens WHERE conversa_id = cr.id ORDER BY criado_em DESC LIMIT 1");
  lines.push(") lm ON true;");
  lines.push("");

  // Public bridge
  lines.push("-- Recria views/functions ponte no schema public");
  for (const newName of Object.values(TABLES)) {
    lines.push(`CREATE OR REPLACE VIEW public.${newName} WITH (security_invoker = true) AS SELECT * FROM marketplace.${newName};`);
  }
  lines.push("");

  lines.push("CREATE OR REPLACE FUNCTION public.incrementar_visualizacoes_anuncio(p_anuncio_id uuid)");
  lines.push("RETURNS void LANGUAGE sql AS $$ SELECT marketplace.incrementar_visualizacoes_anuncio(p_anuncio_id); $$;");
  lines.push("");

  lines.push("GRANT USAGE ON SCHEMA public TO anon, authenticated;");
  lines.push("GRANT SELECT ON");
  lines.push("  public.usuarios, public.categorias, public.subcategorias, public.anuncios,");
  lines.push("  public.anuncio_imagens, public.anuncio_videos, public.banners, public.configuracoes,");
  lines.push("  public.anuncios_publicos, public.perfis_vendedores");
  lines.push("TO anon, authenticated;");
  lines.push("GRANT SELECT ON");
  lines.push("  public.favoritos, public.conversas, public.mensagens,");
  lines.push("  public.conversas_com_ultima_mensagem, public.anuncio_visualizacoes,");
  lines.push("  public.denuncias, public.notificacoes");
  lines.push("TO authenticated;");
  lines.push("GRANT INSERT, UPDATE, DELETE ON");
  lines.push("  public.usuarios, public.anuncios, public.anuncio_imagens, public.anuncio_videos,");
  lines.push("  public.favoritos, public.conversas, public.mensagens, public.denuncias");
  lines.push("TO authenticated;");
  lines.push("GRANT UPDATE ON public.notificacoes TO authenticated;");
  lines.push("GRANT INSERT ON public.anuncio_visualizacoes TO anon, authenticated;");
  lines.push("GRANT EXECUTE ON FUNCTION public.incrementar_visualizacoes_anuncio(uuid) TO anon, authenticated;");
  lines.push("");

  // Realtime
  lines.push("-- Realtime");
  lines.push("ALTER PUBLICATION supabase_realtime DROP TABLE marketplace.chat_messages, marketplace.chat_rooms;");
  lines.push("ALTER PUBLICATION supabase_realtime ADD TABLE marketplace.mensagens, marketplace.conversas;");
  lines.push("ALTER TABLE marketplace.mensagens REPLICA IDENTITY FULL;");
  lines.push("ALTER TABLE marketplace.conversas REPLICA IDENTITY FULL;");
  lines.push("");

  // Storage policy
  lines.push("-- Atualiza storage policies");
  lines.push("DROP POLICY IF EXISTS banners_admin_write ON storage.objects;");
  lines.push("CREATE POLICY banners_admin_write ON storage.objects FOR ALL");
  lines.push("  USING (bucket_id = 'banners' AND EXISTS (SELECT 1 FROM marketplace.usuarios u WHERE u.id_autenticacao = auth.uid() AND u.papel = 'administrador'))");
  lines.push("  WITH CHECK (bucket_id = 'banners' AND EXISTS (SELECT 1 FROM marketplace.usuarios u WHERE u.id_autenticacao = auth.uid() AND u.papel = 'administrador'));");
  lines.push("");

  return lines.join("\n");
}

async function getFiles(dir, pattern) {
  const files = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        stack.push(full);
      } else if (pattern.test(entry.name)) {
        files.push(full);
      }
    }
  }
  return files;
}

async function processSqlFiles(dryRun) {
  const files = await getFiles(SQL_DIR, /\.sql$/);
  let changed = 0;
  for (const file of files) {
    if (basename(file) === "10_migracao_renomear_portugues.sql") continue;
    const text = await readFile(file, "utf-8");
    const newText = sqlProcess(text);
    if (newText !== text) {
      changed++;
      if (dryRun) {
        console.log(`  SQL: ${relative(ROOT, file)}`);
      } else {
        await writeFile(file, newText, "utf-8");
      }
    }
  }
  return changed;
}

async function processTsFiles(dryRun) {
  const files = [...(await getFiles(SRC_DIR, /\.ts$/)), ...(await getFiles(SRC_DIR, /\.tsx$/))];
  let changed = 0;
  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    const text = await readFile(file, "utf-8");
    let newText;
    if (basename(file) === "database.types.ts") {
      newText = typesProcess(text);
    } else if (file.endsWith(".tsx") || (file.endsWith(".ts") && rel.includes("/app/"))) {
      newText = tsxProcess(text, basename(file));
    } else {
      newText = tsProcess(text, basename(file));
    }
    if (newText !== text) {
      changed++;
      if (dryRun) {
        console.log(`  TS: ${rel}`);
      } else {
        await writeFile(file, newText, "utf-8");
      }
    }
  }
  return changed;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const onlySql = args.includes("--only-sql");
  const onlyTs = args.includes("--only-ts");
  const migrationOnly = args.includes("--migration");

  const migrationPath = join(SQL_DIR, "10_migracao_renomear_portugues.sql");

  if (dryRun) {
    console.log("=== DRY RUN ===");
    console.log("Arquivos que seriam alterados:");
    let changed = 0;
    if (!onlyTs) changed += await processSqlFiles(true);
    if (!onlySql) changed += await processTsFiles(true);

    const currentMigration = await readFile(migrationPath, "utf-8").catch(() => "");
    const newMigration = generateMigration();
    if (currentMigration !== newMigration) {
      console.log(`  MIGRATION: ${relative(ROOT, migrationPath)}`);
      changed++;
    }
    console.log(`Total de arquivos alterados: ${changed}`);
    return;
  }

  if (migrationOnly || (!onlyTs)) {
    await writeFile(migrationPath, generateMigration(), "utf-8");
    console.log(`Gerado: ${migrationPath}`);
  }

  if (!migrationOnly) {
    if (!onlyTs) {
      const n = await processSqlFiles(false);
      console.log(`SQL base atualizado: ${n} arquivo(s).`);
    }
    if (!onlySql) {
      const n = await processTsFiles(false);
      console.log(`TypeScript atualizado: ${n} arquivo(s).`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
