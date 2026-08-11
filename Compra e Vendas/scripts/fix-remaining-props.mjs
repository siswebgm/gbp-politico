// Script para corrigir as últimas propriedades incorretas
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, relative, extname } from "node:path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");

const FIXES = [
  // Fix Metadata title property
  { from: /titulo:/g, to: "title:" },
  
  // Fix product properties that should remain in English in the view
  { from: /product\.cover_image_url/g, to: "product.capa_url" },
  { from: /product\.featured/g, to: "product.destaque" },
  { from: /product\.accepts_trade/g, to: "product.aceita_troca" },
  { from: /product\.negotiable/g, to: "product.negociavel" },
  
  // Fix seller card - should use nome not name
  { from: /alt=\{name\}/g, to: "alt={nome}" },
  { from: />\s*\{name\}\s*</g, to: ">{nome}<" },
  
  // Fix ProductFilters city property
  { from: /city: params\.cidade/g, to: "cidade: params.cidade" },
  
  // Fix SellerCard component prop
  { from: /cidade=\{product\.vendedor_cidade\}/g, to: "city={product.vendedor_cidade}" },
  
  // Fix estado -> state
  { from: /estado\.mensagem/g, to: "state.message" },
  
  // Fix content variable
  { from: /\{content\}</g, to: "{children}" },
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
