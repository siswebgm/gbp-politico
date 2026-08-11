// Script final para corrigir todos os erros restantes
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, relative, extname } from "node:path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");

const FIXES = [
  // Fix ProductFilters interface properties
  { from: /filters\.city/g, to: "filters.cidade" },
  { from: /filters\.condition/g, to: "filters.condicao" },
  { from: /filters\.condominium/g, to: "filters.condominio" },
  
  // Fix img.ordem when img comes from map with order property
  { from: /ordem: img\.ordem/g, to: "ordem: img.order" },
  
  // Fix size="icone" to size="icon"
  { from: /size="icone"/g, to: 'size="icon"' },
  
  // Fix Views type name
  { from: /"conversas_com_ultima_mensagem"/g, to: '"conversas_com_ultima_message"' },
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
