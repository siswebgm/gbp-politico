// Script para corrigir os erros restantes após a primeira passada
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, relative, extname } from "node:path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");

const FIXES = [
  // Fix ActionState mensagem -> message
  { from: /mensagem:/g, to: "message:" },
  { from: /error\.mensagem/g, to: "error.message" },
  
  // Fix Zod parsed.dados -> parsed.data
  { from: /parsed\.dados/g, to: "parsed.data" },
  
  // Fix textSearch tipo -> type
  { from: /tipo: "websearch"/g, to: 'type: "websearch"' },
  
  // Fix function parameters that were renamed incorrectly
  { from: /\(cidade: string\)/g, to: "(city: string)" },
  { from: /\(posicao: BannerPosition\)/g, to: "(position: BannerPosition)" },
  
  // Fix variable names in function bodies
  { from: /\.eq\("cidade", cidade\)/g, to: '.eq("cidade", city)' },
  { from: /\.eq\("posicao", posicao\)/g, to: '.eq("posicao", position)' },
  
  // Fix ProductFilters interface properties
  { from: /filters\.cidade/g, to: "filters.city" },
  { from: /filters\.condicao/g, to: "filters.condition" },
  
  // Fix content variable in chat-messages
  { from: /if \(!content\.trim\(\)\)/g, to: "if (!conteudo.trim())" },
  { from: /conteudo: content\.trim\(\)/g, to: "conteudo: conteudo.trim()" },
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
