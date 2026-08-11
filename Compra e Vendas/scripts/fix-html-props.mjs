// Script para corrigir propriedades HTML que foram incorretamente renomeadas
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, relative, extname } from "node:path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");

const FIXES = [
  // Fix HTML input/button props
  { from: /\btipo="text"/g, to: 'type="text"' },
  { from: /\btipo="email"/g, to: 'type="email"' },
  { from: /\btipo="password"/g, to: 'type="password"' },
  { from: /\btipo="number"/g, to: 'type="number"' },
  { from: /\btipo="checkbox"/g, to: 'type="checkbox"' },
  { from: /\btipo="file"/g, to: 'type="file"' },
  { from: /\btipo="hidden"/g, to: 'type="hidden"' },
  { from: /\btipo="button"/g, to: 'type="button"' },
  { from: /\bnome="/g, to: 'name="' },
  
  // Fix FormFieldError component prop
  { from: /mensagem=/g, to: "message=" },
  
  // Fix file.nome -> file.name
  { from: /file\.nome/g, to: "file.name" },
  
  // Fix estado -> state in form components
  { from: /\bestado\.fieldErrors/g, to: "state.fieldErrors" },
  
  // Fix seller-card destructuring - keep as is but fix usage
  { from: /\bconst \{ nome, photoUrl, city, rating, createdAt \}/g, to: "const { nome, photoUrl, city, rating, createdAt }" },
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
