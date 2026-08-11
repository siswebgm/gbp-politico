// Script final para corrigir os últimos 96 erros
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, relative, extname } from "node:path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");

const FIXES = [
  // Fix state.mensagem -> state.message in all components
  { from: /state\.mensagem/g, to: "state.message" },
  
  // Fix banner image URLs
  { from: /banner\.desktop_image_url/g, to: "banner.imagem_desktop_url" },
  { from: /banner\.mobile_image_url/g, to: "banner.imagem_mobile_url" },
  
  // Fix seller card properties
  { from: /\bname,\n  photoUrl,\n  city,\n  rating,\n  createdAt,/g, to: "nome,\n  photoUrl,\n  city,\n  rating,\n  createdAt," },
  
  // Fix CategoryIcon component prop
  { from: /<CategoryIcon nome=/g, to: "<CategoryIcon name=" },
  
  // Fix share button - navigator.share expects 'title' not 'titulo'
  { from: /await navigator\.share\(\{ titulo, url \}\);/g, to: "await navigator.share({ title: titulo, url });" },
  
  // Fix section-titulo component - destructure titulo but use it
  { from: /\{title\}<\/h2>/g, to: "{titulo}</h2>" },
  
  // Fix metadata title in pages
  { from: /export const metadata: Metadata = \{\n  title:/g, to: "export const metadata: Metadata = {\n  title:" },
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
