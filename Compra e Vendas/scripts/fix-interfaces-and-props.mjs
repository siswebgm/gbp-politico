// Script para corrigir interfaces e props HTML
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, relative, extname } from "node:path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");

const FIXES = [
  // Fix HTML props that were incorrectly renamed
  { from: /\bvalor=/g, to: "value=" },
  { from: /\.target\.valor/g, to: ".target.value" },
  { from: /\btipo="submit"/g, to: 'type="submit"' },
  { from: /\bchave=/g, to: "key=" },
  
  // Fix ProductFilters interface properties in anuncios.ts
  { from: /condominium\?: string;/g, to: "condominio?: string;" },
  { from: /city\?: string;/g, to: "cidade?: string;" },
  { from: /condition\?: ProductCondition;/g, to: "condicao?: ProductCondition;" },
  
  // Fix ChatWindow interface properties
  { from: /name: string;/g, to: "nome: string;" },
  { from: /title: string;/g, to: "titulo: string;" },
  { from: /image_url: string/g, to: "imagem_url: string" },
  
  // Fix otherUser and product property access in chat components
  { from: /otherUser\.name/g, to: "otherUser.nome" },
  { from: /product\.title/g, to: "product.titulo" },
  { from: /otherUser\.photo_url/g, to: "otherUser.foto_url" },
  { from: /product\.image_url/g, to: "product.imagem_url" },
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
