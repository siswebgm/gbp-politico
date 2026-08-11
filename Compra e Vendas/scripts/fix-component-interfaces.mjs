// Script para corrigir interfaces de componentes que ainda usam 'title'
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, relative, extname } from "node:path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");

const FIXES = [
  // Fix component prop interfaces - change title to titulo
  { from: /\{ title: string; url: string \}/g, to: "{ titulo: string; url: string }" },
  { from: /\{ images: string\[\]; title: string; \}/g, to: "{ images: string[]; titulo: string; }" },
  { from: /\{ title: string; href\?: string \| undefined; \}/g, to: "{ titulo: string; href?: string | undefined; }" },
  
  // Fix banner Row type to use titulo
  { from: /title: string \| null;/g, to: "titulo: string | null;" },
  
  // Fix Views type for chat rooms
  { from: /anuncio_title: string;/g, to: "anuncio_titulo: string;" },
  
  // Fix product schema
  { from: /title: z\.string/g, to: "titulo: z.string" },
  
  // Fix MyProduct interface
  { from: /title: string;/g, to: "titulo: string;" },
  
  // Fix ChatWindow product interface
  { from: /title: string;\n  slug: string;\n  imagem_url: string/g, to: "titulo: string;\n  slug: string;\n  imagem_url: string" },
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
