// Script para corrigir as últimas interfaces e propriedades
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, relative, extname } from "node:path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");

const FIXES = [
  // Fix ProductFilters - add missing property
  { 
    from: /condition\?: "novo" \| "usado";/g, 
    to: 'condicao?: "novo" | "usado";' 
  },
  
  // Fix ChatRoomDetail interface
  { from: /other_user_name: string;/g, to: "other_user_nome: string;" },
  { from: /other_user_photo_url: string/g, to: "other_user_foto_url: string" },
  
  // Fix chat-list-item property access
  { from: /room\.unread_count/g, to: "room.nao_lidas" },
  { from: /room\.last_message_remetente_id/g, to: "room.ultima_mensagem_remetente_id" },
  { from: /room\.last_message_created_at/g, to: "room.ultima_mensagem_criado_em" },
  { from: /room\.last_message_content/g, to: "room.ultima_mensagem_conteudo" },
  { from: /room\.product_title/g, to: "room.anuncio_titulo" },
  
  // Fix chat-window interface and usage
  { from: /photo_url: string \| null;/g, to: "foto_url: string | null;" },
  { from: /other_user_name/g, to: "other_user_nome" },
  { from: /other_user_photo_url/g, to: "other_user_foto_url" },
  
  // Fix section-titulo props
  { from: /\btitle,/g, to: "titulo," },
  { from: /\btitle:/g, to: "titulo:" },
];

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

function applyFixes(text) {
  let modified = text;
  
  for (const { from, to } of FIXES) {
    modified = modified.replace(from, to);
  }
  
  return modified;
}

async function main() {
  const files = await getFiles(SRC_DIR, [".ts", ".tsx"]);
  let changedCount = 0;
  
  for (const file of files) {
    const rel = relative(ROOT, file);
    const content = await readFile(file, "utf-8");
    const modified = applyFixes(content);
    
    if (content !== modified) {
      await writeFile(file, modified, "utf-8");
      console.log(`✓ ${rel}`);
      changedCount++;
    }
  }
  
  console.log(`\nTotal de arquivos atualizados: ${changedCount}`);
}

main().catch(console.error);
