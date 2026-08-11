#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de renomeação do schema do marketplace de inglês para português.

Aplica:
  1. SQL em sql/*.sql (tabelas, colunas, views, funções, RLS, índices etc.)
  2. Tipos TypeScript em src/lib/supabase/database.types.ts
  3. Código TS/TSX em src/ (referências a tabelas/colunas/funções)

Uso:
  python scripts/renomear_portugues.py          # aplica as alterações
  python scripts/renomear_portugues.py --dry-run # apenas mostra o que mudaria
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SQL_DIR = ROOT / "sql"
SRC_DIR = ROOT / "src"

# ========================================================================
# MAPEAMENTOS
# ========================================================================

TABLES: dict[str, str] = {
    "users": "usuarios",
    "categories": "categorias",
    "subcategories": "subcategorias",
    "products": "anuncios",
    "product_images": "anuncio_imagens",
    "product_videos": "anuncio_videos",
    "favorites": "favoritos",
    "chat_rooms": "conversas",
    "chat_messages": "mensagens",
    "product_views": "anuncio_visualizacoes",
    "product_reports": "denuncias",
    "banner_ads": "banners",
    "notifications": "notificacoes",
    "settings": "configuracoes",
    # views
    "products_public": "anuncios_publicos",
    "seller_profiles": "perfis_vendedores",
    "chat_rooms_with_last_message": "conversas_com_ultima_mensagem",
}

COLUMNS: dict[str, str] = {
    # usuarios
    "auth_id": "id_autenticacao",
    "name": "nome",
    "phone": "telefone",
    "condominium": "condominio",
    "address": "endereco",
    "city": "cidade",
    "state": "estado",
    "zip": "cep",
    "photo_url": "foto_url",
    "bio": "biografia",
    "latitude": "latitude",
    "longitude": "longitude",
    "rating": "avaliacao",
    "total_reviews": "total_avaliacoes",
    "total_ads": "total_anuncios",
    "total_sold": "total_vendidos",
    "role": "papel",
    "status": "situacao",
    "email_confirmed": "email_confirmado",
    "created_at": "criado_em",
    "updated_at": "atualizado_em",
    "last_access": "ultimo_acesso",
    # categorias / subcategorias
    "category_id": "categoria_id",
    "subcategory_id": "subcategoria_id",
    "parent_id": "categoria_pai_id",
    "icon": "icone",
    "color": "cor",
    "order": "ordem",
    "is_active": "ativo",
    # anuncios
    "user_id": "usuario_id",
    "title": "titulo",
    "description": "descricao",
    "price": "preco",
    "condition": "condicao",
    "quantity": "quantidade",
    "views": "visualizacoes",
    "featured": "destaque",
    "negotiable": "negociavel",
    "accepts_trade": "aceita_troca",
    "video_url": "video_url",
    "search_vector": "vetor_busca",
    # imagens / videos
    "product_id": "anuncio_id",
    "thumbnail_url": "thumbnail_url",
    # favoritos
    # chat
    "buyer_id": "comprador_id",
    "seller_id": "vendedor_id",
    "last_message_at": "ultima_mensagem_em",
    # mensagens
    "room_id": "conversa_id",
    "sender_id": "remetente_id",
    "content": "conteudo",
    "attachments": "anexos",
    "read_at": "lida_em",
    # visualizacoes
    "viewer_id": "visitante_id",
    "ip_address": "endereco_ip",
    "user_agent": "user_agent",
    "viewed_at": "visualizado_em",
    # denuncias
    "reporter_id": "denunciante_id",
    "reason": "motivo",
    "details": "detalhes",
    # banners
    "desktop_image_url": "imagem_desktop_url",
    "mobile_image_url": "imagem_mobile_url",
    "position": "posicao",
    "start_date": "data_inicio",
    "end_date": "data_fim",
    "active": "ativo",
    "clicks": "cliques",
    "impressions": "impressoes",
    # notificacoes
    "type": "tipo",
    "message": "mensagem",
    "data": "dados",
    "read": "lida",
    # configuracoes
    "key": "chave",
    "value": "valor",
    # view columns
    "category_name": "categoria_nome",
    "category_slug": "categoria_slug",
    "subcategory_name": "subcategoria_nome",
    "subcategory_slug": "subcategoria_slug",
    "seller_id": "vendedor_id",
    "seller_name": "vendedor_nome",
    "seller_slug": "vendedor_slug",
    "seller_photo_url": "vendedor_foto_url",
    "seller_city": "vendedor_cidade",
    "seller_rating": "vendedor_avaliacao",
    "cover_image_url": "capa_url",
    "images_count": "total_imagens",
    "active_ads_count": "total_anuncios_ativos",
    "sold_ads_count": "total_anuncios_vendidos",
    "product_title": "anuncio_titulo",
    "product_slug": "anuncio_slug",
    "product_image_url": "anuncio_imagem_url",
    "last_message_content": "ultima_mensagem_conteudo",
    "last_message_sender_id": "ultima_mensagem_remetente_id",
    "last_message_created_at": "ultima_mensagem_criado_em",
    "unread_count": "nao_lidas",
    # args
    "p_product_id": "p_anuncio_id",
}

FUNCTIONS: dict[str, str] = {
    "update_updated_at_column": "atualizar_coluna_atualizado_em",
    "set_user_slug": "definir_slug_usuario",
    "set_product_slug": "definir_slug_anuncio",
    "handle_new_user": "tratar_novo_usuario",
    "get_current_user_id": "obter_id_usuario_atual",
    "is_admin": "eh_administrador",
    "increment_product_views": "incrementar_visualizacoes_anuncio",
    "slugify": "slugify",
}

CONSTRAINTS: dict[str, str] = {
    "no_self_chat": "sem_chat_proprio",
}

# Valores de enum/check constraints (mapeia strings entre aspas)
ENUMS: dict[str, str] = {
    # produto condicao
    '"new"': '"novo"',
    '"used"': '"usado"',
    "'new'": "'novo'",
    "'used'": "'usado'",
    # produto situacao
    '"active"': '"ativo"',
    '"paused"': '"pausado"',
    '"sold"': '"vendido"',
    '"deleted"': '"removido"',
    "'active'": "'ativo'",
    "'paused'": "'pausado'",
    "'sold'": "'vendido'",
    "'deleted'": "'removido'",
    # usuario papel
    '"user"': '"usuario"',
    '"admin"': '"administrador"',
    "'user'": "'usuario'",
    "'admin'": "'administrador'",
    # usuario situacao
    '"active"_user': '"ativo"',  # desambiguacao nao usada
    '"inactive"': '"inativo"',
    '"suspended"': '"suspenso"',
    "'inactive'": "'inativo'",
    "'suspended'": "'suspenso'",
    # denuncia situacao
    '"pending"': '"pendente"',
    '"reviewing"': '"em_analise"',
    '"resolved"': '"resolvido"',
    '"dismissed"': '"arquivado"',
    "'pending'": "'pendente'",
    "'reviewing'": "'em_analise'",
    "'resolved'": "'resolvido'",
    "'dismissed'": "'arquivado'",
    # banner posicao
    '"home_top"': '"home_topo"',
    '"home_middle"': '"home_meio"',
    '"sidebar"': '"barra_lateral"',
    '"listing"': '"listagem"',
    "'home_top'": "'home_topo'",
    "'home_middle'": "'home_meio'",
    "'sidebar'": "'barra_lateral'",
    "'listing'": "'listagem'",
}

# Remove chaves com sufixos de desambiguacao que nao sao validas
ENUMS = {k: v for k, v in ENUMS.items() if "_user" not in k}

# ========================================================================
# HELPERS
# ========================================================================

def regex_escape(word: str) -> str:
    return re.escape(word)


def make_word_replacements(mapping: dict[str, str], case_sensitive: bool = True) -> list[tuple[re.Pattern, str]]:
    """Cria regex com word boundary para cada palavra, ordenado do maior para o menor."""
    items = sorted(mapping.items(), key=lambda kv: len(kv[0]), reverse=True)
    flags = 0 if case_sensitive else re.IGNORECASE
    return [(re.compile(r"\b" + regex_escape(k) + r"\b", flags), v) for k, v in items]


TABLE_REPLS = make_word_replacements(TABLES)
COLUMN_REPLS = make_word_replacements(COLUMNS)
FUNCTION_REPLS = make_word_replacements(FUNCTIONS)
CONSTRAINT_REPLS = make_word_replacements(CONSTRAINTS)

# Regex para strings entre aspas (simples ou duplas) de valores enum
ENUM_REPLS = [(re.compile(re.escape(k)), v) for k, v in sorted(ENUMS.items(), key=lambda kv: len(kv[0]), reverse=True)]


def apply_replacements(text: str, repls: list[tuple[re.Pattern, str]]) -> str:
    for pattern, repl in repls:
        text = pattern.sub(repl, text)
    return text


def quoted_column_re(text: str) -> str:
    """Renomeia colunas dentro de strings entre aspas (select, eq, order, ilike, etc.)."""
    # Substitui palavras isoladas dentro de "..." ou '...'
    def replacer(m: re.Match) -> str:
        inner = m.group(1)
        # Para cada coluna conhecida, substitui word-boundary dentro da string
        for pattern, repl in COLUMN_REPLS:
            inner = pattern.sub(repl, inner)
        for pattern, repl in TABLE_REPLS:
            inner = pattern.sub(repl, inner)
        return m.group(0)[0] + inner + m.group(0)[-1]

    # aspas duplas
    text = re.sub(r'"([^"]+)"', replacer, text)
    # aspas simples (somente strings multi-caractere; evita 'a')
    text = re.sub(r"'([^']+)'", replacer, text)
    return text


DOT_SKIP_PREFIXES = {
    "siteConfig",
    "file",
    "fieldErrors",
    "state",
    "target",
    "e",
    "event",
    "File",
}


def dot_property_replace(text: str) -> str:
    """Substitui propriedades de objetos do tipo obj.coluna -> obj.coluna_pt.
    Pula objetos que nao vem do banco (file.name, siteConfig.name, etc.)."""
    def replacer(m: re.Match) -> str:
        prefix = m.group(1)
        dot = m.group(2)
        col = m.group(3)
        if prefix in DOT_SKIP_PREFIXES:
            return m.group(0)
        new_col = COLUMNS.get(col)
        if new_col:
            return f"{prefix}{dot}{new_col}"
        return m.group(0)

    # obj?.prop ou obj.prop
    pattern = re.compile(r"(\w+)(\??\.)\b(" + "|".join(re.escape(c) for c in COLUMNS.keys()) + r")\b")
    return pattern.sub(replacer, text)


def object_key_replace(text: str, filename: str) -> str:
    """Substitui chaves de objetos literais: { title: ... } -> { titulo: ... }.
    Em .tsx evita metadata e siteConfig."""
    if ".tsx" in filename:
        # Nao troca chaves de metadata/social em paginas
        if "metadata" in text and "Metadata" in text:
            pass

    def replacer(m: re.Match) -> str:
        key = m.group(1)
        new_key = COLUMNS.get(key)
        if new_key:
            return f"{new_key}:"
        return m.group(0)

    # Chaves de objeto: word seguido de : (com possivel ? em opcional)
    # Pula strings e comentarios nao e trivial; assumimos que as chaves estao fora de strings
    pattern = re.compile(r"(?<=[{,;\n\s])(" + "|".join(re.escape(c) for c in COLUMNS.keys()) + r")\s*:")
    return pattern.sub(replacer, text)


def type_key_replace(text: str) -> str:
    """Substitui chaves de tipos em database.types.ts (Tables: { products: ... })."""
    def table_replacer(m: re.Match) -> str:
        key = m.group(1)
        new_key = TABLES.get(key)
        if new_key:
            return f'{new_key}:'
        return m.group(0)

    pattern = re.compile(r"(?<=[{,\n\s])(" + "|".join(re.escape(k) for k in TABLES.keys()) + r")\s*:")
    return pattern.sub(table_replacer, text)


def sql_process(text: str) -> str:
    text = apply_replacements(text, TABLE_REPLS)
    text = apply_replacements(text, COLUMN_REPLS)
    text = apply_replacements(text, FUNCTION_REPLS)
    text = apply_replacements(text, CONSTRAINT_REPLS)
    text = apply_replacements(text, ENUM_REPLS)
    # Remove aspas ao redor da coluna order que agora e ordem
    text = re.sub(r'"ordem"', "ordem", text)
    return text


def types_process(text: str) -> str:
    # Tipos union de enums
    for en_old, en_new in ENUMS.items():
        text = re.sub(re.escape(en_old), en_new, text)
    text = type_key_replace(text)
    text = dot_property_replace(text)
    text = object_key_replace(text, "database.types.ts")
    text = apply_replacements(text, TABLE_REPLS)
    text = apply_replacements(text, FUNCTION_REPLS)
    # strings de colunas usadas em comentarios
    text = quoted_column_re(text)
    return text


def ts_process(text: str, filename: str) -> str:
    # enum strings
    for en_old, en_new in ENUMS.items():
        text = re.sub(re.escape(en_old), en_new, text)
    # strings entre aspas com nomes de tabelas/colunas
    text = quoted_column_re(text)
    text = dot_property_replace(text)
    text = object_key_replace(text, filename)
    text = apply_replacements(text, TABLE_REPLS)
    text = apply_replacements(text, FUNCTION_REPLS)
    return text


def tsx_process(text: str, filename: str) -> str:
    # Cuidado com metadata/tags; porem enum strings entre aspas sao seguras
    for en_old, en_new in ENUMS.items():
        text = re.sub(re.escape(en_old), en_new, text)
    text = quoted_column_re(text)
    text = dot_property_replace(text)
    # Em .tsx, nao fazemos substituicao generica de chaves de objeto
    # para evitar quebrar metadata/JSON-LD/componentes de UI.
    text = apply_replacements(text, TABLE_REPLS)
    text = apply_replacements(text, FUNCTION_REPLS)
    return text


# ========================================================================
# GERACAO DE MIGRACAO SQL
# ========================================================================

def generate_migration() -> str:
    """Gera o SQL de migracao do schema antigo em ingles para o novo em portugues."""
    sections = [
        "-- ============================================================================",
        "-- Marketplace - Migracao: renomear tabelas e colunas para o portugues",
        "-- ============================================================================",
        "-- Execute este script UMA VEZ na base de dados existente (role postgres).",
        "-- Ele renomeia tabelas, colunas, views, funcoes, triggers, RLS e realtime.",
        "-- ============================================================================",
        "",
    ]

    # Remover triggers dependentes de colunas
    sections += [
        "-- Remove triggers antigos para recriar depois",
        "DROP TRIGGER IF EXISTS trg_users_before_insert ON marketplace.users;",
        "DROP TRIGGER IF EXISTS trg_products_before_insert ON marketplace.products;",
        "DROP TRIGGER IF EXISTS trg_auth_users_insert ON auth.users;",
        "",
    ]

    # Renomear colunas
    column_alters: list[tuple[str, str, str]] = [
        # usuarios
        ("users", "auth_id", "id_autenticacao"),
        ("users", "name", "nome"),
        ("users", "phone", "telefone"),
        ("users", "condominium", "condominio"),
        ("users", "address", "endereco"),
        ("users", "city", "cidade"),
        ("users", "state", "estado"),
        ("users", "zip", "cep"),
        ("users", "photo_url", "foto_url"),
        ("users", "bio", "biografia"),
        ("users", "rating", "avaliacao"),
        ("users", "total_reviews", "total_avaliacoes"),
        ("users", "total_ads", "total_anuncios"),
        ("users", "total_sold", "total_vendidos"),
        ("users", "role", "papel"),
        ("users", "status", "situacao"),
        ("users", "email_confirmed", "email_confirmado"),
        ("users", "created_at", "criado_em"),
        ("users", "updated_at", "atualizado_em"),
        ("users", "last_access", "ultimo_acesso"),
        # categorias
        ("categories", "name", "nome"),
        ("categories", "slug", "slug"),
        ("categories", "icon", "icone"),
        ("categories", "color", "cor"),
        ("categories", '"order"', "ordem"),
        ("categories", "parent_id", "categoria_pai_id"),
        ("categories", "is_active", "ativo"),
        ("categories", "created_at", "criado_em"),
        ("categories", "updated_at", "atualizado_em"),
        # subcategorias
        ("subcategories", "category_id", "categoria_id"),
        ("subcategories", "name", "nome"),
        ("subcategories", '"order"', "ordem"),
        ("subcategories", "is_active", "ativo"),
        ("subcategories", "created_at", "criado_em"),
        ("subcategories", "updated_at", "atualizado_em"),
        # anuncios
        ("products", "user_id", "usuario_id"),
        ("products", "title", "titulo"),
        ("products", "description", "descricao"),
        ("products", "price", "preco"),
        ("products", "category_id", "categoria_id"),
        ("products", "subcategory_id", "subcategoria_id"),
        ("products", "condition", "condicao"),
        ("products", "quantity", "quantidade"),
        ("products", "city", "cidade"),
        ("products", "condominium", "condominio"),
        ("products", "address", "endereco"),
        ("products", "views", "visualizacoes"),
        ("products", "status", "situacao"),
        ("products", "featured", "destaque"),
        ("products", "negotiable", "negociavel"),
        ("products", "accepts_trade", "aceita_troca"),
        ("products", "search_vector", "vetor_busca"),
        ("products", "created_at", "criado_em"),
        ("products", "updated_at", "atualizado_em"),
        # imagens
        ("product_images", "product_id", "anuncio_id"),
        ("product_images", '"order"', "ordem"),
        ("product_images", "created_at", "criado_em"),
        # videos
        ("product_videos", "product_id", "anuncio_id"),
        ("product_videos", "created_at", "criado_em"),
        # favoritos
        ("favorites", "user_id", "usuario_id"),
        ("favorites", "product_id", "anuncio_id"),
        ("favorites", "created_at", "criado_em"),
        # conversas
        ("chat_rooms", "product_id", "anuncio_id"),
        ("chat_rooms", "buyer_id", "comprador_id"),
        ("chat_rooms", "seller_id", "vendedor_id"),
        ("chat_rooms", "last_message_at", "ultima_mensagem_em"),
        ("chat_rooms", "created_at", "criado_em"),
        ("chat_rooms", "updated_at", "atualizado_em"),
        # mensagens
        ("chat_messages", "room_id", "conversa_id"),
        ("chat_messages", "sender_id", "remetente_id"),
        ("chat_messages", "content", "conteudo"),
        ("chat_messages", "attachments", "anexos"),
        ("chat_messages", "read_at", "lida_em"),
        ("chat_messages", "created_at", "criado_em"),
        # visualizacoes
        ("product_views", "product_id", "anuncio_id"),
        ("product_views", "viewer_id", "visitante_id"),
        ("product_views", "ip_address", "endereco_ip"),
        ("product_views", "viewed_at", "visualizado_em"),
        # denuncias
        ("product_reports", "product_id", "anuncio_id"),
        ("product_reports", "reporter_id", "denunciante_id"),
        ("product_reports", "reason", "motivo"),
        ("product_reports", "details", "detalhes"),
        ("product_reports", "status", "situacao"),
        ("product_reports", "created_at", "criado_em"),
        ("product_reports", "updated_at", "atualizado_em"),
        # banners
        ("banner_ads", "title", "titulo"),
        ("banner_ads", "description", "descricao"),
        ("banner_ads", "desktop_image_url", "imagem_desktop_url"),
        ("banner_ads", "mobile_image_url", "imagem_mobile_url"),
        ("banner_ads", "position", "posicao"),
        ("banner_ads", "start_date", "data_inicio"),
        ("banner_ads", "end_date", "data_fim"),
        ("banner_ads", "active", "ativo"),
        ("banner_ads", "clicks", "cliques"),
        ("banner_ads", "impressions", "impressoes"),
        ("banner_ads", "created_at", "criado_em"),
        ("banner_ads", "updated_at", "atualizado_em"),
        # notificacoes
        ("notifications", "user_id", "usuario_id"),
        ("notifications", "type", "tipo"),
        ("notifications", "title", "titulo"),
        ("notifications", "message", "mensagem"),
        ("notifications", "data", "dados"),
        ("notifications", "read", "lida"),
        ("notifications", "created_at", "criado_em"),
        # configuracoes
        ("settings", "key", "chave"),
        ("settings", "value", "valor"),
        ("settings", "description", "descricao"),
        ("settings", "created_at", "criado_em"),
        ("settings", "updated_at", "atualizado_em"),
    ]

    sections.append("-- Renomeia colunas")
    for table, old, new in column_alters:
        sections.append(f"ALTER TABLE marketplace.{table} RENAME COLUMN {old} TO {new};")
    sections.append("")

    # Renomear tabelas
    sections.append("-- Renomeia tabelas")
    for old, new in TABLES.items():
        if old in (
            "products_public",
            "seller_profiles",
            "chat_rooms_with_last_message",
        ):
            continue  # views, nao tabelas
        sections.append(f"ALTER TABLE marketplace.{old} RENAME TO {new};")
    sections.append("")

    # Renomear constraints
    sections += [
        "-- Renomeia constraints",
        "ALTER TABLE marketplace.conversas RENAME CONSTRAINT no_self_chat TO sem_chat_proprio;",
        "",
    ]

    # Atualizar check constraints (valores)
    sections += [
        "-- Atualiza check constraints de enums",
        "ALTER TABLE marketplace.usuarios DROP CONSTRAINT IF EXISTS users_role_check;",
        "ALTER TABLE marketplace.usuarios ADD CONSTRAINT users_role_check CHECK (papel IN ('usuario','administrador'));",
        "ALTER TABLE marketplace.usuarios DROP CONSTRAINT IF EXISTS users_status_check;",
        "ALTER TABLE marketplace.usuarios ADD CONSTRAINT users_status_check CHECK (situacao IN ('ativo','inativo','suspenso'));",
        "ALTER TABLE marketplace.anuncios DROP CONSTRAINT IF EXISTS products_condition_check;",
        "ALTER TABLE marketplace.anuncios ADD CONSTRAINT products_condition_check CHECK (condicao IN ('novo','usado'));",
        "ALTER TABLE marketplace.anuncios DROP CONSTRAINT IF EXISTS products_status_check;",
        "ALTER TABLE marketplace.anuncios ADD CONSTRAINT products_status_check CHECK (situacao IN ('ativo','pausado','vendido','removido'));",
        "ALTER TABLE marketplace.denuncias DROP CONSTRAINT IF EXISTS product_reports_status_check;",
        "ALTER TABLE marketplace.denuncias ADD CONSTRAINT product_reports_status_check CHECK (situacao IN ('pendente','em_analise','resolvido','arquivado'));",
        "ALTER TABLE marketplace.banners DROP CONSTRAINT IF EXISTS banner_ads_position_check;",
        "ALTER TABLE marketplace.banners ADD CONSTRAINT banner_ads_position_check CHECK (posicao IN ('home_topo','home_meio','barra_lateral','listagem'));",
        "",
    ]

    # Recriar funcoes
    sections += [
        "-- Recria funcoes com nomes/campos em portugues",
        "CREATE OR REPLACE FUNCTION marketplace.atualizar_coluna_atualizado_em()",
        "RETURNS TRIGGER",
        "LANGUAGE plpgsql",
        "AS $$",
        "BEGIN",
        "  NEW.atualizado_em := now();",
        "  RETURN NEW;",
        "END;",
        "$$;",
        "",
        "CREATE OR REPLACE FUNCTION marketplace.definir_slug_usuario()",
        "RETURNS TRIGGER",
        "LANGUAGE plpgsql",
        "AS $$",
        "BEGIN",
        "  IF NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;",
        "  IF NEW.slug IS NULL OR NEW.slug = '' THEN",
        "    NEW.slug := marketplace.slugify(coalesce(NULLIF(NEW.nome, ''), 'usuario')) || '-' || substring(NEW.id::text, 1, 8);",
        "  END IF;",
        "  RETURN NEW;",
        "END;",
        "$$;",
        "",
        "CREATE OR REPLACE FUNCTION marketplace.definir_slug_anuncio()",
        "RETURNS TRIGGER",
        "LANGUAGE plpgsql",
        "AS $$",
        "BEGIN",
        "  IF NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;",
        "  IF NEW.slug IS NULL OR NEW.slug = '' THEN",
        "    NEW.slug := marketplace.slugify(coalesce(NULLIF(NEW.titulo, ''), 'anuncio')) || '-' || substring(NEW.id::text, 1, 8);",
        "  END IF;",
        "  IF NEW.situacao IS NULL THEN NEW.situacao := 'ativo'; END IF;",
        "  RETURN NEW;",
        "END;",
        "$$;",
        "",
        "CREATE OR REPLACE FUNCTION marketplace.tratar_novo_usuario()",
        "RETURNS TRIGGER",
        "LANGUAGE plpgsql",
        "SECURITY DEFINER",
        "SET search_path = marketplace, auth, public",
        "AS $$",
        "BEGIN",
        "  INSERT INTO marketplace.usuarios (",
        "    id_autenticacao, email, nome, foto_url, email_confirmado, situacao, papel, ultimo_acesso",
        "  ) VALUES (",
        "    NEW.id,",
        "    NEW.email,",
        "    coalesce(nullif(NEW.raw_user_meta_data ->> 'name', ''), split_part(NEW.email, '@', 1)),",
        "    NEW.raw_user_meta_data ->> 'photo_url',",
        "    NEW.email_confirmed_at IS NOT NULL,",
        "    'ativo',",
        "    coalesce(NEW.raw_user_meta_data ->> 'role', 'usuario'),",
        "    now()",
        "  )",
        "  ON CONFLICT (id_autenticacao) DO NOTHING;",
        "  RETURN NEW;",
        "END;",
        "$$;",
        "",
        "CREATE OR REPLACE FUNCTION marketplace.obter_id_usuario_atual()",
        "RETURNS uuid",
        "LANGUAGE sql",
        "STABLE",
        "AS $$",
        "  SELECT id",
        "  FROM marketplace.usuarios",
        "  WHERE id_autenticacao = auth.uid()",
        "  LIMIT 1;",
        "$$;",
        "",
        "CREATE OR REPLACE FUNCTION marketplace.eh_administrador()",
        "RETURNS boolean",
        "LANGUAGE sql",
        "STABLE",
        "AS $$",
        "  SELECT exists(",
        "    SELECT 1",
        "    FROM marketplace.usuarios",
        "    WHERE id_autenticacao = auth.uid()",
        "      AND papel = 'administrador'",
        "      AND situacao = 'ativo'",
        "  );",
        "$$;",
        "",
        "CREATE OR REPLACE FUNCTION marketplace.incrementar_visualizacoes_anuncio(p_anuncio_id uuid)",
        "RETURNS void",
        "LANGUAGE plpgsql",
        "SECURITY DEFINER",
        "SET search_path = marketplace, auth",
        "AS $$",
        "BEGIN",
        "  INSERT INTO marketplace.anuncio_visualizacoes (anuncio_id, visitante_id, endereco_ip, user_agent)",
        "  VALUES (",
        "    p_anuncio_id,",
        "    marketplace.obter_id_usuario_atual(),",
        "    current_setting('request.headers::x-forwarded-for', true),",
        "    current_setting('request.headers::user-agent', true)",
        "  );",
        "  UPDATE marketplace.anuncios SET visualizacoes = visualizacoes + 1 WHERE id = p_anuncio_id;",
        "END;",
        "$$;",
        "",
        "GRANT EXECUTE ON FUNCTION marketplace.incrementar_visualizacoes_anuncio(uuid) TO anon, authenticated;",
        "",
    ]

    # Triggers
    sections += [
        "-- Recria triggers",
        "DO $$",
        "DECLARE tabela text;",
        "BEGIN",
        "  FOR tabela IN",
        "    SELECT tablename",
        "    FROM pg_tables",
        "    WHERE schemaname = 'marketplace'",
        "      AND tablename IN (",
        "        'usuarios', 'categorias', 'subcategorias', 'anuncios', 'anuncio_imagens',",
        "        'anuncio_videos', 'favoritos', 'conversas', 'mensagens',",
        "        'anuncio_visualizacoes', 'denuncias', 'banners', 'notificacoes', 'configuracoes'",
        "      )",
        "  LOOP",
        "    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_atualizado_em ON marketplace.%I;', tabela, tabela);",
        "    EXECUTE format('CREATE TRIGGER trg_%I_atualizado_em BEFORE UPDATE ON marketplace.%I FOR EACH ROW EXECUTE FUNCTION marketplace.atualizar_coluna_atualizado_em();', tabela, tabela);",
        "  END LOOP;",
        "END $$;",
        "",
        "CREATE OR REPLACE TRIGGER trg_usuarios_before_insert",
        "BEFORE INSERT ON marketplace.usuarios",
        "FOR EACH ROW EXECUTE FUNCTION marketplace.definir_slug_usuario();",
        "",
        "CREATE OR REPLACE TRIGGER trg_anuncios_before_insert",
        "BEFORE INSERT ON marketplace.anuncios",
        "FOR EACH ROW EXECUTE FUNCTION marketplace.definir_slug_anuncio();",
        "",
        "DROP TRIGGER IF EXISTS trg_auth_users_insert ON auth.users;",
        "CREATE TRIGGER trg_auth_users_insert",
        "AFTER INSERT ON auth.users",
        "FOR EACH ROW EXECUTE FUNCTION marketplace.tratar_novo_usuario();",
        "",
    ]

    # Atualizar RLS (drop & create com novos nomes de colunas/funcoes)
    sections += [
        "-- Recria politicas RLS",
        "DROP POLICY IF EXISTS users_select_public ON marketplace.usuarios;",
        "CREATE POLICY users_select_public ON marketplace.usuarios",
        "  FOR SELECT USING (situacao = 'ativo' OR id_autenticacao = auth.uid() OR marketplace.eh_administrador());",
        "",
        "DROP POLICY IF EXISTS users_insert_self ON marketplace.usuarios;",
        "CREATE POLICY users_insert_self ON marketplace.usuarios",
        "  FOR INSERT WITH CHECK (id_autenticacao = auth.uid());",
        "",
        "DROP POLICY IF EXISTS users_update_self_or_admin ON marketplace.usuarios;",
        "CREATE POLICY users_update_self_or_admin ON marketplace.usuarios",
        "  FOR UPDATE USING (id_autenticacao = auth.uid() OR marketplace.eh_administrador()) WITH CHECK (id_autenticacao = auth.uid() OR marketplace.eh_administrador());",
        "",
        "DROP POLICY IF EXISTS users_delete_admin ON marketplace.usuarios;",
        "CREATE POLICY users_delete_admin ON marketplace.usuarios FOR DELETE USING (marketplace.eh_administrador());",
        "",
        "DROP POLICY IF EXISTS categories_select_all ON marketplace.categorias;",
        "CREATE POLICY categories_select_all ON marketplace.categorias FOR SELECT USING (true);",
        "DROP POLICY IF EXISTS categories_write_admin ON marketplace.categorias;",
        "CREATE POLICY categories_write_admin ON marketplace.categorias FOR ALL USING (marketplace.eh_administrador()) WITH CHECK (marketplace.eh_administrador());",
        "",
        "DROP POLICY IF EXISTS subcategories_select_all ON marketplace.subcategorias;",
        "CREATE POLICY subcategories_select_all ON marketplace.subcategorias FOR SELECT USING (true);",
        "DROP POLICY IF EXISTS subcategories_write_admin ON marketplace.subcategorias;",
        "CREATE POLICY subcategories_write_admin ON marketplace.subcategorias FOR ALL USING (marketplace.eh_administrador()) WITH CHECK (marketplace.eh_administrador());",
        "",
        "DROP POLICY IF EXISTS products_select_active_or_owner ON marketplace.anuncios;",
        "CREATE POLICY products_select_active_or_owner ON marketplace.anuncios",
        "  FOR SELECT USING (situacao = 'ativo' OR usuario_id = marketplace.obter_id_usuario_atual() OR marketplace.eh_administrador());",
        "",
        "DROP POLICY IF EXISTS products_insert_own ON marketplace.anuncios;",
        "CREATE POLICY products_insert_own ON marketplace.anuncios",
        "  FOR INSERT WITH CHECK (usuario_id = marketplace.obter_id_usuario_atual());",
        "",
        "DROP POLICY IF EXISTS products_update_own_or_admin ON marketplace.anuncios;",
        "CREATE POLICY products_update_own_or_admin ON marketplace.anuncios",
        "  FOR UPDATE USING (usuario_id = marketplace.obter_id_usuario_atual() OR marketplace.eh_administrador()) WITH CHECK (usuario_id = marketplace.obter_id_usuario_atual() OR marketplace.eh_administrador());",
        "",
        "DROP POLICY IF EXISTS products_delete_own_or_admin ON marketplace.anuncios;",
        "CREATE POLICY products_delete_own_or_admin ON marketplace.anuncios",
        "  FOR DELETE USING (usuario_id = marketplace.obter_id_usuario_atual() OR marketplace.eh_administrador());",
        "",
        "DROP POLICY IF EXISTS product_images_select_all ON marketplace.anuncio_imagens;",
        "CREATE POLICY product_images_select_all ON marketplace.anuncio_imagens FOR SELECT USING (true);",
        "",
        "DROP POLICY IF EXISTS product_images_write_owner ON marketplace.anuncio_imagens;",
        "CREATE POLICY product_images_write_owner ON marketplace.anuncio_imagens",
        "  FOR ALL",
        "  USING (marketplace.eh_administrador() OR EXISTS (SELECT 1 FROM marketplace.anuncios p WHERE p.id = anuncio_id AND p.usuario_id = marketplace.obter_id_usuario_atual()))",
        "  WITH CHECK (marketplace.eh_administrador() OR EXISTS (SELECT 1 FROM marketplace.anuncios p WHERE p.id = anuncio_id AND p.usuario_id = marketplace.obter_id_usuario_atual()));",
        "",
        "DROP POLICY IF EXISTS product_videos_select_all ON marketplace.anuncio_videos;",
        "CREATE POLICY product_videos_select_all ON marketplace.anuncio_videos FOR SELECT USING (true);",
        "",
        "DROP POLICY IF EXISTS product_videos_write_owner ON marketplace.anuncio_videos;",
        "CREATE POLICY product_videos_write_owner ON marketplace.anuncio_videos",
        "  FOR ALL",
        "  USING (marketplace.eh_administrador() OR EXISTS (SELECT 1 FROM marketplace.anuncios p WHERE p.id = anuncio_id AND p.usuario_id = marketplace.obter_id_usuario_atual()))",
        "  WITH CHECK (marketplace.eh_administrador() OR EXISTS (SELECT 1 FROM marketplace.anuncios p WHERE p.id = anuncio_id AND p.usuario_id = marketplace.obter_id_usuario_atual()));",
        "",
        "DROP POLICY IF EXISTS favorites_select_own ON marketplace.favoritos;",
        "CREATE POLICY favorites_select_own ON marketplace.favoritos",
        "  FOR SELECT USING (usuario_id = marketplace.obter_id_usuario_atual() OR marketplace.eh_administrador());",
        "",
        "DROP POLICY IF EXISTS favorites_insert_own ON marketplace.favoritos;",
        "CREATE POLICY favorites_insert_own ON marketplace.favoritos",
        "  FOR INSERT WITH CHECK (usuario_id = marketplace.obter_id_usuario_atual());",
        "",
        "DROP POLICY IF EXISTS favorites_delete_own ON marketplace.favoritos;",
        "CREATE POLICY favorites_delete_own ON marketplace.favoritos",
        "  FOR DELETE USING (usuario_id = marketplace.obter_id_usuario_atual());",
        "",
        "DROP POLICY IF EXISTS chat_rooms_select_participant ON marketplace.conversas;",
        "CREATE POLICY chat_rooms_select_participant ON marketplace.conversas",
        "  FOR SELECT USING (comprador_id = marketplace.obter_id_usuario_atual() OR vendedor_id = marketplace.obter_id_usuario_atual() OR marketplace.eh_administrador());",
        "",
        "DROP POLICY IF EXISTS chat_rooms_insert_buyer ON marketplace.conversas;",
        "CREATE POLICY chat_rooms_insert_buyer ON marketplace.conversas",
        "  FOR INSERT WITH CHECK (comprador_id = marketplace.obter_id_usuario_atual());",
        "",
        "DROP POLICY IF EXISTS chat_rooms_update_participant ON marketplace.conversas;",
        "CREATE POLICY chat_rooms_update_participant ON marketplace.conversas",
        "  FOR UPDATE USING (comprador_id = marketplace.obter_id_usuario_atual() OR vendedor_id = marketplace.obter_id_usuario_atual() OR marketplace.eh_administrador());",
        "",
        "DROP POLICY IF EXISTS chat_messages_select_participant ON marketplace.mensagens;",
        "CREATE POLICY chat_messages_select_participant ON marketplace.mensagens",
        "  FOR SELECT USING (",
        "    marketplace.eh_administrador()",
        "    OR EXISTS (",
        "      SELECT 1 FROM marketplace.conversas cr",
        "      WHERE cr.id = conversa_id",
        "        AND (cr.comprador_id = marketplace.obter_id_usuario_atual() OR cr.vendedor_id = marketplace.obter_id_usuario_atual())",
        "    )",
        "  );",
        "",
        "DROP POLICY IF EXISTS chat_messages_insert_participant ON marketplace.mensagens;",
        "CREATE POLICY chat_messages_insert_participant ON marketplace.mensagens",
        "  FOR INSERT WITH CHECK (",
        "    remetente_id = marketplace.obter_id_usuario_atual()",
        "    AND EXISTS (",
        "      SELECT 1 FROM marketplace.conversas cr",
        "      WHERE cr.id = conversa_id",
        "        AND (cr.comprador_id = marketplace.obter_id_usuario_atual() OR cr.vendedor_id = marketplace.obter_id_usuario_atual())",
        "    )",
        "  );",
        "",
        "DROP POLICY IF EXISTS chat_messages_update_participant ON marketplace.mensagens;",
        "CREATE POLICY chat_messages_update_participant ON marketplace.mensagens",
        "  FOR UPDATE USING (",
        "    EXISTS (",
        "      SELECT 1 FROM marketplace.conversas cr",
        "      WHERE cr.id = conversa_id",
        "        AND (cr.comprador_id = marketplace.obter_id_usuario_atual() OR cr.vendedor_id = marketplace.obter_id_usuario_atual())",
        "    )",
        "  );",
        "",
        "DROP POLICY IF EXISTS product_views_insert_all ON marketplace.anuncio_visualizacoes;",
        "CREATE POLICY product_views_insert_all ON marketplace.anuncio_visualizacoes",
        "  FOR INSERT WITH CHECK (true);",
        "",
        "DROP POLICY IF EXISTS product_views_select_owner_or_admin ON marketplace.anuncio_visualizacoes;",
        "CREATE POLICY product_views_select_owner_or_admin ON marketplace.anuncio_visualizacoes",
        "  FOR SELECT USING (",
        "    marketplace.eh_administrador()",
        "    OR EXISTS (",
        "      SELECT 1 FROM marketplace.anuncios p",
        "      WHERE p.id = anuncio_id AND p.usuario_id = marketplace.obter_id_usuario_atual()",
        "    )",
        "  );",
        "",
        "DROP POLICY IF EXISTS product_reports_insert_own ON marketplace.denuncias;",
        "CREATE POLICY product_reports_insert_own ON marketplace.denuncias",
        "  FOR INSERT WITH CHECK (denunciante_id = marketplace.obter_id_usuario_atual());",
        "",
        "DROP POLICY IF EXISTS product_reports_select_own_or_admin ON marketplace.denuncias;",
        "CREATE POLICY product_reports_select_own_or_admin ON marketplace.denuncias",
        "  FOR SELECT USING (denunciante_id = marketplace.obter_id_usuario_atual() OR marketplace.eh_administrador());",
        "",
        "DROP POLICY IF EXISTS product_reports_update_admin ON marketplace.denuncias;",
        "CREATE POLICY product_reports_update_admin ON marketplace.denuncias",
        "  FOR UPDATE USING (marketplace.eh_administrador()) WITH CHECK (marketplace.eh_administrador());",
        "",
        "DROP POLICY IF EXISTS banner_ads_select_active_or_admin ON marketplace.banners;",
        "CREATE POLICY banner_ads_select_active_or_admin ON marketplace.banners",
        "  FOR SELECT USING (",
        "    (ativo = true AND current_date BETWEEN data_inicio AND coalesce(data_fim, current_date))",
        "    OR marketplace.eh_administrador()",
        "  );",
        "",
        "DROP POLICY IF EXISTS banner_ads_write_admin ON marketplace.banners;",
        "CREATE POLICY banner_ads_write_admin ON marketplace.banners",
        "  FOR ALL USING (marketplace.eh_administrador()) WITH CHECK (marketplace.eh_administrador());",
        "",
        "DROP POLICY IF EXISTS notifications_select_own ON marketplace.notificacoes;",
        "CREATE POLICY notifications_select_own ON marketplace.notificacoes",
        "  FOR SELECT USING (usuario_id = marketplace.obter_id_usuario_atual() OR marketplace.eh_administrador());",
        "",
        "DROP POLICY IF EXISTS notifications_update_own ON marketplace.notificacoes;",
        "CREATE POLICY notifications_update_own ON marketplace.notificacoes",
        "  FOR UPDATE USING (usuario_id = marketplace.obter_id_usuario_atual()) WITH CHECK (usuario_id = marketplace.obter_id_usuario_atual());",
        "",
        "DROP POLICY IF EXISTS notifications_insert_system ON marketplace.notificacoes;",
        "CREATE POLICY notifications_insert_system ON marketplace.notificacoes",
        "  FOR INSERT WITH CHECK (marketplace.eh_administrador());",
        "",
        "DROP POLICY IF EXISTS settings_select_all ON marketplace.configuracoes;",
        "CREATE POLICY settings_select_all ON marketplace.configuracoes FOR SELECT USING (true);",
        "",
        "DROP POLICY IF EXISTS settings_write_admin ON marketplace.configuracoes;",
        "CREATE POLICY settings_write_admin ON marketplace.configuracoes",
        "  FOR ALL USING (marketplace.eh_administrador()) WITH CHECK (marketplace.eh_administrador());",
        "",
        "GRANT USAGE ON SCHEMA marketplace TO anon, authenticated;",
        "GRANT SELECT ON ALL TABLES IN SCHEMA marketplace TO anon, authenticated;",
        "GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA marketplace TO authenticated;",
        "ALTER DEFAULT PRIVILEGES IN SCHEMA marketplace GRANT SELECT ON TABLES TO anon, authenticated;",
        "ALTER DEFAULT PRIVILEGES IN SCHEMA marketplace GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated;",
        "",
    ]

    # Views
    sections += [
        "-- Atualiza views agregadas",
        "CREATE OR REPLACE VIEW marketplace.anuncios_publicos AS",
        "SELECT",
        "  p.id,",
        "  p.titulo,",
        "  p.slug,",
        "  p.descricao,",
        "  p.preco,",
        "  p.condicao,",
        "  p.quantidade,",
        "  p.cidade,",
        "  p.condominio,",
        "  p.endereco,",
        "  p.latitude,",
        "  p.longitude,",
        "  p.visualizacoes,",
        "  p.situacao,",
        "  p.destaque,",
        "  p.negociavel,",
        "  p.aceita_troca,",
        "  p.video_url,",
        "  p.criado_em,",
        "  p.atualizado_em,",
        "  c.id   AS categoria_id,",
        "  c.nome AS categoria_nome,",
        "  c.slug AS categoria_slug,",
        "  sc.id   AS subcategoria_id,",
        "  sc.nome AS subcategoria_nome,",
        "  sc.slug AS subcategoria_slug,",
        "  u.id       AS vendedor_id,",
        "  u.nome     AS vendedor_nome,",
        "  u.slug     AS vendedor_slug,",
        "  u.foto_url AS vendedor_foto_url,",
        "  u.cidade     AS vendedor_cidade,",
        "  u.avaliacao   AS vendedor_avaliacao,",
        "  (",
        "    SELECT pi.url",
        "    FROM marketplace.anuncio_imagens pi",
        "    WHERE pi.anuncio_id = p.id",
        "    ORDER BY pi.ordem ASC, pi.criado_em ASC",
        "    LIMIT 1",
        "  ) AS capa_url,",
        "  (",
        "    SELECT count(*)",
        "    FROM marketplace.anuncio_imagens pi",
        "    WHERE pi.anuncio_id = p.id",
        "  ) AS total_imagens",
        "FROM marketplace.anuncios p",
        "LEFT JOIN marketplace.categorias c ON c.id = p.categoria_id",
        "LEFT JOIN marketplace.subcategorias sc ON sc.id = p.subcategoria_id",
        "LEFT JOIN marketplace.usuarios u ON u.id = p.usuario_id",
        "WHERE p.situacao = 'ativo';",
        "",
        "CREATE OR REPLACE VIEW marketplace.perfis_vendedores AS",
        "SELECT",
        "  u.id,",
        "  u.slug,",
        "  u.nome,",
        "  u.foto_url,",
        "  u.biografia,",
        "  u.cidade,",
        "  u.estado,",
        "  u.avaliacao,",
        "  u.total_avaliacoes,",
        "  u.criado_em,",
        "  count(p.id) FILTER (WHERE p.situacao = 'ativo') AS total_anuncios_ativos,",
        "  count(p.id) FILTER (WHERE p.situacao = 'vendido')   AS total_anuncios_vendidos",
        "FROM marketplace.usuarios u",
        "LEFT JOIN marketplace.anuncios p ON p.usuario_id = u.id",
        "WHERE u.situacao = 'ativo'",
        "GROUP BY u.id;",
        "",
        "CREATE OR REPLACE VIEW marketplace.conversas_com_ultima_mensagem AS",
        "SELECT",
        "  cr.id,",
        "  cr.anuncio_id,",
        "  cr.comprador_id,",
        "  cr.vendedor_id,",
        "  cr.criado_em,",
        "  cr.ultima_mensagem_em,",
        "  p.titulo      AS anuncio_titulo,",
        "  p.slug        AS anuncio_slug,",
        "  (",
        "    SELECT pi.url",
        "    FROM marketplace.anuncio_imagens pi",
        "    WHERE pi.anuncio_id = p.id",
        "    ORDER BY pi.ordem ASC",
        "    LIMIT 1",
        "  ) AS anuncio_imagem_url,",
        "  lm.conteudo    AS ultima_mensagem_conteudo,",
        "  lm.remetente_id  AS ultima_mensagem_remetente_id,",
        "  lm.criado_em AS ultima_mensagem_criado_em,",
        "  (",
        "    SELECT count(*)",
        "    FROM marketplace.mensagens m",
        "    WHERE m.conversa_id = cr.id AND m.lida_em IS NULL",
        "  ) AS nao_lidas",
        "FROM marketplace.conversas cr",
        "JOIN marketplace.anuncios p ON p.id = cr.anuncio_id",
        "LEFT JOIN LATERAL (",
        "  SELECT conteudo, remetente_id, criado_em",
        "  FROM marketplace.mensagens",
        "  WHERE conversa_id = cr.id",
        "  ORDER BY criado_em DESC",
        "  LIMIT 1",
        ") lm ON true;",
        "",
    ]

    # Public bridge
    sections += [
        "-- Recria views/functions ponte no schema public",
        "CREATE OR REPLACE VIEW public.usuarios WITH (security_invoker = true) AS SELECT * FROM marketplace.usuarios;",
        "CREATE OR REPLACE VIEW public.categorias WITH (security_invoker = true) AS SELECT * FROM marketplace.categorias;",
        "CREATE OR REPLACE VIEW public.subcategorias WITH (security_invoker = true) AS SELECT * FROM marketplace.subcategorias;",
        "CREATE OR REPLACE VIEW public.anuncios WITH (security_invoker = true) AS SELECT * FROM marketplace.anuncios;",
        "CREATE OR REPLACE VIEW public.anuncio_imagens WITH (security_invoker = true) AS SELECT * FROM marketplace.anuncio_imagens;",
        "CREATE OR REPLACE VIEW public.anuncio_videos WITH (security_invoker = true) AS SELECT * FROM marketplace.anuncio_videos;",
        "CREATE OR REPLACE VIEW public.favoritos WITH (security_invoker = true) AS SELECT * FROM marketplace.favoritos;",
        "CREATE OR REPLACE VIEW public.conversas WITH (security_invoker = true) AS SELECT * FROM marketplace.conversas;",
        "CREATE OR REPLACE VIEW public.mensagens WITH (security_invoker = true) AS SELECT * FROM marketplace.mensagens;",
        "CREATE OR REPLACE VIEW public.anuncio_visualizacoes WITH (security_invoker = true) AS SELECT * FROM marketplace.anuncio_visualizacoes;",
        "CREATE OR REPLACE VIEW public.denuncias WITH (security_invoker = true) AS SELECT * FROM marketplace.denuncias;",
        "CREATE OR REPLACE VIEW public.banners WITH (security_invoker = true) AS SELECT * FROM marketplace.banners;",
        "CREATE OR REPLACE VIEW public.notificacoes WITH (security_invoker = true) AS SELECT * FROM marketplace.notificacoes;",
        "CREATE OR REPLACE VIEW public.configuracoes WITH (security_invoker = true) AS SELECT * FROM marketplace.configuracoes;",
        "",
        "CREATE OR REPLACE VIEW public.anuncios_publicos WITH (security_invoker = true) AS SELECT * FROM marketplace.anuncios_publicos;",
        "CREATE OR REPLACE VIEW public.perfis_vendedores WITH (security_invoker = true) AS SELECT * FROM marketplace.perfis_vendedores;",
        "CREATE OR REPLACE VIEW public.conversas_com_ultima_mensagem WITH (security_invoker = true) AS SELECT * FROM marketplace.conversas_com_ultima_mensagem;",
        "",
        "CREATE OR REPLACE FUNCTION public.incrementar_visualizacoes_anuncio(p_anuncio_id uuid)",
        "RETURNS void",
        "LANGUAGE sql",
        "AS $$",
        "  SELECT marketplace.incrementar_visualizacoes_anuncio(p_anuncio_id);",
        "$$;",
        "",
        "GRANT USAGE ON SCHEMA public TO anon, authenticated;",
        "GRANT SELECT ON",
        "  public.usuarios, public.categorias, public.subcategorias, public.anuncios,",
        "  public.anuncio_imagens, public.anuncio_videos, public.banners, public.configuracoes,",
        "  public.anuncios_publicos, public.perfis_vendedores",
        "TO anon, authenticated;",
        "GRANT SELECT ON",
        "  public.favoritos, public.conversas, public.mensagens,",
        "  public.conversas_com_ultima_mensagem, public.anuncio_visualizacoes,",
        "  public.denuncias, public.notificacoes",
        "TO authenticated;",
        "GRANT INSERT, UPDATE, DELETE ON",
        "  public.usuarios, public.anuncios, public.anuncio_imagens, public.anuncio_videos,",
        "  public.favoritos, public.conversas, public.mensagens, public.denuncias",
        "TO authenticated;",
        "GRANT UPDATE ON public.notificacoes TO authenticated;",
        "GRANT INSERT ON public.anuncio_visualizacoes TO anon, authenticated;",
        "GRANT EXECUTE ON FUNCTION public.incrementar_visualizacoes_anuncio(uuid) TO anon, authenticated;",
        "",
    ]

    # Realtime
    sections += [
        "-- Realtime",
        "ALTER PUBLICATION supabase_realtime DROP TABLE marketplace.chat_messages, marketplace.chat_rooms;",
        "ALTER PUBLICATION supabase_realtime ADD TABLE marketplace.mensagens, marketplace.conversas;",
        "ALTER TABLE marketplace.mensagens REPLICA IDENTITY FULL;",
        "ALTER TABLE marketplace.conversas REPLICA IDENTITY FULL;",
        "",
    ]

    # Storage policies (referenciam marketplace.usuarios e papel)
    sections += [
        "-- Atualiza storage policies (admin agora consulta papel/administrador)",
        "DROP POLICY IF EXISTS banners_admin_write ON storage.objects;",
        "CREATE POLICY banners_admin_write",
        "  ON storage.objects FOR ALL",
        "  USING (",
        "    bucket_id = 'banners'",
        "    AND EXISTS (",
        "      SELECT 1 FROM marketplace.usuarios u",
        "      WHERE u.id_autenticacao = auth.uid() AND u.papel = 'administrador'",
        "    )",
        "  )",
        "  WITH CHECK (",
        "    bucket_id = 'banners'",
        "    AND EXISTS (",
        "      SELECT 1 FROM marketplace.usuarios u",
        "      WHERE u.id_autenticacao = auth.uid() AND u.papel = 'administrador'",
        "    )",
        "  );",
        "",
    ]

    return "\n".join(sections)


def update_base_sql_files() -> None:
    """Atualiza os arquivos SQL base (01-09) para refletir nomes em portugues."""
    for sql_file in sorted(SQL_DIR.glob("*.sql")):
        if sql_file.name == "10_migracao_renomear_portugues.sql":
            continue
        text = sql_file.read_text(encoding="utf-8")
        new_text = sql_process(text)
        sql_file.write_text(new_text, encoding="utf-8")


def update_typescript() -> None:
    """Atualiza arquivos TypeScript."""
    for ts_file in sorted(SRC_DIR.rglob("*.ts")):
        rel = ts_file.relative_to(ROOT).as_posix()
        if "/node_modules/" in rel or "/.next/" in rel:
            continue
        text = ts_file.read_text(encoding="utf-8")
        if ts_file.name == "database.types.ts":
            new_text = types_process(text)
        elif ts_file.suffix == ".tsx" or (ts_file.suffix == ".ts" and "/app/" in rel):
            new_text = tsx_process(text, ts_file.name)
        else:
            new_text = ts_process(text, ts_file.name)
        ts_file.write_text(new_text, encoding="utf-8")

    for tsx_file in sorted(SRC_DIR.rglob("*.tsx")):
        rel = tsx_file.relative_to(ROOT).as_posix()
        if "/node_modules/" in rel or "/.next/" in rel:
            continue
        text = tsx_file.read_text(encoding="utf-8")
        new_text = tsx_process(text, tsx_file.name)
        tsx_file.write_text(new_text, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Apenas simula e mostra o diff resumido")
    parser.add_argument("--only-sql", action="store_true", help="Apenas SQL")
    parser.add_argument("--only-ts", action="store_true", help="Apenas TypeScript")
    parser.add_argument("--migration", action="store_true", help="Gera somente o arquivo de migracao")
    args = parser.parse_args()

    migration_path = SQL_DIR / "10_migracao_renomear_portugues.sql"

    if args.dry_run:
        print("=== DRY RUN ===")
        print("Arquivos que seriam alterados:")
        changed = 0
        for sql_file in sorted(SQL_DIR.glob("*.sql")):
            if sql_file.name == "10_migracao_renomear_portugues.sql":
                continue
            text = sql_file.read_text(encoding="utf-8")
            new_text = sql_process(text)
            if new_text != text:
                print(f"  SQL: {sql_file.name}")
                changed += 1
        for ts_file in sorted(list(SRC_DIR.rglob("*.ts")) + list(SRC_DIR.rglob("*.tsx"))):
            rel = ts_file.relative_to(ROOT).as_posix()
            if "/node_modules/" in rel or "/.next/" in rel:
                continue
            text = ts_file.read_text(encoding="utf-8")
            if ts_file.name == "database.types.ts":
                new_text = types_process(text)
            elif ts_file.suffix == ".tsx" or (ts_file.suffix == ".ts" and "/app/" in rel):
                new_text = tsx_process(text, ts_file.name)
            else:
                new_text = ts_process(text, ts_file.name)
            if new_text != text:
                print(f"  TS: {rel}")
                changed += 1
        if migration_path.exists():
            current = migration_path.read_text(encoding="utf-8")
        else:
            current = ""
        new_migration = generate_migration()
        if current != new_migration:
            print(f"  MIGRATION: {migration_path.name}")
            changed += 1
        print(f"Total de arquivos alterados: {changed}")
        return

    if args.migration or (not args.only_ts):
        migration_path.write_text(generate_migration(), encoding="utf-8")
        print(f"Gerado: {migration_path}")

    if not args.migration:
        if not args.only_ts:
            update_base_sql_files()
            print("SQL base atualizado.")
        if not args.only_sql:
            update_typescript()
            print("TypeScript atualizado.")


if __name__ == "__main__":
    main()
