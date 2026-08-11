// Script para corrigir os últimos 17 erros
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, relative, extname } from "node:path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");

const FIXES = [
  // Fix SectionTitle component usage
  { from: /title=/g, to: "titulo=" },
  
  // Fix product properties
  { from: /product\.category_slug/g, to: "product.categoria_slug" },
  { from: /product\.category_name/g, to: "product.categoria_nome" },
  { from: /product\.condominium/g, to: "product.condominio" },
  
  // Fix SellerCard props
  { from: /avaliacao=/g, to: "rating=" },
  
  // Fix ProductFilters
  { from: /condominium: params\.condominio/g, to: "condominio: params.condominio" },
  
  // Fix DashboardStats
  { from: /stats\.ativoAds/g, to: "stats.activeAds" },
  
  // Fix ChatRoomDetail
  { from: /anuncio_title:/g, to: "anuncio_titulo:" },
  
  // Fix anuncio-filters children prop
  { from: /function ProductFiltersPanel\(\{ children \}: \{ children: React\.ReactNode \}\)/g, to: "function ProductFiltersPanel({ children }: { children: React.ReactNode })" },
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
