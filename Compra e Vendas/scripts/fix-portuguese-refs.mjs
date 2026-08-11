// Script para corrigir referências em inglês que ainda restam no código TypeScript
// após a renomeação das tabelas e colunas para português

import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, relative, extname } from "node:path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");

// Mapeamento de propriedades que precisam ser corrigidas
const PROPERTY_REPLACEMENTS = {
  // Supabase response properties
  "dados:": "data:",
  ".dados": ".data",
  
  // Column names in queries
  "buyer_id": "comprador_id",
  "seller_id": "vendedor_id",
  "product_id": "anuncio_id",
  "room_id": "conversa_id",
  "sender_id": "remetente_id",
  "viewer_id": "visitante_id",
  "reporter_id": "denunciante_id",
  "category_id": "categoria_id",
  "subcategory_id": "subcategoria_id",
  "user_id": "usuario_id",
  "parent_id": "categoria_pai_id",
  
  // Column names in property access
  ".status": ".situacao",
  ".views": ".visualizacoes",
  ".title": ".titulo",
  ".description": ".descricao",
  ".price": ".preco",
  ".condition": ".condicao",
  ".quantity": ".quantidade",
  ".city": ".cidade",
  ".state": ".estado",
  ".name": ".nome",
  ".phone": ".telefone",
  ".bio": ".biografia",
  ".photo_url": ".foto_url",
  ".rating": ".avaliacao",
  ".created_at": ".criado_em",
  ".updated_at": ".atualizado_em",
  ".read_at": ".lida_em",
  ".content": ".conteudo",
  ".attachments": ".anexos",
  ".message": ".mensagem",
  ".data": ".dados",
  ".read": ".lida",
  ".active": ".ativo",
  ".order": ".ordem",
  
  // Method names
  ".ordem(": ".order(",
};

async function getFiles(dir, extensions) {
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
      } else if (extensions.includes(extname(entry.name))) {
        files.push(full);
      }
    }
  }
  
  return files;
}

function applyReplacements(text) {
  let modified = text;
  
  for (const [oldStr, newStr] of Object.entries(PROPERTY_REPLACEMENTS)) {
    // Use regex global replacement
    const regex = new RegExp(escapeRegex(oldStr), "g");
    modified = modified.replace(regex, newStr);
  }
  
  return modified;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function main() {
  const files = await getFiles(SRC_DIR, [".ts", ".tsx"]);
  let changedCount = 0;
  
  for (const file of files) {
    const rel = relative(ROOT, file);
    const content = await readFile(file, "utf-8");
    const modified = applyReplacements(content);
    
    if (content !== modified) {
      await writeFile(file, modified, "utf-8");
      console.log(`✓ ${rel}`);
      changedCount++;
    }
  }
  
  console.log(`\nTotal de arquivos atualizados: ${changedCount}`);
}

main().catch(console.error);
