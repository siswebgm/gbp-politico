import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const version = {
    version: Date.now().toString()
};

writeFileSync(
    join(__dirname, '..', 'public', 'version.json'),
    JSON.stringify(version, null, 2)
);
