import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const manifestPath = path.join(rootDir, 'build-manifest.json');
const outPath = path.join(rootDir, 'scripts', 'init.js');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

const chunks = [];
for (const entry of manifest) {
  const sourcePath = path.join(rootDir, entry.source);
  const content = await readFile(sourcePath, 'utf8');
  chunks.push(`${entry.banner}\n${content.replace(/\s+$/u, '')}`);
}

await writeFile(outPath, `${chunks.join('\n\n')}\n`, 'utf8');
console.log(`Built ${path.relative(rootDir, outPath)} from ${manifest.length} source files.`);
