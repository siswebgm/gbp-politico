import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const timestamp = Date.now();
const buildDate = new Date(timestamp).toISOString();

const version = {
    version: timestamp.toString(),
    buildDate: buildDate,
    timestamp: timestamp
};

const versionPath = join(__dirname, '..', 'public', 'version.json');
writeFileSync(versionPath, JSON.stringify(version, null, 2));

console.log(`✅ Versão gerada: ${timestamp} (${buildDate})`);
